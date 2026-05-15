"""
tests/test_sources.py
=====================
Cubre el módulo src/sources.py y los endpoints /sources/* de la API.
"""

from __future__ import annotations

import copy
import io
import json
from pathlib import Path

import polars as pl
import pytest
from fastapi.testclient import TestClient

from src.api.main import create_app
from src.audit import load_config
from src.sources import (
    SourceError,
    delete_source,
    get_source,
    list_sources,
    load_dataframe,
    preview,
    register_upload,
    set_mapping,
)


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["sources"]["upload_dir"] = str(tmp_path / "sources")
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    return c


@pytest.fixture
def csv_bytes() -> bytes:
    return (
        "trade_id,timestamp,instrument,asset_class,side,quantity,price,"
        "notional,currency,counterparty_id,trader_id,venue,status\n"
        "T1,2026-01-01T00:00:00,AAPL,equity,BUY,10,180.0,1800.0,USD,CP-1,TR-1,NYSE,executed\n"
        "T2,2026-01-01T01:00:00,MSFT,equity,SELL,5,380.0,1900.0,USD,CP-2,TR-2,NASDAQ,executed\n"
    ).encode("utf-8")


@pytest.fixture
def client(cfg) -> TestClient:
    return TestClient(create_app(cfg))


# =====================================================================
# Unit: register_upload + validation
# =====================================================================
class TestRegisterUpload:
    def test_csv_upload_writes_file_and_metadata(self, cfg, csv_bytes):
        meta = register_upload("trades.csv", csv_bytes, cfg)
        assert meta["ext"] == ".csv"
        assert meta["size_bytes"] == len(csv_bytes)
        assert meta["original_name"] == "trades.csv"
        sdir = Path(cfg["sources"]["upload_dir"]) / meta["source_id"]
        assert (sdir / "file.csv").read_bytes() == csv_bytes
        assert (sdir / "metadata.json").exists()

    def test_rejects_unknown_extension(self, cfg):
        with pytest.raises(SourceError, match="Extension"):
            register_upload("trades.txt", b"hello", cfg)

    def test_rejects_oversize(self, cfg, csv_bytes):
        cfg["sources"]["max_upload_mb"] = 0.0000001  # ~ <1 byte
        with pytest.raises(SourceError, match="exceeds max"):
            register_upload("trades.csv", csv_bytes, cfg)


# =====================================================================
# Unit: preview + load_dataframe + mapping
# =====================================================================
class TestPreviewAndLoad:
    def test_preview_returns_columns_and_rows(self, cfg, csv_bytes):
        meta = register_upload("trades.csv", csv_bytes, cfg)
        prev = preview(cfg, meta["source_id"])
        assert "trade_id" in prev["columns"]
        assert prev["row_count_preview"] == 2
        assert prev["rows"][0]["instrument"] == "AAPL"

    def test_load_dataframe_without_mapping_keeps_columns(self, cfg, csv_bytes):
        meta = register_upload("trades.csv", csv_bytes, cfg)
        df = load_dataframe(cfg, meta["source_id"])
        assert len(df) == 2
        assert "trade_id" in df.columns

    def test_set_mapping_renames_on_load(self, cfg):
        # CSV con nombres de columna distintos al TradeSchema
        raw = (
            "id,ts,instr,ac,sd,qty,px,nt,ccy,cp,tr,vn,st\n"
            "T1,2026-01-01T00:00:00,AAPL,equity,BUY,10,180.0,1800.0,USD,CP-1,TR-1,NYSE,executed\n"
        ).encode("utf-8")
        meta = register_upload("trades.csv", raw, cfg)
        set_mapping(cfg, meta["source_id"], {
            "id": "trade_id",
            "ts": "timestamp",
            "instr": "instrument",
            "ac": "asset_class",
            "sd": "side",
            "qty": "quantity",
            "px": "price",
            "nt": "notional",
            "ccy": "currency",
            "cp": "counterparty_id",
            "tr": "trader_id",
            "vn": "venue",
            "st": "status",
        })
        df = load_dataframe(cfg, meta["source_id"])
        assert df.columns == [
            "trade_id", "timestamp", "instrument", "asset_class", "side",
            "quantity", "price", "notional", "currency",
            "counterparty_id", "trader_id", "venue", "status",
        ]

    def test_mapping_rejects_unknown_target(self, cfg, csv_bytes):
        meta = register_upload("trades.csv", csv_bytes, cfg)
        with pytest.raises(SourceError, match="Unknown target"):
            set_mapping(cfg, meta["source_id"], {"trade_id": "not_a_real_column"})

    def test_mapping_rejects_duplicate_targets(self, cfg, csv_bytes):
        meta = register_upload("trades.csv", csv_bytes, cfg)
        with pytest.raises(SourceError, match="Duplicated"):
            set_mapping(
                cfg, meta["source_id"],
                {"trade_id": "trade_id", "instrument": "trade_id"},
            )


