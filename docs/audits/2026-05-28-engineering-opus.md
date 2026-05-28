# Engineering Audit (CTO, Opus second opinion) -- 2026-05-28

**Scope:** Today's 57 commits on `main`, across six surfaces:
monorepo restructure, orchestrator T5-T14 sub-agent rollout, security fixes,
antagonistic eval suite, E2E rewrite, trip-form polish, WC-01..WC-11 cleanup, CI fixes.

**Auditor model:** claude-sonnet-4-6 (Opus routing)
**Baseline Sonnet audit:** `docs/audits/2026-05-28-engineering.md` at commit `fee62ec`

---

## Executive Summary

The codebase is in substantially better shape than six weeks ago. The security surface
has been narrowed, the state machine is centralized, and bug-fix discipline is holding.
Two findings from this pass require immediate action before the next feature wave:

1. **IDOR on `DELETE /trips/:id/legs/:legId` and `PUT /trips/:id/legs/reorder`.**
   Ownership is verified on the trip but not on the individual leg IDs. An
   authenticated user who learns a leg UUID from any source (shared trip, network tab,
   previous API call) can delete or reorder legs belonging to another user's trip.
   This is a P1 security regression: the security fix batch verified ownership at the
   HTTP handler level but left the repository SQL without a trip_id join.

2. **`add_leg`, `remove_leg`, `reorder_legs`, and `plan_daily_schedule` are in
   `TOOL_DEFINITIONS` but absent from every `SUB_AGENT_TOOLS` partition.**
   Because `allowedTools` is always set to a partition list, these four tools are
   never offered to the LLM. The multi-city and day-schedule features are silently
   non-functional through the agent loop.

3. **`planConfirmation` body is structurally duck-typed, not schema-validated.**
   The `experience_interests` array written to the `booking_state` JSONB column has
   no length cap or content validation.

### Top 3 Priorities

1. P1 -- IDOR on leg delete/reorder: add `trip_id = $N` to `deleteLeg` and
   `reorderLegs` SQL joins, or verify leg IDs against `listLegs(tripId)` in the handler.
2. P1 -- Dead tools: add `add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule`
   to the appropriate `SUB_AGENT_TOOLS` partition.
3. P2 -- `planConfirmation` unvalidated: add a Zod schema for `TripPlanCard` and
   validate before calling `applyPlanConfirmation`.

---

## Operational Basics

| Check | Status | Notes |
|---|---|---|
| Tests run | YES | 993+ server unit tests, client tests, integration tests all pass. |
| CI green | YES | `lint`, `unit-tests`, `e2e-tests` wired on push to `main`. |
| E2E wired | YES | All specs run in CI with mock flags. |
| Coverage | PASSING | 89%+ statements, 85%+ branches. Above the 85% floor. |
| Monitoring | PARTIAL | Pino logs, PostHog events, `/health`+`/health/ready`, post-deploy check workflow. No Sentry. |
| Rollback plan | MISSING | Railway supports rollback from dashboard; not documented in repo. |
| Post-build smoke test | MISSING | `bea33cc5` retrospective demanded this. Still absent. |
| Worktree hygiene | CONCERN | `investigate-llm-orchestration` worktree is live with 3 commits not on `main`, including two P1 fixes. |

---

## Surface 1 -- Monorepo Restructure (2672b52)

`server/` + `web-client/` moved to `apps/server/` + `apps/client/web/`. A subsequent
cleanup commit (`607965e`) addressed path remnants. `pnpm-workspace.yaml` correctly
lists all four packages including `eval`.

**P3 finding:** `eval/package.json` pins `@anthropic-ai/sdk ^0.81.0` while
`apps/server/package.json` uses `^0.91.1`. pnpm resolves them independently. The
eval harness makes live Anthropic API calls and uses the SDK's tool-use response
parsing. The wire format changed across SDK minor versions. Eval runs using the
0.81.x-resolved SDK against a model that produces 0.91.x-format responses will
silently misparse tool results.

