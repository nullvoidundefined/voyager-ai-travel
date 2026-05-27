import { describe, expect, it } from 'vitest';

import { createTripSchema } from './trips.js';

describe('createTripSchema', () => {
  it('accepts minimal valid input', () => {
    const result = createTripSchema.parse({ destination: 'Paris' });
    expect(result.destination).toBe('Paris');
    expect(result.budget_currency).toBe('USD');
    expect(result.travelers).toBe(1);
    expect(result.preferences).toEqual({});
  });

  it('rejects empty destination', () => {
    expect(() => createTripSchema.parse({ destination: '' })).toThrow();
  });

  it('rejects missing destination', () => {
    expect(() => createTripSchema.parse({})).toThrow();
  });

  it('rejects non-positive budget', () => {
    expect(() =>
      createTripSchema.parse({ destination: 'Paris', budget_total: 0 }),
    ).toThrow();
    expect(() =>
      createTripSchema.parse({ destination: 'Paris', budget_total: -100 }),
    ).toThrow();
  });

  it('rejects non-integer travelers', () => {
    expect(() =>
      createTripSchema.parse({ destination: 'Paris', travelers: 1.5 }),
    ).toThrow();
  });

  it('rejects non-positive travelers', () => {
    expect(() =>
      createTripSchema.parse({ destination: 'Paris', travelers: 0 }),
    ).toThrow();
  });

  it('validates preferences.style enum', () => {
    const result = createTripSchema.parse({
      destination: 'Paris',
      preferences: { style: 'luxury' },
    });
    expect(result.preferences.style).toBe('luxury');

    expect(() =>
      createTripSchema.parse({
        destination: 'Paris',
        preferences: { style: 'ultra-luxury' },
      }),
    ).toThrow();
  });

  it('validates preferences.pace enum', () => {
    const result = createTripSchema.parse({
      destination: 'Paris',
      preferences: { pace: 'relaxed' },
    });
    expect(result.preferences.pace).toBe('relaxed');

    expect(() =>
      createTripSchema.parse({
        destination: 'Paris',
        preferences: { pace: 'frantic' },
      }),
    ).toThrow();
  });

  it('accepts full valid input', () => {
    const result = createTripSchema.parse({
      destination: 'Tokyo',
      origin: 'SFO',
      departure_date: '2026-08-01',
      return_date: '2026-08-10',
      budget_total: 5000,
      budget_currency: 'EUR',
      travelers: 3,
      preferences: {
        style: 'mid-range',
        pace: 'moderate',
        interests: ['food', 'culture'],
      },
    });
    expect(result.destination).toBe('Tokyo');
    expect(result.travelers).toBe(3);
    expect(result.preferences.interests).toEqual(['food', 'culture']);
  });
});
