"""
src/sources.py
==============
Fuentes externas subidas por el usuario: CSV / XLSX / Parquet.

Cada upload genera un `source_id` (UUID4). Los archivos viven en
`sources.upload_dir/<source_id>/file.<ext>` y junto a ellos se guarda
`metadata.json` con los datos del upload y el column-mapping opcional.

La carga a DataFrame es lazy (sólo cuando el usuario pide preview o
ejecuta el pipeline contra la fuente). El mapping permite alinear
columnas del archivo a los nombres de TradeSchema sin transformar el
archivo original.
"""

from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import polars as pl

logger = logging.getLogger(__name__)

# Columnas que cualquier fuente debe poder mapear a TradeSchema.
TRADE_COLUMNS: tuple[str, ...] = (
    "trade_id", "timestamp", "instrument", "asset_class", "side",
    "quantity", "price", "notional", "currency",
    "counterparty_id", "trader_id", "venue", "status",
)

# Tipos canónicos esperados por TradeSchema. CSV/XLSX traen tipos
# heurísticos (un quantity="10" se parsea como Int64); aquí coercemos
# para que Patito no rechace por dtype.
_NUMERIC_FLOAT_COLS: tuple[str, ...] = ("quantity", "price", "notional")


class SourceError(Exception):
    """Error de manejo de fuentes (archivo inválido, mapping incompleto, etc.)."""


# =====================================================================
# Persistencia en disco
# =====================================================================
def _sources_root(config: dict[str, Any]) -> Path:
    return Path(config["sources"]["upload_dir"])


def _source_dir(config: dict[str, Any], source_id: str) -> Path:
    return _sources_root(config) / source_id


def _metadata_path(config: dict[str, Any], source_id: str) -> Path:
    return _source_dir(config, source_id) / "metadata.json"


def _file_path(config: dict[str, Any], source_id: str) -> Path:
    meta = _read_metadata(config, source_id)
    return _source_dir(config, source_id) / f"file{meta['ext']}"


def _read_metadata(config: dict[str, Any], source_id: str) -> dict[str, Any]:
    p = _metadata_path(config, source_id)
    if not p.exists():
        raise SourceError(f"Source not found: {source_id}")
    return json.loads(p.read_text(encoding="utf-8"))


def _write_metadata(config: dict[str, Any], source_id: str, meta: dict[str, Any]) -> None:
    p = _metadata_path(config, source_id)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(meta, indent=2), encoding="utf-8")


