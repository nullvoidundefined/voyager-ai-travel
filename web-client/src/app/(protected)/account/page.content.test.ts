import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content assertions for the account page.
 *
 * Guards against hardcoded category counts that fall out of sync
 * with the actual PREFERENCE_CATEGORIES array.
 */

const pagePath = resolve(__dirname, 'page.tsx');
const pageSource = readFileSync(pagePath, 'utf-8');

describe('account page content', () => {
  it('does not hardcode the preference category count', () => {
    // Must not contain "of 6" or "of 7" as a hardcoded category count.
    // The source should use a dynamic expression like PREFERENCE_CATEGORIES.length.
    expect(pageSource).not.toMatch(/of \d+ categories/);
  });

  it('uses PREFERENCE_CATEGORIES.length for the completion count', () => {
    expect(pageSource).toContain('PREFERENCE_CATEGORIES.length');
  });
});
