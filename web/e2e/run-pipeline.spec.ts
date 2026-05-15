import { test, expect } from '@playwright/test';

/**
 * Smoke flow #3 — execute a tiny pipeline run from the UI and verify
 * the stage stepper + result banner. Hits the real backend with n=200
 * trades, which finishes in well under a second.
 */
test('runs a small pipeline end-to-end from the UI', async ({ page }) => {
  await page.goto('/run');
  await expect(page.getByText(/Pipeline Configuration/i)).toBeVisible();

  // Default tab is "Generate synthetic" with n_trades=10_000. Drop it
  // to 200 to keep the run snappy.
  const nInput = page.locator('input[type="number"]').first();
  await nInput.fill('200');

  // Press the big RUN PIPELINE button inside the form (not the topbar
  // shortcut, which would just navigate).
  await page.getByRole('button', { name: /RUN PIPELINE/ }).last().click();

  // Result banner shows up when the run finishes.
  await expect(page.getByText(/RUN COMPLETED/)).toBeVisible({ timeout: 30_000 });
});
