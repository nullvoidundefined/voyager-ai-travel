import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test('multi-city trip shows LegList in itinerary pane', async ({ page }) => {
  test.setTimeout(30_000);
  const user = await seedUser(newUser());
  await login(page, user);
  await createTrip(page);

  const match = page.url().match(/\/trips\/([a-f0-9-]{36})/);
  if (!match) {
    throw new Error(`Could not extract trip id from URL: ${page.url()}`);
  }
  const tripId = match[1];

  // Intercept the trip fetch to set trip_structure = 'multi_city'
  // so the LegList section renders.
  await page.route(`**/api/trips/${tripId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: { ...body, trip: { ...body.trip, trip_structure: 'multi_city' } },
    });
  });

  // Intercept the legs fetch and inject two synthetic legs.
  await page.route(`**/api/trips/${tripId}/legs`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        legs: [
          {
            id: 'leg-1',
            origin: 'DEN',
            destination: 'LAX',
            depart_date: '2026-06-01',
            leg_order: 1,
          },
          {
            id: 'leg-2',
            origin: 'LAX',
            destination: 'SFO',
            depart_date: '2026-06-03',
            leg_order: 2,
          },
        ],
      }),
    });
  });

  await page.reload();
  await expect(page.locator('[data-testid="leg-list"]')).toBeVisible({
    timeout: 10_000,
  });
});
