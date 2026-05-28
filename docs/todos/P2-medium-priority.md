# P2: Medium Priority

Fix within the next few work sessions. These are real bugs, missing tests, security gaps, and UX issues that degrade the experience but don't break first impressions.

---

## Engineering Audit (2026-05-28)

### No Post-Build Smoke Test for `dist/data/destinations.json`

The `bea33cc5` retrospective explicitly demanded this. Build script does `cp src/data/*.json dist/data/` but has no assertion step. The Dockerfile copies the file redundantly as a workaround, not a build contract.

**Scope:** Append `&& node -e "require('fs').accessSync('dist/data/destinations.json')"` to the `build` script in `apps/server/package.json`.

---

### `app.ts` `readFileSync` at Module Load With No try/catch

If `dist/data/destinations.json` is absent at boot, the server crashes with an unhandled exception before handling any request.

**Scope:** Wrap in try/catch; log a fatal error and `process.exit(1)` with a descriptive message.

---

### No Timeout on Enrichment HTTP Fetches

`fetchStateDeptAdvisory`, `fetchFCDOAdvisory`, `fetchWeatherForecast` have no `AbortSignal.timeout()`. A slow external advisory API holds up the first agent response.

**Scope:** Wrap each `fetch()` with `AbortSignal.timeout(5000)`.

---

### Executor Test Gaps for 4 New Tools

`add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule` in `executor.ts` (lines 137-253) are uncovered by unit tests. `executor.adapters.test.ts` covers only `search_flights` and `search_hotels`.

**Scope:** Extend `executor.test.ts` with happy-path and validation-error tests for all four.

---

### `chat.ts` SSE Error Path Uncovered

Lines 319-323 (SSE error emit on `runAgentLoop` throw) are untested.

**Scope:** Add a unit test mocking `runAgentLoop` to throw and assert the SSE `error` event is emitted and the connection is closed.

---

### `NEXT_PUBLIC_APP_URL` Not Validated at Boot

`share.ts` line 23 falls back to `''` if unset, producing relative share URLs. Not in `validateEnv()`.

**Scope:** Add to `validateEnv()` or add a build-time check.

---

### `schedule.repository.ts` and `trip-legs.repository.ts` at ~2.5% Unit Coverage

Both covered only by integration tests, not the faster unit suite.

**Scope:** Add unit tests for the core query paths.

---

### Potential Missing Index on `agent_turn_cost(conversation_id)`

`agent_turn_cost` is queried with `JOIN conversations c ON c.id = atc.conversation_id WHERE c.trip_id = $1`. Postgres does not auto-index FKs.

**Scope:** Verify migration 1771879388561 creates this index. If not, add a migration.

---

### CSRF Guard is Header-Presence-Only

`csrfGuard` checks for the presence of `X-Requested-With` but does not validate its value or use a cryptographic token.

**Scope:** Verify `SameSite=Lax` or `Strict` is set on the session cookie in production, or upgrade to a synchronizer-token pair.

---

## Criticism Audit (2026-05-28)

### ChatBox Invariant 11 is Source-Grep, Not Behavior Test

`ChatBox.invariants.test.tsx:559-570` reads `ChatBox.tsx` as a string with `readFileSync` and asserts the constant `BOOKING_CONFIRMATION_TRIGGER` is defined. Does not test the actual behavior.

**Scope:** Replace with a behavioral test that fires `handleSend('Save itinerary')` and asserts `onBookTrip` was called.

---

### 10 `readFileSync` Source-Grep Content Tests Are Confidence Theater

`page.content.test.ts`, `AuthContext.content.test.ts`, `faq/page.content.test.ts`, `globals.content.test.ts`, `account/page.content.test.ts`, `trips/page.content.test.ts`, `trips/[id]/page.content.test.ts`, `trips/new/page.content.test.ts`, `register/page.content.test.ts`, `login/page.content.test.ts`. Each reads its target as a string and asserts `.toContain(...)`.

**Scope:** Delete the 9 pure source-grep files (exception: `BookingConfirmation.content.test.tsx` uses `render()`). Replace with E2E or render-test assertions where the checks matter.

---

### CI Coverage Gate Missing for Web-Client

`unit-tests` CI job enforces 85% coverage on the server only. Web-client runs tests with no `--coverage` flag and no threshold.

**Scope:** Add `--coverage` and a threshold to the web-client test command in CI.

---

### `chat.lock.test.ts` is Source-Grep Confidence Theater

Reads `chat.ts` as a string and asserts `activeConversations.has(` exists.

**Scope:** Replace with a deferred-promise harness that fires two overlapping requests and asserts the second gets 409. Or delete and tag `test.fixme` with a ticket.

---

### No "What Does This Demo Demonstrate" README Section