---

## Surface 2 -- Orchestrator T5-T14 Sub-Agent Rollout

### ORC-01 -- P1: Four tools dead from the LLM perspective (MISSED BY SONNET)

**File:** `apps/server/src/services/agent/sub-agent.service.ts` lines 20-55;
`apps/server/src/services/agent/agent.service.ts` lines 63-66;
`apps/server/src/tools/definitions.ts` lines 328-418

`SUB_AGENT_TOOLS` defines seven partitions. None of them include:
`add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule`.

`agent.service.ts` line 63-66:
```
const tools =
  allowedTools && allowedTools.length > 0
    ? TOOL_DEFINITIONS.filter((t) => allowedTools.includes(t.name))
    : TOOL_DEFINITIONS;
```

`chat.ts` line 191: `const allowedTools = SUB_AGENT_TOOLS[subAgentType];`

`SUB_AGENT_TOOLS[subAgentType]` is never empty (all seven types have at least
two tools), so the `allowedTools.length > 0` branch always fires, and these four
tools are always filtered out. The LLM never sees them. They are implemented in the
executor (`executor.ts` lines 206-253) but unreachable through the chat flow.

**Impact:** The multi-city feature (legs) and daily schedule feature are non-functional
through agent-driven chat. Direct HTTP endpoints (`POST /:id/legs`, `PUT /:id/legs/reorder`,
`GET /:id/schedule`) still work, but the AI cannot autonomously trigger these tools.

**Remediation:** Add to `conversation` partition at minimum, or create an `itinerary`
sub-agent type with `['add_leg', 'remove_leg', 'reorder_legs', 'plan_daily_schedule', 'format_response']`.

### ORC-02 -- P2: `planConfirmation` body bypasses Zod schema validation

**File:** `apps/server/src/handlers/chat/chat.ts` lines 178-183

`planConfirmation` is accepted if `typeof === 'object'` and has `categories` as an
array. It is then cast `as TripPlanCard` without Zod validation.
`applyPlanConfirmation` (`chat.helpers.ts` lines 57-85) has defensive guards
(`VALID_CATEGORY_IDS.has`, `typeof v === 'string'`), but:

- No length cap on `experience_interests` values or the array itself.
- No validation that `category.not_applicable` and `category.enabled` are booleans.
- No cap on `categories` array length.

These values are written verbatim into the `booking_state` JSONB column via
`updateBookingState`. A user can POST a `planConfirmation` with thousands of
categories or interest strings, inflating the persisted state without limit.

**Remediation:** Add a Zod schema for `TripPlanCard` in `schemas/`; call
`safeParse(planConfirmation)` before `applyPlanConfirmation`; reject 400 on failure.
Set limits: max 10 categories, max 20 interest strings, max 100 chars each.

### ORC-03 -- P2: Experiences routable before hotels in some states (design ambiguity)

**File:** `apps/server/src/services/agent/sub-agent.service.ts` lines 68-71

```
if (needsWork(tracker.hotels) && isResolved(tracker.flights)) return 'hotel';
if (needsWork(tracker.experiences) && isResolved(tracker.flights)) return 'experience';
```

Both conditions gate only on `isResolved(tracker.flights)`. If hotels are in
`searching` state, `needsWork(hotels)` is true so the hotel agent fires (correct).
But if hotels are `not_applicable` or `skipped`, `isResolved(hotels)` is true and
the hotel condition is false, so experience fires -- also correct. The routing is
actually sound for the current tracker values.

However, ground requires `isResolved(tracker.hotels)` while experience does not.
The asymmetry is undocumented. If the intent is that experiences can run in parallel
with hotel selection (or after hotels are resolved), add a comment stating this. If
it is unintentional, the experience condition should also require `isResolved(tracker.hotels)`.

