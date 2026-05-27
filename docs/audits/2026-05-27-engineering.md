# Engineering Audit: Voyager

**Date:** 2026-05-27
**Auditor:** CTO role (canonical definition: `~/.claude/audits/engineering.md`)
**Branch:** main
**Head commit:** `23aa19c` chore: remove resolved issues and delete completed plan/spec files
**Reference quality bar:** Doppelscript (`/Users/iangreenough/Desktop/code/personal/production/doppelscript`)

---

## Executive Summary

Voyager is in meaningfully better shape than the 2026-04-09 audit. The code quality sweep (2026-05-27) fixed 2 P0s and 25 P1s. The repository integration tests (CQS-01) are now real Postgres tests rather than pool-mock theater. The shared Redis singleton (CQS-06) consolidated three independent Redis client pools into one. The `getAuthUser` helper (CQS-04) eliminated 11 non-null assertions. Critical user-visible regressions (B14 tile persistence, B12 budget coercion) shipped with paired tests.

Three problems stand out as the most consequential open items today.

**Top 3 priorities:**

1. **BLOCKER: Integration test suite fails locally due to CORS test expecting a stale port default.** `cors.integration.test.ts` asserts `http://localhost:5173` but `server/.env` sets `CORS_ORIGIN=http://localhost:3000`. Tests pass in CI (where CORS_ORIGIN is unset and the `:5173` default activates) but fail for any developer running `pnpm test:integration` locally with the standard `.env`. This makes the integration suite environment-dependent and untrustworthy as a gate. The root fix is to set `CORS_ORIGIN` explicitly in the integration test environment, not rely on the fallback default.

2. **BLOCKER: Web-client tests are not run in CI.** 25 web-client test files covering 110 tests (ChatBox invariants, booking confirmation, auth flows, component behavior) run only locally. The `ci.yml` `unit tests` step filters to `voyager-server` exclusively. Doppelscript CI runs all three surfaces (server, web-client, extension) in a single job. A regression in the web-client can land on `main` with a green CI badge. This has been open since the 2026-04-09 audit (flagged as ENG-22-followup) and remains unresolved.

3. **WORKSPACE DIVERGENCE: Two independent git histories for the same project.** `/Users/iangreenough/Desktop/code/personal/projects/voyager` is a separate git working tree on the same remote (`git@github.com:nullvoidundefined/voyager.git`) with 2 commits ahead of the last shared ancestor. Those commits ("Migrate frontend from Vercel to Railway", "Configure per-service Dockerfiles in railway.toml") change the deploy target and the CORS default origin. The production canonical repo (`production/voyager`) does not have these changes. One copy has a `Dockerfile.web` and a Railway-hosted frontend; the other deploys the frontend to Vercel. It is unclear which one is actually serving traffic. This ambiguity is a P0 operational risk.

---

## Operational Basics

| Check                             | Status                | Notes                                                                                                                                  |
| --------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Server unit tests run (725 tests) | YES                   | `pnpm --filter voyager-server run test` passes clean. 62 test files.                                                                   |
| Server coverage threshold (85%)   | YES                   | 90.35% lines, 85.61% branches. Thresholds enforced in vitest config.                                                                   |
| Web-client tests run (110 tests)  | YES (local) / NO (CI) | Tests pass locally. CI does not run them. P1 gap. See finding ENG-NEW-01.                                                              |
| Integration tests run             | BROKEN locally        | `cors.integration.test.ts` fails locally due to env mismatch. Passes in CI. P1.                                                        |
| E2E tests wired and executing     | YES                   | `e2e.yml` required check on main. `playwright.global-setup.ts` fires e2e-smoke before specs. Workers bumped to 2 in CI per ENG-13 fix. |
| E2E global smoke check            | YES                   | ENG-14 fix is in: `playwright.global-setup.ts` calls `scripts/e2e-smoke.sh`.                                                           |
| CI is green                       | PARTIAL               | Unit tests green in CI. Integration tests green in CI only because CORS_ORIGIN is unset. E2E green.                                    |
| Coverage threshold enforced       | YES                   | 85% on all four dimensions.                                                                                                            |
| Error tracking                    | NO                    | No Sentry. ENG-05 open.                                                                                                                |
| Monitoring / health checks        | PARTIAL               | `/health` and `/health/ready` exist. Post-deploy check fires. No uptime monitoring.                                                    |
| Rollback plan documented          | NO                    | ENG-11 open. Railway has one-click rollback; procedure not written.                                                                    |
| Smoke test in CI                  | NO                    | `scripts/smoke-test.sh` exists and `test:smoke` works locally but not wired to CI. ENG-09 open.                                        |
| Nightly real-API workflow         | REMOVED               | Deliberately removed in commit `daa4ab6`.                                                                                              |

