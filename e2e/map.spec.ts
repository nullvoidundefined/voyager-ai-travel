import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test('trip detail page renders the map container', async ({ page }) => {
  const user = await seedUser(newUser());
  await login(page, user);
  await createTrip(page);
  await expect(page.locator('[data-testid="trip-map"]')).toBeVisible({
    timeout: 10_000,
  });
});