### ORC-04 -- P3: `maxIterations` name tracks tool calls, not loop iterations

**File:** `apps/server/src/services/agent/AgentOrchestrator.ts` lines 11-12, 207

`DEFAULT_MAX_ITERATIONS = 8` is compared against `toolCalls.length + toolUseBlocks.length`,
not the `iterations` counter. The variable tracks tool calls, not Anthropic API calls.
The naming is misleading. Functionally correct.

---

## Surface 3 -- Security Fixes

### SEC-01 -- P1: IDOR on leg delete and reorder (MISSED BY SONNET)

**Files:**
- `apps/server/src/handlers/trips/legs.ts` line 65 (`removeLeg`), line 80 (`reorderLegs`)
- `apps/server/src/repositories/trips/trip-legs.repository.ts` line 47-49 (`deleteLeg`), lines 51-69 (`reorderLegs`)

`removeLeg` in `legs.ts`:
```typescript
await assertTripOwnership(req.params.id, userId);  // verifies user owns the TRIP
await deleteLeg(req.params.legId);                 // deletes leg with no trip_id join
```

`deleteLeg` SQL:
```sql
DELETE FROM trip_legs WHERE id = $1
```

No `AND trip_id = $2`. The handler verifies the caller owns `req.params.id` (the trip
in the URL), but never verifies that `req.params.legId` belongs to `req.params.id`.

Attack: User A owns Trip X. They learn `leg-uuid-B` (a leg in Trip Y owned by User B,
visible via a shared trip link). `DELETE /trips/trip-X/legs/leg-uuid-B` passes
ownership on Trip X and deletes User B's leg from Trip Y.

Same gap in `reorderLegs`: the UUIDs in `ordered_leg_ids` pass Zod UUID validation
but are never checked against `trip_id = req.params.id`.

**Remediation Option A (repository):** Change signatures to:
- `deleteLeg(legId: string, tripId: string)` with `WHERE id = $1 AND trip_id = $2`
- `reorderLegs(orderedIds: string[], tripId: string)` with `AND trip_id = $tripId` join

Option A is one SQL change each and fails safely (0 rows affected if mismatch).

**Remediation Option B (handler):** Call `listLegs(req.params.id)` and verify
the target leg ID is in the returned list before proceeding.

### SEC-02: Prior P0/P1 findings confirmed resolved

All three fixes from `3e17fca`, `d0ff914`, `4cbce5c` are real:
- `reorderLegs` SQL injection: parameterized with `::uuid` cast.
- `createShareHandler`: `getTripWithDetails` ownership before INSERT.
- `costs`, `schedule`, `legs` HTTP handlers: ownership via `assertTripOwnership`.

The IDOR finding above is a gap in the legs handler specifically, not in the other
three surfaces that were fixed.

---

## Surface 4 -- Antagonistic Eval Suite

### EVAL-01 -- P2: `parseJudgeResponse` JSON parsing is fragile

**File:** `eval/src/adversarial/judge.ts` lines 79-103, 119

The judge uses a prefilled assistant turn (`{ role: 'assistant', content: '{' }`) to
elicit JSON without a markdown code fence. `parseJudgeResponse` prepends `'{'` to the
raw model text before parsing:

```typescript
const text = '{' + raw.trim();
JSON.parse(text);
```

If the model re-emits the opening brace (producing `{{...}}`), the parse fails. The
catch block returns `{ passed: false, rationale: 'Judge output could not be parsed' }`.
An infrastructure parse failure is indistinguishable from an attack that actually
bypassed the agent. Eval runs that break due to model format drift show as 100% failure
rate with no alert.

**Remediation:** Try `JSON.parse(raw.trim())` first; fall back to the prepend approach;
log a distinct `JUDGE_PARSE_ERROR` when both fail so the operator knows the failure is
infrastructure, not behavioral.

### EVAL-02 -- P2: Eval unit tests not in CI; SDK version divergence

