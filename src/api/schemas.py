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


# =====================================================================
# Sources (uploads CSV / XLSX / Parquet)
# =====================================================================
class SourceMetadata(BaseModel):
    source_id: str
    original_name: str
    ext: str
    size_bytes: int
    uploaded_at: str
    mapping: dict[str, str] = Field(default_factory=dict)
    row_count: int | None = None
    column_names: list[str] | None = None


class SourcePreview(BaseModel):
    source_id: str
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count_preview: int


class SourceMappingRequest(BaseModel):
    mapping: dict[str, str]


class SourceRunRequest(BaseModel):
    """Opciones al ejecutar el pipeline contra una fuente subida."""
    pass


# =====================================================================
# Kafka streaming
# =====================================================================
class KafkaConnectRequest(BaseModel):
    """Override parcial de la sección `kafka` de settings.yaml.
    Sólo los campos no nulos sobrescriben la config en memoria."""
    bootstrap_servers: str | None = None
    topic: str | None = None
    group_id: str | None = None
    security_protocol: Literal[
        "PLAINTEXT", "SSL", "SASL_PLAINTEXT", "SASL_SSL"
    ] | None = None
    sasl_mechanism: Literal[
        "PLAIN", "SCRAM-SHA-256", "SCRAM-SHA-512"
    ] | None = None
    auto_offset_reset: Literal["earliest", "latest"] | None = None
    buffer_max_size: int | None = Field(default=None, ge=1)
    buffer_max_latency_ms: int | None = Field(default=None, ge=1)


class KafkaStatusResponse(BaseModel):
    state: str
    started_at: str | None = None
    messages_consumed_total: int = 0
    errors_total: int = 0
    batches_processed: int = 0
    buffer_size: int = 0
    throughput_msgs_per_sec: float = 0.0
    lag: int | None = None
    last_batch_at: str | None = None
    last_batch_size: int = 0
    last_batch_meta: dict[str, Any] = Field(default_factory=dict)
    last_error: str | None = None
    bootstrap_servers: str = ""
    topic: str = ""


# =====================================================================
# Rules + Settings (editor)
# =====================================================================
class RuleInfo(BaseModel):
    """Status of one RV-XX rule (catalog + runtime state)."""
    id: str
    group: Literal["critical", "business", "context"]
    name: str
    description: str
    enabled: bool


class RulesResponse(BaseModel):
    rules: list[RuleInfo]
    disabled_ids: list[str]


class RulePatchRequest(BaseModel):
    enabled: bool


class SettingsResponse(BaseModel):
    """The in-memory settings dict served back to the UI."""
    settings: dict[str, Any]


class SettingsUpdateRequest(BaseModel):
    """Partial deep-merge over the in-memory settings.

    Only keys present in `patch` are overwritten. Nested dicts are merged
    recursively; lists/scalars replace wholesale.
    """
    patch: dict[str, Any]
