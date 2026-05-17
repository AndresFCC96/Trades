"""
tests/test_jenkins.py
=====================
Cubre src/jenkins_client.py + los endpoints /jenkins/* con un cliente
fake (no requiere un Jenkins real).
"""

from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from src.api.main import create_app
from src.audit import load_config


@pytest.fixture(scope="module")
def real_cfg() -> dict:
    return load_config(Path("config/settings.yaml"))


@pytest.fixture
def cfg(real_cfg, tmp_path) -> dict:
    c = copy.deepcopy(real_cfg)
    c["generator"]["output_dir"] = str(tmp_path / "raw")
    c["audit"]["output_dir"] = str(tmp_path / "audit")
    # Enable Jenkins for the tests that need it
    c["jenkins"]["enabled"] = True
    c["jenkins"]["url"] = "http://jenkins.test"
    return c


# =====================================================================
# Fake Jenkins client (matches JenkinsClient's signature)
# =====================================================================
class FakeJenkins:
    def __init__(self) -> None:
        self.calls: list[tuple[str, ...]] = []
        self.info_data: dict[str, Any] = {
            "version": "2.426.1",
            "jobs": [
                {"name": "trade-deploy", "color": "blue"},
                {"name": "nightly", "color": "blue_anime"},
            ],
            "assignedLabels": [{"name": "master"}, {"name": "linux"}],
        }
        self.jobs_data: list[dict[str, Any]] = [
            {
                "name": "trade-deploy",
                "url": "http://jenkins.test/job/trade-deploy",
                "color": "blue",
                "buildable": True,
                "inQueue": False,
                "lastBuild": {"number": 142, "result": "SUCCESS",
                              "timestamp": 1700000000000, "duration": 84000,
                              "building": False},
            },
            {
                "name": "nightly",
                "url": "http://jenkins.test/job/nightly",
                "color": "blue_anime",
                "buildable": True,
                "inQueue": False,
                "lastBuild": {"number": 21, "result": None,
                              "timestamp": 1700000300000, "duration": 0,
                              "building": True},
            },
        ]
        self.console_pages: list[dict[str, Any]] = [
            {"text": "line 1\n", "next_start": 7, "more": True},
            {"text": "line 2\n", "next_start": 14, "more": False},
        ]
        self._console_idx = 0

    def get_info(self) -> dict[str, Any]:
        self.calls.append(("get_info",))
        return self.info_data

    def list_jobs(self) -> list[dict[str, Any]]:
        self.calls.append(("list_jobs",))
        return self.jobs_data

    def get_job(self, name: str) -> dict[str, Any]:
        self.calls.append(("get_job", name))
        return {"name": name, "builds": [{"number": 142, "result": "SUCCESS"}]}

    def build_job(self, name: str) -> dict[str, Any]:
        self.calls.append(("build_job", name))
        return {"queued": True, "queue_url": "http://jenkins.test/queue/item/99/"}

    def stop_build(self, name: str, number: int) -> dict[str, Any]:
        self.calls.append(("stop_build", name, number))
        return {"stopped": True, "job": name, "build": number}

    def get_console(self, name: str, number: int, start: int = 0) -> dict[str, Any]:
        self.calls.append(("get_console", name, number, start))
        if self._console_idx >= len(self.console_pages):
            return {"text": "", "next_start": start, "more": False}
        page = self.console_pages[self._console_idx]
        self._console_idx += 1
        return page


@pytest.fixture
def client_with_fake_jenkins(cfg) -> tuple[TestClient, FakeJenkins]:
    app = create_app(cfg)
    fake = FakeJenkins()
    app.state.jenkins_factory = lambda: fake
    return TestClient(app), fake


# =====================================================================
# /jenkins/health
# =====================================================================
class TestJenkinsHealth:
    def test_health_when_disabled(self, real_cfg):
        c = copy.deepcopy(real_cfg)
        c["jenkins"]["enabled"] = False
        client = TestClient(create_app(c))
        body = client.get("/jenkins/health").json()
        assert body["enabled"] is False
        assert body["error"]

    def test_health_when_enabled_reports_version_and_jobs(
        self, client_with_fake_jenkins
    ):
        client, fake = client_with_fake_jenkins
        r = client.get("/jenkins/health")
        assert r.status_code == 200
        body = r.json()
        assert body["enabled"] is True
        assert body["version"] == "2.426.1"
        assert body["jobs_total"] == 2
        # `blue_anime` = currently building
        assert body["building_total"] == 1