The `eval/` package is in `pnpm-workspace.yaml` but has no CI job. The 30+ unit tests
in `eval/src/adversarial/*.test.ts` (detector, judge, runner, reporter) are never run
in CI and can break silently.

The eval package also uses `@anthropic-ai/sdk ^0.81.0` vs server's `^0.91.1`. If the
resolved version is significantly older, tool-use parsing in eval harness may fail on
new model responses.

**Remediation:** Add a CI job: `pnpm --filter voyager-eval run test`. Update
`eval/package.json` SDK to `^0.91.1`.

### EVAL-03: Two-layer pass/fail is genuine validation

The deterministic must-not detector runs before the LLM judge. Pre-check violations
are automatic fails. The judge prompt explicitly lists `cave-after-pressure` as a
failure mode. 50 attacks across 8 categories with P0/P1/P2 severity is appropriate
scope. This is real adversarial testing, not theater.

---

## Surface 5 -- E2E Rewrite

### E2E-01 -- P2: `happy-path-booking.spec.ts` stops at preferences wizard

**File:** `e2e/journeys/happy-path-booking.spec.ts` lines 15-35

The spec comment claims to exercise US-1 through US-27 but the test body asserts only
that the preferences wizard rendered. No booking, no chat, no tile selection. The spec
name is misleading. This is a documentation/coverage gap; other specs cover the booking
flow.

### E2E-02: `real/happy-path-real.spec.ts` environment-gated skip

`test.skip(!HAS_REAL_KEYS, ...)` is acceptable: the reason is explicit and the
condition is environmental. This does not violate R-216 (which targets suppressions
without reason). Not a finding.

### E2E-03: Deleted specs tracked via B24 (P2 known, confirmed)

Tracked. No additional finding.

---

## Surface 6 -- Trip-Form Polish (d20af7f)

### TFP-01 -- P2: R-204 violation; `feat:` label circumvents hook

`d20af7f` bundles a P0 timeout fix, P1 budget fix, new migration, and visual/form
changes in 30 files. R-204 requires one commit per triage ID.

More importantly: the commit uses a `feat:` label. The `fix-commit-gate` hook fires
only on `fix:`-prefixed commits. The P0 and P1 fixes are labeled as a feature,
bypassing the hook entirely. This is the same relabeling dodge documented in the
2026-04-06 retrospective.

The fixes do not conflict with each other (timeout fix and NaN rendering are
independent). The reversion risk is the migration: `1779970908000_add-flexible-dates.js`
is bundled with the P0 fix and cannot be independently reverted.

---

## Surface 7 -- WC-01..WC-11 and CI Fixes

No new findings beyond Sonnet's. `f0dee63` server-only `NEXT_PUBLIC_API_URL`,
`a1539dd` preference constants to shared-types, `e018cad` single-source destination
images, and `0c4fa3f` `.js` extension root-cause fix -- all sound.

---

## Credential Exposure Scan

**Targets checked and results:**

1. Working tree (`rg` with all patterns, excluding `node_modules` and `.git`): 0 matches.
2. Git history (`git log -p --all -S<pattern>` for Anthropic, Stripe, GitHub, AWS patterns): 0 matches.
3. Session JSONLs (24 files in `~/.claude/projects/-Users-iangreenough-Desktop-code-personal-production-voyager/`): 0 matches for all patterns.
4. Shell history (`~/.zsh_history`, `~/.bash_history`): 0 matches.
5. Vendor CLI config files:
   - `~/.railway/config.json` (15,464 bytes): keys are `linkedFunctions`, `projects`, `user`. Pattern scan: 0 matches.
   - `~/.config/gh/hosts.yml` (100 bytes): contains `user: nullvoidundefined` and protocol config only. 0 matches.
   - `~/.vercel/auth.json`: absent.
   - `~/.anthropic/`: absent.
   - `~/.aws/credentials`: absent (off-limits per R-107; absence confirmed).

