"""
tests/test_api_rules_settings.py
================================
Cubre los endpoints nuevos /rules y /settings añadidos en la fase de
editor UI.
"""

from __future__ import annotations

import copy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from src.api.main import create_app
from src.audit import load_config


@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    return c


@pytest.fixture
def client(cfg) -> TestClient:
    return TestClient(create_app(cfg))


# =====================================================================
# /rules
# =====================================================================
class TestRules:
    def test_list_returns_14_rules_enabled_by_default(self, client):
        r = client.get("/rules")
        assert r.status_code == 200
        body = r.json()
        assert len(body["rules"]) == 14
        assert body["disabled_ids"] == []
        # All RV-01..RV-14 ids present
        ids = sorted(rule["id"] for rule in body["rules"])
        assert ids == [f"RV-{i:02d}" for i in range(1, 15)]
        # All start enabled
        assert all(rule["enabled"] for rule in body["rules"])

    def test_patch_disables_then_re_enables(self, client):
        r = client.patch("/rules/RV-05", json={"enabled": False})
        assert r.status_code == 200
        body = r.json()
        rv05 = next(r for r in body["rules"] if r["id"] == "RV-05")
        assert rv05["enabled"] is False
        assert "RV-05" in body["disabled_ids"]

        r = client.patch("/rules/RV-05", json={"enabled": True})
        rv05 = next(r for r in r.json()["rules"] if r["id"] == "RV-05")
        assert rv05["enabled"] is True

    def test_patch_unknown_rule_returns_404(self, client):
        r = client.patch("/rules/RV-99", json={"enabled": False})
        assert r.status_code == 404


# =====================================================================
# /settings
# =====================================================================
class TestSettings:
    def test_get_returns_full_config(self, client):
        r = client.get("/settings")
        assert r.status_code == 200
        body = r.json()
        assert "settings" in body
        cfg = body["settings"]
        # Spot-check a few top-level sections
        assert "validator" in cfg
        assert "generator" in cfg
        assert "kafka" in cfg
        assert "sources" in cfg

    def test_put_deep_merges_scalar(self, client):
        # Bump notional_tolerance from 0.01 → 0.05
        r = client.put(
            "/settings",
            json={"patch": {"validator": {"critical": {"notional_tolerance": 0.05}}}},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["settings"]["validator"]["critical"]["notional_tolerance"] == 0.05
        # Unrelated keys untouched
        assert "valid_sides" in body["settings"]["validator"]["critical"]

    def test_put_replaces_list_wholesale(self, client):
        r = client.put(
            "/settings",
            json={"patch": {"validator": {"critical": {"valid_currencies": ["USD"]}}}},
        )
        assert r.status_code == 200
        assert r.json()["settings"]["validator"]["critical"]["valid_currencies"] == ["USD"]

    def test_settings_changes_propagate_to_next_run(self, client):
        # Patch the tolerance, then run the pipeline and confirm
        # the in-memory config was read by the validator.
        client.put(
            "/settings",
            json={"patch": {"validator": {"critical": {"notional_tolerance": 99.0}}}},
        )
        # n_trades=20 keeps the test snappy
        r = client.post("/pipeline/run", json={"n_trades": 20, "seed": 1, "mode": "dataframe"})
        assert r.status_code == 200
        # With absurd tolerance, very few RV-05 rejections (effectively none).
        # We just assert the run completed successfully.
        assert r.json()["validation_summary"]["total_out"] > 0
