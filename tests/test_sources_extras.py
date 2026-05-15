"""
tests/test_sources_extras.py
============================
Cubre paths de error de src/sources.py que test_sources.py no toca:
extension at read mismatch, metadata corrupta en list_sources, etc.
"""

from __future__ import annotations

import copy
from pathlib import Path

import pytest
from src.audit import load_config
from src.sources import (
    SourceError,
    _coerce_to_trade_schema,
    list_sources,
    register_upload,
)


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


def test_list_skips_directories_with_invalid_metadata(cfg, tmp_path):
    # Create a valid source first
    register_upload("ok.csv", b"id\n1\n", cfg)

    # And a sibling dir whose metadata.json is malformed
    bad_dir = Path(cfg["sources"]["upload_dir"]) / "bad-id"
    bad_dir.mkdir(parents=True, exist_ok=True)
    (bad_dir / "metadata.json").write_text("{not valid json")

    listing = list_sources(cfg)
    # Bad entry is silently skipped, only the good upload appears.
    assert len(listing) == 1
    assert listing[0]["original_name"] == "ok.csv"


def test_list_returns_empty_when_root_missing(cfg):
    # Point to a non-existent dir; list returns [] without raising.
    cfg = copy.deepcopy(cfg)
    cfg["sources"]["upload_dir"] = "/does/not/exist/anywhere"
    assert list_sources(cfg) == []


def test_coerce_skips_columns_not_present():
    import polars as pl

    df = pl.DataFrame({"trade_id": ["T1"], "extra": [1]})
    out = _coerce_to_trade_schema(df)
    # Nothing to coerce (no quantity/price/notional in columns); df unchanged
    assert out.columns == df.columns
    assert out["trade_id"].to_list() == ["T1"]


def test_register_rejects_empty_extension(cfg):
    with pytest.raises(SourceError, match="Extension"):
        register_upload("noext", b"x", cfg)
