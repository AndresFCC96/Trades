"""
tests/test_transformer.py
=========================
Tests del transformer: orquestación de los 3 reportes + audit_report.
Los reportes individuales tienen tests propios en:
    - tests/test_business_rules.py
    - tests/test_data_quality.py
"""

from __future__ import annotations

import copy
from pathlib import Path

import polars as pl
import pytest
from src.audit import AuditLogger, load_config
from src.trade_extractor import TradeSchema
from src.trade_generator import generate_trades
from src.trade_transformer import build_audit_report, transform


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
def audit(tmp_path) -> AuditLogger:
    return AuditLogger({"audit": {"output_dir": str(tmp_path / "audit"),
                                   "flush_each_event": True}})


@pytest.fixture
def clean_df(cfg) -> pl.DataFrame:
    return generate_trades(300, seed=1, null_rate=0.0, outlier_rate=0.0,
                           config=cfg, persist=False)


# =====================================================================
# transform() — orquestación
# =====================================================================
class TestTransformOrchestration:
    def test_returns_three_dicts(self, clean_df, cfg, audit):
        business, quality, audit_rep = transform(clean_df, cfg, audit)
        assert isinstance(business, dict)
        assert isinstance(quality, dict)
        assert isinstance(audit_rep, dict)

    def test_empty_df_returns_empty_reports(self, cfg, audit):
        empty = pl.DataFrame(schema=TradeSchema.dtypes)
        business, quality, audit_rep = transform(empty, cfg, audit)
        assert business["summary"]["total_trades"] == 0
        assert quality["score"] == 0.0
        assert audit_rep["totals"]["rejections"] == 0


# =====================================================================
# audit_report
# =====================================================================
class TestAuditReport:
    def test_collects_rejections_with_summary(self, cfg, audit):
        audit.log_rejection("T-1", "RV-01", "x", "f", None)
        audit.log_rejection("T-2", "RV-01", "x", "f", None)
        audit.log_rejection("T-3", "RV-03", "x", "f", "HOLD")
        audit.log_pipeline_run("run-A", "validate", "ok", 100, 97, 5.5)
        audit.log_api_access("/x", "u", "GET", 200)

        rep = build_audit_report(audit)
        assert rep["totals"]["rejections"] == 3
        assert rep["totals"]["pipeline_runs"] == 1
        assert rep["totals"]["api_accesses"] == 1
        assert rep["rejected_by_rule_summary"]["RV-01"] == 2
        assert rep["rejected_by_rule_summary"]["RV-03"] == 1

    def test_filters_by_pipeline_run_id(self, cfg, tmp_path):
        a = AuditLogger(
            {"audit": {"output_dir": str(tmp_path / "a"), "flush_each_event": True}},
            pipeline_run_id="run-X",
        )
        a.log_rejection("T-1", "RV-01", "x", "f", None)
        a.set_pipeline_run_id("run-Y")
        a.log_rejection("T-2", "RV-01", "x", "f", None)
        a.log_rejection("T-3", "RV-02", "x", "f", 0)

        rep = build_audit_report(a, pipeline_run_id="run-Y")
        assert rep["totals"]["rejections"] == 2

    def test_transform_passes_run_id_to_audit(self, clean_df, cfg, tmp_path):
        a = AuditLogger(
            {"audit": {"output_dir": str(tmp_path / "a"), "flush_each_event": True}},
            pipeline_run_id="run-FOCUS",
        )
        a.set_pipeline_run_id("run-OTHER")
        a.log_rejection("T-other", "RV-99", "x", "f", None)
        a.set_pipeline_run_id("run-FOCUS")
        a.log_rejection("T-focus", "RV-01", "x", "f", None)

        _, _, audit_rep = transform(clean_df, cfg, a, pipeline_run_id="run-FOCUS")
        assert audit_rep["totals"]["rejections"] == 1
        assert audit_rep["rejected_trades"][0]["trade_id"] == "T-focus"
