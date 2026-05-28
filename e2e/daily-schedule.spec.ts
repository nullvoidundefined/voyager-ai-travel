import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test('trip detail page shows daily schedule when days exist', async ({
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

  // Intercept the schedule fetch and inject a synthetic day so
  // the DailySchedule section renders without requiring the agent
  // to run plan_daily_schedule.
  await page.route(
    `http://localhost:3001/trips/${tripId}/schedule`,
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          days: [
            {
              day_number: 1,
              day_date: '2026-06-01',
              items: [
                {
                  time_of_day: '09:00',
                  title: 'City tour',
                  category: 'experience',
                },
              ],
            },
          ],
        }),
      });
    },
  );

  await page.reload();
  await expect(page.locator('[data-testid="daily-schedule"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('text=Day 1')).toBeVisible();
});
