"""
src/business_rules.py
=====================
Reglas de negocio aplicadas en Etapa 3 (Transformación).

Produce el `business_report`:
    - resumen por asset_class
    - distribución de riesgo (high / medium / low)
    - top N contrapartes por volumen
    - concentración por venue
    - análisis temporal (por día y por hora)
"""

from __future__ import annotations

import logging
from typing import Any

import polars as pl

logger = logging.getLogger(__name__)


def compute_business_report(df: pl.DataFrame, config: dict[str, Any]) -> dict[str, Any]:
    cfg = config["business_rules"]
    high_t: float = cfg["risk_buckets"]["high_threshold_usd"]
    med_t: float = cfg["risk_buckets"]["medium_threshold_usd"]
    top_n: int = int(cfg["top_counterparties"])

    if df.is_empty():
        return _empty_report()

    lf = df.lazy()
    total_notional = float(df["notional"].sum() or 0.0)

    # -- 1. Resumen por asset_class -----------------------------------
    by_class = (
        lf.group_by("asset_class")
        .agg([
            pl.col("notional").sum().alias("total_notional"),
            pl.col("price").mean().alias("avg_price"),
            pl.len().alias("trade_count"),
            (pl.col("side") == "BUY").sum().alias("buy_count"),
            (pl.col("side") == "SELL").sum().alias("sell_count"),
        ])
        .with_columns([
            (pl.col("buy_count") / pl.col("trade_count")).alias("buy_pct"),
            (pl.col("sell_count") / pl.col("trade_count")).alias("sell_pct"),
        ])
        .sort("asset_class")
        .collect()
    )

    # -- 2. Distribución de riesgo ------------------------------------
    risk = (
        lf.with_columns(
            pl.when(pl.col("notional") > high_t).then(pl.lit("high"))
            .when(pl.col("notional") >= med_t).then(pl.lit("medium"))
            .otherwise(pl.lit("low"))
            .alias("risk_bucket")
        )
        .group_by("risk_bucket")
        .agg(pl.len().alias("count"))
        .collect()
    )
    risk_dist = {"high": 0, "medium": 0, "low": 0}
    for r in risk.to_dicts():
        risk_dist[r["risk_bucket"]] = int(r["count"])

    # -- 3. Top contrapartes por volumen ------------------------------
    top_cp = (
        lf.filter(pl.col("counterparty_id").is_not_null())
        .group_by("counterparty_id")
        .agg([
            pl.col("notional").sum().alias("total_volume"),
            pl.len().alias("trade_count"),
        ])
        .sort("total_volume", descending=True)
        .head(top_n)
        .collect()
    )

    # -- 4. Concentración por venue -----------------------------------
    venue = (
        lf.filter(pl.col("venue").is_not_null())
        .group_by("venue")
        .agg([
            pl.col("notional").sum().alias("total_notional"),
            pl.len().alias("trade_count"),
        ])
        .sort("total_notional", descending=True)
        .collect()
    )
    if total_notional > 0:
        venue = venue.with_columns(
            (pl.col("total_notional") / total_notional).alias("share")
        )
    else:
        venue = venue.with_columns(pl.lit(0.0).alias("share"))

    # -- 5. Análisis temporal -----------------------------------------
    by_day = (
        lf.with_columns(pl.col("timestamp").dt.date().alias("day"))
        .group_by("day")
        .agg([
            pl.len().alias("trade_count"),
            pl.col("notional").sum().alias("total_notional"),
        ])
        .sort("day")
        .collect()
    )
    by_hour = (
        lf.with_columns(pl.col("timestamp").dt.hour().alias("hour"))
        .group_by("hour")
        .agg([
            pl.len().alias("trade_count"),
            pl.col("notional").sum().alias("total_notional"),
        ])
        .sort("hour")
        .collect()
    )

    return {
        "by_asset_class": by_class.to_dicts(),
        "risk_distribution": risk_dist,
        "top_counterparties": top_cp.to_dicts(),
        "venue_concentration": venue.to_dicts(),
        "by_day": [
            {"day": str(r["day"]), "trade_count": r["trade_count"],
             "total_notional": r["total_notional"]}
            for r in by_day.to_dicts()
        ],
        "by_hour": by_hour.to_dicts(),
        "summary": {
            "total_trades": int(len(df)),
            "total_notional": total_notional,
        },
    }


def _empty_report() -> dict[str, Any]:
    return {
        "by_asset_class": [],
        "risk_distribution": {"high": 0, "medium": 0, "low": 0},
        "top_counterparties": [],
        "venue_concentration": [],
        "by_day": [],
        "by_hour": [],
        "summary": {"total_trades": 0, "total_notional": 0.0},
    }
