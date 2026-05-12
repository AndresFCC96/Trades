"""
tests/test_extractor.py
=======================
Tests del extractor: tres modos (csv, api, dataframe), normalización
de timestamps, validación de esquema con Patito, auditoría de API.
"""

from __future__ import annotations

import copy
from datetime import datetime
from pathlib import Path

import polars as pl
import pytest
from src.audit import AuditLogger, EventType, load_config
from src.trade_extractor import (
    TradeSchema,
    _build_auth_headers,
    extract_trades,
)
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
    c["extractor"]["csv"]["path"] = str(tmp_path / "trades.csv")
    return c


@pytest.fixture
def sample_df(cfg) -> pl.DataFrame:
    return generate_trades(20, seed=1, null_rate=0.0, outlier_rate=0.0,
                           config=cfg, persist=False)


@pytest.fixture
def audit(tmp_path) -> AuditLogger:
    return AuditLogger({"audit": {"output_dir": str(tmp_path / "audit"),
                                   "flush_each_event": True}})


# =====================================================================
# Modo: dataframe
# =====================================================================
class TestDataFrameMode:
    def test_returns_same_dataframe(self, cfg, sample_df):
        df_out, meta = extract_trades(cfg, mode="dataframe", dataframe=sample_df)
        assert len(df_out) == len(sample_df)
        assert meta["mode"] == "dataframe"
        assert meta["rows_read"] == 20
        assert "timestamp_utc" in meta
        assert meta["memory_mb"] > 0

    def test_missing_dataframe_raises(self, cfg):
        with pytest.raises(ValueError, match="dataframe"):
            extract_trades(cfg, mode="dataframe")


# =====================================================================
# Modo: csv
# =====================================================================
class TestCsvMode:
    def test_reads_round_trip(self, cfg, sample_df, tmp_path):
        csv_path = Path(cfg["extractor"]["csv"]["path"])
        sample_df.write_csv(csv_path)
        df_out, meta = extract_trades(cfg, mode="csv")
        assert len(df_out) == len(sample_df)
        assert meta["mode"] == "csv"
        # timestamp se normaliza a Datetime
        assert isinstance(df_out.schema["timestamp"], pl.Datetime)

    def test_missing_file_raises(self, cfg):
        # cfg apunta a un path que no existe en tmp
        with pytest.raises(FileNotFoundError):
            extract_trades(cfg, mode="csv")

    def test_uses_mode_from_config_by_default(self, cfg, sample_df):
        cfg["extractor"]["mode"] = "csv"
        Path(cfg["extractor"]["csv"]["path"]).parent.mkdir(parents=True, exist_ok=True)
        sample_df.write_csv(cfg["extractor"]["csv"]["path"])
        df_out, meta = extract_trades(cfg)
        assert meta["mode"] == "csv"
        assert len(df_out) == len(sample_df)


# =====================================================================
# Modo: api
# =====================================================================
class TestApiMode:
    def test_uses_injected_http_client(self, cfg, sample_df):
        # Convertimos sample_df a list[dict] como devolvería la API
        records = sample_df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%dT%H:%M:%S")
        ).to_dicts()
        captured = {}

        def stub(url, headers, params, timeout):
            captured["url"] = url
            captured["headers"] = headers
            captured["params"] = params
            captured["timeout"] = timeout
            return records

        df_out, meta = extract_trades(cfg, mode="api", http_client=stub)
        assert len(df_out) == 20
        assert meta["mode"] == "api"
        assert captured["url"] == cfg["extractor"]["api"]["url"]
        assert captured["timeout"] == cfg["extractor"]["api"]["timeout_seconds"]

    def test_resolves_from_date_auto(self, cfg, sample_df):
        records = sample_df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%dT%H:%M:%S")
        ).to_dicts()
        captured = {}

        def stub(url, headers, params, timeout):
            captured.update(params)
            return records

        cfg["extractor"]["api"]["params"]["from_date"] = "auto"
        extract_trades(cfg, mode="api", http_client=stub)

        # Debe haberse reemplazado por una fecha ISO real
        assert captured["from_date"] != "auto"
        # Parseable
        datetime.fromisoformat(captured["from_date"])

    def test_logs_api_access_on_success(self, cfg, sample_df, audit):
        records = sample_df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%dT%H:%M:%S")
        ).to_dicts()

        def stub(url, headers, params, timeout):
            return records

        extract_trades(cfg, mode="api", http_client=stub, audit=audit)
        events = audit.read_events(EventType.API_ACCESS)
        assert len(events) == 1
        assert events[0]["endpoint"] == cfg["extractor"]["api"]["url"]
        assert events[0]["response_code"] == 200
        assert events[0]["actor"] == "extractor"

    def test_logs_api_access_on_error(self, cfg, audit):
        def stub(url, headers, params, timeout):
            raise RuntimeError("boom")

        with pytest.raises(RuntimeError):
            extract_trades(cfg, mode="api", http_client=stub, audit=audit)
        events = audit.read_events(EventType.API_ACCESS)
        assert events[0]["response_code"] == 500

    def test_empty_response_returns_empty_df(self, cfg, audit):
        def stub(url, headers, params, timeout):
            return []

        df_out, meta = extract_trades(cfg, mode="api", http_client=stub, audit=audit)
        assert df_out.is_empty()
        assert meta["rows_read"] == 0


class TestApiAuthHeaders:
    def test_bearer_token_from_env(self, monkeypatch):
        monkeypatch.setenv("FAKE_TOKEN", "abc123")
        api_cfg = {"auth_type": "bearer", "token_env": "FAKE_TOKEN"}
        assert _build_auth_headers(api_cfg) == {"Authorization": "Bearer abc123"}

    def test_api_key_from_env(self, monkeypatch):
        monkeypatch.setenv("FAKE_TOKEN", "xyz789")
        api_cfg = {"auth_type": "api_key", "token_env": "FAKE_TOKEN"}
        assert _build_auth_headers(api_cfg) == {"X-API-Key": "xyz789"}

    def test_no_token_no_headers(self):
        assert _build_auth_headers({"auth_type": "bearer"}) == {}

    def test_missing_env_yields_empty(self, monkeypatch):
        monkeypatch.delenv("UNSET_TOKEN", raising=False)
        assert _build_auth_headers(
            {"auth_type": "bearer", "token_env": "UNSET_TOKEN"}
        ) == {}


# =====================================================================
# Schema validation
# =====================================================================
class TestSchemaValidation:
    def test_valid_df_passes(self, sample_df):
        TradeSchema.validate(sample_df)

    def test_missing_column_raises(self, sample_df):
        bad = sample_df.drop("venue")
        with pytest.raises(Exception):
            TradeSchema.validate(bad)

    def test_extract_dataframe_validates(self, cfg, sample_df):
        bad = sample_df.drop("status")
        with pytest.raises(Exception):
            extract_trades(cfg, mode="dataframe", dataframe=bad)


# =====================================================================
# Mode misuse
# =====================================================================
class TestUnknownMode:
    def test_unknown_mode_raises(self, cfg):
        with pytest.raises(ValueError, match="Unknown extractor mode"):
            extract_trades(cfg, mode="ftp")
