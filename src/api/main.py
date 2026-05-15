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

import asyncio
import copy
import hashlib
import io
import json
import logging
import os
from typing import Any

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse

from src.api.schemas import (
    HealthResponse,
    KafkaConnectRequest,
    KafkaStatusResponse,
    PipelineHistoryEntry,
    PipelineStatusResponse,
    RulePatchRequest,
    RulesResponse,
    RunPipelineRequest,
    RunPipelineResponse,
    SettingsResponse,
    SettingsUpdateRequest,
    SourceMappingRequest,
    SourceMetadata,
    SourcePreview,
)
from src.audit import AuditLogger, EventType, load_config
from src.kafka_consumer import KafkaTradeConsumer, make_pipeline_callback
from src.pipeline_runner import PipelineStageError, run_pipeline
from src.sources import (
    SourceError,
    delete_source,
    get_source,
    list_sources,
    load_dataframe,
    register_upload,
    set_mapping,
)
from src.sources import (
    preview as source_preview,
)

logger = logging.getLogger(__name__)


# =====================================================================
# Rules catalog — mirrors trade_validator.py order and grouping.
# `enabled` is sourced from app.state.disabled_rules at request time.
# =====================================================================
_RULES_CATALOG: list[dict[str, str]] = [
    {"id": "RV-01", "group": "critical", "name": "Required fields not null",
     "description": "Ningún campo obligatorio puede ser null"},
    {"id": "RV-02", "group": "critical", "name": "price > 0 and quantity > 0",
     "description": "Precio y cantidad deben ser positivos"},
    {"id": "RV-03", "group": "critical", "name": "side in {BUY, SELL}",
     "description": "Side debe ser BUY o SELL"},
    {"id": "RV-04", "group": "critical", "name": "trade_id unique in batch",
     "description": "IDs únicos por batch"},
    {"id": "RV-05", "group": "critical", "name": "|notional − price·qty| ≤ tol",
     "description": "Coherencia notional vs price·qty"},
    {"id": "RV-06", "group": "critical", "name": "timestamp within window",
     "description": "Timestamp dentro de ventana válida"},
    {"id": "RV-07", "group": "business", "name": "lot size by asset_class",
     "description": "Tamaño de lote mínimo por clase"},
    {"id": "RV-08", "group": "business", "name": "price within band of reference",
     "description": "Precio dentro de banda de referencia"},
    {"id": "RV-09", "group": "business", "name": "trader notional ≤ limit",
     "description": "Notional acumulado del trader bajo límite"},
    {"id": "RV-10", "group": "business", "name": "currency ↔ asset_class",
     "description": "Moneda coherente con asset_class"},
    {"id": "RV-11", "group": "business", "name": "counterparty ≤ % batch",
     "description": "Counterparty no excede % del batch"},
    {"id": "RV-12", "group": "business", "name": "venue in whitelist",
     "description": "Venue autorizado por asset_class"},
    {"id": "RV-13", "group": "context", "name": "wash trading detection",
     "description": "Detección heurística de wash trading"},
    {"id": "RV-14", "group": "context", "name": "price outlier (IQR)",
     "description": "Outlier de precio por IQR"},
]


