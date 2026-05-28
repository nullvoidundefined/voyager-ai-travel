/**
 * Trip detail page spacing regression guard (B5).
 *
 * The itinerary pane renders category sections (Flights, Hotels, etc.)
 * only when the trip has matching data. This spec intercepts the GET
 * /trips/:id response, injects a synthetic flight, and asserts the
 * Flights section renders with its item cards visible.
 *
 * Note: the original B5 regression (chat flush against Flights) no
 * longer applies in the split-pane layout; chat and itinerary are now
 * in separate panes. The guard is preserved to ensure the route
 * intercept pattern and conditional rendering still work.
 */
import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test.describe('Trip detail page spacing (B5)', () => {
  test('Flights section renders when trip has flights', async ({ page }) => {
    test.setTimeout(45_000);

    const user = await seedUser(newUser());
    await login(page, user);
    await createTrip(page);

    const match = page
      .url()
      .match(
        /\/trips\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/,
      );
    if (!match) {
      throw new Error(`Could not extract trip id from URL: ${page.url()}`);
    }
    const tripId = match[1];

    await page.route(`http://localhost:3001/trips/${tripId}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      const response = await route.fetch();
      const body = await response.json();
      const trip = body.trip;
      const injectedFlight = {
        id: 'b5-test-flight',
        origin: 'DEN',
        destination: 'SFO',
        airline: 'United',
        flight_number: 'UA123',
        price: 350,
        currency: 'USD',
        departure_time: '2026-06-01T09:00:00.000Z',
        booking_url: null,
      };
      await route.fulfill({
        response,
        json: {
          ...body,
          trip: {
            ...trip,
            flights: [injectedFlight, ...(trip.flights ?? [])],
          },
        },
      });
    });

    await page.reload();

    // The Flights section uses a <p> category label, not an h2.
    await expect(
      page.locator('p', { hasText: /^Flights$/ }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // At least one flight item card must be rendered below the label.
    await expect(page.locator('text=UA123').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
