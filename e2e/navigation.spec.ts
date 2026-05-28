import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    expect(await page.title()).toBeTruthy();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    expect(await page.title()).toBeTruthy();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    // On auth pages the global Header is hidden via CSS, so any
    // Header register link in the DOM is not visible. Filter to
    // visible elements only and take the first match within the
    // form area.
    const registerLink = page.locator('a[href*="register"]:visible').first();
    await expect(registerLink).toBeVisible();
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register');
    // Same CSS-hiding gotcha as above: filter to visible elements.
    const loginLink = page.locator('a[href*="login"]:visible').first();
    await expect(loginLink).toBeVisible();
  });
});