**Result: No credential exposure found.**

---

## Database

Schema and migrations are sound. 24 migrations, clean sequential timestamps, additive.
The `agent_turn_cost` migration (`1771879388561`) creates `pgm.createIndex('agent_turn_cost', 'conversation_id')` at line 57 -- the index exists. Sonnet's concern about this index was valid to check; it is confirmed present.

`deleteLeg` repository SQL (`WHERE id = $1` only) is the specific IDOR gap in SEC-01.

---

## Bug Fix Discipline

0 unpaired `fix:` commits in the last 60. The hook is holding on `fix:`-labeled commits.

`d20af7f` labeled P0/P1 fixes as `feat:` -- the hook does not fire on `feat:` commits,
so the isolation discipline was bypassed. This is the same pattern the 2026-04-06
retrospective documented under "relabeling does not dodge the rule." The hook
enforcement is syntactic; a semantic enforcement (checking whether the commit touches
files listed under open P0/P1 entries in `docs/BUGS.md`) does not exist.

---

## Runbook-vs-Code Drift Scan

No `docs/runbooks/` directory. Operational conventions in `CLAUDE.md`.

Checked surfaces: `CORS_ORIGIN`, Railway deploy vs `railway.toml`, `NIXPACKS_*`
prohibition, `E2E_BYPASS_RATE_LIMITS`, `core.hooksPath`. All consistent. No drift.

