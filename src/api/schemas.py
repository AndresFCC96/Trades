"""
src/api/schemas.py
==================
Modelos Pydantic para request/response de la API REST.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# =====================================================================
# Health
# =====================================================================
class HealthResponse(BaseModel):
    status: str
    version: str


# =====================================================================
# POST /pipeline/run
# =====================================================================
class RunPipelineRequest(BaseModel):
    n_trades: int = Field(default=10_000, ge=0, le=10_000_000)
    seed: int = 42
    mode: Literal["dataframe", "csv", "api"] = "dataframe"
    null_rate: float = Field(default=0.02, ge=0.0, le=1.0)
    outlier_rate: float = Field(default=0.01, ge=0.0, le=1.0)


class RunPipelineResponse(BaseModel):
    run_id: str
    started_at: str
    finished_at: str
    duration_ms: float
    mode: str
    validation_summary: dict[str, Any]
    quality_score: float


# =====================================================================
# GET /pipeline/status
# =====================================================================
class PipelineStatusResponse(BaseModel):
    last_run_id: str | None = None
    last_finished_at: str | None = None
    last_quality_score: float | None = None
    total_runs: int = 0


# =====================================================================
# GET /pipeline/history (entry)
# =====================================================================
class PipelineHistoryEntry(BaseModel):
    run_id: str
    started_at: str
    finished_at: str
    duration_ms: float
    mode: str
    trades_in: int
    trades_out: int
    quality_score: float
