import { expect, test } from '@playwright/test';

test('booking links section is visible on a trip with booking URLs', async ({
  page,
}) => {
  // Requires a seeded trip that has selections with booking_url set.
  await page.goto('/trips/test-trip-with-selections');
  await expect(page.locator('[data-testid="booking-links"]')).toBeVisible();
});