def _deep_merge(dst: dict[str, Any], src: dict[str, Any]) -> None:
    """In-place deep merge of `src` into `dst`.
    Nested dicts merge recursively; lists/scalars replace wholesale.
    """
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            _deep_merge(dst[k], v)
        else:
            dst[k] = v


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
    app.state.kafka_consumer: KafkaTradeConsumer | None = None
    # Disabled rule IDs (toggle-only state for now; validator still runs
    # them — wiring the skip is a backlog item once we move the rule
    # registry out of trade_validator.py).
    app.state.disabled_rules: set[str] = set()

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

    # ----- Sources (uploads CSV / XLSX / Parquet) ---------------------
    @app.post("/sources/upload", response_model=SourceMetadata, status_code=201)
    async def sources_upload(file: UploadFile = File(...)) -> SourceMetadata:
        if not file.filename:
            raise HTTPException(status_code=400, detail="filename is required")
        raw = await file.read()
        try:
            meta = register_upload(file.filename, raw, app.state.config)
        except SourceError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        return SourceMetadata(**meta)

    @app.get("/sources", response_model=list[SourceMetadata])
    def sources_list() -> list[SourceMetadata]:
        return [SourceMetadata(**m) for m in list_sources(app.state.config)]

    @app.get("/sources/{source_id}", response_model=SourceMetadata)
    def sources_get(source_id: str) -> SourceMetadata:
        try:
            return SourceMetadata(**get_source(app.state.config, source_id))
        except SourceError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e

    @app.get("/sources/{source_id}/preview", response_model=SourcePreview)
    def sources_preview_endpoint(source_id: str) -> SourcePreview:
        try:
            return SourcePreview(**source_preview(app.state.config, source_id))
        except SourceError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e

    @app.post("/sources/{source_id}/mapping", response_model=SourceMetadata)
    def sources_mapping(
        source_id: str, req: SourceMappingRequest
    ) -> SourceMetadata:
        try:
            return SourceMetadata(
                **set_mapping(app.state.config, source_id, req.mapping)
            )
        except SourceError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    @app.delete("/sources/{source_id}")
    def sources_delete(source_id: str) -> Response:
        try:
            delete_source(app.state.config, source_id)
        except SourceError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return Response(status_code=204)

    @app.post("/sources/{source_id}/run", response_model=RunPipelineResponse)
    def sources_run(source_id: str) -> RunPipelineResponse:
        cfg = app.state.config
        try:
            df = load_dataframe(cfg, source_id)
        except SourceError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        try:
            result = run_pipeline(mode="upload", prebuilt_df=df, config=cfg)
        except PipelineStageError as e:
            raise HTTPException(
                status_code=500,
                detail={"stage": e.stage, "reason": e.reason},
            ) from e
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

    # ----- Kafka streaming --------------------------------------------
    @app.post("/kafka/connect", response_model=KafkaStatusResponse)
    async def kafka_connect(req: KafkaConnectRequest) -> KafkaStatusResponse:
        """Aplica overrides a la config y deja el consumer listo (sin arrancarlo)."""
        cfg = app.state.config
        _apply_kafka_overrides(cfg, req)
        # Si ya hay un consumer corriendo, lo paramos para reconfigurar.
        prev = app.state.kafka_consumer
        if prev is not None and prev.get_status()["state"] not in ("stopped", "error"):
            await prev.stop()
        callback = make_pipeline_callback(
            cfg, on_run=lambda r: _record_streamed_run(app, r)
        )
        app.state.kafka_consumer = KafkaTradeConsumer(cfg, callback)
        return KafkaStatusResponse(**app.state.kafka_consumer.get_status())

    @app.post("/kafka/start", response_model=KafkaStatusResponse)
    async def kafka_start() -> KafkaStatusResponse:
        consumer = _require_consumer(app)
        try:
            await consumer.start()
        except RuntimeError as e:
            raise HTTPException(status_code=409, detail=str(e)) from e
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Kafka start failed: {e}") from e
        return KafkaStatusResponse(**consumer.get_status())

    @app.post("/kafka/pause", response_model=KafkaStatusResponse)
    async def kafka_pause() -> KafkaStatusResponse:
        consumer = _require_consumer(app)
        await consumer.pause()
        return KafkaStatusResponse(**consumer.get_status())

    @app.post("/kafka/resume", response_model=KafkaStatusResponse)
    async def kafka_resume() -> KafkaStatusResponse:
        consumer = _require_consumer(app)
        await consumer.resume()
        return KafkaStatusResponse(**consumer.get_status())

    @app.post("/kafka/stop", response_model=KafkaStatusResponse)
    async def kafka_stop() -> KafkaStatusResponse:
        consumer = _require_consumer(app)
        await consumer.stop()
        return KafkaStatusResponse(**consumer.get_status())

    @app.get("/kafka/status", response_model=KafkaStatusResponse)
    def kafka_status() -> KafkaStatusResponse:
        consumer = app.state.kafka_consumer
        if consumer is None:
            cfg = app.state.config["kafka"]
            return KafkaStatusResponse(
                state="stopped",
                bootstrap_servers=str(cfg["bootstrap_servers"]),
                topic=str(cfg["topic"]),
            )
        return KafkaStatusResponse(**consumer.get_status())

    # ----- Rules (toggle catalog) -------------------------------------
    @app.get("/rules", response_model=RulesResponse)
    def rules_list() -> RulesResponse:
        disabled = app.state.disabled_rules
        rules = [
            {
                "id": r["id"],
                "group": r["group"],
                "name": r["name"],
                "description": r["description"],
                "enabled": r["id"] not in disabled,
            }
            for r in _RULES_CATALOG
        ]
        return RulesResponse(rules=rules, disabled_ids=sorted(disabled))

    @app.patch("/rules/{rule_id}", response_model=RulesResponse)
    def rules_patch(rule_id: str, req: RulePatchRequest) -> RulesResponse:
        if rule_id not in {r["id"] for r in _RULES_CATALOG}:
            raise HTTPException(status_code=404, detail=f"Unknown rule: {rule_id}")
        if req.enabled:
            app.state.disabled_rules.discard(rule_id)
        else:
            app.state.disabled_rules.add(rule_id)
        return rules_list()

    # ----- Settings (live editor) -------------------------------------
    @app.get("/settings", response_model=SettingsResponse)
    def settings_get() -> SettingsResponse:
        return SettingsResponse(settings=copy.deepcopy(app.state.config))

    @app.put("/settings", response_model=SettingsResponse)
    def settings_put(req: SettingsUpdateRequest) -> SettingsResponse:
        """Deep-merge `patch` into the in-memory settings dict.

        Effect is immediate for any module that reads `app.state.config`
        at call time (validator, generator, audit). Not persisted to
        `config/settings.yaml` on disk — restart drops the patch.
        """
        _deep_merge(app.state.config, req.patch)
        return SettingsResponse(settings=copy.deepcopy(app.state.config))

    @app.websocket("/ws/kafka/stats")
    async def kafka_stats_ws(websocket: WebSocket) -> None:
        await websocket.accept()
        interval_ms = int(
            app.state.config["kafka"]["stats"]["websocket_interval_ms"]
        )
        try:
            while True:
                consumer = app.state.kafka_consumer
                payload = (
                    consumer.get_status() if consumer is not None
                    else {"state": "stopped"}
                )
                await websocket.send_json(payload)
                await asyncio.sleep(interval_ms / 1000.0)
        except WebSocketDisconnect:
            return
        except Exception:  # noqa: BLE001
            logger.exception("ws/kafka/stats loop crashed")
            await websocket.close(code=1011)


