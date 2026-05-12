"""
src/audit.py
============
Capa de auditoría transversal del pipeline.

Todos los módulos escriben aquí sus eventos para trazabilidad cruzada.
Formato JSON Lines (un archivo por categoría) — append-only y grep-able.

Cada evento contiene:
    - event_id        (UUID4)
    - timestamp_utc   (ISO 8601, UTC)
    - event_type      (rejection | pipeline_run | api_access | data_change)
    - pipeline_run_id (correlación entre etapas del mismo run)

`load_config()` también vive aquí: es la primera utilidad necesaria del
pipeline y los demás módulos la importan desde aquí.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import asdict, dataclass
from dataclasses import field as dc_field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import yaml

logger = logging.getLogger(__name__)


# =====================================================================
# Config loader (compartido por todo el pipeline)
# =====================================================================
DEFAULT_CONFIG_PATH = Path("config/settings.yaml")


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    """Carga settings.yaml. Acepta ruta relativa al cwd o absoluta."""
    cfg_path = Path(path) if path is not None else DEFAULT_CONFIG_PATH
    if not cfg_path.exists():
        raise FileNotFoundError(f"Config file not found: {cfg_path}")
    with cfg_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# =====================================================================
# Tipos de evento
# =====================================================================
class EventType(str, Enum):
    REJECTION = "rejection"
    PIPELINE_RUN = "pipeline_run"
    API_ACCESS = "api_access"
    DATA_CHANGE = "data_change"


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_event_id() -> str:
    return str(uuid4())


@dataclass
class _BaseEvent:
    event_id: str = dc_field(default_factory=_new_event_id)
    timestamp_utc: str = dc_field(default_factory=_now_utc_iso)
    event_type: str = ""
    pipeline_run_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RejectionEvent(_BaseEvent):
    trade_id: str = ""
    rule_id: str = ""
    rule_description: str = ""
    field: str = ""
    value_received: Any = None
    event_type: str = EventType.REJECTION.value


@dataclass
class PipelineRunEvent(_BaseEvent):
    run_id: str = ""
    stage: str = ""
    status: str = ""
    trades_in: int = 0
    trades_out: int = 0
    duration_ms: float = 0.0
    event_type: str = EventType.PIPELINE_RUN.value


@dataclass
class ApiAccessEvent(_BaseEvent):
    endpoint: str = ""
    actor: str = ""
    method: str = ""
    response_code: int = 0
    event_type: str = EventType.API_ACCESS.value


@dataclass
class DataChangeEvent(_BaseEvent):
    run_id: str = ""
    field: str = ""
    before: Any = None
    after: Any = None
    trade_count_affected: int = 0
    event_type: str = EventType.DATA_CHANGE.value


# =====================================================================
# AuditLogger
# =====================================================================
class AuditLogger:
    """JSONL append-only por categoría de evento.

    Uso típico:
        cfg = load_config()
        audit = AuditLogger(cfg, pipeline_run_id="run-XYZ")
        audit.log_rejection("T-1", "RV-02", "price > 0", "price", -10)
    """

    def __init__(
        self,
        config: dict[str, Any] | None = None,
        pipeline_run_id: str | UUID | None = None,
    ) -> None:
        cfg = config if config is not None else load_config()
        audit_cfg = cfg.get("audit", {})

        self.output_dir = Path(audit_cfg.get("output_dir", "outputs/audit"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.flush_each = bool(audit_cfg.get("flush_each_event", True))
        self.pipeline_run_id = (
            str(pipeline_run_id) if pipeline_run_id is not None else None
        )

        self._files: dict[EventType, Path] = {
            EventType.REJECTION:    self.output_dir / audit_cfg.get("rejection_log",   "rejections.jsonl"),
            EventType.PIPELINE_RUN: self.output_dir / audit_cfg.get("pipeline_log",    "pipeline_runs.jsonl"),
            EventType.API_ACCESS:   self.output_dir / audit_cfg.get("access_log",      "api_access.jsonl"),
            EventType.DATA_CHANGE:  self.output_dir / audit_cfg.get("data_change_log", "data_changes.jsonl"),
        }
        self._locks: dict[EventType, threading.Lock] = {
            k: threading.Lock() for k in self._files
        }

    # ---- run_id setter ----
    def set_pipeline_run_id(self, run_id: str | UUID) -> None:
        self.pipeline_run_id = str(run_id)

    # ---- Loggers ----
    def log_rejection(
        self,
        trade_id: str | UUID,
        rule_id: str,
        rule_description: str,
        field: str,
        value: Any,
    ) -> str:
        ev = RejectionEvent(
            trade_id=str(trade_id),
            rule_id=rule_id,
            rule_description=rule_description,
            field=field,
            value_received=_to_jsonable(value),
            pipeline_run_id=self.pipeline_run_id,
        )
        return self._write(EventType.REJECTION, ev)

    def log_pipeline_run(
        self,
        run_id: str | UUID,
        stage: str,
        status: str,
        trades_in: int,
        trades_out: int,
        duration_ms: float,
    ) -> str:
        ev = PipelineRunEvent(
            run_id=str(run_id),
            stage=stage,
            status=status,
            trades_in=int(trades_in),
            trades_out=int(trades_out),
            duration_ms=float(duration_ms),
            pipeline_run_id=str(run_id),
        )
        return self._write(EventType.PIPELINE_RUN, ev)

    def log_api_access(
        self,
        endpoint: str,
        actor: str,
        method: str,
        response_code: int,
    ) -> str:
        ev = ApiAccessEvent(
            endpoint=endpoint,
            actor=actor,
            method=method,
            response_code=int(response_code),
            pipeline_run_id=self.pipeline_run_id,
        )
        return self._write(EventType.API_ACCESS, ev)

    def log_data_change(
        self,
        run_id: str | UUID,
        field: str,
        before: Any,
        after: Any,
        trade_count_affected: int,
    ) -> str:
        ev = DataChangeEvent(
            run_id=str(run_id),
            field=field,
            before=_to_jsonable(before),
            after=_to_jsonable(after),
            trade_count_affected=int(trade_count_affected),
            pipeline_run_id=str(run_id),
        )
        return self._write(EventType.DATA_CHANGE, ev)

    # ---- Readers (consumidos por la API más adelante) ----
    def read_events(self, event_type: EventType | str) -> list[dict[str, Any]]:
        et = EventType(event_type) if isinstance(event_type, str) else event_type
        path = self._files[et]
        if not path.exists():
            return []
        events: list[dict[str, Any]] = []
        with self._locks[et]:
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        events.append(json.loads(line))
                    except json.JSONDecodeError:
                        logger.warning("Skipping malformed audit line in %s", path)
        return events

    def read_events_by_run(
        self, event_type: EventType | str, pipeline_run_id: str | UUID
    ) -> list[dict[str, Any]]:
        target = str(pipeline_run_id)
        return [
            e for e in self.read_events(event_type)
            if e.get("pipeline_run_id") == target
        ]

    # ---- Internals ----
    def _write(self, et: EventType, event: _BaseEvent) -> str:
        record = event.to_dict()
        line = json.dumps(record, ensure_ascii=False, default=str) + "\n"
        path = self._files[et]
        with self._locks[et]:
            with path.open("a", encoding="utf-8") as f:
                f.write(line)
                if self.flush_each:
                    f.flush()
        logger.info(
            "audit.%s event_id=%s pipeline_run_id=%s",
            et.value, record["event_id"], record.get("pipeline_run_id"),
        )
        return record["event_id"]


# =====================================================================
# Helpers
# =====================================================================
def _to_jsonable(v: Any) -> Any:
    """Normaliza tipos no-JSON (datetime, UUID, set, etc.) a algo serializable."""
    if v is None or isinstance(v, (str, bool, int, float)):
        return v
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, UUID):
        return str(v)
    if isinstance(v, (list, tuple, set)):
        return [_to_jsonable(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _to_jsonable(x) for k, x in v.items()}
    return str(v)
