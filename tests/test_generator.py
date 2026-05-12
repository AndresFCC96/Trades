"""
tests/test_generator.py
=======================
Tests del generador: esquema, reproducibilidad, tasas de nulos/outliers,
coherencia con catálogos del validador, persistencia.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import polars as pl
import pytest
from src.audit import load_config
from src.trade_generator import generate_trades


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    """Copia del settings.yaml con output_dir reescrito a tmp_path."""
    import copy
    c = copy.deepcopy(real_cfg)
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    return c


# ---------------------------------------------------------------------
# Esquema y tamaño
# ---------------------------------------------------------------------
class TestSchemaAndSize:
    def test_returns_n_rows(self, cfg):
        df = generate_trades(50, config=cfg, persist=False)
        assert len(df) == 50

    def test_zero_rows(self, cfg):
        df = generate_trades(0, config=cfg, persist=False)
        assert df.is_empty()

    def test_columns_match_spec(self, cfg):
        df = generate_trades(10, config=cfg, persist=False)
        expected = {
            "trade_id", "timestamp", "instrument", "asset_class",
            "side", "quantity", "price", "notional", "currency",
            "counterparty_id", "trader_id", "venue", "status",
        }
        assert set(df.columns) == expected

    def test_dtypes(self, cfg):
        df = generate_trades(10, config=cfg, persist=False)
        assert df.schema["trade_id"] == pl.Utf8
        assert isinstance(df.schema["timestamp"], pl.Datetime)
        assert df.schema["quantity"] == pl.Float64
        assert df.schema["price"] == pl.Float64
        assert df.schema["notional"] == pl.Float64


# ---------------------------------------------------------------------
# Reproducibilidad
# ---------------------------------------------------------------------
class TestReproducibility:
    def test_same_seed_same_output(self, cfg):
        df1 = generate_trades(100, seed=42, config=cfg, persist=False)
        df2 = generate_trades(100, seed=42, config=cfg, persist=False)
        # trade_id (uuid4) y timestamp (now()) no son determinísticos por diseño
        cols = [c for c in df1.columns if c not in ("trade_id", "timestamp")]
        assert df1.select(cols).equals(df2.select(cols))

    def test_different_seed_different_output(self, cfg):
        df1 = generate_trades(100, seed=1, config=cfg, persist=False)
        df2 = generate_trades(100, seed=2, config=cfg, persist=False)
        cols = [c for c in df1.columns if c not in ("trade_id", "timestamp")]
        assert not df1.select(cols).equals(df2.select(cols))


# ---------------------------------------------------------------------
# Tasa de nulos / outliers
# ---------------------------------------------------------------------
class TestNullAndOutlierRates:
    def test_null_rate_zero_no_nulls(self, cfg):
        df = generate_trades(200, seed=1, null_rate=0.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        assert df["counterparty_id"].null_count() == 0
        assert df["venue"].null_count() == 0

    def test_null_rate_one_all_nullable_are_null(self, cfg):
        df = generate_trades(50, seed=1, null_rate=1.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        assert df["counterparty_id"].null_count() == 50
        assert df["venue"].null_count() == 50
        # campos no-null deben seguir non-null
        for non_null in ("trade_id", "trader_id", "price", "quantity", "notional"):
            assert df[non_null].null_count() == 0

    def test_null_rate_approximately_correct(self, cfg):
        n = 5_000
        df = generate_trades(n, seed=42, null_rate=0.10, outlier_rate=0.0,
                             config=cfg, persist=False)
        # 10% de 5000 = 500. Con desviación binomial razonable, [400, 600].
        cp_nulls = df["counterparty_id"].null_count()
        venue_nulls = df["venue"].null_count()
        assert 400 <= cp_nulls <= 600, f"cp_nulls={cp_nulls}"
        assert 400 <= venue_nulls <= 600, f"venue_nulls={venue_nulls}"


# ---------------------------------------------------------------------
# Coherencia con catálogos del validador
# ---------------------------------------------------------------------
class TestDomainConsistency:
    def test_asset_classes_in_catalog(self, cfg):
        df = generate_trades(500, seed=1, outlier_rate=0.0, config=cfg, persist=False)
        valid_acs = set(cfg["generator"]["instruments"].keys())
        assert set(df["asset_class"].unique().to_list()) <= valid_acs

    def test_instruments_match_asset_class(self, cfg):
        df = generate_trades(500, seed=1, outlier_rate=0.0, config=cfg, persist=False)
        for ac, instruments in cfg["generator"]["instruments"].items():
            sub = df.filter(pl.col("asset_class") == ac)
            assert set(sub["instrument"].unique().to_list()) <= set(instruments)

    def test_currency_matches_asset_class(self, cfg):
        df = generate_trades(500, seed=1, outlier_rate=0.0, config=cfg, persist=False)
        for r in df.filter(pl.col("asset_class") == "crypto").iter_rows(named=True):
            assert r["currency"] == "USD"
        for r in df.filter(pl.col("asset_class") == "equity").iter_rows(named=True):
            assert r["currency"] in ("USD", "EUR")
        for r in df.filter(pl.col("asset_class") == "forex").iter_rows(named=True):
            pair = cfg["generator"]["forex_pair_currencies"][r["instrument"]]
            assert r["currency"] in pair

    def test_venue_in_whitelist(self, cfg):
        df = generate_trades(500, seed=1, null_rate=0.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        whitelist = cfg["validator"]["business"]["venue_whitelist"]
        for ac, valid_venues in whitelist.items():
            sub = df.filter(pl.col("asset_class") == ac)
            assert set(sub["venue"].drop_nulls().unique().to_list()) <= set(valid_venues)

    def test_status_in_catalog(self, cfg):
        df = generate_trades(500, seed=1, config=cfg, persist=False)
        statuses = set(cfg["validator"]["critical"]["valid_statuses"])
        assert set(df["status"].unique().to_list()) <= statuses

    def test_side_only_buy_or_sell(self, cfg):
        df = generate_trades(500, seed=1, config=cfg, persist=False)
        assert set(df["side"].unique().to_list()) <= {"BUY", "SELL"}


# ---------------------------------------------------------------------
# Lote mínimo y notional
# ---------------------------------------------------------------------
class TestQuantityAndNotional:
    def test_equity_quantity_is_integer(self, cfg):
        df = generate_trades(500, seed=1, outlier_rate=0.0, config=cfg, persist=False)
        sub = df.filter(pl.col("asset_class") == "equity")
        assert (sub["quantity"] == sub["quantity"].floor()).all()

    def test_forex_quantity_at_least_min_lot(self, cfg):
        df = generate_trades(500, seed=1, outlier_rate=0.0, config=cfg, persist=False)
        sub = df.filter(pl.col("asset_class") == "forex")
        assert (sub["quantity"] >= 1_000.0).all()

    def test_notional_equals_price_times_qty_within_tolerance(self, cfg):
        df = generate_trades(500, seed=1, outlier_rate=0.0, config=cfg, persist=False)
        diff = (df["notional"] - df["price"] * df["quantity"]).abs()
        assert diff.max() <= 0.01

    def test_timestamp_within_window(self, cfg):
        df = generate_trades(200, seed=1, config=cfg, persist=False)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        days = cfg["validator"]["critical"]["timestamp_window_days"]
        lower = now - timedelta(days=days)
        # All timestamps within [lower, now + 1s tolerance]
        ts_min = df["timestamp"].min()
        ts_max = df["timestamp"].max()
        assert ts_min >= lower
        assert ts_max <= now + timedelta(seconds=1)


# ---------------------------------------------------------------------
# Persistencia
# ---------------------------------------------------------------------
class TestPersistence:
    def test_writes_csv_when_persist_true(self, cfg, tmp_path):
        out_dir = Path(cfg["generator"]["output_dir"])
        generate_trades(50, seed=1, config=cfg, persist=True)
        csvs = list(out_dir.glob("trades_*.csv"))
        assert len(csvs) == 1
        df_read = pl.read_csv(csvs[0])
        assert len(df_read) == 50

    def test_no_csv_when_persist_false(self, cfg):
        out_dir = Path(cfg["generator"]["output_dir"])
        generate_trades(20, seed=1, config=cfg, persist=False)
        # Directory may not even exist
        assert not out_dir.exists() or not list(out_dir.glob("trades_*.csv"))


# ---------------------------------------------------------------------
# Integración con el validador (sanity end-to-end)
# ---------------------------------------------------------------------
class TestValidatorIntegration:
    def test_clean_batch_mostly_passes_validator(self, cfg, tmp_path):
        """Con null_rate=0 y outlier_rate=0, casi todos los trades deberían
        pasar el validador. 'Casi' porque RV-09/RV-11/RV-13 dependen de la
        distribución azarosa."""
        from src.audit import AuditLogger
        from src.trade_validator import TradeValidator

        df = generate_trades(500, seed=1, null_rate=0.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        audit = AuditLogger({"audit": {"output_dir": str(tmp_path / "a"),
                                        "flush_each_event": True}})
        valid, summary = TradeValidator(cfg, audit).validate(df)
        # Baseline esperable: > 80% pasan (RV-13/14 pueden recortar parte)
        assert summary["total_out"] / summary["total_in"] >= 0.7
