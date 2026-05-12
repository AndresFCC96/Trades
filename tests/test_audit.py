"""
tests/test_audit.py
===================
Tests del módulo de auditoría: load_config + AuditLogger (4 tipos de evento,
correlación por pipeline_run_id, lectura, robustez).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pytest
from src.audit import (
    AuditLogger,
    EventType,
    load_config,
)


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture
def audit_dir(tmp_path: Path) -> Path:
    return tmp_path / "audit"


@pytest.fixture
def cfg(audit_dir: Path) -> dict:
    return {
        "audit": {
            "output_dir": str(audit_dir),
            "rejection_log": "rejections.jsonl",
            "pipeline_log": "pipeline_runs.jsonl",
            "access_log": "api_access.jsonl",
            "data_change_log": "data_changes.jsonl",
            "flush_each_event": True,
        }
    }


@pytest.fixture
def logger(cfg) -> AuditLogger:
    return AuditLogger(cfg)


# ---------------------------------------------------------------------
# load_config
# ---------------------------------------------------------------------
class TestLoadConfig:
    def test_loads_valid_yaml(self, tmp_path: Path):
        f = tmp_path / "settings.yaml"
        f.write_text("foo: 1\nbar:\n  - a\n  - b\n", encoding="utf-8")
        assert load_config(f) == {"foo": 1, "bar": ["a", "b"]}

    def test_missing_file_raises(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError):
            load_config(tmp_path / "nope.yaml")

    def test_empty_file_returns_empty_dict(self, tmp_path: Path):
        f = tmp_path / "empty.yaml"
        f.write_text("", encoding="utf-8")
        assert load_config(f) == {}

    def test_real_settings_yaml_loads(self):
        """Sanity: el settings.yaml real del proyecto carga sin errores."""
        cfg = load_config(Path("config/settings.yaml"))
        assert "validator" in cfg
        assert "generator" in cfg
        assert cfg["validator"]["business"]["max_notional_per_trader_usd"] == 5_000_000.0


# ---------------------------------------------------------------------
# AuditLogger — caso básico por evento
# ---------------------------------------------------------------------
class TestLogRejection:
    def test_writes_jsonl_line(self, logger: AuditLogger, audit_dir: Path):
        eid = logger.log_rejection("T-1", "RV-02", "price > 0", "price", -10.0)

        path = audit_dir / "rejections.jsonl"
        assert path.exists()
        rec = json.loads(path.read_text(encoding="utf-8").strip())

        assert rec["event_id"] == eid
        assert rec["event_type"] == "rejection"
        assert rec["trade_id"] == "T-1"
        assert rec["rule_id"] == "RV-02"
        assert rec["rule_description"] == "price > 0"
        assert rec["field"] == "price"
        assert rec["value_received"] == -10.0
        assert "timestamp_utc" in rec
        # timestamp parseable
        datetime.fromisoformat(rec["timestamp_utc"])

    def test_uuid_trade_id_serialized_as_str(self, logger: AuditLogger):
        tid = uuid4()
        logger.log_rejection(tid, "RV-04", "unique", "trade_id", tid)
        evs = logger.read_events(EventType.REJECTION)
        assert evs[0]["trade_id"] == str(tid)
        assert evs[0]["value_received"] == str(tid)


class TestLogPipelineRun:
    def test_run_id_used_as_correlation(self, logger: AuditLogger):
        logger.log_pipeline_run("run-X", "extract", "ok", 100, 95, 12.5)
        ev = logger.read_events(EventType.PIPELINE_RUN)[0]
        assert ev["run_id"] == "run-X"
        assert ev["pipeline_run_id"] == "run-X"
        assert ev["stage"] == "extract"
        assert ev["status"] == "ok"
        assert ev["trades_in"] == 100
        assert ev["trades_out"] == 95
        assert ev["duration_ms"] == 12.5


class TestLogApiAccess:
    def test_basic_fields(self, logger: AuditLogger):
        logger.log_api_access("/health", "anon", "GET", 200)
        ev = logger.read_events(EventType.API_ACCESS)[0]
        assert ev["endpoint"] == "/health"
        assert ev["actor"] == "anon"
        assert ev["method"] == "GET"
        assert ev["response_code"] == 200


class TestLogDataChange:
    def test_serializes_complex_before_after(self, logger: AuditLogger):
        logger.log_data_change(
            "run-Y", "currency",
            before=["EUR", "USD"], after=["USD"],
            trade_count_affected=5,
        )
        ev = logger.read_events(EventType.DATA_CHANGE)[0]
        assert ev["run_id"] == "run-Y"
        assert ev["pipeline_run_id"] == "run-Y"
        assert ev["field"] == "currency"
        assert ev["before"] == ["EUR", "USD"]
        assert ev["after"] == ["USD"]
        assert ev["trade_count_affected"] == 5

    def test_serializes_datetime(self, logger: AuditLogger):
        ts = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
        logger.log_data_change("run-Z", "timestamp", before=ts, after=None, trade_count_affected=1)
        ev = logger.read_events(EventType.DATA_CHANGE)[0]
        assert ev["before"] == ts.isoformat()
        assert ev["after"] is None


# ---------------------------------------------------------------------
# pipeline_run_id propagation
# ---------------------------------------------------------------------
class TestPipelineRunIdPropagation:
    def test_constructor_sets_run_id(self, cfg):
        al = AuditLogger(cfg, pipeline_run_id="run-123")
        al.log_rejection("T-1", "RV-01", "x", "f", None)
        al.log_api_access("/x", "u", "GET", 200)
        assert al.read_events(EventType.REJECTION)[0]["pipeline_run_id"] == "run-123"
        assert al.read_events(EventType.API_ACCESS)[0]["pipeline_run_id"] == "run-123"

    def test_setter_changes_subsequent_only(self, logger: AuditLogger):
        logger.log_rejection("T-1", "RV", "x", "f", 0)
        logger.set_pipeline_run_id("run-42")
        logger.log_rejection("T-2", "RV", "x", "f", 0)

        evs = logger.read_events(EventType.REJECTION)
        assert evs[0]["pipeline_run_id"] is None
        assert evs[1]["pipeline_run_id"] == "run-42"

    def test_uuid_run_id_accepted(self, cfg):
        rid = uuid4()
        al = AuditLogger(cfg, pipeline_run_id=rid)
        al.log_rejection("T", "R", "x", "f", 0)
        assert al.read_events(EventType.REJECTION)[0]["pipeline_run_id"] == str(rid)


# ---------------------------------------------------------------------
# Readers
# ---------------------------------------------------------------------
class TestReaders:
    def test_empty_when_file_missing(self, logger: AuditLogger):
        assert logger.read_events(EventType.REJECTION) == []

    def test_skips_malformed_lines(self, logger: AuditLogger, audit_dir: Path):
        logger.log_rejection("T-1", "R", "x", "f", 0)
        path = audit_dir / "rejections.jsonl"
        with path.open("a", encoding="utf-8") as f:
            f.write("not json\n\n")
        logger.log_rejection("T-2", "R", "x", "f", 0)

        evs = logger.read_events(EventType.REJECTION)
        assert len(evs) == 2
        assert {e["trade_id"] for e in evs} == {"T-1", "T-2"}

    def test_accepts_string_event_type(self, logger: AuditLogger):
        logger.log_rejection("T", "R", "x", "f", 0)
        assert len(logger.read_events("rejection")) == 1

    def test_read_events_by_run_filters(self, cfg):
        al = AuditLogger(cfg, pipeline_run_id="A")
        al.log_rejection("T-1", "R", "x", "f", 0)
        al.set_pipeline_run_id("B")
        al.log_rejection("T-2", "R", "x", "f", 0)
        al.log_rejection("T-3", "R", "x", "f", 0)

        only_b = al.read_events_by_run(EventType.REJECTION, "B")
        assert {e["trade_id"] for e in only_b} == {"T-2", "T-3"}


# ---------------------------------------------------------------------
# Robustness
# ---------------------------------------------------------------------
class TestRobustness:
    def test_event_ids_are_unique(self, logger: AuditLogger):
        ids = [logger.log_rejection("T", "R", "x", "f", 0) for _ in range(50)]
        assert len(set(ids)) == 50

    def test_each_event_type_writes_to_its_own_file(self, logger: AuditLogger, audit_dir: Path):
        logger.log_rejection("T", "R", "x", "f", 0)
        logger.log_pipeline_run("run", "stage", "ok", 1, 1, 1.0)
        logger.log_api_access("/x", "u", "GET", 200)
        logger.log_data_change("run", "f", 1, 2, 1)

        for fname in ("rejections.jsonl", "pipeline_runs.jsonl",
                      "api_access.jsonl", "data_changes.jsonl"):
            assert (audit_dir / fname).exists()
            assert (audit_dir / fname).stat().st_size > 0

    def test_creates_output_dir_if_missing(self, tmp_path: Path):
        target = tmp_path / "deep" / "nested" / "audit"
        cfg = {"audit": {"output_dir": str(target), "flush_each_event": True}}
        AuditLogger(cfg)
        assert target.exists() and target.is_dir()