---

## Architecture and Design

### What improved since 2026-04-09

- **Redis singleton (CQS-06):** `cache.service.ts`, `serpApiQuota.service.ts`, and `tokenBudget.service.ts` all now import from the shared `redis.service.ts` singleton. Three connection pools are now one. The fix is correct and the `redis.service.ts` manages connect/disconnect lifecycle.

- **`getAuthUser` helper (CQS-04):** All 11 `req.user!` non-null assertions are replaced with `getAuthUser(req)` which throws `ApiError.unauthorized` if user is missing. Type safety is properly enforced. Handler code is cleaner.

- **`updateBookingState` type safety (CQS-03):** The `as unknown as Record<string, unknown>` double-cast is removed. `updateBookingState` now accepts the `BookingStateTracker` type directly.

- **`Message.role` type (CQS-05):** The `'tool' as string` cast is removed. The filter is now `m.role !== 'tool'` with a proper role union cast on the surviving messages.

- **`AgentOrchestrator` `max_tokens` handling (CQS-01 partially):** The orchestrator now breaks the loop and returns a graceful message when `stop_reason` is neither `end_turn` nor `tool_use`. It no longer burns API tokens for 120 seconds on an unexpected stop reason.

- **`userPreferences` concurrent write race (CQS-01 in repositories):** `upsert` now uses `ON CONFLICT DO UPDATE SET preferences = user_preferences.preferences || $2` for atomic JSONB merge. The read-then-write race is eliminated.

- **`updateTrip` SQL injection protection (P0 from code quality sweep):** `UPDATE_TRIP_ALLOWED_COLUMNS: ReadonlySet<string>` is in place and `Object.entries(input)` key filtering against that set blocks any column outside the allowlist.

- **SSE timeout fixed:** `res.setTimeout(0)` is called in `chat.ts` line 96, disabling the 30-second Express request timeout for the SSE connection. The 2026-04-09 finding about spurious 408s is resolved.

- **SSE JSON parse wrapped (CQS P1):** `useSSEChat.ts` now wraps `JSON.parse(line.slice(6))` in a try/catch and logs a warning on malformed lines instead of propagating the error as "Could not reach the agent."

### Remaining concerns

**`rateLimiter.ts` still has its own private Redis client.** `rateLimiter.ts` maintains a module-level `redisClient: Redis | null` instantiated by its own `getRedisClient()` function, independent of `redis.service.ts`. The CQS-06 refactor consolidated `cache.service.ts`, `serpApiQuota.service.ts`, and `tokenBudget.service.ts` onto the shared singleton, but `rateLimiter.ts` was not migrated. In production there are now 2 Redis clients, not 1. The comment in `rateLimiter.ts` explains the `enableOfflineQueue: true` requirement, which is a legitimate reason to keep separate configuration, but the connection should still route through the singleton with the option passed through rather than maintaining a parallel client.

**`projects/voyager` has diverged from `production/voyager`.** See Workspace Hygiene section. This is not an architectural concern in `production/voyager` itself, but the operational risk is real.

**`dist/` build does not clean before `tsc`.** The `server/package.json` build script is `tsc && tsc-alias -p tsconfig.json && mkdir -p dist/data && cp src/data/*.json dist/data/`. There is no `rm -rf dist` prefix. Deleted source files can leave stale artifacts in `dist/` that get copied into the Docker image. The 2026-04-09 audit flagged this; it is still open.

