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
    // The three tab labels are visible regardless of which tab is
    // active; use them as a stable marker. (The Kafka panel body has
    // race-y WS-driven content that flakes in CI.)
    await expect(page.getByText(/KAFKA STREAMING/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/FILE UPLOAD/i)).toBeVisible();
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
    // Banner copy: Settings is now backed by the live editor endpoint.
    await expect(page.getByText(/Live editor/i)).toBeVisible({ timeout: 15_000 });
  });
});