# =====================================================================
# /jenkins/jobs CRUD
# =====================================================================
class TestJenkinsJobs:
    def test_list_jobs(self, client_with_fake_jenkins):
        client, _ = client_with_fake_jenkins
        body = client.get("/jenkins/jobs").json()
        assert len(body["jobs"]) == 2
        names = [j["name"] for j in body["jobs"]]
        assert "trade-deploy" in names

    def test_job_detail(self, client_with_fake_jenkins):
        client, _ = client_with_fake_jenkins
        body = client.get("/jenkins/jobs/trade-deploy").json()
        assert body["job"]["name"] == "trade-deploy"

    def test_trigger_build_returns_queue_url(self, client_with_fake_jenkins):
        client, fake = client_with_fake_jenkins
        r = client.post("/jenkins/jobs/trade-deploy/build")
        assert r.status_code == 201
        body = r.json()
        assert body["queued"] is True
        assert "queue/item" in body["queue_url"]
        assert ("build_job", "trade-deploy") in fake.calls

    def test_stop_build(self, client_with_fake_jenkins):
        client, fake = client_with_fake_jenkins
        r = client.post("/jenkins/jobs/trade-deploy/builds/142/stop")
        assert r.status_code == 200
        assert r.json() == {"stopped": True, "job": "trade-deploy", "build": 142}
        assert ("stop_build", "trade-deploy", 142) in fake.calls

    def test_build_log_returns_progressive_text(self, client_with_fake_jenkins):
        client, _ = client_with_fake_jenkins
        r = client.get("/jenkins/jobs/trade-deploy/builds/142/log")
        assert r.status_code == 200
        body = r.json()
        assert body["text"] == "line 1\n"
        assert body["next_start"] == 7
        assert body["more"] is True


# =====================================================================
# Disabled Jenkins returns 503 on the /jobs endpoints
# =====================================================================
class TestJenkinsDisabled:
    def test_jobs_returns_503_when_disabled(self, real_cfg):
        c = copy.deepcopy(real_cfg)
        c["jenkins"]["enabled"] = False
        client = TestClient(create_app(c))
        routes: list[tuple[str, str]] = [
            ("get", "/jenkins/jobs"),
            ("get", "/jenkins/jobs/trade-deploy"),
            ("post", "/jenkins/jobs/trade-deploy/build"),
            ("post", "/jenkins/jobs/trade-deploy/builds/1/stop"),
            ("get", "/jenkins/jobs/trade-deploy/builds/1/log"),
        ]
        for method, path in routes:
            r = getattr(client, method)(path)
            assert r.status_code == 503, f"{method} {path} returned {r.status_code}"


# =====================================================================
# Direct JenkinsClient unit tests (against an httpx MockTransport)
# =====================================================================
class TestJenkinsClientDirect:
    def test_disabled_raises(self, real_cfg):
        from src.jenkins_client import JenkinsClient, JenkinsError

        c = copy.deepcopy(real_cfg)
        c["jenkins"]["enabled"] = False
        with pytest.raises(JenkinsError, match="disabled"):
            JenkinsClient(c)

    def test_build_job_calls_post_and_returns_location(self, cfg, monkeypatch):
        import httpx
        from src.jenkins_client import JenkinsClient

        def handler(req: httpx.Request) -> httpx.Response:
            assert req.method == "POST"
            assert req.url.path == "/job/trade-deploy/build"
            return httpx.Response(
                201, headers={"Location": "http://jenkins.test/queue/item/7/"}
            )

        transport = httpx.MockTransport(handler)
        http = httpx.Client(base_url=cfg["jenkins"]["url"], transport=transport)
        client = JenkinsClient(cfg, http_client=http)
        out = client.build_job("trade-deploy")
        assert out["queue_url"].endswith("/item/7/")

    def test_get_console_truncates_long_payload(self, cfg):
        import httpx
        from src.jenkins_client import JenkinsClient

        big = "x" * (200 * 1024)  # 200KB
        cfg["jenkins"]["console_tail_kb"] = 8

        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                text=big,
                headers={"X-Text-Size": str(len(big)), "X-More-Data": "false"},
            )

        transport = httpx.MockTransport(handler)
        http = httpx.Client(base_url=cfg["jenkins"]["url"], transport=transport)
        client = JenkinsClient(cfg, http_client=http)
        out = client.get_console("trade-deploy", 1, start=0)
        assert "truncated" in out["text"]
        # Tail of 8KB + a small "truncated" prefix
        assert len(out["text"]) < 9 * 1024
