# E2E Unmocked Journey

## Why

The existing E2E suite mocks the Anthropic client (`E2E_MOCK_ANTHROPIC=1`)
and the SerpApi / Google Places tool layer (`E2E_MOCK_TOOLS=1`), then
the trip-rendering specs additionally use `page.route()` to inject
synthetic agent output (`daily-schedule.spec.ts`, `multi-city.spec.ts`,
`booking-links.spec.ts`, `trip-page-spacing.spec.ts`). The result is a
suite that runs in seconds and never burns a token, but is also
structurally incapable of catching agent-policy, data-extraction, or
tool-result-rendering regressions in production.

This spec exists to close that gap with a single unmocked backbone
that:

1. Boots the real agent loop.
2. Boots against real Anthropic + SerpApi + Google Places.
3. Asserts only on structure (selectors, ARIA attributes, persistence),
   never on exact text, because the LLM output is non-deterministic.

It is gated on `ANTHROPIC_API_KEY` being a real key and skips itself
otherwise, so it cannot accidentally run in the mocked fast lane.

## What it asserts

In order, the spec:

1. Registers a fresh user via `/auth/register`.
2. Dismisses the preferences wizard (six Skip clicks).
3. Creates a trip via the New Trip button (waits on the real
   `POST /trips` response, then on the UUID URL).
4. Sends a fully-specified trip-planning prompt that includes
   destination, dates, traveler count, budget, and origin airport.
5. If the agent asks a clarifying question, clicks the first
   quick-reply chip.
6. Waits up to four minutes for the first `[data-tile-card]` to render.
7. Asserts the tile's `aria-label` is non-empty, contains no
   `undefined` token, and contains no `NaN`.
8. Clicks the tile and asserts `aria-pressed="true"`.
9. Reloads the trip URL.
10. Asserts the same `aria-label` is still visible and still
    `aria-pressed="true"`.

The reload-and-verify step is the assertion no existing spec makes
against real data, and is where most "I saved my trip and it
disappeared" bugs would surface.

## How to run

```bash
pnpm test:e2e:real
```

The script invokes Playwright with `playwright.real.config.ts`, which
omits `E2E_MOCK_ANTHROPIC` and `E2E_MOCK_TOOLS` from the server's
webServer env and points `testDir` at `e2e/real/`.

Cost per run: roughly one Anthropic turn ($0.01 or so on Sonnet/Haiku
pricing) plus three to eight SerpApi searches. Not safe to run per
push; intended for nightly or pre-release.

## Findings from the first two runs

The spec failed on its first two runs. The failures themselves are the
proof that the existing suite cannot catch what this one can.

### Run 1: prompt without explicit dates

- Prompt: "Plan a 3-day trip to Lisbon next month for two people,
  budget $1500 total. Find round-trip flights from JFK."
- Result: agent responded with a clarifying question and quick-reply
  date chips (`June 5-8`, `June 12-15`, `June 19-22`, `Different
dates`) plus a date-range picker. No tool calls fired. No tiles
  rendered.
- Significance: the real agent gates `search_flights` behind a
  date-confirmation turn even when the relative date "next month" is
  unambiguous to a human (the agent's own response said "next month
  (June 2026)"). The mocked Anthropic stub always returns tool-use
  turns, so this branch has no E2E coverage.

### Run 2: prompt with explicit dates

- Prompt: "Plan a 3-day trip to Lisbon from June 12 to June 15, 2026
  for two people, budget $1500 total. Round-trip flights from JFK."
- Result: agent responded "Perfect! I've set up your 3-day Lisbon
  trip for 2 people from JFK (June 12-15, 2026) with a $1,500 budget.
  Let's start planning..." with quick-reply chips `Find flights`,
  `Tell me about Lisbon`, `What's the weather like in June?`. Tile
  cards did not render. The spec clicked `Find flights` per the
  quick-reply fallback but no tiles rendered in the remaining
  timeout window.

Two concrete bugs the existing suite cannot see:

#### B-real-1: traveler count not persisted

- Severity: P1
- Effort: S
- Symptom: prompt explicitly says "two people", agent's
  natural-language response acknowledges "for 2 people", but the
  trip header on the same page reads "1 traveler".
- Root cause hypothesis: trip metadata is initialized to defaults
  during `POST /trips` and is not updated from the agent's
  understanding of the user's first message. Suspect
  `apps/server/src/services/trip/...` or the agent's failure to
  emit a structured trip-context update from a free-text prompt.
- Why the mocked suite missed it: the mocked stub never produces a
  natural-language reply that asserts a traveler count, so no spec
  ever compared the agent's spoken claim against the persisted
  trip metadata.

#### B-real-2 (logged as B35): tool calls do not fire even with all required info

- Severity: P1
- Effort: M
- Symptom: with destination, exact dates, traveler count, budget,
  and origin airport all in the first message, the agent issued
  zero tool calls. After the user clicked the "Find flights"
  quick-reply chip, still no tool calls. Four minutes elapsed.
- Root cause hypothesis: either the system prompt is gating
  search_flights behind a separate confirmation turn beyond date
  confirmation, the quick-reply chips do not actually dispatch
  to the agent loop on click, or SerpApi failed silently. Worth
  inspecting the next agent turn after the chip click.
- Why the mocked suite missed it: the mocked Anthropic stub always
  returns tool-use turns; the real agent's policy of asking
  multiple clarifying questions before searching is invisible to
  the mocked suite. The chip-click handler is also wired through a
  surface the mocked specs simulate rather than exercise.

## What this spec does not cover

- Multi-turn iteration (US-20 "make it more budget-friendly", etc).
  Add a second backbone spec when the bugs above are resolved.
- Failure paths (rate-limited tool, invalid credentials, no
  network). Belongs in a separate `e2e/real/failure-path.spec.ts`.
- Concurrency between two trips owned by the same user.

## Next steps

1. B-real-1 (traveler count) is fixed in the same squash as this spec.
   B-real-2 is logged as B35 in `docs/bugs.md` for follow-up.
2. Add a CI workflow (nightly cron) that runs `pnpm test:e2e:real`
   and posts results to a Slack channel. Do not gate per-push
   merges on it: per-push remains the mocked `test:e2e:fast` lane.
3. Once the two bugs are fixed and the spec is green for three
   consecutive nights, extend it: tile selection of all three card
   types (flight, hotel, experience), saving the trip, returning a
   day later with login + persistence assertion.