One new item: `CLAUDE.md` describes trunk-based development ("push directly to
`main`"), but the `investigate-llm-orchestration` worktree is live with 3 commits not
on `main`. The two `fix(P1-N)` commits on that branch represent unmerged P1 bug fixes
that are not on the trunk. This is not strictly a runbook-vs-code drift finding, but
it is a process state that contradicts the trunk-based discipline.

---

## Workspace Hygiene

One active worktree: `investigate-llm-orchestration` at
`.claude/worktrees/investigate-llm-orchestration`. It has 3 commits not on `main`:

- `e67af61`: `chore: wrap planning checklist in XML tags for LLM readability`
- `4aa4fce`: `fix(P1-03): budget tool uses DB-truth costs instead of Claude-supplied values`
- `ebf2c6b`: `fix(P1-05): multi-airport support for destination lookups`

`fix(P1-03)` and `fix(P1-05)` are P1 bug fixes not in production. If they were
validated, they should be cherry-picked or merged to `main`. If they were abandoned,
the worktree should be removed. Do not delete without confirming intent.

No duplicate project directories found on the filesystem.

---

## Delta vs Sonnet Audit (fee62ec)

### (a) Findings Sonnet missed

**SEC-01 (P1) -- IDOR on leg delete/reorder.** Sonnet confirmed all three security
fixes as resolved. It did not inspect whether the repository SQL verifies that the
leg belongs to the trip in the URL parameter. `deleteLeg` deletes `WHERE id = $1`
with no `trip_id` filter. This is a concrete exploitable gap.

**ORC-01 (P1) -- Dead tools.** Sonnet described sub-agent routing as "sound" and
noted 33 unit tests. It did not verify whether the newly added multi-city and schedule
tools are in any `SUB_AGENT_TOOLS` partition. They are not. The features are
non-functional through the agent loop.

**ORC-02 (P2) -- `planConfirmation` unvalidated.** The `planConfirmation` body path
and its unbounded write to `booking_state` JSONB were not inspected by Sonnet.

**EVAL-01 (P2) -- `parseJudgeResponse` fragility.** Not inspected by Sonnet.

**EVAL-02 partial -- SDK version divergence.** Sonnet noted the eval is unintegrated
but did not flag the `^0.81.0` vs `^0.91.1` SDK divergence.

**TFP-01 partial -- hook circumvention.** Sonnet flagged the R-204 violation but did
not note that the `feat:` label bypasses the hook entirely, making this a process
recurrence, not a one-off exception.

**Worktree with unmerged P1 fixes.** Not flagged by Sonnet.

### (b) Findings Sonnet flagged that this audit disagrees with or downgrades

**Sonnet: "eval/personas-cache.json committed to repo" (P3).** False positive.
`personas-cache.json` is in `.gitignore` (confirmed) and is untracked (`git ls-files`
returns nothing). This finding should be retracted from Sonnet's report.

**Sonnet: "Potential missing index on agent_turn_cost(conversation_id)."** False
positive. The index is created in migration `1771879388561` at line 57:
`pgm.createIndex('agent_turn_cost', 'conversation_id')`. Confirmed present.

### (c) Meaningful agreements

- `app.ts` `readFileSync` at module load, no try/catch: both P2.
- No post-build smoke test for `dist/data/destinations.json`: both P2.
- Enrichment async sources 0% function coverage, silent error swallow: both P1.
- Executor test gaps for the four new tools: both P2 (this audit additionally
  escalates because the tools are also dead from the LLM, making test gaps secondary).
- CSRF header-presence-only guard: both P2.
- No timeout on enrichment HTTP fetches: both P2.
- `pnpm/action-setup@v4` unpinned in two CI jobs: both P3.
- No rollback procedure: both P3.
- Eval package not in CI: both flagged.

---

## Prioritized Recommendations

| Priority | Finding | Impact | Effort | Action |
|---|---|---|---|---|
| P1 | IDOR on leg delete/reorder (SEC-01) | H | S | Add `AND trip_id = $N` to `deleteLeg` and `reorderLegs` SQL. Write test: user A cannot delete leg from trip owned by user B. |
| P1 | Dead tools in all sub-agent partitions (ORC-01) | H | S | Add the four tools to `conversation` partition or new `itinerary` sub-agent. Confirm with a unit test that the agent call includes them. |
| P1 | Enrichment 0% coverage + silent swallow (Sonnet P1) | H | S | Add fetch-mocked unit tests; add `logger.warn` to `allSettled` rejection path. |
| P2 | `planConfirmation` unvalidated (ORC-02) | M | S | Add Zod schema for `TripPlanCard`; validate at chat handler entry; cap interests to 20 strings of max 100 chars. |
| P2 | `app.ts` `readFileSync` no try/catch (Sonnet P2) | M | M | Wrap in try/catch; log fatal + `process.exit(1)` if file absent. |
| P2 | No post-build smoke test (Sonnet P2) | M | S | Append `node -e "require('fs').accessSync('dist/data/destinations.json')"` to build script. |
| P2 | Eval unit tests not in CI; SDK divergence (EVAL-02) | M | S | Add `eval-tests` CI job; update eval SDK to `^0.91.1`. |
| P2 | `parseJudgeResponse` fragile (EVAL-01) | M | S | Try raw parse first; fall back to prepend; log `JUDGE_PARSE_ERROR` distinctly on both failures. |
| P2 | Worktree with unmerged P1 fixes | M | S | Triage `4aa4fce` and `ebf2c6b`: cherry-pick to `main` if valid, or remove worktree. |
| P2 | No timeout on enrichment fetches (Sonnet P2) | M | S | Wrap each `fetch()` with `AbortSignal.timeout(5000)`. |
| P3 | `feat:` label circumvents hook (TFP-01) | L | S | Track as process recurrence. Consider whether the hook should check commits touching open P0/P1 BUGS.md entries. |
| P3 | eval SDK `^0.81.0` vs server `^0.91.1` (Surface 1) | L | S | Pin eval SDK to `^0.91.1`. |
| P3 | pnpm version unpinned in 2 CI jobs (Sonnet P3) | L | S | Add `version: 9.15.9` to both `pnpm/action-setup@v4` steps. |
| P3 | No rollback procedure (Sonnet P3) | L | S | Add `## Rollback` section to `CLAUDE.md`. |