# =====================================================================
# Public API
# =====================================================================
def register_upload(
    filename: str,
    raw_bytes: bytes,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Guarda un archivo subido y devuelve su metadata."""
    cfg = config["sources"]
    allowed: list[str] = cfg["allowed_extensions"]
    max_mb: float = float(cfg["max_upload_mb"])

    ext = Path(filename).suffix.lower()
    if ext not in allowed:
        raise SourceError(
            f"Extension {ext!r} not allowed. Allowed: {allowed}"
        )
    size_mb = len(raw_bytes) / (1024 * 1024)
    if size_mb > max_mb:
        raise SourceError(
            f"File size {size_mb:.2f}MB exceeds max {max_mb}MB"
        )

    source_id = str(uuid4())
    sdir = _source_dir(config, source_id)
    sdir.mkdir(parents=True, exist_ok=True)
    (sdir / f"file{ext}").write_bytes(raw_bytes)

    meta = {
        "source_id": source_id,
        "original_name": filename,
        "ext": ext,
        "size_bytes": len(raw_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "mapping": {},
        "row_count": None,         # se rellena al primer preview/load
        "column_names": None,
    }
    _write_metadata(config, source_id, meta)
    logger.info("sources.upload id=%s name=%s size=%dB", source_id, filename, len(raw_bytes))
    return meta


def list_sources(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Lista todas las fuentes registradas (lee metadata.json de cada subdir)."""
    root = _sources_root(config)
    if not root.exists():
        return []
    out: list[dict[str, Any]] = []
    for sub in sorted(root.iterdir()):
        if not sub.is_dir():
            continue
        meta_p = sub / "metadata.json"
        if meta_p.exists():
            try:
                out.append(json.loads(meta_p.read_text(encoding="utf-8")))
            except json.JSONDecodeError:
                logger.warning("sources.list skipped invalid metadata at %s", meta_p)
    return out


def get_source(config: dict[str, Any], source_id: str) -> dict[str, Any]:
    return _read_metadata(config, source_id)


def delete_source(config: dict[str, Any], source_id: str) -> None:
    sdir = _source_dir(config, source_id)
    if not sdir.exists():
        raise SourceError(f"Source not found: {source_id}")
    shutil.rmtree(sdir)
    logger.info("sources.delete id=%s", source_id)


def set_mapping(
    config: dict[str, Any],
    source_id: str,
    mapping: dict[str, str],
) -> dict[str, Any]:
    """Define el mapeo columna-origen → columna-TradeSchema.

    El mapping se valida contra TRADE_COLUMNS. Columnas destino desconocidas
    o duplicadas levantan SourceError.
    """
    targets = list(mapping.values())
    unknown = [t for t in targets if t not in TRADE_COLUMNS]
    if unknown:
        raise SourceError(f"Unknown target columns: {unknown}")
    if len(set(targets)) != len(targets):
        raise SourceError("Duplicated target columns in mapping")

    meta = _read_metadata(config, source_id)
    meta["mapping"] = mapping
    _write_metadata(config, source_id, meta)
    return meta


def preview(
    config: dict[str, Any],
    source_id: str,
    n: int | None = None,
) -> dict[str, Any]:
    """Lee las primeras N filas del archivo y devuelve preview + columnas."""
    n = n if n is not None else int(config["sources"]["preview_rows"])
    df = _read_file(config, source_id, head=n)

    meta = _read_metadata(config, source_id)
    meta["column_names"] = df.columns
    _write_metadata(config, source_id, meta)

    return {
        "source_id": source_id,
        "columns": df.columns,
        "rows": df.to_dicts(),
        "row_count_preview": len(df),
    }


def load_dataframe(config: dict[str, Any], source_id: str) -> pl.DataFrame:
    """Carga la fuente completa aplicando el mapping configurado.

    Si hay mapping, las columnas se renombran y se eligen sólo las
    presentes en TRADE_COLUMNS. Si no hay mapping, se devuelve tal cual
    el archivo (el extractor validará con Patito después).
    """
    meta = _read_metadata(config, source_id)
    df = _read_file(config, source_id, head=None)

    mapping: dict[str, str] = meta.get("mapping") or {}
    if mapping:
        present = {src: dst for src, dst in mapping.items() if src in df.columns}
        missing_src = sorted(set(mapping) - set(df.columns))
        if missing_src:
            raise SourceError(
                f"Mapping references columns not in file: {missing_src}"
            )
        df = df.rename(present)
        keep = [c for c in df.columns if c in TRADE_COLUMNS]
        df = df.select(keep)

    df = _coerce_to_trade_schema(df)
    meta["row_count"] = len(df)
    meta["column_names"] = df.columns
    _write_metadata(config, source_id, meta)
    return df


def _coerce_to_trade_schema(df: pl.DataFrame) -> pl.DataFrame:
    """Coerciona tipos numéricos para alinear con TradeSchema (Float64).
    Sin esto, un CSV con `quantity=10` queda como Int64 y Patito lo rechaza.
    """
    casts = [
        pl.col(c).cast(pl.Float64, strict=False).alias(c)
        for c in _NUMERIC_FLOAT_COLS
        if c in df.columns
    ]
    return df.with_columns(casts) if casts else df


# =====================================================================
# Lectores por extensión
# =====================================================================
def _read_file(
    config: dict[str, Any],
    source_id: str,
    head: int | None,
) -> pl.DataFrame:
    meta = _read_metadata(config, source_id)
    ext = meta["ext"]
    path = _file_path(config, source_id)

    if ext == ".csv":
        df = pl.read_csv(path, try_parse_dates=True, n_rows=head)
    elif ext in (".xlsx", ".xls"):
        df = pl.read_excel(path)
        if head is not None:
            df = df.head(head)
    elif ext == ".parquet":
        df = pl.read_parquet(path, n_rows=head)
    else:
        raise SourceError(f"Unsupported extension at read: {ext}")
    return df
