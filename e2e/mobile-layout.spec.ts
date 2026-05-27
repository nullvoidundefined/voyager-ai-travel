import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('chat box is at least 60vh on mobile', async ({ page }) => {
  await page.goto('/');
  const chatBox = page.locator('[data-testid="chat-box"]').first();
  const box = await chatBox.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(0.6 * 812);
});
