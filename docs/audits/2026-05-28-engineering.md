# Engineering Audit (CTO) -- 2026-05-28

**Scope:** `apps/` (full monorepo: `apps/server/`, `apps/client/web/`, `packages/shared-types/`)
**Auditor model:** claude-sonnet-4-6

---

## Executive Summary

The codebase is materially better than the 2026-04-06 baseline. All three P0/P1 security findings from the prior same-day server audit have been fixed and are paired with tests. Coverage thresholds pass (89.01% statements, 85.57% branch, 85.4% functions -- all above the 85% floor). CI is green. The E2E suite has 20+ specs covering auth, chat flows, booking flows, accessibility, mobile, export, daily schedule, and multi-city, all using the mock Anthropic + mock tools infrastructure.

Three areas require action before the next feature wave:

1. **The three async enrichment sources (`fetchStateDeptAdvisory`, `fetchFCDOAdvisory`, `fetchWeatherForecast`) have 0% function coverage and their errors are silently swallowed.** A live advisory API outage produces no log entry and a silent empty enrichment panel. This is P1.

2. **`app.ts` has a module-level `fs.readFileSync(destinationsPath)` with no error handling.** If `dist/data/destinations.json` is absent at boot, the server crashes with an unhandled exception before handling any request. This is the exact scenario from the `bea33cc5` retrospective and the post-build smoke test that retrospective demanded is still missing.

3. **The `eval/` package has `personas-cache.json` committed to the repo** alongside eval source, and the eval package is not included in CI. This is non-reproducible committed state.

### Top 3 Blockers

1. **P1 -- Enrichment async sources have 0% test coverage and silent error swallowing.** `enrichment.ts` is at 17.14% coverage. The `Promise.allSettled` loop drops all rejected results with no `logger.warn`. A production advisory outage is invisible.

2. **P2 -- No post-build smoke test for `dist/data/destinations.json`.** The `bea33cc5` retrospective explicitly demanded this. The build script does `cp src/data/*.json dist/data/` but there is no assertion step. The Dockerfile copies the file redundantly as a workaround, not a build contract.

3. **P2 -- `app.ts` `readFileSync` at module load with no try/catch.** If the file is absent, the process crashes before any request is served.

---

## Operational Basics

| Check | Status | Notes |
|---|---|---|
| Tests run | YES | 993 server unit tests pass in 3.45s (70 files). Client test suite runs separately. |
| CI green | YES | `lint`, `unit-tests`, and `e2e-tests` jobs all wired on push/PR to `main`. |
| E2E wired | YES | 20+ specs in `e2e/`. All use `E2E_MOCK_ANTHROPIC=1` and `E2E_MOCK_TOOLS=1`. Runs in CI with Postgres + Redis service containers. |
| Coverage threshold | PASSING | 89.01% / 85.57% / 85.4% all above the 85% floor. |
| Monitoring | PARTIAL | Pino structured logging, PostHog event tracking on agent turns, `/health` and `/health/ready` endpoints, post-deploy health check workflow. No Sentry or external error tracking. No Prometheus-style metrics. |
| Rollback plan | MISSING | No documented rollback procedure. Railway supports reverting via dashboard but this is not written down anywhere in the repo. |
| Post-build smoke test | MISSING | Demanded by `bea33cc5` retrospective. Still absent. |

---

## Architecture and Design

**Server layering is correct and consistent:** routes -> handlers -> services/repositories -> db/pool. `AgentOrchestrator` accepts its Anthropic client by config (correct DI seam). `ToolAdapters` interface provides per-tool injection without env-global flags (ENG-04, resolved).

**Sub-agent routing** (`selectSubAgent` + `SUB_AGENT_TOOLS`) is sound: seven sub-agent types with partitioned tool access control per phase. 33 unit tests in `sub-agent.service.test.ts`. The routing logic is well-covered.