# =====================================================================
# Helpers
# =====================================================================
def _require_last_run(app: FastAPI) -> dict[str, Any]:
    if app.state.last_run is None:
        raise HTTPException(status_code=404, detail="No pipeline run yet")
    return app.state.last_run


def _require_consumer(app: FastAPI) -> KafkaTradeConsumer:
    if app.state.kafka_consumer is None:
        raise HTTPException(
            status_code=409,
            detail="Kafka consumer not configured; call POST /kafka/connect first",
        )
    return app.state.kafka_consumer


def _apply_kafka_overrides(cfg: dict[str, Any], req: KafkaConnectRequest) -> None:
    """Aplica overrides parciales a cfg['kafka'] in-place."""
    k = cfg["kafka"]
    if req.bootstrap_servers is not None:
        k["bootstrap_servers"] = req.bootstrap_servers
    if req.topic is not None:
        k["topic"] = req.topic
    if req.group_id is not None:
        k["group_id"] = req.group_id
    if req.security_protocol is not None:
        k["security_protocol"] = req.security_protocol
    if req.sasl_mechanism is not None:
        k["sasl_mechanism"] = req.sasl_mechanism
    if req.auto_offset_reset is not None:
        k["auto_offset_reset"] = req.auto_offset_reset
    if req.buffer_max_size is not None:
        k["buffer"]["max_size"] = req.buffer_max_size
    if req.buffer_max_latency_ms is not None:
        k["buffer"]["max_latency_ms"] = req.buffer_max_latency_ms


def _record_streamed_run(app: FastAPI, result: dict[str, Any]) -> None:
    """Callback invocado por el consumer Kafka cuando termina un batch.

    Pseudonimiza, cachea como last_run y agrega al historial. Es lo mismo
    que hace pipeline_run(), centralizado para reuso.
    """
    salt = _get_salt(app.state.config)
    result = _pseudonymize_result(result, salt)
    app.state.last_run = result
    app.state.history.append(_history_entry(result).model_dump())


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
