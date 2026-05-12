"""
src/api/main.py
===============
FastAPI app para ejecutar el pipeline y consultar reportes/auditoría.

Endpoints:
    POST /pipeline/run
    GET  /pipeline/status
    GET  /pipeline/history
    GET  /reports/business
    GET  /reports/quality
    GET  /reports/business/download[?format=csv|json]
    GET  /reports/quality/download[?format=csv|json]
    GET  /audit/trades   (rechazos, con trader_id/counterparty_id pseudonimizados)
    GET  /audit/pipeline (historial de runs)
    GET  /audit/access   (accesos a la API)
    GET  /health

Pseudonimización: SHA-256(salt + value) trunc a 16 hex.
La sal viene de TRADES_PSEUDO_SALT o cae al default (sólo dev).
Cache: el último run se guarda en memoria (`app.state.last_run`).
"""

from __future__ import annotations

import copy
import hashlib
import io
import json
import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from src.api.schemas import (
    HealthResponse,
    PipelineHistoryEntry,
    PipelineStatusResponse,
    RunPipelineRequest,
    RunPipelineResponse,
)
from src.audit import AuditLogger, EventType, load_config
from src.pipeline_runner import PipelineStageError, run_pipeline

logger = logging.getLogger(__name__)


# =====================================================================
# App factory
# =====================================================================
def create_app(config: dict[str, Any] | None = None) -> FastAPI:
    cfg = config if config is not None else load_config()
    api_cfg = cfg.get("api", {})
    pipeline_cfg = cfg.get("pipeline", {})

    app = FastAPI(
        title="Trade Pipeline API",
        version=pipeline_cfg.get("version", "0.1.0"),
    )

    # Estado de la app (cache en memoria entre ejecuciones)
    app.state.config = cfg
    app.state.audit = AuditLogger(cfg)
    app.state.last_run = None
    app.state.history: list[dict[str, Any]] = []

    # CORS — abierto en dev; restringir en producción vía settings.yaml
    origins = api_cfg.get("cors_origins", ["*"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware: registra cada acceso a la API
    @app.middleware("http")
    async def _audit_access(request: Request, call_next):
        response = await call_next(request)
        try:
            actor = request.client.host if request.client else "unknown"
            app.state.audit.log_api_access(
                endpoint=str(request.url.path),
                actor=actor,
                method=request.method,
                response_code=response.status_code,
            )
        except Exception:  # nunca dejar caer la request por un fallo de auditoría
            logger.exception("audit_access middleware failed")
        return response

    _register_routes(app)
    return app


# =====================================================================
# Routes
# =====================================================================
def _register_routes(app: FastAPI) -> None:

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            version=app.state.config.get("pipeline", {}).get("version", "0.0.0"),
        )

    # ----- Pipeline ---------------------------------------------------
    @app.post("/pipeline/run", response_model=RunPipelineResponse)
    def pipeline_run(req: RunPipelineRequest) -> RunPipelineResponse:
        cfg = app.state.config
        try:
            result = run_pipeline(
                n_trades=req.n_trades,
                mode=req.mode,
                seed=req.seed,
                null_rate=req.null_rate,
                outlier_rate=req.outlier_rate,
                config=cfg,
            )
        except PipelineStageError as e:
            raise HTTPException(
                status_code=500,
                detail={"stage": e.stage, "reason": e.reason},
            ) from e

        # Pseudonimizar antes de cachear
        salt = _get_salt(cfg)
        result = _pseudonymize_result(result, salt)
        app.state.last_run = result
        app.state.history.append(_history_entry(result).model_dump())

        return RunPipelineResponse(
            run_id=result["run_id"],
            started_at=result["started_at"],
            finished_at=result["finished_at"],
            duration_ms=result["duration_ms"],
            mode=result["mode"],
            validation_summary=result["validation_summary"],
            quality_score=float(result["quality_report"].get("score", 0.0)),
        )

    @app.get("/pipeline/status", response_model=PipelineStatusResponse)
    def pipeline_status() -> PipelineStatusResponse:
        if not app.state.history:
            return PipelineStatusResponse()
        last = app.state.history[-1]
        return PipelineStatusResponse(
            last_run_id=last["run_id"],
            last_finished_at=last["finished_at"],
            last_quality_score=last["quality_score"],
            total_runs=len(app.state.history),
        )

    @app.get("/pipeline/history", response_model=list[PipelineHistoryEntry])
    def pipeline_history() -> list[PipelineHistoryEntry]:
        return [PipelineHistoryEntry(**h) for h in app.state.history]

    # ----- Reports ----------------------------------------------------
    @app.get("/reports/business")
    def get_business_report():
        last = _require_last_run(app)
        return last["business_report"]

    @app.get("/reports/quality")
    def get_quality_report():
        last = _require_last_run(app)
        return last["quality_report"]

    @app.get("/reports/business/download")
    def download_business(format: str = Query("json", pattern="^(csv|json)$")):
        last = _require_last_run(app)
        return _report_response(last["business_report"], "business", format)

    @app.get("/reports/quality/download")
    def download_quality(format: str = Query("json", pattern="^(csv|json)$")):
        last = _require_last_run(app)
        return _report_response(last["quality_report"], "quality", format)

    # ----- Audit ------------------------------------------------------
    @app.get("/audit/trades")
    def audit_rejected_trades():
        events = app.state.audit.read_events(EventType.REJECTION)
        salt = _get_salt(app.state.config)
        return _pseudonymize_rejection_events(events, salt)

    @app.get("/audit/pipeline")
    def audit_pipeline_runs():
        return app.state.audit.read_events(EventType.PIPELINE_RUN)

    @app.get("/audit/access")
    def audit_access_log():
        return app.state.audit.read_events(EventType.API_ACCESS)


# =====================================================================
# Helpers
# =====================================================================
def _require_last_run(app: FastAPI) -> dict[str, Any]:
    if app.state.last_run is None:
        raise HTTPException(status_code=404, detail="No pipeline run yet")
    return app.state.last_run


def _history_entry(result: dict[str, Any]) -> PipelineHistoryEntry:
    s = result["validation_summary"]
    return PipelineHistoryEntry(
        run_id=result["run_id"],
        started_at=result["started_at"],
        finished_at=result["finished_at"],
        duration_ms=result["duration_ms"],
        mode=result["mode"],
        trades_in=s["total_in"],
        trades_out=s["total_out"],
        quality_score=float(result["quality_report"].get("score", 0.0)),
    )


# ---- Pseudonimización ------------------------------------------------
def _get_salt(cfg: dict[str, Any]) -> str:
    pseu = cfg.get("api", {}).get("pseudonymization", {})
    salt_env = pseu.get("salt_env")
    if salt_env:
        env_salt = os.environ.get(salt_env)
        if env_salt:
            return env_salt
    return pseu.get("default_salt", "dev-only-change-me")


def _pseudonymize(value: Any, salt: str) -> Any:
    if value is None:
        return None
    h = hashlib.sha256((salt + str(value)).encode("utf-8")).hexdigest()
    return h[:16]


def _pseudonymize_result(result: dict[str, Any], salt: str) -> dict[str, Any]:
    """Devuelve una copia con counterparty_id pseudonimizado en business_report."""
    r = copy.deepcopy(result)
    business = r.get("business_report", {})
    for row in business.get("top_counterparties", []):
        if "counterparty_id" in row:
            row["counterparty_id"] = _pseudonymize(row["counterparty_id"], salt)
    return r


def _pseudonymize_rejection_events(
    events: list[dict[str, Any]], salt: str
) -> list[dict[str, Any]]:
    out = []
    for ev in events:
        e = dict(ev)
        if e.get("field") in ("trader_id", "counterparty_id"):
            e["value_received"] = _pseudonymize(e.get("value_received"), salt)
        out.append(e)
    return out


# ---- Reportes en CSV / JSON -----------------------------------------
def _report_response(report: dict[str, Any], name: str, fmt: str) -> StreamingResponse:
    if fmt == "json":
        body = json.dumps(report, default=str, ensure_ascii=False, indent=2)
        return StreamingResponse(
            iter([body]),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{name}_report.json"'
            },
        )
    # CSV: aplanado simple key,value para compatibilidad con cualquier reporte
    buf = io.StringIO()
    buf.write("key,value\n")
    for path, value in _flatten(report):
        v = json.dumps(value, default=str, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
        buf.write(f'"{path}",{v}\n')
    body = buf.getvalue()
    return StreamingResponse(
        iter([body]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{name}_report.csv"'
        },
    )


def _flatten(obj: Any, prefix: str = ""):
    """Aplana dict anidado a tuplas (path, leaf)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _flatten(v, f"{prefix}.{k}" if prefix else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _flatten(v, f"{prefix}[{i}]")
    else:
        yield (prefix, obj)


# =====================================================================
# Default app instance (para `uvicorn src.api.main:app`)
# =====================================================================
app = create_app()
