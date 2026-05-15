"""
tests/test_kafka_consumer_extras.py
===================================
Cubre branches del consumer Kafka que test_kafka_consumer.py todav├ìa no
toca: SASL factory, halt-on-error, make_pipeline_callback y guards de
pause/resume/stop sin consumer arrancado.
"""

from __future__ import annotations

import copy
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from src.audit import load_config
from src.kafka_consumer import (
    AIOKAFKA_AVAILABLE,
    ConsumerState,
    KafkaTradeConsumer,
    make_pipeline_callback,
)


@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["kafka"]["buffer"]["max_size"] = 2
    c["kafka"]["buffer"]["max_latency_ms"] = 50
    return c


# =====================================================================
# Guards on pause/resume/stop when the consumer was never started
# =====================================================================
class TestLifecycleGuards:
    @pytest.mark.asyncio
    async def test_pause_is_noop_when_not_running(self, cfg):
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {})
        await c.pause()
        assert c.get_status()["state"] == ConsumerState.STOPPED.value

    @pytest.mark.asyncio
    async def test_resume_is_noop_when_not_paused(self, cfg):
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {})
        await c.resume()
        assert c.get_status()["state"] == ConsumerState.STOPPED.value

    @pytest.mark.asyncio
    async def test_stop_is_safe_when_never_started(self, cfg):
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {})
        await c.stop()
        assert c.get_status()["state"] == ConsumerState.STOPPED.value


# =====================================================================
# halt-on-error: a bad payload raises out of _ingest_message
# =====================================================================
class TestHaltOnError:
    def test_halt_raises_on_bad_payload(self, cfg):
        cfg["kafka"]["buffer"]["on_error"] = "halt"
        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {})

        class _Msg:
            value = b"this is not json"

        with pytest.raises(Exception):  # noqa: PT011 — generic by design
            c._ingest_message(_Msg())
        assert c.get_status()["errors_total"] == 1


# =====================================================================
# _build_consumer SASL branch (real AIOKafkaConsumer mocked out)
# =====================================================================
@pytest.mark.skipif(
    not AIOKAFKA_AVAILABLE,
    reason="aiokafka not installed; SASL factory path can't be exercised",
)
class TestBuildConsumer:
    def test_sasl_credentials_pulled_from_env(self, cfg, monkeypatch):
        cfg["kafka"]["security_protocol"] = "SASL_SSL"
        cfg["kafka"]["sasl_mechanism"] = "PLAIN"
        cfg["kafka"]["sasl_username_env"] = "X_SASL_USER"
        cfg["kafka"]["sasl_password_env"] = "X_SASL_PASS"
        monkeypatch.setenv("X_SASL_USER", "alice")
        monkeypatch.setenv("X_SASL_PASS", "s3cret")

        c = KafkaTradeConsumer(cfg, on_batch=lambda df: {})
        with patch("src.kafka_consumer.AIOKafkaConsumer") as mock_ctor:
            mock_ctor.return_value = MagicMock()
            c._build_consumer()
        kwargs = mock_ctor.call_args.kwargs
        assert kwargs["security_protocol"] == "SASL_SSL"
        assert kwargs["sasl_mechanism"] == "PLAIN"
        assert kwargs["sasl_plain_username"] == "alice"
        assert kwargs["sasl_plain_password"] == "s3cret"


# =====================================================================
# make_pipeline_callback drives run_pipeline + on_run
# =====================================================================
class TestMakePipelineCallback:
    def test_callback_runs_pipeline_and_invokes_on_run(self, cfg):
        import polars as pl

        captured: list[dict] = []
        cb = make_pipeline_callback(
            cfg,
            on_run=lambda r: captured.append(r),
            disabled_rules=lambda: {"RV-05"},
        )
        # Build a tiny in-memory DF with all the required columns so the
        # validator doesn't reject everything outright.
        df = pl.DataFrame({
            "trade_id": ["t1", "t2"],
            "timestamp": ["2026-01-01T00:00:00", "2026-01-01T01:00:00"],
            "instrument": ["AAPL", "MSFT"],
            "asset_class": ["equity", "equity"],
            "side": ["BUY", "SELL"],
            "quantity": [10.0, 5.0],
            "price": [180.0, 380.0],
            "notional": [1800.0, 1900.0],
            "currency": ["USD", "USD"],
            "counterparty_id": ["CP-1", "CP-2"],
            "trader_id": ["TR-1", "TR-2"],
            "venue": ["NYSE", "NASDAQ"],
            "status": ["executed", "executed"],
        }).with_columns(pl.col("timestamp").str.to_datetime(strict=False))

        meta = cb(df)
        assert "run_id" in meta
        assert "quality_score" in meta
        assert len(captured) == 1
        assert captured[0]["run_id"] == meta["run_id"]
        # disabled_rules propagated into the validation summary
        skipped = captured[0]["validation_summary"].get("skipped_rules", [])
        assert "RV-05" in skipped