**`app.ts` module-level side effect (CQS-17) still present.** `query('SELECT NOW()')` fires at module import time, not inside `startServer()`. Importing `app.ts` in tests immediately attempts a real database connection. The `.catch()` swallows the error silently. This was flagged P2 in the code quality sweep and is still open.

---

## Code Quality

### What improved

- Tile inline styles extracted to a shared SCSS module (CQS-08). `FlightTiles`, `HotelTiles`, `CarRentalTiles`, `ExperienceTiles` no longer duplicate `style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}`.
- `PreferencesWizard.handleNext` now wraps `saveCurrentStep` in try/catch with user-visible error state.
- Booking confirmation error handling: `handleConfirmBooking` in `trips/[id]/page.tsx` is wrapped in try/catch, rolls back the optimistic update, and shows a toast on failure.
- "Forgot password" link replaced with a button that shows a toast. No more self-referential dead link.
- Account page category count uses `PREFERENCE_CATEGORIES.length` instead of hardcoded `6`.
- DemoBanner no longer links to a repo path. The engineering audit link was removed.
- `ChatBox.invariants.test.tsx` fixture now uses `id` (not `offer_id`) matching the `Flight` type interface.

### Remaining concerns

**Web-client `tsconfig.json` targets ES2017 but a test uses the ES2018 `/s` dotAll regex flag.** `web-client/src/app/(auth)/login/page.content.test.ts:23` uses `/s` which requires ES2018+. `web-client/tsconfig.json` has `"target": "ES2017"`. Running `tsc --noEmit` on the web-client produces `TS1501: This regular expression flag is only available when targeting 'es2018' or later`. The build does not fail (Next.js uses SWC, not `tsc`, for build) and the test itself passes (Vitest transpiles independently). However, `tsc --noEmit` is dirty. This is **below Doppelscript quality bar**: Doppelscript's `tsc --noEmit` is clean across all surfaces.

**`trips/new/page.tsx` still uses a `useRef` + `useEffect` for the one-time POST instead of TanStack Query `useMutation`.** The `creating` ref now has an `aborted` flag for cleanup, fixing the React Strict Mode double-invoke. However, the CLAUDE.md frontend convention explicitly requires TanStack Query for all server state mutations. This remains a convention violation (CQS-22-style). It is not a correctness bug, but it diverges from the project's declared pattern.

**`content.test.ts` files assert regex against source text.** Multiple web-client test files (`page.content.test.ts`, `PreferencesWizard.content.test.ts`) use `readFileSync + .toContain` or `toMatch(regex)` against raw source text. These can pass even if the assertion string appears only in a comment. This was flagged in the code quality sweep as P3 and is still the dominant test pattern for web-client components that lack render tests (CQS-21).

---

## Security

Prior audit security findings (SEC-05 through SEC-25) remain open and tracked in `ISSUES.md`. No regressions identified.

New finding:

**CORS integration test is environment-dependent.** `cors.integration.test.ts` relies on the `http://localhost:5173` CORS fallback default being active. In CI (where `CORS_ORIGIN` is not set), this works. In any local environment where `server/.env` sets `CORS_ORIGIN=http://localhost:3000` (the current local default), the test fails with `Origin http://localhost:5173 not allowed by CORS`. The test is not testing production behavior -- it is testing the fallback default that only applies when no env var is set. This is not a security vulnerability but it is a broken test that gives false confidence about CORS behavior and fails locally. Fix: set `CORS_ORIGIN=http://localhost:5173` explicitly in the integration test setup, or update the test to use the actual default that matches local development.

---

## Credential Exposure Scan

**Scan performed 2026-05-27.**

