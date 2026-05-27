import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content guard for the new-trip page.
 *
 * Locks in the UX-05 fix: the pre-audit code sent
 * destination: 'Planning...' as the literal initial string for a new
 * trip, which then showed up on trip cards and the trip detail hero
 * as a visible status word masquerading as a city name.
 */

const newTripPath = resolve(__dirname, 'page.tsx');
const newTripSource = readFileSync(newTripPath, 'utf-8');

describe('new trip page content', () => {
  it('does not seed a new trip with the literal string "Planning..."', () => {
    expect(newTripSource).not.toContain("'Planning...'");
    expect(newTripSource).not.toContain('"Planning..."');
  });

  it('seeds the new trip with a human-readable fallback', () => {
    const hasFallback = /['"]New trip['"]/.test(newTripSource);
    expect(hasFallback).toBe(true);
  });

  it('reads destination from search params for pre-fill', () => {
    expect(newTripSource).toContain('useSearchParams');
    expect(newTripSource).toContain("searchParams.get('destination')");
  });

  it('has a cleanup function and a creating ref to prevent duplicate trips', () => {
    // The useEffect must return a cleanup function and use a ref
    // to guard against React Strict Mode double-invoke creating
    // duplicate trips. The ref prevents the second mount from
    // firing a second POST. router.replace is NOT gated behind
    // the mounted flag because it operates on the Next.js router
    // singleton and must execute even after Strict Mode's
    // intermediate cleanup.
    expect(newTripSource).toMatch(/return\s*\(\)\s*=>\s*\{/);
    expect(newTripSource).toContain('creating.current');
    expect(newTripSource).toContain('mounted = false');
  });
});
