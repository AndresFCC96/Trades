"""
tests/test_extractor_extras.py
==============================
Branches del extractor que test_extractor.py no toca: la rama
api_key auth, el default http_client con `from_date='auto'` y errores
de payload shape.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from unittest.mock import patch

import polars as pl
import pytest
from src.audit import load_config
from src.trade_extractor import _build_auth_headers, _default_http_client, extract_trades


@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    return c


class TestAuthHeaders:
    def test_bearer(self, monkeypatch):
        monkeypatch.setenv("MY_TOKEN", "abc123")
        h = _build_auth_headers({"auth_type": "bearer", "token_env": "MY_TOKEN"})
        assert h == {"Authorization": "Bearer abc123"}

    def test_api_key(self, monkeypatch):
        monkeypatch.setenv("MY_KEY", "k-789")
        h = _build_auth_headers({"auth_type": "api_key", "token_env": "MY_KEY"})
        assert h == {"X-API-Key": "k-789"}

    def test_no_env_returns_empty(self):
        h = _build_auth_headers({"auth_type": "bearer", "token_env": "NEVER_SET_X"})
        assert h == {}

    def test_unknown_auth_returns_empty(self, monkeypatch):
        monkeypatch.setenv("MY_TOKEN", "abc")
        h = _build_auth_headers({"auth_type": "fancy", "token_env": "MY_TOKEN"})
        assert h == {}


class _FakeResp:
    def __init__(self, body: bytes):
        self._body = body

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class TestDefaultHttpClient:
    def test_returns_trades_when_payload_is_object_with_trades_key(self):
        body = json.dumps({"trades": [{"id": 1}, {"id": 2}]}).encode()
        with patch("src.trade_extractor.urllib.request.urlopen", return_value=_FakeResp(body)):
            out = _default_http_client(
                "https://example.test/v1/trades", {}, {}, 5.0,
            )
        assert out == [{"id": 1}, {"id": 2}]

    def test_returns_array_directly(self):
        body = json.dumps([{"id": 1}]).encode()
        with patch("src.trade_extractor.urllib.request.urlopen", return_value=_FakeResp(body)):
            out = _default_http_client("https://x", {}, {"limit": 10}, 5.0)
        assert out == [{"id": 1}]

    def test_unexpected_shape_raises(self):
        body = json.dumps("just a string").encode()
        with patch("src.trade_extractor.urllib.request.urlopen", return_value=_FakeResp(body)):
            with pytest.raises(ValueError, match="payload shape"):
                _default_http_client("https://x", {}, {}, 5.0)


class TestExtractApiMode:
    def test_api_mode_with_from_date_auto(self, cfg):
        """`from_date='auto'` is resolved to `now - timestamp_window_days`."""
        captured: dict[str, object] = {}

        def _client(url, headers, params, timeout):
            captured["url"] = url
            captured["params"] = params
            return [
                {"trade_id": "T1", "timestamp": "2026-01-01T00:00:00",
                 "instrument": "AAPL", "asset_class": "equity", "side": "BUY",
                 "quantity": 10.0, "price": 180.0, "notional": 1800.0,
                 "currency": "USD", "counterparty_id": "CP-1",
                 "trader_id": "TR-1", "venue": "NYSE", "status": "executed"},
            ]

        df, meta = extract_trades(cfg, mode="api", http_client=_client)
        assert len(df) == 1
        # from_date was an ISO string, not the literal "auto"
        assert captured["params"]["from_date"] != "auto"
        assert "T" in captured["params"]["from_date"]
        assert meta["mode"] == "api"

    def test_api_mode_empty_payload_returns_empty_frame(self, cfg):
        df, meta = extract_trades(
            cfg, mode="api", http_client=lambda *a, **k: [],
        )
        assert isinstance(df, pl.DataFrame)
        assert meta["rows_read"] == 0
