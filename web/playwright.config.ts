import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config. Tests live in `e2e/` and run against a Vite dev
 * server + FastAPI backend that the spec files boot via `webServer` below
 * — locally and in CI.
 *
 *   PORT_API  : where uvicorn listens (default 8001)
 *   BASE_URL  : already-running frontend; if set, Playwright skips its
 *               own webServer (used by the CI job that orchestrates both
 *               services from the workflow).
 */

const API_PORT = process.env.PORT_API ?? '8001';
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const skipWebServer = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run dev -- --host 127.0.0.1 --port 5173`,
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: { PORT_API: API_PORT },
      },
});
