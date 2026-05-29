# P2: Medium Priority

Fix within the next few work sessions. These are real bugs, missing tests, security gaps, and UX issues that degrade the experience but don't break first impressions.

---

## Code Quality Sweep (2026-05-27)

### 5 Repository Test Files Mock the Database Pool (R-200 Anti-Pattern #5)

`auth.test.ts`, `conversations.test.ts`, `tool-call-log.test.ts`, `trips.test.ts`, `userPreferences.test.ts` all mock the pool and make tautological assertions.

**Scope:** These are mitigated by integration tests. Replace or supplement with integration-level behavioral assertions over time. Multi-session refactor.

---

## Bug Log Items at P2

### B24: E2E US-19, US-23, US-36 Deleted/Pending MockAnthropic State Machine

US-19 (travel_plan_form flow), US-23 (tile selection confirmed via `confirmedId`), and the newly-added US-36 (plan card confirm) were deleted from `e2e/chat-booking-flow.spec.ts` or never written because they require a multi-turn MockAnthropic state machine that reacts to user messages, plan-card confirmations, and tile-selection events. Without it, `aria-pressed` is never set to true (it is driven by server-side `confirmedId`, not by the client click), and the agent never emits a `plan_card` then transitions to the first search.

**Why P2:** Test coverage gap, not user-visible. Blocks restoring three user-story E2E specs.

**Scope:** Build the MockAnthropic state machine (tracked as ENG-17). Once it lands, restore US-19, US-23, US-36 specs and remove the `void tripUrl` guard in `e2e/real/happy-path-real.spec.ts`.

---

## Criticism Audit (2026-05-28 Opus)

### Eval Model Lock-In: Cross-Model Judge Validation Missing

`eval/src/scoring/judge.ts:51` hardcodes `claude-sonnet-4-20250514`. `eval/src/adversarial/judge.ts:111` uses `claude-sonnet-4-6`. Commit `87576dc` reverted judge and orchestrator from `claude-sonnet-4-6` to `claude-sonnet-4-20250514` "to restore eval score to 0.79." The eval is measuring the grader's self-consistency on one model, not the product's robustness. When Anthropic deprecates the alias, the score will change for grader reasons, not product reasons.

**Scope:** Re-run the adversarial eval with at least two additional judge models (e.g., `claude-haiku-4-5-20251001`, `claude-opus-4-7`). If pass-rate varies by more than +/-0.05 across models, the 0.79 number is grader-specific and must be reported as a range. If it is stable, the lock-in concern is retracted. Requires running the eval suite end-to-end.
