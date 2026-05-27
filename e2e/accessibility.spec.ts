import { expect, test } from '@playwright/test';

test('skip link is first focusable element and jumps to main', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  const main = page.locator('main');
  await expect(main).toBeFocused();
});
