"""
tests/test_data_quality.py
==========================
Tests dedicados a `compute_quality_report`.
"""

from __future__ import annotations

import copy
from pathlib import Path

import polars as pl
import pytest
from src.audit import load_config
from src.data_quality import compute_quality_report
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


@pytest.fixture
def noisy_df(cfg) -> pl.DataFrame:
    return generate_trades(500, seed=2, null_rate=0.05, outlier_rate=0.02,
                           config=cfg, persist=False)


# =====================================================================
# Score
# =====================================================================
class TestScore:
    def test_clean_data_score_at_least_95(self, clean_df, cfg):
        rep = compute_quality_report(clean_df, cfg)
        assert rep["score"] >= 95.0

    def test_score_is_bounded_0_100(self, noisy_df, cfg):
        rep = compute_quality_report(noisy_df, cfg)
        assert 0.0 <= rep["score"] <= 100.0

    def test_noisy_score_lower_than_clean(self, clean_df, noisy_df, cfg):
        clean = compute_quality_report(clean_df, cfg)["score"]
        noisy = compute_quality_report(noisy_df, cfg)["score"]
        assert noisy < clean

    def test_empty_df_score_zero(self, cfg):
        from src.trade_extractor import TradeSchema
        empty = pl.DataFrame(schema=TradeSchema.dtypes)
        rep = compute_quality_report(empty, cfg)
        assert rep["score"] == 0.0


# =====================================================================
# Completitud
# =====================================================================
class TestCompleteness:
    def test_per_column_counts(self, noisy_df, cfg):
        rep = compute_quality_report(noisy_df, cfg)
        for col in noisy_df.columns:
            assert col in rep["completeness"]
            entry = rep["completeness"][col]
            assert "nulls" in entry and "pct_null" in entry
            assert entry["nulls"] == int(noisy_df[col].null_count())

    def test_clean_data_zero_nulls(self, clean_df, cfg):
        rep = compute_quality_report(clean_df, cfg)
        for col in clean_df.columns:
            if col in ("counterparty_id", "venue"):
                # Nullable per spec — pero con null_rate=0 son 0
                pass
            assert rep["completeness"][col]["nulls"] == int(clean_df[col].null_count())


# =====================================================================
# Unicidad
# =====================================================================
class TestUniqueness:
    def test_one_when_no_duplicates(self, clean_df, cfg):
        rep = compute_quality_report(clean_df, cfg)
        assert rep["uniqueness"] == 1.0
        assert rep["duplicates"] == 0

    def test_drops_when_duplicates_injected(self, clean_df, cfg):
        dup_row = clean_df.head(1).with_columns(pl.lit("DUP").alias("trade_id"))
        df_dup = pl.concat([clean_df, dup_row, dup_row, dup_row])
        rep = compute_quality_report(df_dup, cfg)
        assert rep["duplicates"] >= 2
        assert rep["uniqueness"] < 1.0


# =====================================================================
# Consistencia (notional vs price*qty)
# =====================================================================
class TestConsistency:
    def test_one_for_clean_data(self, clean_df, cfg):
        rep = compute_quality_report(clean_df, cfg)
        assert rep["consistency"] == 1.0

    def test_drops_when_mismatch_injected(self, clean_df, cfg):
        bad = clean_df.head(50).with_columns(pl.lit(99999.0).alias("notional"))
        rest = clean_df.slice(50, len(clean_df) - 50)
        df_mix = pl.concat([bad, rest])
        rep = compute_quality_report(df_mix, cfg)
        assert rep["consistency"] < 1.0


# =====================================================================
# Validez (dominios)
# =====================================================================
class TestValidity:
    def test_one_for_clean_data(self, clean_df, cfg):
        rep = compute_quality_report(clean_df, cfg)
        assert rep["validity"] == 1.0

    def test_drops_when_invalid_side_injected(self, clean_df, cfg):
        bad = clean_df.head(20).with_columns(pl.lit("HOLD").alias("side"))
        rest = clean_df.slice(20, len(clean_df) - 20)
        df_mix = pl.concat([bad, rest])
        rep = compute_quality_report(df_mix, cfg)
        assert rep["validity"] < 1.0


# =====================================================================
# Outliers (IQR)
# =====================================================================
class TestOutliers:
    def test_zero_for_clean_data(self, clean_df, cfg):
        rep = compute_quality_report(clean_df, cfg)
        assert rep["outliers_detected"] == 0

    def test_detects_outliers_when_present(self, noisy_df, cfg):
        rep = compute_quality_report(noisy_df, cfg)
        assert rep["outliers_detected"] >= 1
