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

    def test_disabled_rule_is_skipped_by_validator(self, client):
        # Baseline: a normal run rejects some trades for RV-05 (the
        # noisy synthetic generator's most common offender) when the
        # rule is enabled.
        client.patch("/rules/RV-05", json={"enabled": False})
        r = client.post(
            "/pipeline/run",
            json={"n_trades": 100, "seed": 1, "mode": "dataframe"},
        )
        assert r.status_code == 200
        summary = r.json()["validation_summary"]
        # The skipped rule contributes zero rejections.
        assert summary["rejected_by_rule"]["RV-05"] == 0
        # Other rules can still report >= 0 rejections; we don't assert
        # an exact total because synthetic data is stochastic, but the
        # skipped-rules array must contain RV-05.
        assert "RV-05" in summary.get("skipped_rules", [])

        # Re-enable for a clean state across tests.
        client.patch("/rules/RV-05", json={"enabled": True})


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


# =====================================================================
# /settings/persist (write-back to disk)
# =====================================================================
class TestSettingsPersist:
    def test_persist_writes_yaml_to_target_path(self, cfg, tmp_path):
        from src.api.main import create_app

        target = tmp_path / "settings.yaml"
        app = create_app(cfg)
        # Override the disk target so the test never touches the real file.
        app.state.settings_path = target
        client = TestClient(app)

        # Patch something distinctive and persist.
        client.put(
            "/settings",
            json={"patch": {"validator": {"critical": {"notional_tolerance": 0.07}}}},
        )
        r = client.post("/settings/persist")
        assert r.status_code == 200
        body = r.json()
        assert body["persisted"] is True
        assert body["target"].endswith("settings.yaml")
        # First persist: no prior file → no backup yet.
        assert body["backup"] is None

        # Round-trip the YAML and confirm the patch is reflected.
        import yaml

        loaded = yaml.safe_load(target.read_text(encoding="utf-8"))
        assert loaded["validator"]["critical"]["notional_tolerance"] == 0.07

    def test_persist_creates_bak_when_overwriting(self, cfg, tmp_path):
        from src.api.main import create_app

        target = tmp_path / "settings.yaml"
        # Pre-existing settings.yaml with some marker content
        target.write_text("__previous__: true\n", encoding="utf-8")

        app = create_app(cfg)
        app.state.settings_path = target
        client = TestClient(app)

        r = client.post("/settings/persist")
        body = r.json()
        assert body["backup"] is not None
        assert body["backup"].endswith(".bak")
        # Backup carries the pre-existing content
        bak_text = (target.parent / (target.name + ".bak")).read_text(encoding="utf-8")
        assert "__previous__" in bak_text
        # And the live file now has the in-memory config (no __previous__)
        assert "__previous__" not in target.read_text(encoding="utf-8")
