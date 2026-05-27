import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content assertions for AuthContext.
 *
 * Guards against inert state that is not declared in the interface
 * (TypeScript silently narrows it out, making the field invisible
 * to consumers).
 */

const ctxPath = resolve(__dirname, 'AuthContext.tsx');
const ctxSource = readFileSync(ctxPath, 'utf-8');

describe('AuthContext content', () => {
  it('does not contain inert authError state', () => {
    // authError was removed because it was never in the AuthContextValue
    // interface, making it invisible to consumers.
    expect(ctxSource).not.toContain('authError');
    expect(ctxSource).not.toContain('setAuthError');
  });

  it('every useMemo value field is declared in AuthContextValue', () => {
    // Extract fields from useMemo return object
    const memoMatch = ctxSource.match(
      /useMemo\(\s*\(\)\s*=>\s*\(\{([\s\S]*?)\}\)/,
    );
    expect(memoMatch).not.toBeNull();
    const memoFields = memoMatch![1]
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    // Extract fields from AuthContextValue interface
    const ifaceMatch = ctxSource.match(
      /interface AuthContextValue\s*\{([\s\S]*?)\}/,
    );
    expect(ifaceMatch).not.toBeNull();
    const ifaceBody = ifaceMatch![1];

    for (const field of memoFields) {
      const fieldName = field.split(':')[0].trim();
      expect(ifaceBody).toContain(fieldName);
    }
  });
});
