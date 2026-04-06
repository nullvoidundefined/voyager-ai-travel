import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content assertions for the landing page hero and copy.
 *
 * These tests read the source of `page.tsx` and assert that specific
 * user-facing strings are present or absent. This is a lightweight
 * regression guard for copy changes driven by the 2026-04-06 audit,
 * without the overhead of mounting the full Next.js page component
 * in RTL (which would require mocking useAuth, useRouter, next/image,
 * and several other providers).
 */

const pagePath = resolve(__dirname, 'page.tsx');
const pageSource = readFileSync(pagePath, 'utf-8');

describe('landing page content', () => {
  it('eyebrow reads "Portfolio demo"', () => {
    expect(pageSource).toContain('Portfolio demo');
  });

  it('H1 frames Voyager as an agentic trip planner portfolio piece', () => {
    expect(pageSource).toContain('An agentic trip planner');
  });

  it('subhead explicitly names the real data sources', () => {
    expect(pageSource).toMatch(/SerpApi|Google Flights/);
  });

  it('primary CTA invites a chat demo', () => {
    expect(pageSource).toMatch(/Try the chat demo|Plan my first trip/);
  });

  it('does not use the pre-audit "AI Travel Concierge" eyebrow', () => {
    expect(pageSource).not.toContain('AI Travel Concierge');
  });

  it('does not use the pre-audit "planned by AI" hero headline', () => {
    expect(pageSource).not.toContain('planned by AI.');
  });

  it('does not claim "no hallucinated prices" (unsubstantiable)', () => {
    expect(pageSource).not.toContain('No hallucinated prices');
  });

  it('uses a softer "grounded in live API data" phrasing instead', () => {
    expect(pageSource).toContain('Grounded in live API data');
  });
});
