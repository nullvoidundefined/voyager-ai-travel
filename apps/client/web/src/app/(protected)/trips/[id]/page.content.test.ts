import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content assertions for the trip detail page.
 *
 * Guards against the optimistic booking update not being rolled back
 * when the server returns an error.
 */

const pagePath = resolve(__dirname, 'page.tsx');
const pageSource = readFileSync(pagePath, 'utf-8');

describe('trip detail page content', () => {
  it('handleConfirmBooking has a catch block that shows an error toast', () => {
    // The catch block must exist and set a toast message
    expect(pageSource).toMatch(/catch[\s\S]*?setToastMessage/);
  });

  it('does not update the cache optimistically before the put succeeds', () => {
    // The setQueryData call should be INSIDE the try block (after put),
    // not after the try/catch (which would run even on error).
    // This regex checks that setQueryData appears before the catch keyword
    // within the handleConfirmBooking function.
    const fnMatch = pageSource.match(
      /handleConfirmBooking[\s\S]*?try\s*\{([\s\S]*?)\}\s*catch/,
    );
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![1]).toContain('setQueryData');
  });
});