README needs 200-500 words answering: "What engineering decisions did you make here that a less thoughtful engineer would not?"

**Scope:** Write the section. Front-load the self-audit practice as the differentiator.

---

### Plan Card Flow Not in User Stories or E2E Tested

PLAN_TRIP phase and TripPlanWidget add a new step where users confirm a plan card before the agent starts searching. No user story documents this. No E2E test covers it.

**Scope:** Add user story. Write E2E test for the plan card confirmation flow.

---

## UX Audit (2026-05-27)

### Inline Form Error `<p>` Elements Have No `role="alert"`

In `login/page.tsx:103` and `register/page.tsx:144`, inline validation errors are rendered as `<p className={styles.error}>`. Screen readers do not announce these.

**Scope:** Add `role="alert"` to all inline form error elements.

---

### Chat Form Has No `aria-live` Announcement of Agent State

When a message is sent and the agent starts working, there is no programmatic announcement. Blind users have no feedback.

**Scope:** Add `aria-live` region that announces when the agent starts and finishes responding.

---

### Send Button Text "..." During Sending Has No Accessible Label

The send button content changes from "Send" to "..." while `isSending`. No `aria-label` update.

**Scope:** Add `aria-label="Sending"` or `aria-busy="true"` during sending state.

---

### Account Deletion Promised in FAQ But Not Implemented

`faq/page.tsx:84-86` states: "You can delete your account at any time from the Account page." The account page has no such option. Legal exposure under GDPR Art. 17.

**Scope:** Either implement account deletion or remove the FAQ claim.

---

### Weather Table Uses Non-Semantic ARIA Markup

`explore/[slug]/page.tsx:183-229` constructs a weather table using `<div role="table">`.

**Scope:** Convert to native `<table>` with `<thead>`, `<tbody>`, `<th scope="col">`, `<th scope="row">`.

---

### Header Nav Overflow at 375px Mobile

The authenticated nav contains 7 interactive elements in a 375px container. No hamburger menu. SCSS breakpoint only shrinks text, does not collapse.

**Scope:** Add a mobile hamburger/drawer menu at the `600px` breakpoint.

---

### Add `aria-describedby` on Password Input

Register page password input has no link to the min-length hint text.

**Scope:** Add `aria-describedby` pointing to the hint `<p>`.

---

### Add Password Strength Indicator on Register Page

Only feedback is a min-8-chars error after submission. A real-time strength bar eliminates the round trip.

**Scope:** Add a character counter or strength indicator.

---

### Integrate `jest-axe` Into Component Render Tests

No `jest-axe` integration at the component test level. Accessibility violations are not caught by the test suite.

**Scope:** Add `jest-axe` assertions to existing render tests, starting with Toast, BookingConfirmation, PreferencesWizard.

---

## Code Quality Sweep (2026-05-27) -- Untracked P1s Now Filed as P2

These were labeled P1 in the sweep but are code hygiene items, not portfolio trust-breakers. Filed here as P2.

### `chat.ts:198` Double-Cast Through `unknown`

`updateBookingState(conversation.id, newTracker as unknown as Record<string, unknown>)` bypasses type safety.

**Scope:** Define a proper type for the booking state tracker.

---

### `chat.ts:47` `req.user!` Non-Null Assertion Pattern

Safe behind `requireAuth` but creates a hidden contract. Same pattern at 10+ locations.

**Scope:** Create a typed `authenticatedUser(req)` helper that throws if missing.

---

### `chat.ts:250` `('tool' as string)` Cast

`.filter((m) => m.role !== ('tool' as string))` hides a real type mismatch.

**Scope:** Fix the type definition so the filter doesn't need a cast.

---

### `trips.ts:85-87` Lexicographic Date Comparison

`departure_date < today` compares ISO strings lexicographically. Works for `YYYY-MM-DD` but breaks with datetime strings.

**Scope:** Use `new Date()` comparison or a date library.

---

### `userPreferences.ts:27-44` Read-Then-Write Race

`upsert` performs read-then-write outside a transaction. Two concurrent requests clobber each other.

**Scope:** Use `ON CONFLICT DO UPDATE SET preferences = user_preferences.preferences || $2` for atomic JSONB merge.

---

### 5 Repository Test Files Mock the Database Pool (R-200 Anti-Pattern #5)

`auth.test.ts`, `conversations.test.ts`, `tool-call-log.test.ts`, `trips.test.ts`, `userPreferences.test.ts` all mock the pool and make tautological assertions.

**Scope:** These are mitigated by integration tests. Replace or supplement with integration-level behavioral assertions over time.

---

### `schemas/trips.ts` Has No Test File

Non-trivial validation (`budget_total: z.number().positive()`, `travelers: z.number().int().positive().default(1)`, nested preferences) with no tests.

**Scope:** Add schema validation tests covering edge cases.

