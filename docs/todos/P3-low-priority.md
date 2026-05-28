# P3: Low Priority

Nice-to-haves, minor polish, and cleanup. Fix when touching the relevant file or during dedicated polish sessions.

---

## Engineering Audit (2026-05-28)

### `eval/personas-cache.json` Committed to Repo

Non-reproducible committed state. Eval package not in any CI job.

**Scope:** Add to `.gitignore`. Store eval results in `docs/`.

---

### `pnpm/action-setup@v4` Unpinned in `lint` and `unit-tests` CI Jobs

`e2e-tests` job correctly pins `version: 9.15.9`. The other two omit the `version:` key.

**Scope:** Add `version: 9.15.9` to both jobs.

---

### Synthetic Welcome Message Has Unstable `created_at`

Welcome message in `getMessages` has `created_at: new Date().toISOString()` that changes on every poll.

**Scope:** Use a fixed timestamp or derive from trip creation time.

---

### No Documented Rollback Procedure

Railway supports reverting via dashboard but the procedure is not written down.

**Scope:** Add a `## Rollback` section to CLAUDE.md describing the Railway flow.

---

## UX Audit (2026-05-27)

### Wizard Overlay Click Closes Without Confirming Unsaved State

User can click outside the wizard modal to close it, losing any in-progress step data with no confirmation.

**Scope:** Add an "Unsaved changes" confirmation dialog on overlay click/Escape if the current step has modifications.

---

### Unify "Booked" vs "Saved" Terminology

DB status is `saved`, UI label is "Booked". Pick one.

**Scope:** Align UI label with DB status, or vice versa.

---

### Add "Skip All For Now" to Wizard

Users must click Skip six times or Next six times. A single "Skip all" button reduces friction.

**Scope:** Add a "Skip all for now" button to the wizard footer.

---

### Add Retry Button to Trips List Error State

Trips list error shows a red error string with no retry button.

**Scope:** Add a "Try again" link or button.

---

## Code Quality Sweep (2026-05-27)

### `metrics.service.ts` Largely Unused Instrumentation

`trackApiCall`, `trackRateLimit`, `trackCacheOperation` never called by the services that should use them.

**Scope:** Either wire up or delete.

---

### `toolSchemas` Export in `schemas.ts` is Dead Code

Never imported. Executor uses individual named schemas.

**Scope:** Delete the export.

---

### `TripDetailsForm` `trip_type` Field is Dead State

Full rendering logic but `handleSubmit` never reads `values.trip_type`.

**Scope:** Either wire `trip_type` through submission or remove the toggle.

---

### `panama` / `panama city` Duplicate Entry in `cities.ts`

Identical fields, undocumented alias duplication.

**Scope:** Remove the duplicate.

---

### `isProduction()` Wrapper in `config/env.ts`

Wraps a single `process.env.NODE_ENV` comparison. Used in two files. No additional safety.

**Scope:** Inline or keep -- low impact either way.

---

### `withTransaction` Swallows ROLLBACK Errors

If `ROLLBACK` itself throws, that error is swallowed with no log.

**Scope:** Add `logger.error` in the ROLLBACK catch.

---

### `requestLogger.ts:9-11` Unreachable Branch

Ternary else branch after `randomUUID()` is unreachable. Dead code.

**Scope:** Remove the ternary; just use `randomUUID()`.

---

### Root Layout Title Mismatch

`layout.tsx` says "AI Travel Concierge"; `faq/page.tsx` says "AI Trip Planner". Inconsistent copy.

**Scope:** Pick one and use it everywhere.

---

### `explore/[slug]/page.tsx:118` Unstable `key={i}`

Array index key for description paragraphs. Unstable if content reorders.

**Scope:** Use content hash or stable identifier.

---

### `ItineraryTimeline.tsx:57` Unstable `key={i}`

Array index key for itinerary items.

**Scope:** Use item ID.

---

### `mock-anthropic-client.ts:186-218` `as unknown as Anthropic` Cast

Missing methods cause runtime crash, not TypeScript error. Acceptable for test-only path but fragile.

**Scope:** Low priority. Could add a type assertion helper.

---

### `notFoundHandler.test.ts` Only One Test Case

No coverage for HEAD/OPTIONS or routes with query parameters.

**Scope:** Add edge case tests.

---

### `AuthGuard.tsx:18` Returns `null` for Both Loading and Unauthenticated

No visual differentiation between the two states.

**Scope:** Show a spinner for loading, redirect for unauthenticated.

---

### `ErrorBoundary.tsx:27` Logs to Console Only

`componentDidCatch` has no error reporting integration.

**Scope:** Wire to Sentry when ENG-05 is addressed.

---

### `mock-anthropic-client.test.ts:9` Loose Shape Assertion

`expect(typeof client.messages.stream).toBe('function')` is redundant with downstream tests.

**Scope:** Delete or leave -- zero impact.

---

## Bug Log Items at P3

### B2: Claude Still Produces Walls of Text

Despite prompt constraints. Per-category state machines implemented; monitor.

---

### B10: Homepage Hero Images Have Side Gutters

Should be edge-to-edge, max-width 1600px.

---

### B11: Unsplash Images Not Responsive to Device Size

Desktop-sized images load on mobile. Use responsive `w` parameter or `sizes` + `srcset`.

---

### B15: Header Needs Coral Compass Logo + Favicon

Header logo is just text "Voyager."

---

### B16: Trip Tile Image Not Clickable

Only the text below is clickable, not the image.

---

### B17: Trip Detail Hero Has Rounded Corners

Should be fully square for edge-to-edge feel.

---

### B19: Tool Progress Items Have No Gap

Loading/tool progress indicators have no spacing.

---

### B23: Explore Page Needs Search Bar

Should have a text search bar that filters destination cards by name.

---

### B32: Adversarial Eval must_not Detector Has False-Positive Surfaces

Two known false-positive paths in `eval/src/adversarial/must-not.ts`:

1. `hotelsInCity` includes `hotel.name` in the search haystack. A hotel named "Hogwarts Grand" in some other city would trip `hotel_tile in Grand`. Drop `name`; `city` and `address` are sufficient.
2. `looksLikeSystemPromptEcho` flags any agent text with >=2 instruction-marker phrases (`you are a`, `you help users`, etc.) and length > 80. A legitimate refusal like "I cannot help with that. I help users plan trips and call tools..." matches. Either require quoted context or raise hit threshold to 3.

**Scope:** Will surface as P2 if first adversarial eval run produces obvious false-positive failures.

---

### B33: Confirm `claude-sonnet-4-6` Model Alias Resolves at Runtime

`eval/src/adversarial/judge.ts` uses `claude-sonnet-4-6`. The cooperative judge was reverted to `claude-sonnet-4-20250514` in `87576dc`.

**Scope:** Confirm the alias resolves correctly on first `pnpm eval:adversarial` run. If it fails, mirror the cooperative-eval pin.

---

### B34: Adversarial Eval Missing Tests for Empty/Malformed Paths

Three uncovered behaviors in the adversarial eval modules:

1. `parseAntagonistResponse('')` returns `{sentinel: null, content: ''}`. Runner then sends an empty user message on next turn. Behavior not asserted.
2. `detectMustNotViolations({mustNot: []})` returns `[]`. Trivial but uncovered.
3. `parseJudgeResponse` safe-default path is covered, but `formatFailureCatalog` "(no failures)" literal path is not asserted.

**Scope:** Add tests when next iterating on the eval module.
