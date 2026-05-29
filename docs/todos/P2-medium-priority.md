# P2: Medium Priority

Fix within the next few work sessions. These are real bugs, missing tests, security gaps, and UX issues that degrade the experience but don't break first impressions.

---

## Engineering Audit (2026-05-28)

### Executor Test Gaps for 4 New Tools

`add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule` in `executor.ts` are uncovered by unit tests. `executor.adapters.test.ts` covers only `search_flights` and `search_hotels`.

**Scope:** Extend `executor.test.ts` with happy-path and validation-error tests for all four.

---

### `chat.ts` SSE Error Path Uncovered

The SSE error emit on `runAgentLoop` throw is untested.

**Scope:** Add a unit test mocking `runAgentLoop` to throw and assert the SSE `error` event is emitted and the connection is closed.

---

### `schedule.repository.ts` and `trip-legs.repository.ts` at ~2.5% Unit Coverage

Both covered only by integration tests, not the faster unit suite.

**Scope:** Add unit tests for the core query paths.

---

### CSRF Guard is Header-Presence-Only

`csrfGuard` checks for the presence of `X-Requested-With` but does not validate its value or use a cryptographic token.

**Scope:** Verify `SameSite=Lax` or `Strict` is set on the session cookie in production, or upgrade to a synchronizer-token pair.

---

## Criticism Audit (2026-05-28)

### 10 `readFileSync` Source-Grep Content Tests Are Confidence Theater

`page.content.test.ts`, `AuthContext.content.test.ts`, `faq/page.content.test.ts`, `globals.content.test.ts`, `account/page.content.test.ts`, `trips/page.content.test.ts`, `trips/[id]/page.content.test.ts`, `trips/new/page.content.test.ts`, `register/page.content.test.ts`, `login/page.content.test.ts`. Each reads its target as a string and asserts `.toContain(...)`.

**Scope:** Delete the 9 pure source-grep files (exception: `BookingConfirmation.content.test.tsx` uses `render()`). Replace with E2E or render-test assertions where the checks matter.

---

### ChatBox Invariant 11 is Source-Grep, Not Behavior Test

`ChatBox.invariants.test.tsx` invariant 11 reads `ChatBox.tsx` as a string with `readFileSync` and asserts the constant `BOOKING_CONFIRMATION_TRIGGER` is defined. Does not test the actual behavior.

**Scope:** Replace with a behavioral test that fires `handleSend('Save itinerary')` and asserts `onBookTrip` was called.

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

## Code Quality Sweep (2026-05-27)

### 5 Repository Test Files Mock the Database Pool (R-200 Anti-Pattern #5)

`auth.test.ts`, `conversations.test.ts`, `tool-call-log.test.ts`, `trips.test.ts`, `userPreferences.test.ts` all mock the pool and make tautological assertions.

**Scope:** These are mitigated by integration tests. Replace or supplement with integration-level behavioral assertions over time.

---

### `schemas/trips.ts` Has No Test File

Non-trivial validation (`budget_total: z.number().positive()`, `travelers: z.number().int().positive().default(1)`, nested preferences) with no tests.

**Scope:** Add schema validation tests covering edge cases.

---

### `serpApiQuota.service.ts` Duplicate Redis Client

Third independent Redis client alongside `cache.service.ts` and `tokenBudget.service.ts`. Three separate connection pools in production.

**Scope:** Consolidate to a shared Redis client module.

---

### Inline Style Duplication Across Tile Components

`style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}` repeated identically in FlightTiles, HotelTiles, CarRentalTiles, ExperienceTiles.

**Scope:** Extract to a shared SCSS class.

---

### FlightCard/HotelCard Missing `aria-label` on Buttons

`<button>` wrapping card has no `aria-label`. Screen reader announces raw text dump.

**Scope:** Add descriptive `aria-label` (e.g., "Select Delta DL100 flight, $450").

---

## Bug Log Items at P2

### B21: Hotel Tiles Missing Prices

Many hotel tiles don't display prices. All should show `price_per_night` and `total_price`.

---

### B24: E2E US-19 and US-23 Deleted Pending MockAnthropic State Machine

US-19 (travel_plan_form flow) and US-23 (tile selection confirmed via `confirmedId`) were deleted from `e2e/chat-booking-flow.spec.ts` because they require a multi-turn MockAnthropic state machine that reacts to user messages and tile selection events. Without it, `aria-pressed` is never set to true (it is driven by server-side `confirmedId`, not by the client click).

