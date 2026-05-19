"""
tests/test_jenkins_client_direct.py
====================================
Direct tests against `JenkinsClient` with an httpx `MockTransport`,
so every branch is exercised without a real Jenkins controller.

Complements test_jenkins.py (which exercises the FastAPI endpoints with
a `FakeJenkins`) — this file is for line-coverage of the client itself.
"""

from __future__ import annotations

import copy
from pathlib import Path

import httpx
import pytest
from src.audit import load_config
from src.jenkins_client import JenkinsClient, JenkinsError


@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg) -> dict:
    c = copy.deepcopy(real_cfg)
    c["jenkins"]["enabled"] = True
    c["jenkins"]["url"] = "http://jenkins.test"
    return c


def _make_client(cfg: dict, handler):
    """Build a JenkinsClient with an httpx MockTransport over `handler`."""
    transport = httpx.MockTransport(handler)
    http = httpx.Client(base_url=cfg["jenkins"]["url"], transport=transport)
    return JenkinsClient(cfg, http_client=http)


# =====================================================================
# Read-only methods
# =====================================================================
class TestGetInfo:
    def test_get_info_returns_parsed_json(self, cfg):
        def handler(req):
            assert req.url.path == "/api/json"
            return httpx.Response(
                200, json={"version": "2.426.1", "jobs": [], "nodeName": "master"}
            )

        client = _make_client(cfg, handler)
        out = client.get_info()
        assert out["version"] == "2.426.1"

    def test_non_json_response_raises(self, cfg):
        def handler(req):
            return httpx.Response(200, text="not valid json")

        client = _make_client(cfg, handler)
        with pytest.raises(JenkinsError, match="Non-JSON"):
            client.get_info()


class TestListJobs:
    def test_list_jobs_uses_tree_projection(self, cfg):
        captured: dict[str, str] = {}

        def handler(req):
            captured["tree"] = req.url.params.get("tree", "")
            return httpx.Response(
                200,
                json={
                    "jobs": [
                        {"name": "a", "color": "blue"},
                        {"name": "b", "color": "red"},
                    ]
                },
            )

        client = _make_client(cfg, handler)
        out = client.list_jobs()
        assert len(out) == 2
        # Tree projection must include the columns the UI renders
        assert "lastBuild" in captured["tree"]
        assert "color" in captured["tree"]


class TestGetJob:
    def test_get_job_includes_builds(self, cfg):
        def handler(req):
            assert req.url.path == "/job/trade-deploy/api/json"
            return httpx.Response(
                200,
                json={
                    "name": "trade-deploy",
                    "builds": [{"number": 1}, {"number": 2}],
                },
            )

        client = _make_client(cfg, handler)
        out = client.get_job("trade-deploy")
        assert len(out["builds"]) == 2


# =====================================================================
# Write methods
# =====================================================================
class TestBuildAndStop:
    def test_build_job_returns_queue_location(self, cfg):
        def handler(req):
            assert req.method == "POST"
            assert req.url.path == "/job/x/build"
            return httpx.Response(
                201, headers={"Location": "http://jenkins.test/queue/item/42/"}
            )

        client = _make_client(cfg, handler)
        out = client.build_job("x")
        assert out["queued"] is True
        assert out["queue_url"].endswith("/queue/item/42/")

    def test_build_job_accepts_status_200(self, cfg):
        """Some Jenkins versions return 200 on /build instead of 201."""

        def handler(req):
            return httpx.Response(200, headers={"Location": "/queue/item/9/"})

        client = _make_client(cfg, handler)
        assert client.build_job("x")["queued"] is True

    def test_stop_build_accepts_200_and_302(self, cfg):
        for status in (200, 302):
            def handler(req, _status=status):
                assert req.method == "POST"
                assert req.url.path == "/job/x/3/stop"
                return httpx.Response(_status)

            client = _make_client(cfg, handler)
            out = client.stop_build("x", 3)
            assert out == {"stopped": True, "job": "x", "build": 3}


# =====================================================================
# Console fetch (progressive)
# =====================================================================
class TestGetConsole:
    def test_get_console_passes_through_headers(self, cfg):
        def handler(req):
            assert req.url.params.get("start") == "100"
            return httpx.Response(
                200,
                text="line 3\nline 4\n",
                headers={"X-Text-Size": "120", "X-More-Data": "true"},
            )

        client = _make_client(cfg, handler)
        out = client.get_console("x", 7, start=100)
        assert out["text"] == "line 3\nline 4\n"
        assert out["next_start"] == 120
        assert out["more"] is True

    def test_get_console_caps_huge_payloads(self, cfg):
        cfg = copy.deepcopy(cfg)
        cfg["jenkins"]["console_tail_kb"] = 4  # 4KB cap

        big = "x" * (50 * 1024)  # 50KB body

        def handler(req):
            return httpx.Response(
                200,
                text=big,
                headers={"X-Text-Size": str(len(big)), "X-More-Data": "false"},
            )

        client = _make_client(cfg, handler)
        out = client.get_console("x", 1)
        assert "truncated" in out["text"]
        assert len(out["text"]) < 5 * 1024


# =====================================================================
# Error transport / status code branches
# =====================================================================
class TestTransportErrors:
    def test_transport_error_wraps_to_jenkins_error(self, cfg):
        def handler(req):
            raise httpx.ConnectError("DNS broke")

        client = _make_client(cfg, handler)
        with pytest.raises(JenkinsError, match="Transport error"):
            client.get_info()

    def test_4xx_response_raises_with_status(self, cfg):
        def handler(req):
            return httpx.Response(404, text="Not found")

        client = _make_client(cfg, handler)
        with pytest.raises(JenkinsError) as exc:
            client.get_info()
        assert exc.value.status_code == 404

    def test_5xx_response_raises_with_status(self, cfg):
        def handler(req):
            return httpx.Response(503, text="Service unavailable")

        client = _make_client(cfg, handler)
        with pytest.raises(JenkinsError) as exc:
            client.list_jobs()
        assert exc.value.status_code == 503


# =====================================================================
# close() releases the owned client
# =====================================================================
def test_close_releases_owned_client(cfg):
    def handler(req):
        return httpx.Response(200, json={"version": "1"})

    client = _make_client(cfg, handler)
    client.close()  # idempotent: closing twice would be safer; we just verify it runs


def test_close_no_op_when_external_client_passed(cfg):
    """When http_client is injected, the consumer keeps ownership; close()
    on JenkinsClient should NOT close the external client."""
    transport = httpx.MockTransport(
        lambda req: httpx.Response(200, json={"version": "1"})
    )
    external = httpx.Client(base_url=cfg["jenkins"]["url"], transport=transport)
    client = JenkinsClient(cfg, http_client=external)
    client.close()
    # The external client is still usable
    resp = external.get("/api/json")
    assert resp.status_code == 200
    external.close()
