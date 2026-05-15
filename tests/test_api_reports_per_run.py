"""
tests/test_api_reports_per_run.py
=================================
Cubre el filtro ?run_id= en /reports/business y /reports/quality.
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


def _run(client: TestClient, *, seed: int) -> str:
    r = client.post(
        "/pipeline/run",
        json={"n_trades": 50, "seed": seed, "mode": "dataframe"},
    )
    assert r.status_code == 200, r.text
    return r.json()["run_id"]


class TestReportsByRunId:
    def test_business_without_run_id_returns_last_run(self, client):
        rid = _run(client, seed=1)
        r = client.get("/reports/business")
        assert r.status_code == 200
        # Implicit "last_run" path. Summary present.
        assert "summary" in r.json()
        # And the same run_id is reachable explicitly.
        r2 = client.get("/reports/business", params={"run_id": rid})
        assert r2.status_code == 200
        assert r2.json() == r.json()

    def test_business_returns_specific_older_run(self, client):
        rid_first = _run(client, seed=1)
        _run(client, seed=2)  # this becomes "last_run"
        r = client.get("/reports/business", params={"run_id": rid_first})
        assert r.status_code == 200
        # By design the older run's report is reachable independently of
        # the topbar's "last_run".
        assert "summary" in r.json()

    def test_quality_returns_specific_run(self, client):
        rid = _run(client, seed=1)
        r = client.get("/reports/quality", params={"run_id": rid})
        assert r.status_code == 200
        assert "score" in r.json()

    def test_unknown_run_id_returns_404(self, client):
        _run(client, seed=1)
        r = client.get("/reports/business", params={"run_id": "nope"})
        assert r.status_code == 404

    def test_download_honours_run_id(self, client):
        rid = _run(client, seed=1)
        r = client.get(
            "/reports/business/download",
            params={"run_id": rid, "format": "json"},
        )
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/json")
