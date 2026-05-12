"""
src/trade_extractor.py
======================
Extracción con tres modos: csv | api | dataframe.

Los tres modos producen el mismo esquema y pasan por la misma validación
Patito (presencia de columnas y tipos). Las reglas de negocio quedan para
el validator (Etapa 0).

Retorna (df, metadata) donde metadata trae:
    - mode usado
    - rows_read
    - timestamp_utc de la lectura
    - memory_mb estimado
"""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import patito as pt
import polars as pl

from src.audit import AuditLogger, load_config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Patito schema (estructura, no reglas de negocio)
# ---------------------------------------------------------------------
class TradeSchema(pt.Model):
    """Esquema mínimo: presencia de columnas y tipos.
    Permite null en cada celda — RV-01 del validator decide qué nulos
    son aceptables (counterparty_id y venue son los únicos legítimos)."""
    trade_id:        str | None = None
    timestamp:       datetime | None = None
    instrument:      str | None = None
    asset_class:     str | None = None
    side:            str | None = None
    quantity:        float | None = None
    price:           float | None = None
    notional:        float | None = None
    currency:        str | None = None
    counterparty_id: str | None = None
    trader_id:       str | None = None
    venue:           str | None = None
    status:          str | None = None


# Inyectable para tests: (url, headers, params, timeout) -> list[dict]
HttpClient = Callable[[str, dict[str, str], dict[str, Any], float], list[dict[str, Any]]]


# =====================================================================
# Entrypoint
# =====================================================================
def extract_trades(
    config: dict[str, Any] | None = None,
    *,
    mode: str | None = None,
    dataframe: pl.DataFrame | None = None,
    audit: AuditLogger | None = None,
    http_client: HttpClient | None = None,
) -> tuple[pl.DataFrame, dict[str, Any]]:
    """Extrae trades. Modo viene de config.extractor.mode salvo override.

    Args:
        config: settings dict; si None, carga config/settings.yaml.
        mode: override del modo ("csv" | "api" | "dataframe").
        dataframe: requerido sólo cuando mode == "dataframe".
        audit: AuditLogger (opcional) — si se pasa, registra accesos a la API.
        http_client: callable para inyectar en tests; default usa urllib.

    Returns:
        (df, metadata)
    """
    cfg = config if config is not None else load_config()
    mode = mode or cfg["extractor"]["mode"]

    if mode == "dataframe":
        if dataframe is None:
            raise ValueError("mode='dataframe' requires the `dataframe` parameter")
        df = dataframe
    elif mode == "csv":
        df = _extract_csv(cfg["extractor"]["csv"])
    elif mode == "api":
        df = _extract_api(cfg, audit=audit, http_client=http_client)
    else:
        raise ValueError(f"Unknown extractor mode: {mode!r}")

    df = _normalize(df)
    _validate_schema(df)

    metadata = {
        "mode": mode,
        "rows_read": len(df),
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "memory_mb": round(df.estimated_size("mb"), 4),
    }
    logger.info("extractor.%s rows=%d mem=%.4fMB", mode, len(df), metadata["memory_mb"])
    return df, metadata


# =====================================================================
# Modos
# =====================================================================
def _extract_csv(csv_cfg: dict[str, Any]) -> pl.DataFrame:
    path = Path(csv_cfg["path"])
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")
    encoding = csv_cfg.get("encoding", "utf-8")
    sep = csv_cfg.get("separator", ",")
    return pl.read_csv(path, encoding=encoding, separator=sep, try_parse_dates=True)


def _extract_api(
    full_cfg: dict[str, Any],
    audit: AuditLogger | None,
    http_client: HttpClient | None,
) -> pl.DataFrame:
    api_cfg = full_cfg["extractor"]["api"]
    url = api_cfg["url"]
    timeout = float(api_cfg.get("timeout_seconds", 30))
    params: dict[str, Any] = dict(api_cfg.get("params", {}))

    # Resolve from_date='auto' usando la ventana del validator
    if params.get("from_date") == "auto":
        days = full_cfg["validator"]["critical"]["timestamp_window_days"]
        params["from_date"] = (
            datetime.now(timezone.utc) - timedelta(days=days)
        ).isoformat()

    headers = _build_auth_headers(api_cfg)
    client = http_client if http_client is not None else _default_http_client

    try:
        records = client(url, headers, params, timeout)
        if audit is not None:
            audit.log_api_access(url, "extractor", "GET", 200)
    except Exception:
        if audit is not None:
            audit.log_api_access(url, "extractor", "GET", 500)
        raise

    if not records:
        return pl.DataFrame(schema=TradeSchema.dtypes)
    return pl.DataFrame(records)


def _build_auth_headers(api_cfg: dict[str, Any]) -> dict[str, str]:
    auth_type = api_cfg.get("auth_type", "bearer")
    token_env = api_cfg.get("token_env")
    if not token_env:
        return {}
    token = os.environ.get(token_env, "")
    if not token:
        return {}
    if auth_type == "bearer":
        return {"Authorization": f"Bearer {token}"}
    if auth_type == "api_key":
        return {"X-API-Key": token}
    return {}


def _default_http_client(
    url: str,
    headers: dict[str, str],
    params: dict[str, Any],
    timeout: float,
) -> list[dict[str, Any]]:
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    # URL comes from settings.yaml (operator-controlled); not user input.
    req = urllib.request.Request(url, headers=headers, method="GET")  # noqa: S310
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310  # nosec B310
        body = resp.read()
    payload = json.loads(body)
    if isinstance(payload, dict) and "trades" in payload:
        return payload["trades"]
    if isinstance(payload, list):
        return payload
    raise ValueError(f"Unexpected API payload shape: {type(payload).__name__}")


# =====================================================================
# Normalización + validación de esquema
# =====================================================================
def _normalize(df: pl.DataFrame) -> pl.DataFrame:
    """Asegura que `timestamp` sea Datetime; del CSV puede venir como Utf8."""
    if "timestamp" in df.columns and df.schema["timestamp"] == pl.Utf8:
        df = df.with_columns(
            pl.col("timestamp").str.to_datetime(strict=False).alias("timestamp")
        )
    return df


def _validate_schema(df: pl.DataFrame) -> None:
    """Valida con Patito: levanta DataFrameValidationError si falla."""
    TradeSchema.validate(df)
