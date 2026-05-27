import { expect, test } from '@playwright/test';

test('trip detail page shows daily schedule when days exist', async ({
  page,
}) => {
  // Requires a trip with a seeded schedule. Adjust the URL to match test seed data.
  await page.goto('/trips/scheduled-trip-test-id');
  await expect(page.locator('[data-testid="daily-schedule"]')).toBeVisible();
  await expect(page.locator('text=Day 1')).toBeVisible();
});