**`app.ts` module-level side effect (CQS-17, unresolved):** Line 135 executes `fs.readFileSync(destinationsPath, 'utf-8')` at import time with no error handling. Any import of `app.ts` -- including in tests -- that occurs before `dist/data/` exists will crash the process.

**`eval/` directory:** An eval harness exists at `eval/` with its own `package.json` (`voyager-eval`), vitest config, source, and a committed `personas-cache.json`. It is not included in any CI job. Its relationship to the main application is unclear from the source alone.

---

## Code Quality

Strong: consistent `ApiError` + `errorHandler`, Zod validation at every handler and tool boundary, parameterized SQL throughout, `UPDATE_TRIP_ALLOWED_COLUMNS` allowlist, normalized cache keys.

Open P2/P3 items (from `ISSUES.md`, confirmed still unresolved):
- **CQS-09:** `cities.ts` data quality (`'luang'` key missing "Luang Prabang" lookups).
- **CQS-10:** NUMERIC parser silently returns NaN, propagates into budget arithmetic.
- **CQS-11:** Enrichment sources swallow errors silently.
- **CQS-13:** `departure_date`/`return_date` are `z.string().optional()` with no regex or date-format validation.
- **CQS-16:** `address: ''` hardcoded in `hotels.tool.ts` production path; mock returns real address.
- **CQS-17:** `app.ts` `readFileSync` at module load.
- **CQS-18:** Client data duplication (destinations, image maps) remains; preference constants were moved to `@voyager/shared-types` but the rest was not.

**New finding -- `executor.ts` tool dispatch branches at 75.29% statement coverage:** Lines 137-244 and 247-253 cover `add_leg`, `remove_leg`, `reorder_legs`, and `plan_daily_schedule`. These four tools were added in the multi-city/schedule feature wave with no executor-level unit tests.

---

## Security

**All three prior P0/P1 findings are resolved:**
- `reorderLegs` SQL injection: Fixed. `trip-legs.repository.ts` uses parameterized `VALUES ($1::uuid, $2::int), ...` with UUID Zod validation in the handler.
- `createShareHandler` ownership gap: Fixed. `getTripWithDetails(tripId, userId)` check added before INSERT.
- `costs`, `schedule`, `legs` ownership gaps: Fixed. All three handlers use `getTripWithDetails` / `assertTripOwnership`.

**Remaining concerns:**

- **CSRF guard is header-presence-only (P2):** `csrfGuard` checks for the presence of `X-Requested-With` but does not validate its value or use a cryptographic token.

- **`NEXT_PUBLIC_APP_URL` not validated at boot (P2):** `share.ts` line 23 falls back to `''` if unset, producing relative share URLs. Not in `validateEnv()`.

- **No timeout on enrichment HTTP fetches (P2):** `fetchStateDeptAdvisory`, `fetchFCDOAdvisory`, `fetchWeatherForecast` have no `AbortSignal.timeout()`. A slow external advisory API will hold up the first agent response for its full wait.

---

## Database

Schema design is sound. 24 migrations, clean sequential timestamps, additive-only. The `remove-amadeus-columns` migration (1771879388560) confirms Amadeus dead-code was cleaned from the schema. No Amadeus references remain anywhere in the codebase.

All queries are parameterized. `insertTripSelection` generic helper, `updateTrip` allowlist pattern -- both correct.

**`schedule.repository.ts` and `trip-legs.repository.ts` are at ~2.5% statement coverage** (import only). Covered only by integration tests, not the faster unit suite.

**Potential missing index:** `agent_turn_cost` is queried with `JOIN conversations c ON c.id = atc.conversation_id WHERE c.trip_id = $1`. Verify migration 1771879388561 creates an index on `agent_turn_cost(conversation_id)`. Postgres does not auto-index FKs.

---

## API Design

Route structure is consistent. All error responses use `{ error: CODE, message: string }` via `ApiError`. Minor P3: success response shapes are not uniformly wrapped (`{ trips }`, `{ leg }`, `{ days }`, `{ messages }` vary per endpoint).

