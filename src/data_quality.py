"""
src/data_quality.py
===================
Métricas de calidad aplicadas en Etapa 3 (Transformación).

Produce el `quality_report`:
    - completeness: % de nulos por columna
    - uniqueness:   duplicados en trade_id
    - consistency:  |notional - price*qty| <= tolerancia
    - validity:     dominios (side, currency, asset_class, status)
    - outliers:     IQR por instrumento
    - score global ponderado [0, 100]
"""

from __future__ import annotations

import logging
from typing import Any

import polars as pl

logger = logging.getLogger(__name__)


def compute_quality_report(df: pl.DataFrame, config: dict[str, Any]) -> dict[str, Any]:
    cfg = config["data_quality"]
    weights: dict[str, float] = cfg["weights"]
    iqr_factor: float = float(cfg["iqr_factor"])
    valid_cfg = config["validator"]["critical"]
    tol: float = float(valid_cfg["notional_tolerance"])

    n = len(df)
    if n == 0:
        return _empty_report(weights)

    # -- 1. Completeness ----------------------------------------------
    completeness: dict[str, dict[str, Any]] = {}
    for col in df.columns:
        nulls = int(df[col].null_count())
        completeness[col] = {
            "nulls": nulls,
            "pct_null": round(nulls / n * 100, 4),
        }
    avg_completeness = 1 - sum(c["pct_null"] for c in completeness.values()) / (
        len(completeness) * 100
    )

    # -- 2. Uniqueness (trade_id) -------------------------------------
    if "trade_id" in df.columns:
        duplicates = n - int(df["trade_id"].n_unique())
        uniqueness = max(0.0, 1 - duplicates / n)
    else:
        duplicates = 0
        uniqueness = 1.0

    # -- 3. Consistency (notional == price * quantity) ----------------
    if {"notional", "price", "quantity"} <= set(df.columns):
        diff = (df["notional"] - df["price"] * df["quantity"]).abs()
        consistent = int((diff <= tol).sum())
        consistency = consistent / n
    else:
        consistency = 0.0

    # -- 4. Validity (dominios) ---------------------------------------
    validity_components: list[float] = []
    domain_checks = [
        ("side", valid_cfg["valid_sides"]),
        ("currency", valid_cfg["valid_currencies"]),
        ("asset_class", valid_cfg["valid_asset_classes"]),
        ("status", valid_cfg["valid_statuses"]),
    ]
    for col, allowed in domain_checks:
        if col not in df.columns:
            continue
        ok = int(df[col].is_in(allowed).sum())
        validity_components.append(ok / n)
    validity = sum(validity_components) / len(validity_components) if validity_components else 0.0

    # -- 5. Outliers (IQR por instrumento) ----------------------------
    outliers = 0
    if {"instrument", "price"} <= set(df.columns):
        for instr in df["instrument"].drop_nulls().unique().to_list():
            sub = df.filter(pl.col("instrument") == instr)
            if len(sub) < 4:
                continue
            q1 = sub["price"].quantile(0.25, interpolation="linear")
            q3 = sub["price"].quantile(0.75, interpolation="linear")
            if q1 is None or q3 is None:
                continue
            iqr = q3 - q1
            lo, hi = q1 - iqr_factor * iqr, q3 + iqr_factor * iqr
            outliers += int(
                sub.filter((pl.col("price") < lo) | (pl.col("price") > hi)).height
            )
    outliers_score = max(0.0, 1 - outliers / n)

    # -- Score ponderado ----------------------------------------------
    score = 100 * (
        avg_completeness * weights["completeness"] +
        uniqueness       * weights["uniqueness"] +
        consistency      * weights["consistency"] +
        validity         * weights["validity"] +
        outliers_score   * weights["outliers"]
    )

    return {
        "completeness": completeness,
        "uniqueness": round(uniqueness, 4),
        "duplicates": int(duplicates),
        "consistency": round(consistency, 4),
        "validity": round(validity, 4),
        "outliers_detected": int(outliers),
        "score": round(score, 2),
        "weights": weights,
    }


def _empty_report(weights: dict[str, float]) -> dict[str, Any]:
    return {
        "completeness": {},
        "uniqueness": 1.0,
        "duplicates": 0,
        "consistency": 1.0,
        "validity": 1.0,
        "outliers_detected": 0,
        "score": 0.0,
        "weights": weights,
    }
