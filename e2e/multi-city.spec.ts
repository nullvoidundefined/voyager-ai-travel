import { expect, test } from '@playwright/test';

test('multi-city trip shows LegList in itinerary pane', async ({ page }) => {
  // Requires a seeded multi-city trip. Adjust the URL to match test seed data.
  await page.goto('/trips/multi-city-test-id');
  await expect(page.locator('[data-testid="leg-list"]')).toBeVisible();
});
