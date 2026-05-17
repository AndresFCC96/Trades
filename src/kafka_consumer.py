"""
src/kafka_consumer.py
=====================
Consumer aiokafka con buffer batched que dispara `run_pipeline` por lote.

Modelo: cada mensaje recibido se acumula en un buffer en memoria. El flush
se dispara cuando:
    - el buffer alcanza `buffer.max_size` trades, o
    - pasan `buffer.max_latency_ms` ms desde el último flush con datos.

Cada flush arma un Polars DataFrame con los trades buffer-eados y se lo
entrega a `on_batch(df)` (en producción: `run_pipeline(mode="stream",
prebuilt_df=df)`). El callback se ejecuta en un thread para no bloquear
el event loop del consumer.

Stats expuestas vía `get_status()` y consumibles desde el WebSocket
`/ws/kafka/stats` (ver src/api/main.py).

aiokafka es un import opcional: si no está instalado, el módulo se importa
igual y la clase falla sólo al llamar a `start()`. Eso permite que la app
arranque sin Kafka instalado y que el operador lo prenda cuando quiera.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import deque
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

import polars as pl

logger = logging.getLogger(__name__)

try:
    from aiokafka import AIOKafkaConsumer
    from aiokafka.errors import KafkaError
    AIOKAFKA_AVAILABLE = True
except ImportError:  # pragma: no cover - se cubre en CI con la dep instalada
    AIOKafkaConsumer = None  # type: ignore[assignment,misc]
    KafkaError = Exception  # type: ignore[assignment,misc]
    AIOKAFKA_AVAILABLE = False


# Callback que el consumer invoca cuando flushea un batch.
# Devuelve metadata libre (p.ej. run_id, quality_score) que el consumer
# guarda como `last_batch_meta`.
BatchCallback = Callable[[pl.DataFrame], dict[str, Any]]


class ConsumerState(str, Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    ERROR = "error"


@dataclass
class ConsumerStats:
    state: str = ConsumerState.STOPPED.value
    started_at: str | None = None
    messages_consumed_total: int = 0
    errors_total: int = 0
    batches_processed: int = 0
    buffer_size: int = 0
    throughput_msgs_per_sec: float = 0.0
    lag: int | None = None
    last_batch_at: str | None = None
    last_batch_size: int = 0
    last_batch_meta: dict[str, Any] = field(default_factory=dict)
    last_error: str | None = None
    bootstrap_servers: str = ""
    topic: str = ""
    # Count of malformed messages routed to the DLQ JSONL file when
    # buffer.on_error == "dlq".
    dlq_total: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class KafkaTradeConsumer:
    """Consumer Kafka con buffer y flush por size/latency.

    `consumer_factory` permite inyectar un fake en tests sin tocar la red.
    Debe devolver un objeto con la misma interfaz async de AIOKafkaConsumer
    (`start`, `stop`, `getmany`, `assignment`, `position`, `end_offsets`).
    """

    def __init__(
        self,
        config: dict[str, Any],
        on_batch: BatchCallback,
        *,
        consumer_factory: Callable[..., Any] | None = None,
        on_ingest: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self.cfg = config["kafka"]
        self.buffer_cfg = self.cfg["buffer"]
        self.stats_cfg = self.cfg["stats"]
        self.on_batch = on_batch
        self.on_ingest = on_ingest
        self._consumer_factory = consumer_factory

        # DLQ path is colocated with the audit JSONLs so operators have
        # a single output_dir to mount/persist. The actual `dlq.jsonl`
        # filename is fixed; `kafka.buffer.dlq_topic` from settings.yaml
        # is still surfaced in the API status payload (UI label) but
        # isn't published to Kafka — that's a future enhancement.
        audit_dir = config.get("audit", {}).get("output_dir", "outputs/audit")
        self._dlq_path = Path(audit_dir) / "dlq.jsonl"

        self._buffer: list[dict[str, Any]] = []
        self._last_flush_at: float = time.monotonic()
        self._task: asyncio.Task | None = None
        self._consumer: Any = None
        self._paused = asyncio.Event()
        self._paused.set()  # set = NO paused; clear = paused
        self._stopping = False

        # ventana deslizante de timestamps de mensajes para throughput
        self._throughput_window: deque[float] = deque()
        self._window_seconds = float(self.stats_cfg["throughput_window_seconds"])

        self.stats = ConsumerStats(
            bootstrap_servers=str(self.cfg["bootstrap_servers"]),
            topic=str(self.cfg["topic"]),
        )

    # =================================================================
    # Lifecycle
    # =================================================================
    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            raise RuntimeError("Consumer already running")
        if not AIOKAFKA_AVAILABLE and self._consumer_factory is None:
            raise RuntimeError(
                "aiokafka is not installed; install it or inject a consumer_factory for tests"
            )

        self.stats.state = ConsumerState.STARTING.value
        self.stats.last_error = None
        self._stopping = False
        self._buffer.clear()
        self._throughput_window.clear()

        self._consumer = self._build_consumer()
        await self._consumer.start()
        self.stats.started_at = datetime.now(timezone.utc).isoformat()
        self.stats.state = ConsumerState.RUNNING.value
        self._paused.set()
        self._task = asyncio.create_task(self._run(), name="kafka-consumer")
        logger.info(
            "kafka.consumer.start bootstrap=%s topic=%s",
            self.cfg["bootstrap_servers"], self.cfg["topic"],
        )

    async def pause(self) -> None:
        if self.stats.state != ConsumerState.RUNNING.value:
            return
        self._paused.clear()
        self.stats.state = ConsumerState.PAUSED.value
        logger.info("kafka.consumer.pause")

    async def resume(self) -> None:
        if self.stats.state != ConsumerState.PAUSED.value:
            return
        self._paused.set()
        self.stats.state = ConsumerState.RUNNING.value
        logger.info("kafka.consumer.resume")

    async def stop(self) -> None:
        self._stopping = True
        self.stats.state = ConsumerState.STOPPING.value
        self._paused.set()  # liberar el loop si estaba paused
        if self._consumer is not None:
            try:
                await self._consumer.stop()
            except Exception:  # noqa: BLE001
                logger.exception("kafka.consumer.stop failed to close consumer")
        if self._task is not None:
            try:
                await asyncio.wait_for(self._task, timeout=5.0)
            except asyncio.TimeoutError:
                self._task.cancel()
        # flush final si quedó algo en buffer
        if self._buffer:
            await self._flush(reason="stop")
        self._task = None
        self._consumer = None
        self.stats.state = ConsumerState.STOPPED.value
        logger.info("kafka.consumer.stop done")

    # =================================================================
    # Loop
    # =================================================================
    async def _run(self) -> None:
        max_size: int = int(self.buffer_cfg["max_size"])
        max_latency_s: float = float(self.buffer_cfg["max_latency_ms"]) / 1000.0
        try:
            while not self._stopping:
                await self._paused.wait()
                # getmany permite consumir en bursts y respetar latencia
                msgs = await self._consumer.getmany(
                    timeout_ms=int(max_latency_s * 1000),
                    max_records=max_size,
                )
                now = time.monotonic()
                for _tp, batch in msgs.items():
                    for msg in batch:
                        self._ingest_message(msg)
                # flush por tamaño o por latencia
                if len(self._buffer) >= max_size:
                    await self._flush(reason="size")
                elif self._buffer and (now - self._last_flush_at) >= max_latency_s:
                    await self._flush(reason="latency")
                self._refresh_throughput(now)
                self._refresh_lag()
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            self.stats.state = ConsumerState.ERROR.value
            self.stats.last_error = str(e)
            self.stats.errors_total += 1
            logger.exception("kafka.consumer loop crashed")

    # =================================================================
    # Ingesta + flush
    # =================================================================
    def _ingest_message(self, msg: Any) -> None:
        on_error = self.buffer_cfg.get("on_error", "skip")
        raw_value = getattr(msg, "value", None)
        try:
            payload = raw_value
            if isinstance(payload, bytes):
                payload = payload.decode("utf-8")
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                raise ValueError(f"Unexpected payload type: {type(payload).__name__}")
            self._buffer.append(payload)
            self.stats.messages_consumed_total += 1
            self._throughput_window.append(time.monotonic())
            if self.on_ingest is not None:
                try:
                    self.on_ingest(payload)
                except Exception:  # noqa: BLE001
                    logger.exception("kafka.consumer.on_ingest hook failed")
        except Exception as e:  # noqa: BLE001
            self.stats.errors_total += 1
            self.stats.last_error = str(e)
            logger.warning("kafka.consumer.parse_error: %s", e)
            if on_error == "dlq":
                self._write_dlq(raw_value, str(e))
            elif on_error == "halt":
                raise

    def _write_dlq(self, raw_value: Any, error: str) -> None:
        """Append a JSON line describing the rejected message to the DLQ file.

        Best-effort: a write failure here is logged but doesn't raise,
        otherwise a corrupt FS would cascade into halting the stream.
        """
        try:
            self._dlq_path.parent.mkdir(parents=True, exist_ok=True)
            # Render bytes as a utf-8 string with `replace` so we never
            # explode on invalid encodings; serialize a string-safe view.
            if isinstance(raw_value, bytes):
                view = raw_value.decode("utf-8", errors="replace")
            elif raw_value is None:
                view = ""
            else:
                view = str(raw_value)
            record = {
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "error": error,
                "raw_payload": view,
                "topic": str(self.cfg.get("topic", "")),
            }
            with self._dlq_path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(record) + "\n")
            self.stats.dlq_total += 1
        except Exception:  # noqa: BLE001
            logger.exception("kafka.consumer.dlq_write_failed")

    async def _flush(self, reason: str) -> None:
        if not self._buffer:
            return
        batch = self._buffer
        self._buffer = []
        self._last_flush_at = time.monotonic()
        df = pl.DataFrame(batch)
        try:
            # on_batch puede ser síncrono pesado (run_pipeline); a thread.
            meta = await asyncio.to_thread(self.on_batch, df)
        except Exception as e:  # noqa: BLE001
            self.stats.errors_total += 1
            self.stats.last_error = str(e)
            logger.exception("kafka.consumer.flush callback failed reason=%s", reason)
            return
        self.stats.batches_processed += 1
        self.stats.last_batch_at = datetime.now(timezone.utc).isoformat()
        self.stats.last_batch_size = len(batch)
        self.stats.last_batch_meta = meta or {}
        logger.info(
            "kafka.consumer.flush reason=%s size=%d total=%d",
            reason, len(batch), self.stats.messages_consumed_total,
        )

    # =================================================================
    # Stats / introspección
    # =================================================================
    def _refresh_throughput(self, now: float) -> None:
        cutoff = now - self._window_seconds
        while self._throughput_window and self._throughput_window[0] < cutoff:
            self._throughput_window.popleft()
        self.stats.throughput_msgs_per_sec = (
            len(self._throughput_window) / self._window_seconds
        )
        self.stats.buffer_size = len(self._buffer)

    def _refresh_lag(self) -> None:
        if self._consumer is None:
            return
        try:
            assignment = self._consumer.assignment()
            if not assignment:
                self.stats.lag = None
                return
            # No queremos await dentro del refresh sync; lag se actualizará
            # en la próxima vuelta de _run via _refresh_lag_async si se
            # necesita precisión. Por ahora exponemos buffer_size como
            # proxy de lag interno.
            self.stats.lag = None
        except Exception:  # noqa: BLE001
            self.stats.lag = None

    def get_status(self) -> dict[str, Any]:
        self.stats.buffer_size = len(self._buffer)
        return self.stats.to_dict()

    # =================================================================
    # Factoría del consumer (inyectable para tests)
    # =================================================================
    def _build_consumer(self) -> Any:
        if self._consumer_factory is not None:
            return self._consumer_factory()
        kwargs: dict[str, Any] = {
            "bootstrap_servers": self.cfg["bootstrap_servers"],
            "group_id": self.cfg["group_id"],
            "client_id": self.cfg["client_id"],
            "auto_offset_reset": self.cfg["auto_offset_reset"],
            "enable_auto_commit": True,
            "security_protocol": self.cfg["security_protocol"],
        }
        sasl_mech = self.cfg.get("sasl_mechanism")
        if sasl_mech:
            kwargs["sasl_mechanism"] = sasl_mech
            kwargs["sasl_plain_username"] = os.environ.get(
                self.cfg.get("sasl_username_env", ""), ""
            )
            kwargs["sasl_plain_password"] = os.environ.get(
                self.cfg.get("sasl_password_env", ""), ""
            )
        return AIOKafkaConsumer(self.cfg["topic"], **kwargs)


# =====================================================================
# Conveniencia: callback que envuelve run_pipeline
# =====================================================================
def make_pipeline_callback(
    config: dict[str, Any],
    on_run: Callable[[dict[str, Any]], None] | None = None,
    disabled_rules: Callable[[], set[str]] | None = None,
) -> BatchCallback:
    """Devuelve un callback que ejecuta run_pipeline con el batch recibido.

    `on_run` se llama al final con el dict resultado del pipeline
    (útil para que la API agregue al historial en `app.state.history`).
    `disabled_rules` (si se pasa) se invoca por cada batch y devuelve
    el set actual de reglas saltadas — así un cambio vía /rules afecta
    el siguiente flush sin reconectar el consumer.
    """
    # Import diferido para evitar ciclos cuando este módulo se importa
    # desde la API antes de que el pipeline_runner esté listo.
    from src.pipeline_runner import run_pipeline

    def _callback(df: pl.DataFrame) -> dict[str, Any]:
        result = run_pipeline(
            mode="stream",
            prebuilt_df=df,
            config=config,
            disabled_rules=disabled_rules() if disabled_rules else None,
        )
        if on_run is not None:
            on_run(result)
        return {
            "run_id": result["run_id"],
            "quality_score": float(result["quality_report"].get("score", 0.0)),
            "trades_in": result["validation_summary"]["total_in"],
            "trades_out": result["validation_summary"]["total_out"],
        }

    return _callback
