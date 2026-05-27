import { expect, test } from '@playwright/test';

test('trip detail page renders the map container', async ({ page }) => {
  // Requires a seeded trip. Adjust the URL to match test seed data.
  await page.goto('/trips/scheduled-trip-test-id');
  await expect(page.locator('[data-testid="trip-map"]')).toBeVisible();
});
