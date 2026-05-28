import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test('trip detail page shows export and share buttons', async ({ page }) => {
  const user = await seedUser(newUser());
  await login(page, user);
  await createTrip(page);
  await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible(
    { timeout: 10_000 },
  );
  await expect(
    page.getByRole('button', { name: /download calendar/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /share/i })).toBeVisible();
});