# =====================================================================
# Unit: list / get / delete
# =====================================================================
class TestListGetDelete:
    def test_list_returns_all_uploaded(self, cfg, csv_bytes):
        register_upload("a.csv", csv_bytes, cfg)
        register_upload("b.csv", csv_bytes, cfg)
        assert len(list_sources(cfg)) == 2

    def test_get_unknown_id_raises(self, cfg):
        with pytest.raises(SourceError, match="not found"):
            get_source(cfg, "does-not-exist")

    def test_delete_removes_directory(self, cfg, csv_bytes):
        meta = register_upload("a.csv", csv_bytes, cfg)
        delete_source(cfg, meta["source_id"])
        with pytest.raises(SourceError):
            get_source(cfg, meta["source_id"])


# =====================================================================
# Parquet path (smoke)
# =====================================================================
class TestParquet:
    def test_load_parquet(self, cfg, tmp_path):
        df = pl.DataFrame({
            "trade_id": ["T1"],
            "instrument": ["AAPL"],
            "price": [180.0],
        })
        buf = io.BytesIO()
        df.write_parquet(buf)
        meta = register_upload("trades.parquet", buf.getvalue(), cfg)
        loaded = load_dataframe(cfg, meta["source_id"])
        assert loaded["trade_id"].to_list() == ["T1"]


# =====================================================================
# API endpoints
# =====================================================================
class TestSourcesAPI:
    def test_upload_returns_metadata(self, client, csv_bytes):
        r = client.post(
            "/sources/upload",
            files={"file": ("trades.csv", csv_bytes, "text/csv")},
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["original_name"] == "trades.csv"
        assert body["ext"] == ".csv"

    def test_list_then_preview_then_run(self, client, csv_bytes):
        r = client.post(
            "/sources/upload",
            files={"file": ("trades.csv", csv_bytes, "text/csv")},
        )
        source_id = r.json()["source_id"]

        listing = client.get("/sources").json()
        assert any(s["source_id"] == source_id for s in listing)

        prev = client.get(f"/sources/{source_id}/preview").json()
        assert "trade_id" in prev["columns"]

        run = client.post(f"/sources/{source_id}/run")
        assert run.status_code == 200, run.text
        body = run.json()
        assert body["mode"] == "upload"
        assert body["validation_summary"]["total_in"] == 2

    def test_unknown_source_returns_404(self, client):
        r = client.get("/sources/nope")
        assert r.status_code == 404

    def test_delete_returns_204(self, client, csv_bytes):
        r = client.post(
            "/sources/upload",
            files={"file": ("trades.csv", csv_bytes, "text/csv")},
        )
        source_id = r.json()["source_id"]
        r = client.delete(f"/sources/{source_id}")
        assert r.status_code == 204
        r = client.get(f"/sources/{source_id}")
        assert r.status_code == 404

    def test_invalid_extension_returns_400(self, client):
        r = client.post(
            "/sources/upload",
            files={"file": ("trades.txt", b"hello", "text/plain")},
        )
        assert r.status_code == 400

    def test_mapping_endpoint(self, client):
        raw = b"id,price\nT1,180.0\n"
        r = client.post(
            "/sources/upload",
            files={"file": ("trades.csv", raw, "text/csv")},
        )
        source_id = r.json()["source_id"]
        r = client.post(
            f"/sources/{source_id}/mapping",
            json={"mapping": {"id": "trade_id", "price": "price"}},
        )
        assert r.status_code == 200
        assert r.json()["mapping"] == {"id": "trade_id", "price": "price"}
