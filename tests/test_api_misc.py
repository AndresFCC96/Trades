"""
tests/test_api_misc.py
======================
Cubre handlers de la API que las suites previas no tocan: kafka_status
sin consumer configurado, source endpoints de error, kafka start/pause/
resume/stop con un consumer fake, etc.
"""

from __future__ import annotations

import asyncio
import copy
from pathlib import Path
from unittest.mock import MagicMock

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
    c["sources"]["upload_dir"] = str(tmp_path / "sources")
    return c


@pytest.fixture
def client(cfg) -> TestClient:
    return TestClient(create_app(cfg))


# =====================================================================
# Kafka status / lifecycle without a real consumer
# =====================================================================
class TestKafkaLifecycleNoConsumer:
    def test_status_returns_stopped_when_unconfigured(self, client):
        body = client.get("/kafka/status").json()
        assert body["state"] == "stopped"
        assert body["messages_consumed_total"] == 0

    def test_pause_resume_stop_409_without_connect(self, client):
        assert client.post("/kafka/pause").status_code == 409
        assert client.post("/kafka/resume").status_code == 409
        assert client.post("/kafka/stop").status_code == 409

    def test_connect_then_pause_is_idempotent_when_not_running(self, client):
        client.post("/kafka/connect", json={"topic": "x"})
        # consumer present but stopped → pause is a no-op
        r = client.post("/kafka/pause")
        assert r.status_code == 200
        # still stopped
        assert r.json()["state"] == "stopped"


# =====================================================================
# Source endpoints — 404s + error paths
# =====================================================================
class TestSourceErrors:
    def test_get_unknown_source_returns_404(self, client):
        assert client.get("/sources/nope").status_code == 404

    def test_preview_unknown_source_returns_404(self, client):
        assert client.get("/sources/nope/preview").status_code == 404

    def test_mapping_on_unknown_source_returns_400(self, client):
        r = client.post(
            "/sources/nope/mapping",
            json={"mapping": {"x": "trade_id"}},
        )
        # Source loader raises SourceError → 400
        assert r.status_code == 400

    def test_delete_unknown_source_returns_404(self, client):
        assert client.delete("/sources/nope").status_code == 404

    def test_run_unknown_source_returns_400(self, client):
        assert client.post("/sources/nope/run").status_code == 400

    def test_upload_without_filename_returns_400(self, client):
        # FastAPI requires a multipart file; submit with empty filename
        r = client.post(
            "/sources/upload",
            files={"file": ("", b"hello", "text/csv")},
        )
        # python-multipart treats empty filename as missing → 400 or 422
        assert r.status_code in (400, 422)


# =====================================================================
# Reports without a run yet
# =====================================================================
class TestReportsNoRun:
    def test_business_returns_404_when_no_run(self, client):
        r = client.get("/reports/business")
        assert r.status_code == 404

    def test_quality_returns_404_when_no_run(self, client):
        r = client.get("/reports/quality")
        assert r.status_code == 404

    def test_business_download_returns_404_when_no_run(self, client):
        r = client.get("/reports/business/download", params={"format": "json"})
        assert r.status_code == 404


# =====================================================================
# Run cache: results_by_run_id evicts at MAX_RESULTS
# =====================================================================
class TestRunCacheEviction:
    def test_old_runs_evicted_after_max_results(self, cfg, monkeypatch):
        # Lower the cap to keep the test fast.
        from src.api import main as main_mod

        monkeypatch.setattr(main_mod, "MAX_RESULTS", 3)
        client = TestClient(main_mod.create_app(cfg))

        run_ids: list[str] = []
        for i in range(5):
            r = client.post(
                "/pipeline/run",
                json={"n_trades": 10, "seed": i, "mode": "dataframe"},
            )
            assert r.status_code == 200
            run_ids.append(r.json()["run_id"])

        # First two should be evicted, last three reachable by run_id
        for rid in run_ids[:2]:
            r = client.get("/reports/business", params={"run_id": rid})
            assert r.status_code == 404
        for rid in run_ids[2:]:
            r = client.get("/reports/business", params={"run_id": rid})
            assert r.status_code == 200


# =====================================================================
# Kafka start/stop with an injected fake consumer
# =====================================================================
class _FakeAsyncConsumer:
    def __init__(self):
        self.started = False
        self.stopped = False
        self._messages: list = []

    async def start(self):
        self.started = True

    async def stop(self):
        self.stopped = True

    async def getmany(self, timeout_ms: int, max_records: int):
        await asyncio.sleep(timeout_ms / 1000.0)
        return {}

    def assignment(self):
        return set()


class TestKafkaStartStopWithFake:
    """Direct lifecycle tests against the consumer (not through the
    TestClient, which interacts badly with the long-running asyncio
    task spawned by `start()`)."""

    @pytest.mark.asyncio
    async def test_start_pause_resume_stop_cycle(self, cfg):
        from src.kafka_consumer import KafkaTradeConsumer

        c = KafkaTradeConsumer(
            cfg, on_batch=lambda df: {},
            consumer_factory=lambda: _FakeAsyncConsumer(),
        )
        await c.start()
        assert c.get_status()["state"] == "running"
        await c.pause()
        assert c.get_status()["state"] == "paused"
        await c.resume()
        assert c.get_status()["state"] == "running"
        await c.stop()
        assert c.get_status()["state"] == "stopped"

    @pytest.mark.asyncio
    async def test_start_twice_raises(self, cfg):
        from src.kafka_consumer import KafkaTradeConsumer

        c = KafkaTradeConsumer(
            cfg, on_batch=lambda df: {},
            consumer_factory=lambda: _FakeAsyncConsumer(),
        )
        await c.start()
        with pytest.raises(RuntimeError, match="already running"):
            await c.start()
        await c.stop()


# =====================================================================
# Live trade broadcaster: enriches the payload and appends to the ring
# =====================================================================
class TestLiveTradeBroadcast:
    def test_broadcast_writes_to_ring_buffer(self, cfg):
        from src.api.main import _broadcast_trade, create_app

        app = create_app(cfg)
        _broadcast_trade(app, {"trade_id": "t1", "price": 1.0})
        assert len(app.state.live_trades) == 1
        last = app.state.live_trades[-1]
        assert last["trade_id"] == "t1"
        assert "_arrived_at" in last

    def test_broadcast_handles_dead_subscriber_silently(self, cfg):
        from src.api.main import _broadcast_trade, create_app

        app = create_app(cfg)
        # Inject a "subscriber" that throws on send — broadcast must not raise.
        bad_ws = MagicMock()

        async def _raise(*a, **kw):
            raise RuntimeError("socket closed")

        bad_ws.send_json = _raise
        app.state.live_trade_subscribers.add(bad_ws)
        # No active event loop in this thread, so the loop.create_task path
        # is skipped — broadcast simply appends to the ring and returns.
        _broadcast_trade(app, {"trade_id": "t2"})
        assert app.state.live_trades[-1]["trade_id"] == "t2"
