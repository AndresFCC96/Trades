"""
tests/test_api_schemas.py
=========================
Tests de validación de los modelos Pydantic del API.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError
from src.api.schemas import (
    HealthResponse,
    PipelineHistoryEntry,
    PipelineStatusResponse,
    RunPipelineRequest,
    RunPipelineResponse,
)


# =====================================================================
# RunPipelineRequest
# =====================================================================
class TestRunPipelineRequest:
    def test_defaults(self):
        req = RunPipelineRequest()
        assert req.n_trades == 10_000
        assert req.seed == 42
        assert req.mode == "dataframe"
        assert req.null_rate == 0.02
        assert req.outlier_rate == 0.01

    def test_valid_overrides(self):
        req = RunPipelineRequest(n_trades=500, mode="csv", null_rate=0.1)
        assert req.n_trades == 500
        assert req.mode == "csv"
        assert req.null_rate == 0.1

    def test_negative_n_trades_rejected(self):
        with pytest.raises(ValidationError):
            RunPipelineRequest(n_trades=-1)

    def test_n_trades_above_max_rejected(self):
        with pytest.raises(ValidationError):
            RunPipelineRequest(n_trades=10_000_001)

    def test_invalid_mode_rejected(self):
        with pytest.raises(ValidationError):
            RunPipelineRequest(mode="ftp")

    def test_null_rate_out_of_range(self):
        with pytest.raises(ValidationError):
            RunPipelineRequest(null_rate=1.5)
        with pytest.raises(ValidationError):
            RunPipelineRequest(null_rate=-0.01)

    def test_outlier_rate_out_of_range(self):
        with pytest.raises(ValidationError):
            RunPipelineRequest(outlier_rate=1.5)


# =====================================================================
# RunPipelineResponse
# =====================================================================
class TestRunPipelineResponse:
    def test_construction(self):
        resp = RunPipelineResponse(
            run_id="r-1",
            started_at="2026-01-01T00:00:00+00:00",
            finished_at="2026-01-01T00:00:05+00:00",
            duration_ms=5000.0,
            mode="dataframe",
            validation_summary={"total_in": 100, "total_out": 90},
            quality_score=92.5,
        )
        assert resp.run_id == "r-1"
        assert resp.quality_score == 92.5


# =====================================================================
# Status / history
# =====================================================================
class TestStatusAndHistory:
    def test_status_defaults_to_empty(self):
        s = PipelineStatusResponse()
        assert s.last_run_id is None
        assert s.last_finished_at is None
        assert s.total_runs == 0

    def test_history_entry_round_trip(self):
        entry = PipelineHistoryEntry(
            run_id="r-1",
            started_at="2026-01-01T00:00:00+00:00",
            finished_at="2026-01-01T00:00:05+00:00",
            duration_ms=5000.0,
            mode="dataframe",
            trades_in=100,
            trades_out=90,
            quality_score=92.5,
        )
        assert entry.trades_in == 100
        assert entry.quality_score == 92.5
        dump = entry.model_dump()
        assert dump["run_id"] == "r-1"


# =====================================================================
# Health
# =====================================================================
class TestHealthResponse:
    def test_construction(self):
        h = HealthResponse(status="ok", version="0.1.0")
        assert h.status == "ok"
        assert h.version == "0.1.0"