---

### `AgentOrchestrator.ts:57` No `max_tokens` Stop Reason Handling

If the API returns `max_tokens`, the loop continues making API calls for 120s until wall-clock timeout, burning tokens.

**Scope:** Add `max_tokens` to the stop_reason check and break the loop.

---

### `serpApiQuota.service.ts` Duplicate Redis Client

Third independent Redis client alongside `cache.service.ts` and `tokenBudget.service.ts`. Three separate connection pools in production.

**Scope:** Consolidate to a shared Redis client module.

---

### `serpapi.service.ts:83` Quota Counter Drift

`void incrementMonthlyUsage()` fires inside `serpApiBreaker.call(...)` on success. If `response.json()` throws after increment, counter drifts ahead.

**Scope:** Move increment to after successful JSON parse.

---

### `agent.service.test.ts:204` Stale Assertion Limit

Test says "Should stop at 15 tool calls" but `DEFAULT_MAX_ITERATIONS` is 8. Assertion `<= 15` passes trivially.

**Scope:** Update assertion to match actual limit.

---

### `executor.ts:125-136` `update_trip` Returns Misleading Success Shape

Returns `{ success: false, message: 'No fields to update' }` -- agent sees success-shaped JSON with `success: false`.

**Scope:** Return a clear error structure or throw.

---

### `isMockMode.test.ts` Incomplete Branch Coverage

Only covers `EVAL_MOCK_SEARCH`. `E2E_MOCK_TOOLS` branch untested.

**Scope:** Add test for `E2E_MOCK_TOOLS` branch.

---

### `account/page.tsx:104` Hardcoded "6" Should Be 7

"N of **6** categories completed" but `PREFERENCE_CATEGORIES` has 7 entries.

**Scope:** Use `PREFERENCE_CATEGORIES.length` instead of hardcoded 6.

---

### `login/page.tsx:94` Forgot Password Dead Self-Link

"Forgot password?" link href is `/login` (current page). Dead self-link reloads the page.

**Scope:** Link to a password reset page or show a Toast explaining the feature is coming.

---

### `ChatBox.invariants.test.tsx:88-103` Fixture Violates Type Contract

Flight fixture uses `offer_id: 'F1'` and `segments: []`, but `Flight` type has `id: string` and no `segments` field. `tsc --noEmit` produces TS2322.

**Scope:** Fix the fixture to match the `Flight` type.

---

### Inline Style Duplication Across Tile Components

`style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}` repeated identically in FlightTiles, HotelTiles, CarRentalTiles, ExperienceTiles.

**Scope:** Extract to a shared SCSS class.

---

### FlightCard/HotelCard Missing `aria-label` on Buttons

`<button>` wrapping card has no `aria-label`. Screen reader announces raw text dump.

**Scope:** Add descriptive `aria-label` (e.g., "Select Delta DL100 flight, $450").

---

### `AuthContext.tsx:23-35` `authError` Not in Interface

`authError` state is set and included in `useMemo` value but NOT declared in `AuthContextValue` interface. TypeScript silently narrows it out. Field is entirely inert.

**Scope:** Either add to interface or remove the dead state.

---

### `api.ts:39-41` `return undefined as T` Type Lie

For 204 responses, returns `undefined as T`. If `T` is concrete, callers destructuring throw at runtime.

**Scope:** Return a proper sentinel or narrow the generic.

---

### `auth.ts:107-110` Copy-Pasted JSDoc

JSDoc above `deleteExpiredSessions` is copy-pasted from `createUserAndSession`. Wrong description.

**Scope:** Fix the JSDoc.

---

## Bug Log Items at P2

### B21: Hotel Tiles Missing Prices

Many hotel tiles don't display prices. All should show `price_per_night` and `total_price`.

---

### B22: Over-Budget Value Shows NaN

When `total_spent` exceeds `budget_total`, remaining budget displays NaN instead of a negative number. Partial fix landed in `d20af7f` (trip-form-polish "P1 budget fix"); verify production no longer shows NaN in over-budget scenarios.

---

### B24: E2E US-19 and US-23 Deleted Pending MockAnthropic State Machine

US-19 (travel_plan_form flow) and US-23 (tile selection confirmed via `confirmedId`) were deleted from `e2e/chat-booking-flow.spec.ts` because they require a multi-turn MockAnthropic state machine that reacts to user messages and tile selection events. Without it, `aria-pressed` is never set to true (it is driven by server-side `confirmedId`, not by the client click).

**Why P2:** Test coverage gap, not user-visible. Blocks restoring two user-story E2E specs.

**Scope:** Build the MockAnthropic state machine (tracked as ENG-17). Once it lands, restore US-19 and US-23 specs and remove the `void tripUrl` guard in `e2e/real/happy-path-real.spec.ts`.