| Surface                                                                                                                | Result                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git history (`git log -p --all -S<pattern>` for all patterns)                                                          | 2 matches. Both are in the committed `docs/audits/2026-04-09-engineering.md` file which quotes the prior audit's finding about a JSONL match. The matched text is the audit report prose itself, not a live credential. No live credentials in git history. |
| Working tree (rg across repo, excluding node_modules, .git)                                                            | 0 matches for all patterns.                                                                                                                                                                                                                                 |
| Claude Code session JSONLs (`~/.claude/projects/-Users-iangreenough-Desktop-code-personal-production-voyager/*.jsonl`) | 8 JSONL files present. 0 matches for any credential pattern. The prior audit (2026-04-09) found 1 match in 1 file; that file has been deleted or the content purged.                                                                                        |
| Claude Code worktree session JSONLs (`-Users-iangreenough...-investigate-llm-orchestration/`)                          | 0 JSONL files present. Directory exists with no JSONL content.                                                                                                                                                                                              |
| Shell history (`~/.zsh_history`)                                                                                       | 0 matches.                                                                                                                                                                                                                                                  |
| Railway config (`~/.railway/config.json`, 15464 bytes)                                                                 | 0 credential pattern matches.                                                                                                                                                                                                                               |
| GitHub CLI config (`~/.config/gh/hosts.yml`, 100 bytes)                                                                | 0 matches.                                                                                                                                                                                                                                                  |
| Vercel auth (`~/.vercel/auth.json`)                                                                                    | Not present on filesystem.                                                                                                                                                                                                                                  |
| Anthropic config (`~/.anthropic/`)                                                                                     | Not present on filesystem.                                                                                                                                                                                                                                  |
| AWS credentials (`~/.aws/credentials`)                                                                                 | Not present on filesystem.                                                                                                                                                                                                                                  |
| `.netrc`                                                                                                               | Not present on filesystem.                                                                                                                                                                                                                                  |

**Finding:** No credential exposure detected in any scanned surface. The prior audit finding (1 JSONL match for `sk-ant-api03-`) is resolved; the session is gone.

**Vendor-specific patterns for this stack (in addition to the standard set):** SerpApi uses a query parameter key format `serpapi_api_key=[A-Za-z0-9]{64}` which was not matched in any surface. Google Places API key uses the `AIza[0-9A-Za-z_-]{35}` pattern already covered in the standard set.

---

## Database

- Repository integration tests now cover all 5 repositories with real Postgres: auth, conversations, tool-call-log, trips, userPreferences (1041 total lines across 5 test files, added in CQS-01).
- Concurrent `userPreferences` race fixed with atomic JSONB merge (see Architecture section).
- `updateTrip` allowlist protects against column injection.
- `deleteExpiredSessions` is still not scheduled (SEC-13). Sessions accumulate indefinitely.
- `getTripWithDetails` still issues 5 sequential queries outside a transaction (flagged in code quality sweep as P2). Acceptable for read-only display; documented in code.
- No new migration hygiene issues. Migration sequence is clean.

**Index audit (partial):** The `trips` table is queried with `WHERE user_id = $1` in `listTrips` and `WHERE id = $1 AND user_id = $2` in `getTripWithDetails`. A missing index on `trips.user_id` would cause a full-table scan on every session load. This was flagged as incomplete in the 2026-04-09 audit. The migration files should be checked to confirm the index exists. This is a P2 follow-up.

---

## API Design

- Route structure is clean and unchanged: `/auth`, `/trips`, `/places`, `/user-preferences`.
- `POST /trips/:id/selections` was added in B14 fix. It validates `type` against an enum and routes to the appropriate `insertTrip*` repository function. The handler correctly validates ownership via `getTripWithDetails(tripId, userId)` before inserting.
- `select_*` tool schemas (CQS P1 SEC-14) still use `z.string().min(1)` with no content restriction. The location allowlist applied to `search_*` tools is not applied to `select_*` tools. This remains open as SEC-14.
- `updateTrip` body is still not parsed with Zod (SEC-15). The handler destructures fields from `req.body` directly instead of running `updateTripSchema.partial().safeParse(req.body)`. The repository-level allowlist mitigates SQL injection but type coercion and validation of field values (e.g., ensuring `budget_total` is a number) is not enforced at the handler boundary.
- E2E test seam route `/:id/test-selections` is still registered unconditionally in `routes/trips.ts` (flagged in code quality sweep as P2). The handler returns 404 in production, but the route is visible to scanners.

