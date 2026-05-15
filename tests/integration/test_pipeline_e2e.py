"""
tests/integration/test_pipeline_e2e.py
======================================
Integración end-to-end del pipeline a través de la API FastAPI.
Ejercita: generate -> extract -> validate -> transform -> reports -> audit.
"""

from __future__ import annotations

import copy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from src.api.main import create_app
from src.audit import load_config
from src.trade_generator import generate_trades

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture
def cfg(tmp_path) -> dict:
    c = copy.deepcopy(load_config(Path("config/settings.yaml")))
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    c["extractor"]["csv"]["path"] = str(tmp_path / "trades.csv")
    return c


@pytest.fixture
def client(cfg) -> TestClient:
    return TestClient(create_app(cfg))


# =====================================================================
# Full flows
# =====================================================================
class TestE2EDataframeFlow:
    def test_full_run_produces_all_artifacts(self, client):
        # Trigger
        r = client.post(
            "/pipeline/run",
            json={"n_trades": 200, "seed": 1, "mode": "dataframe",
                  "null_rate": 0.02, "outlier_rate": 0.01},
        )
        assert r.status_code == 200
        run = r.json()
        run_id = run["run_id"]

        # Status refleja el run
        status = client.get("/pipeline/status").json()
        assert status["last_run_id"] == run_id
        assert status["total_runs"] == 1

        # Business + Quality reports están accesibles
        business = client.get("/reports/business").json()
        quality = client.get("/reports/quality").json()
        assert business["summary"]["total_trades"] >= 0
        assert 0.0 <= quality["score"] <= 100.0

        # Audit pipeline tiene las 4 etapas del run (paginated wrapper now)
        audit_pipeline = client.get("/audit/pipeline").json()["events"]
        stages_for_run = {
            e["stage"] for e in audit_pipeline if e["pipeline_run_id"] == run_id
        }
        assert stages_for_run == {"generate", "extract", "validate", "transform"}

        # Pseudonimización en /audit/trades
        audit_trades = client.get("/audit/trades").json()["events"]
        for ev in audit_trades:
            if ev.get("field") in ("trader_id", "counterparty_id") and ev.get("value_received"):
                v = ev["value_received"]
                assert len(v) == 16
                assert all(c in "0123456789abcdef" for c in v)

    def test_multiple_runs_accumulate_in_history(self, client):
        client.post("/pipeline/run", json={"n_trades": 50, "seed": 1, "mode": "dataframe"})
        client.post("/pipeline/run", json={"n_trades": 50, "seed": 2, "mode": "dataframe"})
        client.post("/pipeline/run", json={"n_trades": 50, "seed": 3, "mode": "dataframe"})
        history = client.get("/pipeline/history").json()
        assert len(history) == 3
        # IDs únicos
        ids = [h["run_id"] for h in history]
        assert len(set(ids)) == 3


class TestE2ECsvFlow:
    def test_csv_input_to_reports(self, client, cfg):
        # Pre-generar CSV
        df = generate_trades(120, seed=4, null_rate=0.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        csv_path = Path(cfg["extractor"]["csv"]["path"])
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        df.write_csv(csv_path)

        r = client.post("/pipeline/run", json={"n_trades": 0, "mode": "csv"})
        assert r.status_code == 200
        assert r.json()["validation_summary"]["total_in"] == 120

        # Reports accesibles
        biz = client.get("/reports/business").json()
        assert biz["summary"]["total_trades"] >= 0
