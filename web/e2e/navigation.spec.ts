import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke flow #2 — the sidebar navigates to each main section without
 * runtime errors. Avoid asserting on specific data (the backend may
 * have zero runs in CI), just on the screen header / panel title.
 *
 * NOTE: lookups are scoped to the <aside> so labels like "History"
 * don't collide with action buttons in the main content (e.g. the
 * "VIEW HISTORY →" CTA on the Overview empty state).
 */
function sidebar(page: Page) {
  return page.locator('aside');
}

test.describe('sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('TRADESYS')).toBeVisible();
  });

  test('navigates to Run Pipeline', async ({ page }) => {
    await sidebar(page).getByText('Run Pipeline').click();
    await expect(page.getByText(/Pipeline Configuration/i)).toBeVisible();
  });

  test('navigates to Data Sources and the Kafka tab is default', async ({ page }) => {
    await sidebar(page).getByText('Data Sources').click();
    // The Kafka tab panel exposes "Cluster Connection" — a unique
    // marker that only appears when the Kafka tab is active.
    await expect(page.getByText(/Cluster Connection/i)).toBeVisible();
  });

  test('navigates to Validation Rules and shows all 14 RV ids', async ({ page }) => {
    await sidebar(page).getByText('Validation Rules').click();
    // RV-XX badges appear inside both the card badge and the rule list
    // header chip; `.first()` is fine for the smoke check.
    await expect(page.getByText('RV-01').first()).toBeVisible();
    await expect(page.getByText('RV-14').first()).toBeVisible();
  });

  test('navigates to History', async ({ page }) => {
    await sidebar(page).getByText('History').click();
    await expect(page.getByText(/Pipeline Run History/i)).toBeVisible();
  });

  test('navigates to Settings', async ({ page }) => {
    await sidebar(page).getByText('Settings').click();
    await expect(page.getByText(/Read-only preview/i)).toBeVisible();
  });
});
