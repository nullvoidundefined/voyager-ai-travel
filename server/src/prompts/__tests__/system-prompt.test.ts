import { describe, expect, it } from 'vitest';

import { buildSystemPrompt } from '../system-prompt.js';
import type { TripContext } from '../trip-context.js';

const BASE_CTX: TripContext = {
  destination: 'Tokyo',
  origin: null,
  departure_date: '2026-08-01',
  return_date: '2026-08-10',
  budget_total: 3000,
  budget_currency: 'USD',
  travelers: 2,
  transport_mode: null,
  preferences: {},
  selected_flights: [],
  selected_hotels: [],
  selected_car_rentals: [],
  selected_experiences: [],
  total_spent: 0,
};

describe('buildSystemPrompt personality', () => {
  it('includes a travel advisor persona framing', () => {
    const prompt = buildSystemPrompt(
      BASE_CTX,
      { phase: 'COLLECT_DETAILS' },
      {},
      null,
    );
    expect(prompt.toLowerCase()).toMatch(/travel (advisor|concierge|planner)/);
  });

  it('does not use prohibited filler phrases', () => {
    const prompt = buildSystemPrompt(
      BASE_CTX,
      { phase: 'COLLECT_DETAILS' },
      {},
      null,
    );
    const forbidden = [
      'certainly!',
      'absolutely!',
      'great question',
      'of course!',
    ];
    forbidden.forEach((phrase) => {
      expect(prompt.toLowerCase()).not.toContain(phrase.toLowerCase());
    });
  });

  it('includes budget awareness language', () => {
    const prompt = buildSystemPrompt(BASE_CTX, { phase: 'PLANNING' }, {}, null);
    expect(prompt.toLowerCase()).toContain('budget');
  });
});