**Synthetic welcome message instability (P3):** The welcome message in `getMessages` has `id: 'welcome'` and `created_at: new Date().toISOString()` that changes on every poll. Any client keying on message ID or timestamp sees instability.

---

## Performance

SerpApi quota enforcement: conservative cap at 200 (50 below the 250 free tier limit). Circuit breaker (3-failure threshold, 60s cooldown) wraps all SerpApi calls. Cache key normalization is correct.

Agent loop: 8-iteration limit and 120s wall-clock timeout both enforced at the top of the `while (true)` loop. Token budget per user (50k output tokens/day) is Redis-backed and fails open on Redis unavailability.

**No timeout on enrichment HTTP fetches** (see Security section). This is a latency risk on first messages to any destination.

---

## Testing

**What is working:**
- 993 unit tests, 70 files, 3.45s.
- ChatBox invariants spec covers 12 invariants (grown from the original 5).
- All 8 `fix:` commits in the last 60 are paired with test files. 0 unpaired fixes. The blocking `commit-msg` hook is holding.
- Mock Anthropic client with fixture JSONs enables deterministic E2E.
- Integration tests cover 8 tables/repositories against a real Postgres.

**Gaps:**

- **Enrichment async sources (P1):** `fetchStateDeptAdvisory` 8.47%, `fetchFCDOAdvisory` 66.1% (async path only), `fetchWeatherForecast` 48.27%. `enrichment.ts` overall 17.14%.

- **Executor dispatch for 4 new tools (P2):** `add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule` cases in `executor.ts` are uncovered by unit tests.

- **`chat.ts` error path (P2):** Lines 319-323 (SSE error emit on `runAgentLoop` throw) are uncovered.

- **`schedule.repository.ts` and `trip-legs.repository.ts` unit tests (P2):** Both at ~2.5% coverage in the unit suite.

**Bug-fix discipline retrospective:** 0 unpaired `fix:` commits in the last 60. First clean audit on this metric since the project started.

---

## Dependencies and Supply Chain

All major dependencies are current: `@anthropic-ai/sdk ^0.91.1`, `express ^5.2.1`, `zod ^4.3.6`, `vitest ^3.2.4`. No CVEs detected. `pnpm-lock.yaml` is committed and CI uses `--frozen-lockfile`.

**`pnpm/action-setup@v4` unpinned in `lint` and `unit-tests` CI jobs (P3):** The `e2e-tests` job correctly pins `version: 9.15.9`. The other two jobs omit the `version:` key.

---

## Deployment and Infrastructure

Dockerfile is correct: multi-stage, minimal production image, explicit `USER node`. `railway.toml` is minimal and correct. No `NIXPACKS_*` conflict env vars.

**Post-build smoke test missing (P2):** The build script runs `rm -rf dist && tsc && tsc-alias -p tsconfig.json && mkdir -p dist/data && cp src/data/*.json dist/data/` with no subsequent assertion step. Add: `node -e "require('fs').accessSync('dist/data/destinations.json')"` after the `cp` step.

Post-deploy health check workflow fires on every push to `main`, checks `/health`, CORS headers, frontend, and `/login`, creates a GitHub issue on failure. Correct operational discipline.

`core.hooksPath` is not set (returns empty). Lefthook installs to `.git/hooks/`. No supply-chain signal.

---

## Bug Fix Discipline

**0 unpaired `fix:` commits in the last 60.** All 8 `fix:` commits are paired. The blocking `fix-commit-gate` in `lefthook.yml` commit-msg phase is enforcing the rule. First clean audit on this metric. Contrast with the 68.6% violation rate documented in the 2026-04-06 retrospective.

---

## Runbook-vs-Code Drift Scan

No `docs/runbooks/` directory exists. Operational conventions live in `CLAUDE.md`. Checked all drift-prone surfaces:

