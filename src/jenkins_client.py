"""
src/jenkins_client.py
=====================
Cliente m├ìnimo contra la REST API de Jenkins. Talks JSON via httpx so it
plays nicely with FastAPI's async stack and lets tests inject a fake
client without spinning up a Jenkins controller.

Endpoints used (mapped to Jenkins URLs):
    GET    /api/json                          # controller info
    GET    /api/json?tree=jobs[name,...]      # list jobs
    GET    /job/<name>/api/json?tree=...      # job detail + builds
    GET    /job/<name>/<n>/api/json           # build detail
    POST   /job/<name>/build                  # trigger build
    POST   /job/<name>/<n>/stop               # stop running build
    GET    /job/<name>/<n>/logText/progressiveText?start=<offset>

Auth uses HTTP basic-auth with `username:token` (Jenkins API tokens are
the recommended approach over passwords).
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class JenkinsError(Exception):
    """Wrapping for HTTP/transport failures so callers don't import httpx."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        self.status_code = status_code
        super().__init__(message)


class JenkinsClient:
    """Sync wrapper over httpx.Client.

    Sync is intentional: every FastAPI endpoint that uses this client is a
    plain `def` (not async) and FastAPI runs them in a threadpool. Keeping
    the client sync removes a layer of event-loop juggling.

    `http_client` is injectable for tests.
    """

    def __init__(
        self,
        config: dict[str, Any],
        *,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.cfg = config["jenkins"]
        if not self.cfg.get("enabled", False):
            raise JenkinsError("Jenkins integration is disabled in settings.yaml")
        self.base_url: str = str(self.cfg["url"]).rstrip("/")
        self.timeout: float = float(self.cfg.get("timeout_seconds", 10.0))
        username = os.environ.get(self.cfg.get("username_env", "JENKINS_USER"), "")
        token = os.environ.get(self.cfg.get("token_env", "JENKINS_TOKEN"), "")
        self._auth = (username, token) if username and token else None
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            auth=self._auth,
        )

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    # =================================================================
    # Controller
    # =================================================================
    def get_info(self) -> dict[str, Any]:
        """Top-level Jenkins info: version, node count, etc."""
        return self._get_json("/api/json")

    # =================================================================
    # Jobs
    # =================================================================
    def list_jobs(self) -> list[dict[str, Any]]:
        """List jobs with a minimal projection (name, url, color, last builds)."""
        tree = (
            "jobs[name,url,color,buildable,inQueue,"
            "lastBuild[number,result,timestamp,duration,building],"
            "lastSuccessfulBuild[number,timestamp],"
            "lastFailedBuild[number,timestamp]]"
        )
        data = self._get_json("/api/json", params={"tree": tree})
        return list(data.get("jobs", []))

    def get_job(self, name: str) -> dict[str, Any]:
        """Job detail + last N builds list."""
        n = int(self.cfg.get("builds_per_job", 20))
        tree = (
            "name,url,color,buildable,inQueue,description,"
            f"builds[number,result,timestamp,duration,building,url]{{0,{n}}}"
        )
        return self._get_json(f"/job/{name}/api/json", params={"tree": tree})

    def build_job(self, name: str) -> dict[str, Any]:
        """Trigger a build. Returns the queue item location for follow-up."""
        r = self._request("POST", f"/job/{name}/build", expect_status=(201, 200))
        location = r.headers.get("Location")
        return {"queued": True, "queue_url": location}

    def stop_build(self, name: str, number: int) -> dict[str, Any]:
        """Abort a running build. Jenkins replies 302 to the build page."""
        self._request(
            "POST",
            f"/job/{name}/{number}/stop",
            expect_status=(200, 302),
        )
        return {"stopped": True, "job": name, "build": number}

    # =================================================================
    # Console output
    # =================================================================
    def get_console(self, name: str, number: int, start: int = 0) -> dict[str, Any]:
        """Progressive console fetch.

        Returns the new bytes since `start`, the next offset and a flag
        telling the UI whether more output is expected.
        """
        r = self._request(
            "GET",
            f"/job/{name}/{number}/logText/progressiveText",
            params={"start": str(start)},
            expect_status=(200,),
        )
        text = r.text
        # Cap the payload so a huge log doesn't blow up the WS frame.
        cap = int(self.cfg.get("console_tail_kb", 64)) * 1024
        if len(text) > cap:
            text = "…(truncated)…\n" + text[-cap:]
        return {
            "text": text,
            "next_start": int(r.headers.get("X-Text-Size", start)),
            "more": r.headers.get("X-More-Data", "false").lower() == "true",
        }

    # =================================================================
    # Internals
    # =================================================================
    def _get_json(self, path: str, params: dict[str, str] | None = None) -> dict[str, Any]:
        r = self._request("GET", path, params=params, expect_status=(200,))
        try:
            return r.json()
        except ValueError as e:
            raise JenkinsError(f"Non-JSON response from {path}: {e}", r.status_code) from e

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        expect_status: tuple[int, ...] = (200,),
    ) -> httpx.Response:
        try:
            r = self._client.request(method, path, params=params)
        except httpx.HTTPError as e:
            raise JenkinsError(f"Transport error: {e}") from e
        if r.status_code not in expect_status:
            raise JenkinsError(
                f"Jenkins {method} {path} returned {r.status_code}: {r.text[:200]}",
                r.status_code,
            )
        return r
