"""
tests/test_runner.py
====================
Tests del orquestador `run_pipeline`: ejecución end-to-end, métricas,
auditoría por etapa y manejo de errores con `PipelineStageError`.
"""

from __future__ import annotations

import copy
from pathlib import Path

import polars as pl
import pytest
from src.audit import EventType, load_config
from src.pipeline_runner import PipelineStageError, run_pipeline
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
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    c["extractor"]["csv"]["path"] = str(tmp_path / "trades.csv")
    return c


# =====================================================================
# End-to-end: dataframe mode
# =====================================================================
class TestRunPipelineDataframe:
    def test_returns_full_result_dict(self, cfg):
        result = run_pipeline(n_trades=200, mode="dataframe", config=cfg)
        assert "run_id" in result
        assert "started_at" in result
        assert "finished_at" in result
        assert result["duration_ms"] > 0
        assert result["mode"] == "dataframe"
        assert "business_report" in result
        assert "quality_report" in result
        assert "audit_report" in result
        assert "validation_summary" in result

    def test_validation_summary_populated(self, cfg):
        result = run_pipeline(n_trades=200, mode="dataframe", config=cfg)
        s = result["validation_summary"]
        assert s["total_in"] == 200
        assert s["total_out"] <= 200
        assert s["total_rejected"] == s["total_in"] - s["total_out"]
        assert set(s["rejected_by_rule"].keys()) == {f"RV-{i:02d}" for i in range(1, 15)}

    def test_audit_logs_all_four_stages(self, cfg):
        result = run_pipeline(n_trades=100, mode="dataframe", config=cfg)
        run_id = result["run_id"]

        # Re-construir un audit reader directo
        from src.audit import AuditLogger
        a = AuditLogger(cfg)
        runs = a.read_events_by_run(EventType.PIPELINE_RUN, run_id)
        stages = {r["stage"] for r in runs}
        assert stages == {"generate", "extract", "validate", "transform"}
        # Todas con status ok y duration_ms > 0
        assert all(r["status"] == "ok" for r in runs)
        assert all(r["duration_ms"] >= 0 for r in runs)

    def test_quality_score_is_high_on_clean_data(self, cfg):
        result = run_pipeline(
            n_trades=300, mode="dataframe",
            null_rate=0.0, outlier_rate=0.0,
            config=cfg,
        )
        # validador filtra ruido; los que sobreviven deberían lucir saludables
        assert result["quality_report"]["score"] >= 90.0


# =====================================================================
# CSV mode
# =====================================================================
class TestRunPipelineCsv:
    def test_csv_mode_reads_file(self, cfg):
        # Pre-generar un CSV
        df = generate_trades(150, seed=1, null_rate=0.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        csv_path = Path(cfg["extractor"]["csv"]["path"])
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        df.write_csv(csv_path)

        result = run_pipeline(mode="csv", config=cfg)
        assert result["mode"] == "csv"
        assert result["validation_summary"]["total_in"] == 150


# =====================================================================
# API mode
# =====================================================================
class TestRunPipelineApi:
    def test_api_mode_with_stub_client(self, cfg):
        df = generate_trades(80, seed=1, null_rate=0.0, outlier_rate=0.0,
                             config=cfg, persist=False)
        records = df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%dT%H:%M:%S")
        ).to_dicts()

        def stub(url, headers, params, timeout):
            return records

        result = run_pipeline(mode="api", config=cfg, http_client=stub)
        assert result["mode"] == "api"
        assert result["validation_summary"]["total_in"] == 80


# =====================================================================
# Error handling
# =====================================================================
class TestErrorHandling:
    def test_pipeline_stage_error_on_unknown_mode(self, cfg):
        with pytest.raises(PipelineStageError) as exc:
            run_pipeline(mode="invalid", config=cfg)
        assert exc.value.stage == "extract"

    def test_pipeline_stage_error_logs_failed_event(self, cfg):
        with pytest.raises(PipelineStageError):
            run_pipeline(mode="invalid", config=cfg)

        from src.audit import AuditLogger
        a = AuditLogger(cfg)
        runs = a.read_events(EventType.PIPELINE_RUN)
        # Al menos un evento failed
        failed = [r for r in runs if r["status"] == "failed"]
        assert len(failed) >= 1
