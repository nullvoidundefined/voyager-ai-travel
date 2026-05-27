import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content assertions for the login page.
 *
 * Guards against the dead self-link pattern where "Forgot password?"
 * linked to /login (the current page), creating an infinite loop.
 */

const loginPath = resolve(__dirname, 'page.tsx');
const loginSource = readFileSync(loginPath, 'utf-8');

describe('login page content', () => {
  it('does not link "Forgot password?" to /login (dead self-link)', () => {
    expect(loginSource).not.toMatch(/href=["'](\/login|['"]).*Forgot/);
  });

  it('does not use a Link component for forgot password', () => {
    // The forgot-password action should be a button with a toast,
    // not a navigation link, until password reset is implemented.
    expect(loginSource).not.toMatch(/<Link[^>]*>.*Forgot password/s);
  });
});