**Why P2:** Test coverage gap, not user-visible. Blocks restoring two user-story E2E specs.

**Scope:** Build the MockAnthropic state machine (tracked as ENG-17). Once it lands, restore US-19 and US-23 specs and remove the `void tripUrl` guard in `e2e/real/happy-path-real.spec.ts`.

---

## UX Audit (2026-05-28 Opus)

### F-05: "Flexible Dates" Toggle Unreachable Via UI

`apps/client/web/src/components/ChatBox/TripDetailsForm.tsx:181-201` renders the Fixed/Flexible toggle only when the form definition includes a `flexible_dates` field. `apps/server/src/handlers/chat/chat.helpers.ts:206-264` (`buildMissingFieldsForm`) never includes that field. The toggle exists in the DB and the system prompt but has no user-facing entry point.

**Scope:** Add `flexible_dates` to the field-emission logic in `buildMissingFieldsForm`. Default the value to `'false'`. Also extend the NodeRenderer type-union mapping on the client so the field type passes through, and confirm trip_type is being emitted somewhere (or also missing).

---

### F-17: 15s SerpApi Timeout Indistinguishable From No-Results or Quota

`apps/server/src/services/external/serpapi.service.ts:69` correctly wraps fetches in `AbortSignal.timeout(15_000)`. On timeout, `flights.tool.ts` catches and returns an empty array. The agent then narrates "no flights found." The same result occurs for genuine no-results and quota exhaustion. The three failure modes are indistinguishable to the user.

**Scope:** Surface a distinct error shape from the tool layer: `{ status: 'timeout' | 'quota_exhausted' | 'no_results', message }`. Have the agent narrate the appropriate user-facing message per state.

---

## Criticism Audit (2026-05-28 Opus)

### Eval Model Lock-In: Cross-Model Judge Validation Missing

`eval/src/scoring/judge.ts:51` hardcodes `claude-sonnet-4-20250514`. `eval/src/adversarial/judge.ts:111` uses `claude-sonnet-4-6`. Commit `87576dc` reverted judge and orchestrator from `claude-sonnet-4-6` to `claude-sonnet-4-20250514` "to restore eval score to 0.79." The eval is measuring the grader's self-consistency on one model, not the product's robustness. When Anthropic deprecates the alias, the score will change for grader reasons, not product reasons.

**Scope:** Re-run the adversarial eval with at least two additional judge models (e.g., `claude-haiku-4-5-20251001`, `claude-opus-4-7`). If pass-rate varies by more than +/-0.05 across models, the 0.79 number is grader-specific and must be reported as a range. If it is stable, the lock-in concern is retracted.

---

## Worktree Forward-Ports (2026-05-28)

### Forward-port P2-01: Redis-Backed Conversation Lock

Worktree commit `8da22be` adds Redis-backed `SET NX EX` lock to `chat.ts` `activeConversations` Set, preventing concurrent agent loops across replicas. Falls back to in-memory only when Redis is unavailable. Lock auto-expires after 180s. Current main has only the in-memory Set (`apps/server/src/handlers/chat/chat.ts:54`). Multi-replica deploys can run duplicate agent loops for the same conversation.

**Why P2:** Multi-replica production safety. Voyager currently runs single-replica on Railway, so practical impact is low, but the gap will reappear on any horizontal scale.

**Scope:** Re-implement Redis lock pattern under new structure. Reference: worktree commit `8da22be` (+56 lines, 2 files). Write a failing test asserting two concurrent calls with the same conversation ID return one accept + one 409.

---

### Forward-port P2-04: `car_rental_cost` Required in Budget Tool

Worktree commit `4945b06` makes `car_rental_cost` required in the budget tool schema so car rentals are never invisible in budget calculations. Current `apps/server/src/tools/schemas.ts` and `apps/server/src/tools/definitions.ts` have no `car_rental_cost` requirement.

**Scope:** Add `car_rental_cost: z.number().nonnegative()` to budget tool schema. Update `calculateRemainingBudget` to include car rental in `totalSpent`. Write a failing test asserting a budget call with no `car_rental_cost` is rejected. Reference: worktree commit `4945b06`.
