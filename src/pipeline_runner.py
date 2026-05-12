"""
src/pipeline_runner.py
======================
Orquestador del pipeline.

Ejecución (orden lógico):
    1. Generate   — sintetiza trades con `trade_generator` (sólo cuando
                    mode == "dataframe"; con csv/api se omite y se delega
                    la fuente al extractor).
    2. Extract    — normaliza y valida esquema con Patito.
    3. Validate   — aplica las 14 reglas RV-XX y descarta los inválidos.
    4. Transform  — genera business / quality / audit reports.

Cada etapa registra duración y cantidad de filas en auditoría
(`pipeline_run` event). Errores de etapa se envuelven en
`PipelineStageError(stage, reason)`.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import polars as pl

from src.audit import AuditLogger, load_config
from src.trade_extractor import extract_trades
from src.trade_generator import generate_trades
from src.trade_transformer import transform
from src.trade_validator import validate_trades

logger = logging.getLogger(__name__)


class PipelineStageError(Exception):
    """Error tipado de etapa con stage y reason explícitos."""

    def __init__(self, stage: str, reason: str) -> None:
        self.stage = stage
        self.reason = reason
        super().__init__(f"[{stage}] {reason}")


def run_pipeline(
    n_trades: int = 10_000,
    mode: str = "dataframe",
    seed: int = 42,
    null_rate: float = 0.02,
    outlier_rate: float = 0.01,
    config: dict[str, Any] | None = None,
    persist_raw: bool = False,
    http_client=None,
) -> dict[str, Any]:
    """Ejecuta el pipeline completo y devuelve los tres reportes + metadatos.

    Args:
        n_trades: cantidad a generar (sólo si mode=="dataframe").
        mode: "dataframe" | "csv" | "api".
        seed: semilla para el generador.
        null_rate / outlier_rate: parámetros del generador.
        config: settings dict; si None se carga config/settings.yaml.
        persist_raw: si True, el generador escribe CSV en `outputs/raw/`.
        http_client: callable inyectable para mode="api".

    Returns:
        dict con run_id, métricas por etapa y los tres reportes.
    """
    cfg = config if config is not None else load_config()
    run_id = str(uuid4())
    audit = AuditLogger(cfg, pipeline_run_id=run_id)

    started_at = datetime.now(timezone.utc)
    logger.info("pipeline.start run_id=%s mode=%s n=%d", run_id, mode, n_trades)

    # --------- Stage 1: generate -------------------------------------
    df_raw: pl.DataFrame | None = None
    if mode == "dataframe":
        df_raw = _stage(
            audit, run_id, "generate",
            lambda: generate_trades(
                n=n_trades, seed=seed,
                null_rate=null_rate, outlier_rate=outlier_rate,
                config=cfg, persist=persist_raw,
            ),
            in_count=n_trades,
            out_count_fn=lambda r: len(r),
        )

    # --------- Stage 2: extract --------------------------------------
    df_extracted, ext_meta = _stage(
        audit, run_id, "extract",
        lambda: extract_trades(
            cfg, mode=mode, dataframe=df_raw,
            audit=audit, http_client=http_client,
        ),
        in_count=len(df_raw) if df_raw is not None else 0,
        out_count_fn=lambda r: len(r[0]),
    )

    # --------- Stage 3: validate -------------------------------------
    df_valid, validation_summary = _stage(
        audit, run_id, "validate",
        lambda: validate_trades(df_extracted, cfg, audit),
        in_count=len(df_extracted),
        out_count_fn=lambda r: len(r[0]),
    )

    # --------- Stage 4: transform ------------------------------------
    business, quality, audit_rep = _stage(
        audit, run_id, "transform",
        lambda: transform(df_valid, cfg, audit, pipeline_run_id=run_id),
        in_count=len(df_valid),
        out_count_fn=lambda r: len(r[0].get("by_asset_class", [])),
    )

    finished_at = datetime.now(timezone.utc)
    duration_ms = (finished_at - started_at).total_seconds() * 1000.0

    logger.info(
        "pipeline.end run_id=%s duration_ms=%.2f valid=%d/%d",
        run_id, duration_ms,
        validation_summary["total_out"], validation_summary["total_in"],
    )

    return {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_ms": round(duration_ms, 2),
        "mode": mode,
        "extraction_metadata": ext_meta,
        "validation_summary": validation_summary,
        "business_report": business,
        "quality_report": quality,
        "audit_report": audit_rep,
    }


# ---------------------------------------------------------------------
# Helper: ejecuta una etapa con timing y auditoría
# ---------------------------------------------------------------------
def _stage(
    audit: AuditLogger,
    run_id: str,
    stage_name: str,
    fn,
    in_count: int,
    out_count_fn,
):
    t0 = time.perf_counter()
    try:
        result = fn()
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        audit.log_pipeline_run(
            run_id=run_id, stage=stage_name, status="failed",
            trades_in=in_count, trades_out=0, duration_ms=elapsed_ms,
        )
        logger.exception("pipeline.%s failed: %s", stage_name, e)
        raise PipelineStageError(stage_name, str(e)) from e

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    out_count = out_count_fn(result)
    audit.log_pipeline_run(
        run_id=run_id, stage=stage_name, status="ok",
        trades_in=in_count, trades_out=out_count, duration_ms=elapsed_ms,
    )
    logger.info(
        "pipeline.%s ok in=%d out=%d duration_ms=%.2f",
        stage_name, in_count, out_count, elapsed_ms,
    )
    return result