- `CORS_ORIGIN` documentation vs `corsConfig.ts` vs `validateEnv()`: consistent.
- Railway deploy documentation vs `railway.toml`: consistent.
- `NIXPACKS_*` prohibition vs tracked env config: no violations.
- `E2E_BYPASS_RATE_LIMITS` documentation vs `rateLimiter.ts`: consistent.
- `DATABASE_URL_E2E_LOCAL` documentation in `lefthook.yml` vs `playwright.config.ts`: consistent.

No runbook-vs-code drift findings.

---

## Workspace Hygiene

Only one copy of the project found. No duplicate or near-duplicate directory.

**`eval/` package present but unintegrated (P3):** `eval/personas-cache.json` is committed to the repo. The eval package is not in any CI job.

---

## Tech Debt Register

| ID | Description | Severity | Effort | Status |
|---|---|---|---|---|
| CQS-09 | `cities.ts` data quality issues | P2 | S | Open |
| CQS-10 | NUMERIC parser silent NaN | P2 | S | Open |
| CQS-11 | Enrichment sources swallow errors silently | P2 | S | Open |
| CQS-13 | Date fields lack format validation | P2 | S | Open |
| CQS-16 | Hotel address always empty in production | P2 | S | Open |
| CQS-17 | `app.ts` `readFileSync` at module load | P2 | M | Open |
| CQS-18 | Client/server data duplication (destinations, image maps) | P2 | L | Partial |
| NEW-01 | No post-build smoke test for `dist/data/destinations.json` | P2 | S | Open |
| NEW-02 | No timeout on enrichment HTTP fetches | P2 | S | Open |
| NEW-03 | Executor test gaps for 4 new tools | P2 | S | Open |
| NEW-04 | `eval/personas-cache.json` committed to repo | P3 | S | Open |
| NEW-05 | `pnpm/action-setup@v4` unpinned in 2 CI jobs | P3 | S | Open |
| NEW-06 | Synthetic welcome message has unstable `created_at` | P3 | S | Open |
| NEW-07 | No documented rollback procedure | P3 | S | Open |

---

## Prioritized Recommendations

| Priority | Finding | Impact | Effort | Action |
|---|---|---|---|---|
| P1 | Enrichment async sources untested, errors silently dropped | H | S | Add fetch-mocked unit tests for `fetchStateDeptAdvisory`, `fetchFCDOAdvisory`, `fetchWeatherForecast`. Add `logger.warn` to the `allSettled` rejection path in `enrichment.ts`. |
| P2 | No post-build smoke test for `dist/data/destinations.json` | H | S | Append `&& node -e "require('fs').accessSync('dist/data/destinations.json')"` to the `build` script in `apps/server/package.json`. |
| P2 | `app.ts` `readFileSync` at module load | M | M | Wrap in try/catch; log a fatal error and `process.exit(1)` with a descriptive message if the file is absent. |
| P2 | Executor test gaps for 4 new tools | M | S | Extend `executor.test.ts` with happy-path and validation-error tests for `add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule`. |
| P2 | No timeout on enrichment HTTP fetches | M | S | Wrap each `fetch()` in the three async enrichment sources with `AbortSignal.timeout(5000)`. |
| P2 | `chat.ts` SSE error path uncovered | M | S | Add a unit test mocking `runAgentLoop` to throw and assert the SSE `error` event is emitted and the connection is closed. |
| P3 | `eval/personas-cache.json` committed | L | S | Add `eval/personas-cache.json` to `.gitignore`. Store eval results as static docs in `docs/`. |
| P3 | pnpm version unpinned in 2 CI jobs | L | S | Add `version: 9.15.9` to `pnpm/action-setup@v4` in both `lint` and `unit-tests` CI jobs. |
| P3 | No rollback procedure | L | S | Add a `## Rollback` section to `CLAUDE.md` describing the Railway redeploy-to-previous-commit flow. |
