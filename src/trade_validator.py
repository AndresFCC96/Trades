"""
src/trade_validator.py
======================
Etapa de validación previa: 14 reglas en 3 grupos.

    1. Críticas (RV-01..RV-06): por trade, baratas.
    2. Negocio (RV-07..RV-12): por instrumento o subgrupo.
    3. Contextuales (RV-13, RV-14): requieren batch entero.

Las reglas se evalúan en orden. Un trade que falla cualquier regla se
descarta completamente y se loguea en auditoría con rule_id, campo,
valor y motivo. La salida son SOLO los trades que pasaron las 14 reglas.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any

import polars as pl

from src.audit import AuditLogger

logger = logging.getLogger(__name__)


RuleResult = tuple[pl.DataFrame, list[dict[str, Any]]]
RuleFn = Callable[[pl.DataFrame], RuleResult]


class TradeValidator:
    """Aplica las 14 reglas RV-XX en orden y registra rechazos en auditoría."""

    def __init__(self, config: dict[str, Any], audit_logger: AuditLogger) -> None:
        self.config = config
        self.cfg = config["validator"]
        self.audit = audit_logger

        gen_cfg = config.get("generator", {})
        self.reference_prices: dict[str, float] = gen_cfg.get("reference_prices", {})
        self.forex_pairs: dict[str, list[str]] = gen_cfg.get("forex_pair_currencies", {})

    # =================================================================
    # Entrypoint
    # =================================================================
    def validate(self, df: pl.DataFrame) -> tuple[pl.DataFrame, dict[str, Any]]:
        summary: dict[str, Any] = {
            "total_in": len(df),
            "rejected_by_rule": {},
        }

        rules: list[tuple[str, str, RuleFn]] = [
            # --- Críticas ---
            ("RV-01", "Required fields not null",          self._rv01_required_fields),
            ("RV-02", "price > 0 and quantity > 0",        self._rv02_positive_price_qty),
            ("RV-03", "side in {BUY, SELL}",               self._rv03_valid_side),
            ("RV-04", "trade_id unique in batch",          self._rv04_unique_trade_id),
            ("RV-05", "|notional - price*qty| <= tol",     self._rv05_notional_consistency),
            ("RV-06", "timestamp within window",           self._rv06_timestamp_window),
            # --- Negocio ---
            ("RV-07", "lot size by asset_class",           self._rv07_lot_size),
            ("RV-08", "price within band of reference",    self._rv08_price_band),
            ("RV-09", "trader notional <= limit",          self._rv09_trader_notional),
            ("RV-10", "currency coherent with asset_class",self._rv10_currency_asset_class),
            ("RV-11", "counterparty <= % of batch",        self._rv11_counterparty_concentration),
            ("RV-12", "venue in whitelist by asset_class", self._rv12_venue_whitelist),
            # --- Contextuales ---
            ("RV-13", "wash trading detection",            self._rv13_wash_trading),
            ("RV-14", "price outlier (IQR)",               self._rv14_outlier_iqr),
        ]

        for rule_id, description, rule_fn in rules:
            if df.is_empty():
                summary["rejected_by_rule"][rule_id] = 0
                continue
            df, rejections = rule_fn(df)
            for r in rejections:
                self.audit.log_rejection(
                    trade_id=r["trade_id"],
                    rule_id=rule_id,
                    rule_description=r.get("description", description),
                    field=r["field"],
                    value=r["value"],
                )
            summary["rejected_by_rule"][rule_id] = len(rejections)
            logger.info(
                "validator.%s rejected=%d remaining=%d",
                rule_id, len(rejections), len(df),
            )

        summary["total_out"] = len(df)
        summary["total_rejected"] = summary["total_in"] - summary["total_out"]
        return df, summary

    # =================================================================
    # Reglas críticas (RV-01..RV-06)
    # =================================================================
    def _rv01_required_fields(self, df: pl.DataFrame) -> RuleResult:
        required = self.cfg["critical"]["required_fields"]

        # Si una columna requerida no existe, marcamos todo el batch como inválido
        missing_columns = [f for f in required if f not in df.columns]
        if missing_columns:
            rejections = []
            for row in df.iter_rows(named=True):
                rejections.append({
                    "trade_id": row.get("trade_id") or "<missing>",
                    "field": missing_columns[0],
                    "value": None,
                    "description": f"required field '{missing_columns[0]}' is absent from batch",
                })
            return df.head(0), rejections

        invalid_mask_expr = pl.lit(False)
        for f in required:
            invalid_mask_expr = invalid_mask_expr | pl.col(f).is_null()

        invalid = df.filter(invalid_mask_expr)
        rejections = []
        for row in invalid.iter_rows(named=True):
            for f in required:
                if row.get(f) is None:
                    rejections.append({
                        "trade_id": row.get("trade_id") or "<missing>",
                        "field": f,
                        "value": None,
                        "description": f"required field '{f}' is null",
                    })
                    break
        kept = df.filter(~invalid_mask_expr)
        return kept, rejections

    def _rv02_positive_price_qty(self, df: pl.DataFrame) -> RuleResult:
        invalid = df.filter((pl.col("price") <= 0) | (pl.col("quantity") <= 0))
        rejections: list[dict[str, Any]] = []
        for r in invalid.iter_rows(named=True):
            if r["price"] is not None and r["price"] <= 0:
                rejections.append({
                    "trade_id": r["trade_id"], "field": "price", "value": r["price"],
                    "description": "price must be > 0",
                })
            else:
                rejections.append({
                    "trade_id": r["trade_id"], "field": "quantity", "value": r["quantity"],
                    "description": "quantity must be > 0",
                })
        kept = df.filter((pl.col("price") > 0) & (pl.col("quantity") > 0))
        return kept, rejections

    def _rv03_valid_side(self, df: pl.DataFrame) -> RuleResult:
        valid_sides = self.cfg["critical"]["valid_sides"]
        invalid = df.filter(~pl.col("side").is_in(valid_sides))
        rejections = [
            {"trade_id": r["trade_id"], "field": "side", "value": r["side"],
             "description": f"side must be one of {valid_sides}"}
            for r in invalid.iter_rows(named=True)
        ]
        kept = df.filter(pl.col("side").is_in(valid_sides))
        return kept, rejections

    def _rv04_unique_trade_id(self, df: pl.DataFrame) -> RuleResult:
        counts = df.group_by("trade_id").len()
        dup_ids = counts.filter(pl.col("len") > 1)["trade_id"].to_list()
        invalid = df.filter(pl.col("trade_id").is_in(dup_ids))
        rejections = [
            {"trade_id": r["trade_id"], "field": "trade_id", "value": r["trade_id"],
             "description": "trade_id is not unique in batch"}
            for r in invalid.iter_rows(named=True)
        ]
        kept = df.filter(~pl.col("trade_id").is_in(dup_ids))
        return kept, rejections

    def _rv05_notional_consistency(self, df: pl.DataFrame) -> RuleResult:
        tol = self.cfg["critical"]["notional_tolerance"]
        diff = (pl.col("notional") - pl.col("price") * pl.col("quantity")).abs()
        invalid = df.filter(diff > tol)
        rejections = [
            {"trade_id": r["trade_id"], "field": "notional", "value": r["notional"],
             "description": f"|notional - price*quantity| > {tol}"}
            for r in invalid.iter_rows(named=True)
        ]
        kept = df.filter(diff <= tol)
        return kept, rejections

    def _rv06_timestamp_window(self, df: pl.DataFrame) -> RuleResult:
        days = self.cfg["critical"]["timestamp_window_days"]
        now = datetime.now(timezone.utc)
        lower = now - timedelta(days=days)

        ts_dtype = df.schema.get("timestamp")
        if isinstance(ts_dtype, pl.Datetime) and ts_dtype.time_zone is None:
            now = now.replace(tzinfo=None)
            lower = lower.replace(tzinfo=None)

        invalid = df.filter((pl.col("timestamp") < lower) | (pl.col("timestamp") > now))
        rejections = [
            {"trade_id": r["trade_id"], "field": "timestamp", "value": r["timestamp"],
             "description": f"timestamp outside [{lower.isoformat()}, {now.isoformat()}]"}
            for r in invalid.iter_rows(named=True)
        ]
        kept = df.filter((pl.col("timestamp") >= lower) & (pl.col("timestamp") <= now))
        return kept, rejections

    # =================================================================
    # Reglas de negocio (RV-07..RV-12)
    # =================================================================
    def _rv07_lot_size(self, df: pl.DataFrame) -> RuleResult:
        lots = self.cfg["business"]["min_lot_size"]
        rejections: list[dict[str, Any]] = []
        invalid_ids: list[str] = []

        for ac, min_lot in lots.items():
            sub = df.filter(pl.col("asset_class") == ac)
            if sub.is_empty():
                continue
            if ac == "equity":
                bad = sub.filter(
                    (pl.col("quantity") < min_lot) |
                    (pl.col("quantity") - pl.col("quantity").floor() != 0)
                )
            elif ac == "fixed_income":
                bad = sub.filter(
                    (pl.col("quantity") < min_lot) |
                    ((pl.col("quantity") % min_lot).abs() > 1e-6)
                )
            else:  # forex, crypto
                bad = sub.filter(pl.col("quantity") < min_lot)
            for r in bad.iter_rows(named=True):
                rejections.append({
                    "trade_id": r["trade_id"], "field": "quantity", "value": r["quantity"],
                    "description": f"{ac}: quantity={r['quantity']} fails lot rule (min={min_lot})",
                })
                invalid_ids.append(r["trade_id"])

        kept = df.filter(~pl.col("trade_id").is_in(invalid_ids))
        return kept, rejections

    def _rv08_price_band(self, df: pl.DataFrame) -> RuleResult:
        band = self.cfg["business"]["price_band_pct"]
        refs = self.reference_prices
        rejections: list[dict[str, Any]] = []
        invalid_ids: list[str] = []

        for instr, ref in refs.items():
            sub = df.filter(pl.col("instrument") == instr)
            if sub.is_empty():
                continue
            lo, hi = ref * (1 - band), ref * (1 + band)
            bad = sub.filter((pl.col("price") < lo) | (pl.col("price") > hi))
            for r in bad.iter_rows(named=True):
                rejections.append({
                    "trade_id": r["trade_id"], "field": "price", "value": r["price"],
                    "description": f"{instr}: price={r['price']} outside ±{band*100:.0f}% of ref={ref}",
                })
                invalid_ids.append(r["trade_id"])

        kept = df.filter(~pl.col("trade_id").is_in(invalid_ids))
        return kept, rejections

    def _rv09_trader_notional(self, df: pl.DataFrame) -> RuleResult:
        # Nota: la suma asume notional ya en una unidad comparable (USD-equiv).
        # Una implementación real haría conversión FX antes de sumar.
        limit = self.cfg["business"]["max_notional_per_trader_usd"]
        sums = df.group_by("trader_id").agg(pl.col("notional").sum().alias("total"))
        over = sums.filter(pl.col("total") > limit)["trader_id"].to_list()
        invalid = df.filter(pl.col("trader_id").is_in(over))
        rejections = [
            {"trade_id": r["trade_id"], "field": "trader_id", "value": r["trader_id"],
             "description": f"trader notional sum > {limit}"}
            for r in invalid.iter_rows(named=True)
        ]
        kept = df.filter(~pl.col("trader_id").is_in(over))
        return kept, rejections

    def _rv10_currency_asset_class(self, df: pl.DataFrame) -> RuleResult:
        rules = self.cfg["business"]["currency_by_asset_class"]
        rejections: list[dict[str, Any]] = []
        invalid_ids: list[str] = []

        # equity, fixed_income, crypto: lista cerrada
        for ac, valids in rules.items():
            sub = df.filter(pl.col("asset_class") == ac)
            bad = sub.filter(~pl.col("currency").is_in(valids))
            for r in bad.iter_rows(named=True):
                rejections.append({
                    "trade_id": r["trade_id"], "field": "currency", "value": r["currency"],
                    "description": f"{ac}: currency={r['currency']} not in {valids}",
                })
                invalid_ids.append(r["trade_id"])

        # forex: la moneda debe ser una de las dos del par
        forex = df.filter(pl.col("asset_class") == "forex")
        for r in forex.iter_rows(named=True):
            pair = self.forex_pairs.get(r["instrument"], [])
            if pair and r["currency"] not in pair:
                rejections.append({
                    "trade_id": r["trade_id"], "field": "currency", "value": r["currency"],
                    "description": f"forex {r['instrument']}: currency not in pair {pair}",
                })
                invalid_ids.append(r["trade_id"])

        kept = df.filter(~pl.col("trade_id").is_in(invalid_ids))
        return kept, rejections

    def _rv11_counterparty_concentration(self, df: pl.DataFrame) -> RuleResult:
        pct_limit = self.cfg["business"]["max_counterparty_concentration_pct"]
        non_null = df.filter(pl.col("counterparty_id").is_not_null())
        if non_null.is_empty():
            return df, []
        total = non_null["notional"].sum() or 0
        if total == 0:
            return df, []
        sums = non_null.group_by("counterparty_id").agg(pl.col("notional").sum().alias("total"))
        over = sums.filter(pl.col("total") / total > pct_limit)["counterparty_id"].to_list()
        invalid = df.filter(pl.col("counterparty_id").is_in(over))
        rejections = [
            {"trade_id": r["trade_id"], "field": "counterparty_id", "value": r["counterparty_id"],
             "description": f"counterparty notional > {pct_limit*100:.0f}% of batch"}
            for r in invalid.iter_rows(named=True)
        ]
        invalid_trade_ids = invalid["trade_id"].to_list()
        kept = df.filter(~pl.col("trade_id").is_in(invalid_trade_ids))
        return kept, rejections

    def _rv12_venue_whitelist(self, df: pl.DataFrame) -> RuleResult:
        whitelist = self.cfg["business"]["venue_whitelist"]
        rejections: list[dict[str, Any]] = []
        invalid_ids: list[str] = []

        for ac, valids in whitelist.items():
            sub = df.filter(pl.col("asset_class") == ac)
            # venue es nullable: solo evaluamos cuando viene
            bad = sub.filter(pl.col("venue").is_not_null() & ~pl.col("venue").is_in(valids))
            for r in bad.iter_rows(named=True):
                rejections.append({
                    "trade_id": r["trade_id"], "field": "venue", "value": r["venue"],
                    "description": f"{ac}: venue={r['venue']} not in {valids}",
                })
                invalid_ids.append(r["trade_id"])

        kept = df.filter(~pl.col("trade_id").is_in(invalid_ids))
        return kept, rejections

    # =================================================================
    # Reglas contextuales (RV-13, RV-14)
    # =================================================================
    def _rv13_wash_trading(self, df: pl.DataFrame) -> RuleResult:
        # Mismo trader_id + instrumento + quantity con BOTH BUY y SELL
        grouped = df.group_by(["trader_id", "instrument", "quantity"]).agg([
            pl.col("side").n_unique().alias("n_sides"),
            pl.col("trade_id").alias("trade_ids"),
        ])
        wash = grouped.filter(pl.col("n_sides") >= 2)
        wash_ids: list[str] = []
        for row in wash.iter_rows(named=True):
            wash_ids.extend(row["trade_ids"])

        invalid = df.filter(pl.col("trade_id").is_in(wash_ids))
        rejections = [
            {"trade_id": r["trade_id"], "field": "trade_id", "value": r["trade_id"],
             "description": f"wash: trader+{r['instrument']}+qty={r['quantity']} has BUY and SELL"}
            for r in invalid.iter_rows(named=True)
        ]
        kept = df.filter(~pl.col("trade_id").is_in(wash_ids))
        return kept, rejections

    def _rv14_outlier_iqr(self, df: pl.DataFrame) -> RuleResult:
        factor = self.cfg["contextual"]["iqr_factor"]
        rejections: list[dict[str, Any]] = []
        invalid_ids: list[str] = []

        for instr in df["instrument"].unique().to_list():
            sub = df.filter(pl.col("instrument") == instr)
            if len(sub) < 4:
                continue
            q1 = sub["price"].quantile(0.25, interpolation="linear")
            q3 = sub["price"].quantile(0.75, interpolation="linear")
            if q1 is None or q3 is None:
                continue
            iqr = q3 - q1
            lo, hi = q1 - factor * iqr, q3 + factor * iqr
            bad = sub.filter((pl.col("price") < lo) | (pl.col("price") > hi))
            for r in bad.iter_rows(named=True):
                rejections.append({
                    "trade_id": r["trade_id"], "field": "price", "value": r["price"],
                    "description": f"{instr}: price={r['price']} outside IQR×{factor} [{lo:.2f},{hi:.2f}]",
                })
                invalid_ids.append(r["trade_id"])

        kept = df.filter(~pl.col("trade_id").is_in(invalid_ids))
        return kept, rejections


# Convenience function-style entrypoint
def validate_trades(
    df: pl.DataFrame,
    config: dict[str, Any],
    audit_logger: AuditLogger,
) -> tuple[pl.DataFrame, dict[str, Any]]:
    return TradeValidator(config, audit_logger).validate(df)