---

## Performance

No regressions. The Redis singleton (one connection pool instead of three) reduces Redis connection overhead in production. SerpApi caching, token budget enforcement, and circuit breaker behavior are unchanged.

**One new concern:** The `rateLimiter.ts` private Redis client uses `lazyConnect: false` while `redis.service.ts` uses `lazyConnect: true`. At server boot, the rate limiter client immediately attempts a TCP connection to Redis, while the other client defers. This means a Redis-unavailable boot now produces a connection error from the rate limiter immediately, whereas the cache/quota/budget clients fail gracefully on first use. The `lazyConnect: false` was deliberate (see the extensive comment about `enableOfflineQueue`), but the asymmetric boot behavior is worth documenting as operational awareness.

---

## Testing

### Current test counts (verified)

- Server unit tests: 725 tests, 62 files, passing.
- Server coverage: 90.35% lines, 85.61% branches. Thresholds at 85% enforced.
- Server integration tests: 69 tests, 7 files. **2 tests failing locally** (CORS test, see above). Passing in CI.
- Repository integration tests: 1041 lines across 5 files, all new since 2026-04-09.
- Web-client tests: 110 tests, 25 files, passing locally. Not run in CI.
- E2E tests: approximately 101 tests across 12 spec files.

### Bug Fix Discipline (last 60 commits)

The most recent fix commits (B-series from 2026-04-09 window and CQS fixes from 2026-05-27) all include paired tests. The fix-commit gate (lefthook `commit-msg` hook blocking `fix:` without test files) is functioning. No new violations detected in the 60-commit window.

All `fix:` commits in the last 30 days:

| SHA       | Subject                                                               | Test paired? |
| --------- | --------------------------------------------------------------------- | ------------ |
| `02bcf5c` | fix(B12): budget tile shows $0 when prices arrive as strings or NaN   | YES          |
| `9cf1860` | fix(B14): wire structured item data through tile confirm chain to API | YES          |
| `a5cdb09` | fix(B14): add POST /trips/:id/selections backend route                | YES          |
| `bfb8cc9` | fix(B8): make hotels tool fail soft on all SerpApi errors             | YES          |
| `0ffbcec` | fix(B7): make flights tool fail soft on all SerpApi errors            | YES          |
| `029e2e7` | fix(B5): add gap between chat box and itinerary sections              | YES          |
| `c264b75` | fix(B6): replace huge book buttons with inline assistant prompt tile  | YES          |
| `6bfa8b4` | fix(B4): show pending indicator before first stream chunk             | YES          |
| `990b30c` | fix(B3): consolidate tool progress into one bar                       | YES          |
| `d8c363a` | fix(B2): make car rental tool fail soft                               | YES          |
| `3b50361` | fix(B1): coerce trip detail numeric columns and guard NaN             | YES          |

**Finding:** 11 of 11 fix commits in the last 30 days have paired tests. Zero violations. The fix-commit discipline is holding.

### Test quality gaps

The following remain from the code quality sweep (P2/P3, tracked in ISSUES.md):

- **CQS-21:** No render tests for `ErrorBoundary`, `Header`, `MockChatBox`, `PreferencesWizard` (container). No test files for `Footer`, `GoogleIcon`, `VibeLensBar`. These are `content.test.ts` pattern gaps -- source-text assertions substitute for render tests. This is **below Doppelscript quality bar**: Doppelscript has render tests for all non-trivial components.
- **ENG-07:** Chat endpoint still has no integration test. SSE flow, 409 lock conflict, token budget check have no integration-level coverage below E2E.
- Mock-call-only assertions in repository unit tests have been replaced by real integration tests (CQS-01 fix). However, some unit tests for service-layer code (`metrics.service.test.ts`, `serpapi.service.test.ts`) still use tautological mock-call patterns (CQS P2, tracked in ISSUES.md).

---

## Dependencies and Supply Chain

