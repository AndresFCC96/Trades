"""
tests/test_api_http_clusters.py
===============================
Cubre /sources/http/test, /kafka/clusters CRUD y el hook on_ingest del
consumer Kafka (que alimenta el WS /ws/kafka/trades).
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from unittest.mock import patch

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
# POST /sources/http/test
# =====================================================================
class _FakeResponse:
    def __init__(self, body: bytes, code: int = 200):
        self._body = body
        self._code = code

    def read(self, n: int = -1) -> bytes:
        return self._body if n < 0 else self._body[:n]

    def getcode(self) -> int:
        return self._code

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class TestHttpTest:
    def test_returns_ok_with_array_sample(self, client):
        body = json.dumps([{"trade_id": "t1"}, {"trade_id": "t2"}]).encode("utf-8")
        with patch("src.api.main.urlopen", return_value=_FakeResponse(body, 200)):
            r = client.post(
                "/sources/http/test",
                json={"url": "https://example.test/v1/trades"},
            )
        assert r.status_code == 200
        body_json = r.json()
        assert body_json["ok"] is True
        assert body_json["status_code"] == 200
        assert body_json["latency_ms"] is not None
        assert body_json["sample"]["type"] == "array"
        assert body_json["sample"]["count"] == 2

    def test_object_with_trades_key_summarises(self, client):
        body = json.dumps({"trades": [{"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]}).encode()
        with patch("src.api.main.urlopen", return_value=_FakeResponse(body, 200)):
            r = client.post("/sources/http/test", json={"url": "http://x"})
        assert r.json()["sample"]["count"] == 4
        # Sample is trimmed to first 3
        assert len(r.json()["sample"]["first"]) == 3

    def test_bearer_header_sent(self, client):
        body = b"{}"
        captured: dict[str, dict[str, str]] = {}

        def _fake_urlopen(req, timeout):  # noqa: ARG001
            captured["headers"] = dict(req.headers)
            return _FakeResponse(body, 200)

        with patch("src.api.main.urlopen", side_effect=_fake_urlopen):
            client.post(
                "/sources/http/test",
                json={"url": "http://x", "auth_type": "bearer", "token": "abc"},
            )
        # urllib lower-cases header keys via Request.headers dict
        assert any("Bearer abc" in v for v in captured["headers"].values())

    def test_error_returns_ok_false(self, client):
        with patch("src.api.main.urlopen", side_effect=OSError("connection refused")):
            r = client.post("/sources/http/test", json={"url": "http://nope"})
        body = r.json()
        assert body["ok"] is False
        assert body["error"]
        assert "connection refused" in body["error"]

    def test_non_json_body_returned_as_text_preview(self, client):
        with patch("src.api.main.urlopen", return_value=_FakeResponse(b"not json at all", 200)):
            r = client.post("/sources/http/test", json={"url": "http://x"})
        assert r.json()["sample"]["type"] == "text"
        assert "not json" in r.json()["sample"]["preview"]


# =====================================================================
# /kafka/clusters CRUD
# =====================================================================
class TestKafkaClusters:
    def test_empty_then_create_then_list(self, client):
        assert client.get("/kafka/clusters").json() == {"clusters": []}
        r = client.post(
            "/kafka/clusters",
            json={
                "name": "prod-us-east",
                "bootstrap_servers": "kafka.prod:9092",
                "topic": "trades.raw",
                "group_id": "pipeline-prod",
                "security_protocol": "SASL_SSL",
            },
        )
        assert r.status_code == 201
        cid = r.json()["id"]
        listing = client.get("/kafka/clusters").json()["clusters"]
        assert len(listing) == 1
        assert listing[0]["id"] == cid
        assert listing[0]["security_protocol"] == "SASL_SSL"

    def test_delete_returns_204(self, client):
        cid = client.post(
            "/kafka/clusters",
            json={
                "name": "x",
                "bootstrap_servers": "a:1",
                "topic": "t",
                "group_id": "g",
            },
        ).json()["id"]
        r = client.delete(f"/kafka/clusters/{cid}")
        assert r.status_code == 204
        assert client.get("/kafka/clusters").json() == {"clusters": []}

    def test_delete_unknown_returns_404(self, client):
        assert client.delete("/kafka/clusters/nope").status_code == 404

    def test_use_records_last_used_and_configures_consumer(self, client):
        cid = client.post(
            "/kafka/clusters",
            json={
                "name": "x",
                "bootstrap_servers": "a:1",
                "topic": "t",
                "group_id": "g",
            },
        ).json()["id"]
        r = client.post(f"/kafka/clusters/{cid}/use")
        assert r.status_code == 200
        body = r.json()
        # connect-without-start: state is STOPPED but topic was applied
        assert body["topic"] == "t"
        # Cluster record now carries last_used_at
        listing = client.get("/kafka/clusters").json()["clusters"]
        assert listing[0]["last_used_at"] is not None

    def test_use_unknown_returns_404(self, client):
        assert (
            client.post("/kafka/clusters/nope/use").status_code == 404
        )


# =====================================================================
# Kafka consumer on_ingest hook
# =====================================================================
def test_on_ingest_fires_for_each_message():
    import asyncio

    from src.kafka_consumer import KafkaTradeConsumer

    # Minimal config (only the bits __init__ touches)
    cfg = {
        "kafka": {
            "bootstrap_servers": "x:1",
            "topic": "t",
            "group_id": "g",
            "client_id": "c",
            "auto_offset_reset": "latest",
            "security_protocol": "PLAINTEXT",
            "buffer": {"max_size": 100, "max_latency_ms": 5000, "on_error": "skip"},
            "stats": {"websocket_interval_ms": 1000, "throughput_window_seconds": 1},
        }
    }

    received: list[dict] = []
    consumer = KafkaTradeConsumer(
        cfg, on_batch=lambda df: {},
        on_ingest=lambda p: received.append(p),
    )

    class _Msg:
        def __init__(self, v):
            self.value = v

    asyncio.run(asyncio.sleep(0))  # ensure event loop primed
    consumer._ingest_message(_Msg(b'{"trade_id":"t1","price":1.0}'))
    consumer._ingest_message(_Msg(b'{"trade_id":"t2","price":2.0}'))
    assert received == [
        {"trade_id": "t1", "price": 1.0},
        {"trade_id": "t2", "price": 2.0},
    ]
