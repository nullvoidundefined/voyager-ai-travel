import { expect, test } from '@playwright/test';

test('trip detail page shows export and share buttons', async ({ page }) => {
  // Requires a seeded trip.
  await page.goto('/trips/scheduled-trip-test-id');
  await expect(
    page.getByRole('button', { name: /download pdf/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /download calendar/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /share/i })).toBeVisible();
});