- `pnpm audit --prod --audit-level high` is in CI. No high CVEs detected.
- `pnpm.overrides` pins `path-to-regexp`, `lodash`, and `brace-expansion` to patched versions.
- No Dependabot or Renovate configured (ENG-06 open). The clean audit result will decay over time without automated updates.
- Notable: `zod ^4.3.6` is in use. Zod v4 is a relatively recent major version; verify any breaking changes from the schema patterns in use.
- `@anthropic-ai/sdk ^0.81.0` is current relative to the August 2025 knowledge cutoff.

---

## Deployment and Infrastructure

### What improved

- **B14 fixed:** `POST /trips/:id/selections` backend route wires tile confirmations to persistence. Core booking loop is now functional.
- **E2E migrate script was corrected** (commit `f890a45`): `e2e-real-apis.yml` called `run migrate` which did not exist; corrected to `run migrate:up`. Subsequently the nightly workflow was removed entirely (`daa4ab6`).

### Remaining concerns

**ENG-08 (P2): Dockerfile still runs as root.** Neither the base nor production stage sets `USER node`. The `node:22-slim` base image has a `node` user available. This remains open since the 2026-04-09 audit.

**Build script does not clean `dist/` before `tsc`.** `server/package.json` build script: `tsc && tsc-alias ...`. No `rm -rf dist` prefix. A source file that is deleted will leave its compiled output in `dist/` until the directory is manually cleaned. In the Docker build (which runs `tsc` fresh from the copied source), this is mitigated because `COPY server/ server/` does not include a pre-existing `dist/`. The risk is a developer `npm run build` locally producing a dirty `dist/` that they then compare to production behavior. Medium risk, easy fix.

**`projects/voyager` has infrastructure changes not in `production/voyager`.** `projects/voyager` adds `Dockerfile.web` for a Railway-hosted frontend and changes the `corsConfig.ts` default from `:5173` to `:3000`. `production/voyager` still deploys the frontend to Vercel per its `CLAUDE.md`. Which deployment is active in production is unclear. See Workspace Hygiene.

**Post-deploy check `sleep 90` approach.** The `post-deploy.yml` waits 90 seconds unconditionally before health checking. A slow Railway deploy returns a health check against the old container. This is the same concern from the 2026-04-09 audit; it is low-priority for a portfolio project.

---

## Runbook-vs-Code Drift Scan

`docs/runbooks/` does not exist. The project's `CLAUDE.md` serves as the operational runbook. Comparing it against code:

**P1 drift found: `CLAUDE.md` says frontend deploys to Vercel, but `projects/voyager` has migrated to Railway.**

- `CLAUDE.md` line 20: "Frontend: Next.js 15 on Vercel"
- `CLAUDE.md` line 38-47: Vercel deploy instructions with `cd web-client && npx vercel --prod`
- `CLAUDE.md` line 47: "Do NOT set `outputFileTracingRoot` in `next.config.ts` (causes Vercel path doubling error)"
- `projects/voyager` commit `f972018`: "Migrate frontend from Vercel to Railway" -- adds `Dockerfile.web`, sets `outputFileTracingRoot` (explicitly contradicting the CLAUDE.md warning), changes the default CORS origin.

**Direction of contradiction:** `projects/voyager` code is newer than `CLAUDE.md` instructions. If `production/voyager` is the authoritative canonical repo and the Vercel deploy is still active, then `projects/voyager` represents an unmerged experimental branch (severe workspace hygiene). If `projects/voyager` represents the current deploy intent, then `CLAUDE.md`, `railway.toml`, and `production/voyager` are all stale.

**This is a P1 finding** because a developer following `CLAUDE.md` would deploy to Vercel, which may conflict with or shadow a Railway-hosted frontend if both are active.

**Other drift checks (no drift found):**

- `CLAUDE.md` says `CORS_ORIGIN` is comma-separated. `corsConfig.ts` splits on comma. Aligned in `production/voyager`.
- `CLAUDE.md` says Railway runs from monorepo root with `Dockerfile.server`. `railway.toml` confirms this. Aligned.
- `CLAUDE.md` says `Do NOT set outputFileTracingRoot`. `web-client/next.config.ts` in `production/voyager` does not set it. Aligned locally. Contradicted in `projects/voyager`.

