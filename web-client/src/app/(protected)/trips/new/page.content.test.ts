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
    // Accept either "New trip" or empty string with explicit handling
    const hasFallback =
      /destination:\s*'New trip'|destination:\s*"New trip"/.test(newTripSource);
    expect(hasFallback).toBe(true);
  });

  it('has a cleanup function that prevents acting after unmount', () => {
    // The useEffect must return a cleanup function to guard against
    // React Strict Mode double-invoke creating duplicate trips.
    expect(newTripSource).toMatch(/return\s*\(\)\s*=>\s*\{/);
    expect(newTripSource).toContain('aborted = true');
  });
});
