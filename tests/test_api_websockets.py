"""
tests/test_api_websockets.py
============================
Exercise the three WebSocket endpoints in src/api/main.py:
  - /ws/kafka/stats
  - /ws/kafka/trades
  - /ws/jenkins/jobs/{name}/builds/{n}/log

Each test uses FastAPI's TestClient.websocket_connect which round-trips
the actual handler in a real ASGI loop.
"""

from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from src.api.main import _broadcast_trade, create_app
from src.audit import load_config


@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    # Speed up the stats push so the test doesn't wait a full second
    c["kafka"]["stats"]["websocket_interval_ms"] = 50
    return c


# =====================================================================
# /ws/kafka/stats — pushes the current consumer status every Nms
# =====================================================================
class TestKafkaStatsWS:
    def test_receives_a_frame_with_default_state(self, cfg):
        app = create_app(cfg)
        client = TestClient(app)
        with client.websocket_connect("/ws/kafka/stats") as ws:
            frame = ws.receive_json()
        # No consumer configured → state is "stopped"
        assert frame["state"] == "stopped"


# =====================================================================
# /ws/kafka/trades — replays the in-memory ring buffer on connect
# =====================================================================
class TestKafkaTradesWS:
    def test_replays_existing_ring_buffer(self, cfg):
        app = create_app(cfg)
        # Pre-populate the ring buffer
        _broadcast_trade(app, {"trade_id": "t1", "instrument": "AAPL"})
        _broadcast_trade(app, {"trade_id": "t2", "instrument": "MSFT"})

        client = TestClient(app)
        with client.websocket_connect("/ws/kafka/trades") as ws:
            first = ws.receive_json()
            second = ws.receive_json()
        assert first["trade_id"] == "t1"
        assert second["trade_id"] == "t2"
        # Both frames carry the server-side arrival timestamp
        assert "_arrived_at" in first
        assert "_arrived_at" in second


# =====================================================================
# /ws/jenkins/jobs/{name}/builds/{n}/log
#
#   - Disabled jenkins → frame {error: ...} then close
#   - Enabled with a fake client → progressive frames + {done: true}
# =====================================================================
class _FakeJenkins:
    """Returns one page of console with more=False so the WS loop exits."""

    def __init__(self) -> None:
        self.calls = 0

    def get_console(self, name: str, number: int, start: int = 0) -> dict[str, Any]:
        self.calls += 1
        return {"text": "hello world\n", "next_start": 12, "more": False}


class TestJenkinsLogWS:
    def test_when_disabled_returns_error_and_closes(self, real_cfg):
        c = copy.deepcopy(real_cfg)
        c["jenkins"]["enabled"] = False
        app = create_app(c)
        client = TestClient(app)
        with client.websocket_connect(
            "/ws/jenkins/jobs/x/builds/1/log"
        ) as ws:
            frame = ws.receive_json()
        assert "error" in frame
        assert "disabled" in frame["error"].lower()

    def test_enabled_streams_console_and_signals_done(self, cfg):
        c = copy.deepcopy(cfg)
        c["jenkins"]["enabled"] = True
        c["jenkins"]["url"] = "http://jenkins.test"
        app = create_app(c)
        fake = _FakeJenkins()
        app.state.jenkins_factory = lambda: fake
        client = TestClient(app)
        with client.websocket_connect(
            "/ws/jenkins/jobs/trade-deploy/builds/142/log"
        ) as ws:
            first = ws.receive_json()
            second = ws.receive_json()
        # First frame is the console chunk
        assert first["text"] == "hello world\n"
        assert first["more"] is False
        # Second frame is the "done" sentinel
        assert second == {"done": True}
        # And the client was queried exactly once
        assert fake.calls == 1