---

## Workspace Hygiene

**Duplicate workspace found:**

`/Users/iangreenough/Desktop/code/personal/projects/voyager` is a second full git working tree pointing to the same remote (`git@github.com:nullvoidundefined/voyager.git`). It is 2 commits ahead of the last shared ancestor with `production/voyager` and has local modifications to 9 files. The diverged commits represent a frontend hosting migration (Vercel to Railway) that has not been merged into `production/voyager`.

Consequences:

- Lefthook hooks are configured in `production/voyager` but `projects/voyager` reports `no hooksPath` from `git config core.hooksPath`. Commits from `projects/voyager` bypass lefthook entirely.
- `projects/voyager` has modified convention files (`.claude/bottomlessmargaritas/*.md`) and deleted one (`CLAUDE-SPEC-TO-BUILD.md`) that are not reflected in `production/voyager`.
- The two repos cannot both be current. One is stale. The deploy target question (Vercel vs Railway for the frontend) depends on which copy is authoritative.

**Action required (not destructive):** Produce a cleanup plan. The minimum steps are: (1) identify which repo is authoritative and which is experimental, (2) merge or abandon the diverged commits, (3) remove or archive the non-canonical copy, (4) verify lefthook install in whichever copy survives.

**No other duplicates found.** The git worktree at `production/voyager/.claude/worktrees/investigate-llm-orchestration` is a proper worktree within the canonical repo, not a duplicate.

---

## Tech Debt Register

| ID         | Description                                                                 | Severity | Effort | Risk                                                 |
| ---------- | --------------------------------------------------------------------------- | -------- | ------ | ---------------------------------------------------- |
| ENG-NEW-01 | Web-client tests not run in CI                                              | P1       | S      | Regressions ship with green badge                    |
| ENG-NEW-02 | CORS integration test fails locally (env mismatch)                          | P1       | S      | Developers cannot run integration suite locally      |
| ENG-NEW-03 | Workspace divergence: `projects/voyager` 2 commits ahead with infra changes | P1       | M      | Unclear which deploy is authoritative                |
| ENG-NEW-04 | `rateLimiter.ts` private Redis client not migrated to shared singleton      | P2       | S      | 2 Redis connections in production instead of 1       |
| ENG-NEW-05 | `tsc --noEmit` on web-client fails due to ES2017/ES2018 regex flag          | P2       | S      | TypeScript checking is silent on the client          |
| ENG-05     | No Sentry / error tracking                                                  | P2       | M      | Incidents diagnosed by log grep only                 |
| ENG-07     | Chat endpoint has no integration test                                       | P2       | M      | Critical path untested below E2E                     |
| ENG-08     | Dockerfile runs as root                                                     | P2       | S      | Container compromise escalates to full host access   |
| ENG-09     | Smoke test not wired to CI                                                  | P2       | S      | Boot-time errors not caught without full E2E         |
| SEC-14     | `select_*` schemas bypass location allowlist                                | P2       | M      | Injection surface on selection inputs                |
| SEC-15     | `updateTrip` body not Zod-parsed                                            | P2       | S      | Type coercion and validation gap at handler boundary |
| CQS-17     | `app.ts` `query()` fires at module load                                     | P2       | M      | Affects test isolation; swallows DB errors silently  |
| Build      | `dist/` not cleaned before `tsc` in build script                            | P2       | S      | Stale files in Docker image from deleted sources     |

---

## Prioritized Recommendations

