"""
tests/test_api.py
=================
Tests de la API FastAPI: endpoints, pseudonimización, cache de reportes,
auditoría de accesos.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from src.api.main import _get_salt, _pseudonymize, create_app
from src.audit import load_config


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
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
    app = create_app(cfg)
    return TestClient(app)


@pytest.fixture
def client_after_run(cfg) -> TestClient:
    """Cliente con un run ya ejecutado (n=200, dataframe)."""
    app = create_app(cfg)
    c = TestClient(app)
    resp = c.post("/pipeline/run", json={"n_trades": 200, "seed": 1, "mode": "dataframe"})
    assert resp.status_code == 200
    return c


# =====================================================================
# /health
# =====================================================================
class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "version" in body


# =====================================================================
# POST /pipeline/run
# =====================================================================
class TestPipelineRun:
    def test_run_returns_summary(self, client):
        r = client.post("/pipeline/run", json={"n_trades": 100, "seed": 1, "mode": "dataframe"})
        assert r.status_code == 200
        body = r.json()
        assert "run_id" in body
        assert body["mode"] == "dataframe"
        assert body["validation_summary"]["total_in"] == 100
        assert 0 <= body["quality_score"] <= 100

    def test_run_validates_input(self, client):
        # n_trades negativo → 422
        r = client.post("/pipeline/run", json={"n_trades": -1})
        assert r.status_code == 422

    def test_invalid_mode_returns_422(self, client):
        r = client.post("/pipeline/run", json={"n_trades": 10, "mode": "ftp"})
        assert r.status_code == 422

    def test_run_persists_to_history(self, client):
        client.post("/pipeline/run", json={"n_trades": 50, "seed": 1, "mode": "dataframe"})
        client.post("/pipeline/run", json={"n_trades": 50, "seed": 2, "mode": "dataframe"})
        history = client.get("/pipeline/history").json()
        assert len(history) == 2


# =====================================================================
# /pipeline/status & /history
# =====================================================================
class TestPipelineStatus:
    def test_status_empty_when_no_runs(self, client):
        r = client.get("/pipeline/status").json()
        assert r["last_run_id"] is None
        assert r["total_runs"] == 0

    def test_status_after_run(self, client_after_run):
        r = client_after_run.get("/pipeline/status").json()
        assert r["last_run_id"] is not None
        assert r["total_runs"] == 1
        assert r["last_quality_score"] is not None

    def test_history_after_run(self, client_after_run):
        history = client_after_run.get("/pipeline/history").json()
        assert len(history) == 1
        entry = history[0]
        assert "run_id" in entry
        assert "trades_in" in entry
        assert entry["trades_in"] == 200


# =====================================================================
# /reports/*
# =====================================================================
class TestReports:
    def test_business_404_before_run(self, client):
        r = client.get("/reports/business")
        assert r.status_code == 404

    def test_quality_404_before_run(self, client):
        r = client.get("/reports/quality")
        assert r.status_code == 404

    def test_business_report_after_run(self, client_after_run):
        r = client_after_run.get("/reports/business")
        assert r.status_code == 200
        body = r.json()
        for key in ("by_asset_class", "risk_distribution", "top_counterparties",
                    "venue_concentration", "by_day", "by_hour"):
            assert key in body

    def test_quality_report_after_run(self, client_after_run):
        r = client_after_run.get("/reports/quality")
        assert r.status_code == 200
        body = r.json()
        assert "score" in body
        assert "completeness" in body

    def test_business_download_csv(self, client_after_run):
        r = client_after_run.get("/reports/business/download?format=csv")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/csv")
        assert "attachment" in r.headers["content-disposition"]
        assert r.text.startswith("key,value")

    def test_quality_download_json(self, client_after_run):
        r = client_after_run.get("/reports/quality/download?format=json")
        assert r.status_code == 200
        body = json.loads(r.text)
        assert "score" in body


# =====================================================================
# /audit/*
# =====================================================================
class TestAudit:
    def test_audit_pipeline_after_run(self, client_after_run):
        r = client_after_run.get("/audit/pipeline")
        assert r.status_code == 200
        body = r.json()
        # paginated wrapper now: {events, total, limit, offset}
        events = body["events"]
        # 4 etapas registradas para el run
        assert len(events) >= 4
        stages = {e["stage"] for e in events}
        assert stages == {"generate", "extract", "validate", "transform"}

    def test_audit_access_logs_requests(self, client):
        # El middleware loguea DESPUÉS de procesar la request, así que la
        # llamada GET /audit/access que lee la lista todavía no aparece allí.
        client.get("/health")
        client.get("/health")
        body = client.get("/audit/access").json()
        events = body["events"]
        # Al menos las 2 llamadas previas a /health
        assert len(events) >= 2
        endpoints = {e["endpoint"] for e in events}
        assert "/health" in endpoints

    def test_audit_trades_pseudonymizes(self, client_after_run):
        r = client_after_run.get("/audit/trades")
        assert r.status_code == 200
        events = r.json()["events"]
        # Para eventos cuya field es trader_id o counterparty_id, value_received
        # debería estar hasheado (16 hex chars), no el original.
        for ev in events:
            if ev.get("field") in ("trader_id", "counterparty_id") and ev.get("value_received"):
                v = ev["value_received"]
                # 16 hex chars
                assert len(v) == 16
                assert all(c in "0123456789abcdef" for c in v)

    def test_audit_pipeline_filters_by_run_id(self, client_after_run):
        # The fixture ran 1 pipeline; capture its run_id and filter.
        all_events = client_after_run.get("/audit/pipeline").json()["events"]
        run_id = all_events[0]["pipeline_run_id"]
        r = client_after_run.get("/audit/pipeline", params={"run_id": run_id})
        events = r.json()["events"]
        assert all(e["pipeline_run_id"] == run_id for e in events)

    def test_audit_access_pagination(self, client):
        # Generate >5 entries
        for _ in range(6):
            client.get("/health")
        body = client.get("/audit/access", params={"limit": 3, "offset": 0}).json()
        assert body["limit"] == 3
        assert body["offset"] == 0
        assert len(body["events"]) == 3
        assert body["total"] >= 6
        # Next page
        body2 = client.get("/audit/access", params={"limit": 3, "offset": 3}).json()
        assert len(body2["events"]) == 3

    def test_business_report_pseudonymizes_top_counterparties(self, client_after_run):
        r = client_after_run.get("/reports/business")
        assert r.status_code == 200
        body = r.json()
        for row in body["top_counterparties"]:
            cp = row.get("counterparty_id")
            if cp is None:
                continue
            assert len(cp) == 16
            assert all(c in "0123456789abcdef" for c in cp)


# =====================================================================
# Pseudonymization helpers
# =====================================================================
class TestPseudonymizationHelpers:
    def test_pseudonymize_deterministic(self):
        h1 = _pseudonymize("CP-001", "salt")
        h2 = _pseudonymize("CP-001", "salt")
        assert h1 == h2
        assert len(h1) == 16

    def test_pseudonymize_changes_with_salt(self):
        h1 = _pseudonymize("CP-001", "saltA")
        h2 = _pseudonymize("CP-001", "saltB")
        assert h1 != h2

    def test_pseudonymize_none(self):
        assert _pseudonymize(None, "salt") is None

    def test_get_salt_uses_env_when_set(self, monkeypatch, real_cfg):
        monkeypatch.setenv("TRADES_PSEUDO_SALT", "from-env")
        assert _get_salt(real_cfg) == "from-env"

    def test_get_salt_falls_back_to_default(self, monkeypatch, real_cfg):
        monkeypatch.delenv("TRADES_PSEUDO_SALT", raising=False)
        assert _get_salt(real_cfg) == real_cfg["api"]["pseudonymization"]["default_salt"]
