import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test('booking links section is visible on a trip with booking URLs', async ({
  page,
}) => {
  test.setTimeout(30_000);
  const user = await seedUser(newUser());
  await login(page, user);
  await createTrip(page);

  const match = page.url().match(/\/trips\/([a-f0-9-]{36})/);
  if (!match) {
    throw new Error(`Could not extract trip id from URL: ${page.url()}`);
  }
  const tripId = match[1];

  // Intercept the trip fetch and inject a flight with a booking_url
  // so the BookingLinks section renders without requiring actual selections.
  await page.route(`**/api/trips/${tripId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const body = await response.json();
    const patchedBody = {
      ...body,
      trip: {
        ...body.trip,
        flights: [
          {
            id: 'booking-link-test-flight',
            airline: 'United',
            flight_number: 'UA123',
            origin: 'DEN',
            destination: 'SFO',
            price: 350,
            currency: 'USD',
            booking_url: 'https://example.com/book/ua123',
            departure_time: '2026-06-01T09:00:00.000Z',
          },
        ],
      },
    };
    await route.fulfill({ response, json: patchedBody });
  });

  await page.reload();
  await expect(page.locator('[data-testid="booking-links"]')).toBeVisible({
    timeout: 10_000,
  });
});
