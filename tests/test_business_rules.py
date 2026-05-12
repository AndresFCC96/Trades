"""
tests/test_business_rules.py
============================
Tests dedicados a `compute_business_report`.
"""

from __future__ import annotations

import copy
from pathlib import Path

import polars as pl
import pytest
from src.audit import load_config
from src.business_rules import compute_business_report
from src.trade_generator import generate_trades


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    return c


@pytest.fixture
def clean_df(cfg) -> pl.DataFrame:
    return generate_trades(500, seed=1, null_rate=0.0, outlier_rate=0.0,
                           config=cfg, persist=False)


# =====================================================================
# Estructura general
# =====================================================================
class TestStructure:
    def test_has_expected_top_level_keys(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        assert set(rep.keys()) >= {
            "by_asset_class", "risk_distribution", "top_counterparties",
            "venue_concentration", "by_day", "by_hour", "summary",
        }

    def test_empty_df_returns_empty_report(self, cfg):
        from src.trade_extractor import TradeSchema
        empty = pl.DataFrame(schema=TradeSchema.dtypes)
        rep = compute_business_report(empty, cfg)
        assert rep["summary"]["total_trades"] == 0
        assert rep["summary"]["total_notional"] == 0.0
        assert rep["risk_distribution"] == {"high": 0, "medium": 0, "low": 0}


# =====================================================================
# by_asset_class
# =====================================================================
class TestByAssetClass:
    def test_has_required_metrics(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        for r in rep["by_asset_class"]:
            for key in ("total_notional", "avg_price", "trade_count",
                        "buy_pct", "sell_pct"):
                assert key in r
            assert 0.0 <= r["buy_pct"] <= 1.0
            assert 0.0 <= r["sell_pct"] <= 1.0
            assert abs((r["buy_pct"] + r["sell_pct"]) - 1.0) < 1e-6

    def test_trade_count_sums_to_total(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        total = sum(r["trade_count"] for r in rep["by_asset_class"])
        assert total == len(clean_df)


# =====================================================================
# risk_distribution
# =====================================================================
class TestRiskDistribution:
    def test_buckets_sum_to_total(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        total = sum(rep["risk_distribution"].values())
        assert total == len(clean_df)

    def test_bucket_thresholds_respected(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        high_t = cfg["business_rules"]["risk_buckets"]["high_threshold_usd"]
        med_t = cfg["business_rules"]["risk_buckets"]["medium_threshold_usd"]
        # Cuenta manual
        high = int((clean_df["notional"] > high_t).sum())
        medium = int(((clean_df["notional"] >= med_t) & (clean_df["notional"] <= high_t)).sum())
        low = int((clean_df["notional"] < med_t).sum())
        assert rep["risk_distribution"]["high"] == high
        assert rep["risk_distribution"]["medium"] == medium
        assert rep["risk_distribution"]["low"] == low


# =====================================================================
# top_counterparties
# =====================================================================
class TestTopCounterparties:
    def test_respects_limit(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        assert len(rep["top_counterparties"]) <= cfg["business_rules"]["top_counterparties"]

    def test_sorted_descending(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        volumes = [r["total_volume"] for r in rep["top_counterparties"]]
        assert volumes == sorted(volumes, reverse=True)

    def test_excludes_null_counterparties(self, cfg):
        df = generate_trades(200, seed=7, null_rate=0.5, outlier_rate=0.0,
                             config=cfg, persist=False)
        rep = compute_business_report(df, cfg)
        for row in rep["top_counterparties"]:
            assert row["counterparty_id"] is not None


# =====================================================================
# venue_concentration y temporales
# =====================================================================
class TestVenueAndTemporal:
    def test_venue_shares_within_zero_one(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        for r in rep["venue_concentration"]:
            assert 0.0 <= r["share"] <= 1.0

    def test_by_hour_within_0_23(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        for r in rep["by_hour"]:
            assert 0 <= r["hour"] <= 23


# =====================================================================
# summary
# =====================================================================
class TestSummary:
    def test_total_trades_matches(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        assert rep["summary"]["total_trades"] == len(clean_df)

    def test_total_notional_matches(self, clean_df, cfg):
        rep = compute_business_report(clean_df, cfg)
        assert abs(rep["summary"]["total_notional"] - clean_df["notional"].sum()) < 1e-3
