"""
src/trade_transformer.py
========================
Etapa 3: transformación. Produce los tres reportes del pipeline.

    transform(df, config, audit) -> (business_report, quality_report, audit_report)

- business_report:  resumen por asset_class, riesgo, top contrapartes,
                    venue, temporal (delegado a business_rules).
- quality_report:   completitud, unicidad, consistencia, validez,
                    outliers, score (delegado a data_quality).
- audit_report:     vista consolidada del log de auditoría
                    (rechazados, runs, accesos API, cambios).
"""

from __future__ import annotations

import logging
from typing import Any

import polars as pl

from src.audit import AuditLogger, EventType
from src.business_rules import compute_business_report
from src.data_quality import compute_quality_report

logger = logging.getLogger(__name__)


def transform(
    df: pl.DataFrame,
    config: dict[str, Any],
    audit: AuditLogger,
    pipeline_run_id: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Genera los tres reportes."""
    business = compute_business_report(df, config)
    quality = compute_quality_report(df, config)
    audit_rep = build_audit_report(audit, pipeline_run_id=pipeline_run_id)

    logger.info(
        "transformer trades=%d quality_score=%.2f rejected=%d",
        len(df), quality.get("score", 0.0), len(audit_rep["rejected_trades"]),
    )
    return business, quality, audit_rep


def build_audit_report(
    audit: AuditLogger,
    pipeline_run_id: str | None = None,
) -> dict[str, Any]:
    """Recolecta los cuatro tipos de evento.

    Si `pipeline_run_id` se indica, filtra cada categoría por ese run."""
    if pipeline_run_id is None:
        rejected      = audit.read_events(EventType.REJECTION)
        pipeline_runs = audit.read_events(EventType.PIPELINE_RUN)
        api_accesses  = audit.read_events(EventType.API_ACCESS)
        data_changes  = audit.read_events(EventType.DATA_CHANGE)
    else:
        rejected      = audit.read_events_by_run(EventType.REJECTION,    pipeline_run_id)
        pipeline_runs = audit.read_events_by_run(EventType.PIPELINE_RUN, pipeline_run_id)
        api_accesses  = audit.read_events_by_run(EventType.API_ACCESS,   pipeline_run_id)
        data_changes  = audit.read_events_by_run(EventType.DATA_CHANGE,  pipeline_run_id)

    rejected_by_rule: dict[str, int] = {}
    for ev in rejected:
        rid = ev.get("rule_id", "<unknown>")
        rejected_by_rule[rid] = rejected_by_rule.get(rid, 0) + 1

    return {
        "rejected_trades": rejected,
        "rejected_by_rule_summary": rejected_by_rule,
        "pipeline_runs": pipeline_runs,
        "api_accesses": api_accesses,
        "data_changes": data_changes,
        "totals": {
            "rejections":     len(rejected),
            "pipeline_runs":  len(pipeline_runs),
            "api_accesses":   len(api_accesses),
            "data_changes":   len(data_changes),
        },
    }
