# P2: Medium Priority

Fix within the next few work sessions. These are real bugs, missing tests, security gaps, and UX issues that degrade the experience but don't break first impressions.

---

## Criticism Audit (2026-05-28)

### Plan Card Flow Not in User Stories or E2E Tested

PLAN_TRIP phase and TripPlanWidget add a new step where users confirm a plan card before the agent starts searching. No user story documents this. No E2E test covers it.

**Scope:** Add user story. Write E2E test for the plan card confirmation flow.

---

## UX Audit (2026-05-27)

### Header Nav Overflow at 375px Mobile

The authenticated nav contains 7 interactive elements in a 375px container. No hamburger menu. SCSS breakpoint only shrinks text, does not collapse.

**Scope:** Add a mobile hamburger/drawer menu at the `600px` breakpoint.

---

## Code Quality Sweep (2026-05-27)

### 5 Repository Test Files Mock the Database Pool (R-200 Anti-Pattern #5)

`auth.test.ts`, `conversations.test.ts`, `tool-call-log.test.ts`, `trips.test.ts`, `userPreferences.test.ts` all mock the pool and make tautological assertions.

**Scope:** These are mitigated by integration tests. Replace or supplement with integration-level behavioral assertions over time.

---

## Bug Log Items at P2

### B24: E2E US-19 and US-23 Deleted Pending MockAnthropic State Machine

US-19 (travel_plan_form flow) and US-23 (tile selection confirmed via `confirmedId`) were deleted from `e2e/chat-booking-flow.spec.ts` because they require a multi-turn MockAnthropic state machine that reacts to user messages and tile selection events. Without it, `aria-pressed` is never set to true (it is driven by server-side `confirmedId`, not by the client click).

**Why P2:** Test coverage gap, not user-visible. Blocks restoring two user-story E2E specs.

**Scope:** Build the MockAnthropic state machine (tracked as ENG-17). Once it lands, restore US-19 and US-23 specs and remove the `void tripUrl` guard in `e2e/real/happy-path-real.spec.ts`.

---

## UX Audit (2026-05-28 Opus)

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
