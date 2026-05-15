import { test, expect } from '@playwright/test';

/**
 * Smoke flow #1 — the dashboard mounts, the shell is visible, and the
 * Overview empty state shows when the backend has no runs yet.
 *
 * Requires the FastAPI backend reachable (proxied by Vite). The CI job
 * starts uvicorn before this spec runs.
 */
test('dashboard boots and renders the Terminal shell', async ({ page }) => {
  await page.goto('/');

  // Topbar identity
  await expect(page.getByText('TRADESYS')).toBeVisible();

  // Sidebar sections
  await expect(page.getByText('MAIN').first()).toBeVisible();
  await expect(page.getByText('ANALYSIS').first()).toBeVisible();
  await expect(page.getByText('AUDIT', { exact: true }).first()).toBeVisible();

  // Either the empty state or a populated Overview is acceptable here —
  // we just check that *something* coherent rendered in main content.
  await expect(
    page.getByText(/NO RUNS YET|Quality Score|Trades Processed/).first()
  ).toBeVisible({ timeout: 10_000 });
});