| #   | Recommendation                                                                                                                                                                                          | Severity | Impact | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------ |
| 1   | Add `pnpm --filter voyager-web run test` step to `ci.yml` unit-tests job. One line change.                                                                                                              | P1       | H      | S      |
| 2   | Fix `cors.integration.test.ts`: set `process.env.CORS_ORIGIN = 'http://localhost:5173'` in the test file before `app` is imported, or update the test to use `:3000` to match the actual local default. | P1       | H      | S      |
| 3   | Resolve workspace divergence: decide whether `projects/voyager` Vercel-to-Railway migration is the intended direction, merge or abandon it, and remove the non-canonical copy.                          | P1       | H      | M      |
| 4   | Upgrade `web-client/tsconfig.json` `"target"` from `"ES2017"` to `"ES2018"` (or higher). Verify no downstream break. One character change; run `tsc --noEmit` to confirm green.                         | P2       | M      | S      |
| 5   | Migrate `rateLimiter.ts` to use `getRedis()` from `redis.service.ts` with the `enableOfflineQueue: true` option passed explicitly. Eliminates the second Redis client.                                  | P2       | M      | S      |
| 6   | Add `rm -rf server/dist &&` before `tsc` in `server/package.json` build script.                                                                                                                         | P2       | M      | S      |
| 7   | Add `USER node` to `Dockerfile.server` production stage (ENG-08). One line.                                                                                                                             | P2       | M      | S      |
| 8   | Add Zod validation to `updateTrip` handler body (SEC-15). `updateTripSchema.partial().safeParse(req.body)`.                                                                                             | P2       | M      | S      |
| 9   | Remove or conditionally register the `/:id/test-selections` E2E seam route in `routes/trips.ts` (not visible in production).                                                                            | P2       | L      | S      |
| 10  | Add `pnpm test:smoke` as a CI step in `ci.yml` after the build step (ENG-09). The script already exists.                                                                                                | P2       | M      | S      |

---

## Appendix: Resolved Findings (since 2026-04-09)

The following findings from the 2026-04-09 audit and 2026-05-27 code quality sweep were fixed and are confirmed resolved:

- **B14 (P1):** Tile selections persist to trip record. `POST /trips/:id/selections` route wired. Tests cover ownership, type validation, Zod parsing.
- **CQS-01 (P1):** Repository integration tests use real Postgres. All 5 repositories covered.
- **CQS-03 (P1):** `updateBookingState` double-cast removed. Type-safe.
- **CQS-04 (P1):** `req.user!` assertions replaced with `getAuthUser(req)`.
- **CQS-05 (P1):** `Message.role` cast removed.
- **CQS-06 (P1):** Three Redis clients consolidated to shared singleton (except `rateLimiter.ts`).
- **CQS-07 (P1):** Stale `DEFAULT_MAX_ITERATIONS = 15` assertion in agent.service.test.ts corrected to 8.
- **CQS-08 (P1):** Tile inline styles extracted to shared SCSS module.
- **CQS-02 (P1):** `createTripSchema` validation tests added.
- **B12 (P1):** Budget coercion fixed. `toNum` helper applied to all four reducers.
- **B7, B8 (P1):** Flight and hotel tools fail soft on all SerpApi errors.
- **SSE timeout (P2):** `res.setTimeout(0)` added to chat handler. No more spurious 408s.
- **SSE JSON.parse (P1):** Wrapped in try/catch.
- **`userPreferences` concurrent write race (P1):** Atomic JSONB merge via `ON CONFLICT`.
- **`updateTrip` column injection (P0):** `UPDATE_TRIP_ALLOWED_COLUMNS` allowlist enforces safe column names.
- **E2E nightly script name bug (P2):** Corrected then workflow removed.
- **E2E CORS_ORIGIN default (P1):** Set explicitly in `playwright.config.ts` and `e2e.yml`.
- **Account page "7 of 6 categories" (P1):** Replaced with `PREFERENCE_CATEGORIES.length`.
- **Login "Forgot password" dead link (P1):** Replaced with button + toast.
- **`AgentOrchestrator` `max_tokens` fallback (P1):** Breaks loop gracefully.
- **ChatBox.invariants.test.tsx TS2322 (P1):** Fixture corrected to use `id` field matching `Flight` interface.
- **`PreferencesWizard.handleNext` unhandled rejection (P1):** Wrapped in try/catch with `saveError` state.
- **ENG-17 comment drift:** Stale `test.fixme` comment context in `chat-booking-flow.spec.ts` header is accurate: US-19 and US-23 comments are still present noting they need multi-turn interaction. Not a regression.
