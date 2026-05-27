/**
 * Page-object helpers for trip CRUD flows.
 */
import { type Page, expect } from '@playwright/test';

export async function createTrip(page: Page): Promise<void> {
  await page.goto('/trips');

  // Set up a response listener BEFORE clicking so we never miss
  // the POST /trips response. The /trips/new page fires a
  // useEffect that POSTs a new trip then router.replaces to
  // /trips/{uuid}. In CI, Next.js dev-mode on-demand compilation
  // of /trips/new can take 5-10s on a shared runner, and the
  // previous 15s flat timeout on the final URL was not enough to
  // cover compilation + hydration + API round-trip + client nav.
  //
  // Waiting for the API response decouples us from page
  // compilation time: Playwright holds the promise until the POST
  // completes, then we only need a short wait for router.replace.
  const tripCreated = page.waitForResponse(
    (res) =>
      res.url().includes('/trips') &&
      res.request().method() === 'POST' &&
      res.status() === 201,
    { timeout: 30_000 },
  );

  await page.click(
    'a:has-text("New Trip"), button:has-text("New Trip"), a:has-text("New trip"), button:has-text("New trip")',
  );

  await tripCreated;

  // The POST succeeded so router.replace is in-flight. Wait for
  // the UUID to appear in the URL. This should be near-instant
  // but allow 10s for slow CI client-side navigation.
  await expect(page).toHaveURL(
    /\/trips\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
    { timeout: 10_000 },
  );
}

export async function loadTrip(page: Page, tripId: string): Promise<void> {
  await page.goto(`/trips/${tripId}`);
}

export async function saveTrip(page: Page): Promise<void> {
  await page.click(
    'button:has-text("Save itinerary"), button:has-text("Save Trip")',
  );
}

export async function deleteTrip(
  page: Page,
  tripId: string,
  opts: { confirm: boolean } = { confirm: true },
): Promise<void> {
  await page.goto('/trips');
  const card = page.locator(`[data-trip-id="${tripId}"]`);
  await card
    .locator('button:has-text("Delete"), [aria-label*="Delete" i]')
    .click();
  if (opts.confirm) {
    // UX-04 fix: Radix AlertDialog confirmation.
    await page
      .locator('[role="alertdialog"] button:has-text("Delete")')
      .click();
  }
}

export async function assertTripInList(
  page: Page,
  tripDestination: string,
): Promise<void> {
  await expect(page.locator(`text=${tripDestination}`).first()).toBeVisible({
    timeout: 5_000,
  });
}
