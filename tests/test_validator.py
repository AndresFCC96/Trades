"""
tests/test_validator.py
=======================
Cobertura de las 14 reglas RV-XX, orquestación y auditoría de rechazos.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import polars as pl
import pytest
from src.audit import AuditLogger, EventType, load_config
from src.trade_validator import TradeValidator, validate_trades


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture(scope="module")
def cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def audit(tmp_path) -> AuditLogger:
    audit_cfg = {"audit": {"output_dir": str(tmp_path / "audit"), "flush_each_event": True}}
    return AuditLogger(audit_cfg)


@pytest.fixture
def validator(cfg, audit) -> TradeValidator:
    return TradeValidator(cfg, audit)


@pytest.fixture
def now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@pytest.fixture
def make_trade(now_naive):
    """Factory de un trade válido baseline. Cada llamada incrementa el contador
    para que trade_id, trader_id y counterparty_id sean únicos por defecto."""
    counter = {"n": 0}

    def _make(**overrides):
        counter["n"] += 1
        n = counter["n"]
        base = {
            "trade_id": f"T-{n:04d}",
            "timestamp": now_naive - timedelta(hours=1),
            "instrument": "AAPL",
            "asset_class": "equity",
            "side": "BUY",
            "quantity": 100.0,
            "price": 180.0,
            "notional": 18_000.0,
            "currency": "USD",
            "counterparty_id": f"CP-{n:04d}",
            "trader_id": f"TR-{n:04d}",
            "venue": "NYSE",
            "status": "executed",
        }
        base.update(overrides)
        return base
    return _make


SCHEMA = {
    "trade_id": pl.Utf8,
    "timestamp": pl.Datetime("us"),
    "instrument": pl.Utf8,
    "asset_class": pl.Utf8,
    "side": pl.Utf8,
    "quantity": pl.Float64,
    "price": pl.Float64,
    "notional": pl.Float64,
    "currency": pl.Utf8,
    "counterparty_id": pl.Utf8,
    "trader_id": pl.Utf8,
    "venue": pl.Utf8,
    "status": pl.Utf8,
}


def make_df(trades: list[dict]) -> pl.DataFrame:
    return pl.DataFrame(trades, schema=SCHEMA)


@pytest.fixture
def valid_batch(make_trade):
    """5 trades válidos, traders y counterparties únicos. Útil como 'fondo'
    para que los rechazos parciales no dejen un batch tan chico que RV-11
    dispare por concentración."""
    return [make_trade() for _ in range(5)]


# =====================================================================
# Orquestación / sanity
# =====================================================================
class TestOrchestration:
    def test_all_valid_pass(self, valid_batch, validator):
        df = make_df(valid_batch)
        valid, summary = validator.validate(df)
        assert summary["total_in"] == 5
        assert summary["total_out"] == 5
        assert summary["total_rejected"] == 0
        assert all(v == 0 for v in summary["rejected_by_rule"].values())

    def test_empty_input(self, validator):
        df = make_df([])
        valid, summary = validator.validate(df)
        assert summary["total_in"] == 0
        assert summary["total_out"] == 0
        assert valid.is_empty()

    def test_summary_includes_all_14_rules(self, valid_batch, validator):
        df = make_df(valid_batch)
        _, summary = validator.validate(df)
        expected = {f"RV-{i:02d}" for i in range(1, 15)}
        assert set(summary["rejected_by_rule"].keys()) == expected

    def test_function_entrypoint(self, valid_batch, cfg, audit):
        df = make_df(valid_batch)
        valid, summary = validate_trades(df, cfg, audit)
        assert summary["total_out"] == 5


# =====================================================================
# Reglas críticas
# =====================================================================
class TestRV01_RequiredFields:
    def test_null_price_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(price=None)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-01"] == 1
        assert summary["total_out"] == 5

    def test_null_trade_id_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(trade_id=None)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-01"] == 1


class TestRV02_PositivePriceQty:
    def test_zero_price_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(price=0.0, notional=0.0)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-02"] == 1

    def test_negative_quantity_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(quantity=-10.0, notional=-1800.0)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-02"] >= 1


class TestRV03_ValidSide:
    def test_invalid_side_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(side="HOLD")])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-03"] == 1


class TestRV04_UniqueTradeId:
    def test_duplicate_ids_all_rejected(self, make_trade, valid_batch, validator):
        # Tres filas con el mismo trade_id (todas inválidas: no sabemos cuál es la "buena")
        dup_template = make_trade(trade_id="DUP")
        dups = [
            {**dup_template, "trader_id": "TR-A"},
            {**dup_template, "trader_id": "TR-B", "counterparty_id": "CP-DA"},
            {**dup_template, "trader_id": "TR-C", "counterparty_id": "CP-DB"},
        ]
        df = make_df(valid_batch + dups)
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-04"] == 3


class TestRV05_NotionalConsistency:
    def test_notional_mismatch_rejected(self, make_trade, valid_batch, validator):
        # price=180, qty=100 → expected 18.000; forzamos 99.999
        df = make_df(valid_batch + [make_trade(notional=99_999.0)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-05"] == 1


class TestRV06_TimestampWindow:
    def test_old_timestamp_rejected(self, make_trade, valid_batch, now_naive, validator):
        old = now_naive - timedelta(days=60)
        df = make_df(valid_batch + [make_trade(timestamp=old)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-06"] == 1

    def test_future_timestamp_rejected(self, make_trade, valid_batch, now_naive, validator):
        future = now_naive + timedelta(hours=2)
        df = make_df(valid_batch + [make_trade(timestamp=future)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-06"] == 1


# =====================================================================
# Reglas de negocio
# =====================================================================
class TestRV07_LotSize:
    def test_equity_fractional_quantity_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(quantity=100.5, notional=18_090.0)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-07"] == 1

    def test_forex_below_min_lot_rejected(self, make_trade, valid_batch, validator):
        # forex requiere mínimo 1.000
        bad_forex = make_trade(
            asset_class="forex", instrument="EURUSD",
            quantity=500.0, price=1.08, notional=540.0,
            venue="OTC", currency="USD",
        )
        df = make_df(valid_batch + [bad_forex])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-07"] == 1


class TestRV08_PriceBand:
    def test_price_above_band_rejected(self, make_trade, valid_batch, validator):
        # AAPL ref=180, banda 20% → tope 216. Forzamos 300.
        df = make_df(valid_batch + [make_trade(price=300.0, notional=30_000.0)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-08"] == 1


class TestRV09_TraderNotional:
    def test_trader_over_limit_all_rejected(self, make_trade, valid_batch, validator):
        # 6 trades del mismo trader, ~1M c/u → 6M > 5M
        big = [
            make_trade(
                trader_id="TR-BIG",
                quantity=5556.0, price=180.0, notional=1_000_080.0,
                counterparty_id=f"CP-BIG-{i}",
            )
            for i in range(6)
        ]
        df = make_df(valid_batch + big)
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-09"] == 6
        assert summary["total_out"] == 5


class TestRV10_CurrencyAssetClass:
    def test_equity_in_gbp_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(currency="GBP")])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-10"] == 1

    def test_forex_currency_outside_pair_rejected(self, make_trade, valid_batch, validator):
        # EURUSD: par [EUR, USD]. GBP es inválido.
        bad = make_trade(
            asset_class="forex", instrument="EURUSD",
            price=1.08, quantity=10_000.0, notional=10_800.0,
            currency="GBP", venue="OTC",
        )
        df = make_df(valid_batch + [bad])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-10"] == 1


class TestRV11_CounterpartyConcentration:
    def test_dominant_counterparty_rejected(self, make_trade, validator):
        # 7 trades a CP-DOM (70%) + 3 a otros (30%); 70 > 40 → CP-DOM rechazada
        trades = []
        for i in range(7):
            trades.append(make_trade(counterparty_id="CP-DOM", trader_id=f"TR-D-{i}"))
        for i in range(3):
            trades.append(make_trade(counterparty_id=f"CP-OTHER-{i}", trader_id=f"TR-O-{i}"))
        df = make_df(trades)
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-11"] == 7


class TestRV12_VenueWhitelist:
    def test_invalid_venue_for_equity_rejected(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(venue="OTC")])  # OTC no está en equity
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-12"] == 1

    def test_null_venue_allowed(self, make_trade, valid_batch, validator):
        df = make_df(valid_batch + [make_trade(venue=None)])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-12"] == 0


# =====================================================================
# Reglas contextuales
# =====================================================================
class TestRV13_WashTrading:
    def test_buy_sell_same_trader_instrument_qty_rejected(self, make_trade, valid_batch, validator):
        t1 = make_trade(trade_id="T-W1", trader_id="TR-WASH", side="BUY", quantity=100.0)
        t2 = make_trade(trade_id="T-W2", trader_id="TR-WASH", side="SELL", quantity=100.0)
        df = make_df(valid_batch + [t1, t2])
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-13"] == 2
        assert summary["total_out"] == 5

    def test_only_buys_no_wash(self, make_trade, validator):
        # Mismo trader, mismo instrumento, misma quantity, AMBOS BUY → no es wash
        t1 = make_trade(trader_id="TR-X", side="BUY", quantity=100.0, counterparty_id="CP-1")
        t2 = make_trade(trader_id="TR-X", side="BUY", quantity=100.0, counterparty_id="CP-2")
        # ampliamos batch con varios cps para no disparar RV-11
        rest = [make_trade() for _ in range(4)]
        df = make_df([t1, t2] + rest)
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-13"] == 0


class TestRV14_OutlierIQR:
    def test_extreme_price_outlier_rejected(self, make_trade, validator):
        # 10 precios normales + 1 outlier; 215 está dentro de la banda RV-08 (≤216)
        # pero fuera del [Q1-3·IQR, Q3+3·IQR] del lote.
        normal_prices = [175.0, 178.0, 180.0, 181.0, 182.0, 185.0, 178.0, 180.0, 179.0, 183.0]
        trades = [make_trade(price=p, notional=p * 100) for p in normal_prices]
        trades.append(make_trade(price=215.0, notional=21_500.0))
        df = make_df(trades)
        _, summary = validator.validate(df)
        assert summary["rejected_by_rule"]["RV-14"] >= 1


# =====================================================================
# Auditoría de rechazos
# =====================================================================
class TestRejectionAuditing:
    def test_rejection_logged_with_rule_id(self, make_trade, valid_batch, validator, audit):
        df = make_df(valid_batch + [make_trade(side="HOLD")])
        validator.validate(df)
        events = audit.read_events(EventType.REJECTION)
        assert len(events) == 1
        assert events[0]["rule_id"] == "RV-03"
        assert events[0]["field"] == "side"
        assert events[0]["value_received"] == "HOLD"

    def test_first_failure_only_logged(self, make_trade, valid_batch, validator, audit):
        # Un trade con price=None falla RV-01; NO debería volver a aparecer
        # rechazado por reglas posteriores.
        df = make_df(valid_batch + [make_trade(price=None)])
        validator.validate(df)
        events = audit.read_events(EventType.REJECTION)
        assert len(events) == 1
        assert events[0]["rule_id"] == "RV-01"

    def test_pipeline_run_id_propagates_to_rejections(self, make_trade, valid_batch, cfg, tmp_path):
        audit_cfg = {"audit": {"output_dir": str(tmp_path / "a"), "flush_each_event": True}}
        a = AuditLogger(audit_cfg, pipeline_run_id="run-CORR")
        df = make_df(valid_batch + [make_trade(side="HOLD")])
        TradeValidator(cfg, a).validate(df)
        events = a.read_events(EventType.REJECTION)
        assert events[0]["pipeline_run_id"] == "run-CORR"
