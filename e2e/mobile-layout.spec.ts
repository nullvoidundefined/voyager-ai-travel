import { expect, test } from '@playwright/test';

import { newUser, seedUser } from './fixtures/test-users';
import { login } from './helpers/auth';
import { createTrip } from './helpers/trip';

test.use({ viewport: { width: 375, height: 812 } });

test('chat box is at least 60vh on mobile', async ({ page }) => {
  test.setTimeout(30_000);
  const user = await seedUser(newUser());
  await login(page, user);
  await createTrip(page);
  const chatBox = page.locator('[data-testid="chat-box"]').first();
  await expect(chatBox).toBeVisible({ timeout: 10_000 });
  const box = await chatBox.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(0.6 * 812);
});
