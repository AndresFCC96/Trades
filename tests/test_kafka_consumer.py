"""
tests/test_kafka_consumer.py
============================
Cubre src/kafka_consumer.py con un FakeConsumer inyectado (sin red real)
y los endpoints /kafka/* de la API.

El FakeConsumer drena una cola de mensajes pre-cargada y luego devuelve
batches vacíos, simulando un topic ocioso.
"""

from __future__ import annotations

import asyncio
import copy
import json
from pathlib import Path

import polars as pl
import pytest
from fastapi.testclient import TestClient

from src.api.main import create_app
from src.audit import load_config
from src.kafka_consumer import (
    ConsumerState,
    KafkaTradeConsumer,
)


# ---------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------
class _FakeMsg:
    def __init__(self, value: bytes) -> None:
        self.value = value


class FakeAIOKafkaConsumer:
    """Stub mínimo con la interfaz que usa KafkaTradeConsumer."""

    def __init__(self, messages: list[dict] | None = None) -> None:
        self._queue: list[_FakeMsg] = [
            _FakeMsg(json.dumps(m).encode("utf-8")) for m in (messages or [])
        ]
        self.started = False
        self.stopped = False

    async def start(self) -> None:
        self.started = True

    async def stop(self) -> None:
        self.stopped = True

    async def getmany(self, timeout_ms: int, max_records: int):  # noqa: ARG002
        if not self._queue:
            await asyncio.sleep(timeout_ms / 1000.0)
            return {}
        batch = self._queue[:max_records]
        self._queue = self._queue[max_records:]
        return {"tp0": batch}

    def assignment(self):
        return set()


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    c["kafka"]["buffer"]["max_size"] = 2
    c["kafka"]["buffer"]["max_latency_ms"] = 50
    c["kafka"]["stats"]["throughput_window_seconds"] = 1
    c["kafka"]["stats"]["websocket_interval_ms"] = 50
    return c


@pytest.fixture
def trade_msgs() -> list[dict]:
    return [
        {"trade_id": f"T{i}", "instrument": "AAPL", "price": 180.0}
        for i in range(4)
    ]


# =====================================================================
# Unit tests
# =====================================================================
class TestLifecycle:
    @pytest.mark.asyncio
    async def test_initial_state_is_stopped(self, cfg):
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {})
        assert c.get_status()["state"] == ConsumerState.STOPPED.value
        assert c.get_status()["messages_consumed_total"] == 0

    @pytest.mark.asyncio
    async def test_start_and_flush_by_size(self, cfg, trade_msgs):
        received: list[pl.DataFrame] = []

        def on_batch(df):
            received.append(df)
            return {"run_id": f"r{len(received)}"}

        fake = FakeAIOKafkaConsumer(messages=trade_msgs)
        c = KafkaTradeConsumer(cfg, on_batch=on_batch, consumer_factory=lambda: fake)
        await c.start()
        # 4 mensajes, max_size=2 → esperamos 2 batches
        await asyncio.sleep(0.4)
        await c.stop()

        assert len(received) >= 2
        assert received[0].height == 2
        assert c.get_status()["batches_processed"] >= 2
        assert c.get_status()["state"] == ConsumerState.STOPPED.value

    @pytest.mark.asyncio
    async def test_flush_by_latency(self, cfg):
        received: list[pl.DataFrame] = []

        def on_batch(df):
            received.append(df)
            return {}

        # 1 mensaje y max_size=2 → no flushea por tamaño, debe flushear por latencia
        fake = FakeAIOKafkaConsumer(messages=[{"trade_id": "T1"}])
        c = KafkaTradeConsumer(cfg, on_batch=on_batch, consumer_factory=lambda: fake)
        await c.start()
        await asyncio.sleep(0.3)
        await c.stop()

        assert len(received) >= 1
        assert received[0].height == 1

    @pytest.mark.asyncio
    async def test_pause_resume_change_state(self, cfg):
        fake = FakeAIOKafkaConsumer(messages=[])
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {}, consumer_factory=lambda: fake)
        await c.start()
        assert c.get_status()["state"] == ConsumerState.RUNNING.value
        await c.pause()
        assert c.get_status()["state"] == ConsumerState.PAUSED.value
        await c.resume()
        assert c.get_status()["state"] == ConsumerState.RUNNING.value
        await c.stop()

    @pytest.mark.asyncio
    async def test_invalid_payload_increments_errors(self, cfg):
        class _BadMsg:
            value = b"not json at all"

        class _BadFake(FakeAIOKafkaConsumer):
            async def getmany(self, timeout_ms, max_records):  # noqa: ARG002
                if self._queue:
                    out = {"tp0": self._queue}
                    self._queue = []
                    return out
                await asyncio.sleep(timeout_ms / 1000.0)
                return {}

        fake = _BadFake()
        fake._queue = [_BadMsg()]  # type: ignore[list-item]
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {}, consumer_factory=lambda: fake)
        await c.start()
        await asyncio.sleep(0.2)
        await c.stop()
        assert c.get_status()["errors_total"] >= 1


# =====================================================================
# API endpoints
# =====================================================================
class TestKafkaAPI:
    def test_status_when_not_configured(self, cfg):
        client = TestClient(create_app(cfg))
        r = client.get("/kafka/status")
        assert r.status_code == 200
        body = r.json()
        assert body["state"] == "stopped"
        assert body["topic"] == cfg["kafka"]["topic"]

    def test_start_without_connect_returns_409(self, cfg):
        client = TestClient(create_app(cfg))
        r = client.post("/kafka/start")
        assert r.status_code == 409

    def test_connect_applies_overrides(self, cfg):
        client = TestClient(create_app(cfg))
        r = client.post(
            "/kafka/connect",
            json={"topic": "trades.test", "buffer_max_size": 99},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["topic"] == "trades.test"
        # status sigue siendo stopped tras connect (no se prendió)
        assert body["state"] == "stopped"
