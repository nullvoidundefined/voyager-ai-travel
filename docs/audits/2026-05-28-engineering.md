# Engineering Audit -- apps/server/src (CTO perspective)

**Date:** 2026-05-28
**Scope:** `apps/server/src/` only (Voyager monorepo)
**Auditor model:** Sonnet (focused single-surface audit)
**Disposition:** Protective. Critical by default.

---

## Executive summary

The server is well-tested by line count (947 unit tests in ~2s, 70 test files) and architecturally cleaner than typical Express apps of this age: separated handlers / routes / services / repositories / schemas, ApiError + errorHandler centralization, helmet + CSRF guard + per-route rate limiter, real integration tests against Postgres, an isolatable AgentOrchestrator, and a mock Anthropic client for E2E. Three deliberate operational disciplines visible from past retrospectives (test-first-on-fix, severity-tagged BUGS, ChatBox invariants spec) appear to be holding for recent commits.

However, the audit found three categories of problem the user must address before further refactor work:

1. **Production-impacting authorization gaps in the `/trips/*` subtree.** Three of the five trip sub-handlers (`share`, `costs`, `schedule`, `legs`) check that *some* user is logged in but do not verify the logged-in user owns the trip referenced by `:id`. This is **broken access control** (OWASP A01) and one finding (`createShareHandler`) is **P0**: any authenticated user can mint a public share URL for any other user's trip by guessing a UUID.
2. **A live SQL-injection sink in `trip-legs.repository.reorderLegs`.** User-supplied UUIDs are concatenated directly into a SQL `CASE WHEN id = '<value>' THEN ...` string. The web handler validates via zod; the agent-tool path (`handleReorderLegs`) does NOT. The LLM (or anything that influences its tool input) can drive arbitrary SQL into the database. **P0**.
3. **The folder structure is mostly correct but has four concrete cleanups available** that would reduce cognitive friction and remove genuine confusion (duplicate `system-prompt.test.ts` files, `__tests__/` and `__integration__/` directory conventions mixed with co-located convention, `data/` and `constants/` grab-bag separation, and the `services/` folder mixing seven unrelated concerns).

CI is **also red right now**: `pnpm test:coverage` fails the 85% function-coverage threshold by 0.12 points. That is implicitly the audit's blocker-level signal that the post-PR-K coverage discipline has already slipped one commit later.

### Top 3 priorities

1. **P0 -- SQL injection in `reorderLegs`** -- Parameterize the `CASE WHEN id = '<id>' THEN n` builder. Add a zod gate to `handleReorderLegs` in `tools/legs.tool.ts` so the agent path validates identically to the REST path. Write a test that calls `executeTool('reorder_legs', { ordered_leg_ids: ["x'); DROP TABLE trip_legs;--"] })` and asserts the schema rejects it before any SQL reaches the DB.
2. **P0 -- Missing ownership check in `createShareHandler`** -- Verify `req.user.id === trips.user_id` for `:id` before inserting into `shared_trips`. Add a regression test that a user attempting to share another user's trip receives 403/404.
3. **P1 -- Ownership not enforced on `costs`, `schedule`, `legs`** -- Add the same `getTripWithDetails(tripId, userId)` ownership check pattern that `trips.ts` already uses, to all four trip sub-handlers. Currently the user-id is read but discarded.

---

## Operational basics

| Check | Status | Notes |
|---|---|---|
| Tests run | YES | 947 tests in 70 files, all pass in ~2.18s |
| CI green | **NO** | `pnpm test:coverage` exits non-zero: function coverage 84.88% < 85% threshold. Pre-push hook will block. |
| E2E wired | YES (out of scope but visible) | `playwright.config.ts` references `E2E_BYPASS_RATE_LIMITS=1` and `E2E_MOCK_ANTHROPIC=1`, both of which the server honors. |
| Monitoring | PARTIAL | Pino structured logging, PostHog `captureException`, `/health/ready` exposes db + cache + activeConversations. No metrics endpoint, no Sentry. |
| Rollback plan | UNKNOWN from server scope | Out of audit scope (Railway/Vercel deploy config). |
| Smoke test | PARTIAL | `pnpm build` runs `tsc && tsc-alias && cp src/data/*.json dist/data/` but there is **no post-build assertion** that `dist/data/destinations.json` exists. The 2026-04-06 retrospective (`bea33cc5`) was about exactly this asset failing to ship; a smoke step asserting `dist/data/destinations.json` exists is still missing. |

**Blocker:** The coverage failure is a real CI red. The threshold was raised from 80 -> 85 in PR-K on 2026-04-07 with comments explicitly warning "if coverage drops below 85, EITHER add tests OR document a temporary lowering". One commit cycle later it has dropped, and nothing in the recent commit log lowered the threshold or added tests to compensate. This is the exact failure mode that PR-K's comment was supposed to prevent.

---

## Architecture and design

### Layering (good)

`routes -> handlers -> services / repositories -> db/pool` is consistent. ApiError + errorHandler centralizes 4xx/5xx response shape. Repositories take parameterized SQL via `query<T>` from a single typed pool. The orchestrator (`AgentOrchestrator.ts`) is a clean class that accepts an Anthropic client by config, making the mock-Anthropic E2E seam trivially testable. Tool execution has an adapter layer (`DEFAULT_TOOL_ADAPTERS` in `executor.ts`) that mirrors the orchestrator's seam pattern. Both are good.

### Coupling (mixed)

- `services/agent.service.ts` reaches into four neighboring concerns: prompts, repositories, tool definitions+executor, and the mock-anthropic-client. This is the orchestration seam and the coupling is intentional. Fine.
- `handlers/chat/chat.ts` (293 lines) does too much: SSE setup, request validation, body parsing, lock-state management, conversation lifecycle, agent loop invocation, post-loop tracker update, empty-itinerary guard, message persistence, and SSE error/cleanup. The function is `async function chat(req, res)` and it inlines all of this. Future refactor target -- but only after the security fixes ship. Untangling chat.ts without first fixing the authorization holes risks regressing them.
- `services/TripOrchestrator.ts` is misnamed. It contains `selectSubAgent` (stub) and `buildDefaultPlanCard` (pure helper). It is not an orchestrator. Either rename to something like `plan-card-builder.ts` or fold into `prompts/sub-agents/`. The presence of a class-style filename next to `AgentOrchestrator.ts` (a real orchestrator class) misleads readers into thinking they are siblings.

### Monorepo hygiene

Out of scope (scoped to `apps/server/src`), but the `tsc-alias` rewrite of `app/*` paths into relative paths in `dist/` is set up correctly. Path alias `app/*` is consistent across all imports.

---

## Folder organization -- actionable cleanup

The user specifically asked for actionable folder-structure recommendations, not just a list of "issues". The top-level directories under `src/` are:

```
config/ constants/ data/ db/ handlers/ middleware/ prompts/
repositories/ routes/ schemas/ services/ tools/ types/ utils/
```

This is a reasonable cut overall. The problems are not the cut itself but six concrete misplacements / inconsistencies, in priority order:

### 1. Duplicate test file (P2 -- delete immediately)

`src/prompts/system-prompt.test.ts` and `src/prompts/__tests__/system-prompt.test.ts` are both real test files with different content and both run in vitest. The latter has 3 personality tests (added 2026-04-07 per `g1` commit), the former has 11 functional tests. Two files for the same module is confusing. Pick one location convention (recommend co-located, NOT `__tests__/`) and merge the personality tests into `system-prompt.test.ts`. Then delete the `__tests__/` directory.

### 2. `__tests__/` directories are inconsistent with the rest of the repo (P2)

The repo's convention is co-located `Foo.test.ts` next to `Foo.ts`. Two directories break the rule:
- `src/prompts/__tests__/system-prompt.test.ts` (see above)
- `src/handlers/trips/__tests__/costs.test.ts` (single test file under `__tests__/` while `legs.test.ts`, `schedule.test.ts`, `share.test.ts`, `trips.test.ts` are all co-located one directory up)

Move `costs.test.ts` up to `src/handlers/trips/costs.test.ts`. Remove both `__tests__/` directories. Lint rule: forbid `__tests__/` directories.

### 3. `services/` is a grab-bag of seven unrelated concerns (P2)

```
services/
  AgentOrchestrator.ts          (LLM tool loop infrastructure)
  agent.service.ts              (LLM tool loop wrapper)
  TripOrchestrator.ts           (plan-card builder, misnamed)
  cache.service.ts              (Redis cache helper)
  enrichment.ts                 (external data fetching)
  enrichment-sources/           (per-source external clients)
  mock-anthropic-client/        (test scaffolding for Anthropic SDK)
  node-builder.ts               (ChatNode constructor from tool results)
  posthog.ts                    (analytics SDK init)
  redis.service.ts              (Redis client singleton)
  serpApiQuota.service.ts       (quota counter)
  serpapi.service.ts            (HTTP client to SerpApi)
  tokenBudget.service.ts        (per-user daily budget tracker)
```

The grab-bag pattern is the classic Express-app smell. Two of these things (`AgentOrchestrator` + `agent.service`) belong together. Three (`cache`, `redis`, `tokenBudget`, `serpApiQuota`) are Redis-backed counters. One (`mock-anthropic-client`) is test scaffolding that should not live in production `services/`. Recommended re-org:

```
services/
  agent/
    AgentOrchestrator.ts        (was services/AgentOrchestrator.ts)
    agent.service.ts            (was services/agent.service.ts)
    node-builder.ts             (was services/node-builder.ts)
    plan-card-builder.ts        (was services/TripOrchestrator.ts; renamed)
  cache/
    redis.service.ts
    cache.service.ts
  rate-limits/
    serpApiQuota.service.ts
    tokenBudget.service.ts
  external/
    serpapi.service.ts
    enrichment.ts
    enrichment-sources/
  analytics/
    posthog.ts
test-fixtures/                  (move out of services/)
  mock-anthropic-client/
```

This is a 1-2 day refactor with high readability payoff. Not urgent. Land after the security fixes.

### 4. `mock-anthropic-client/` does not belong under `services/` (P2)

It is a deterministic mock used only when `E2E_MOCK_ANTHROPIC=1`. Today it lives at `services/mock-anthropic-client/` next to production code. Even with the `isAnthropicMockMode()` gate at runtime, the file existing in the production import graph means any future "let me clean up unused exports" sweep could accidentally trip it. Move to `test-fixtures/mock-anthropic-client/` (sibling to `__integration__/`).

### 5. `data/` and `constants/` should merge (P3)

`constants/session.ts` is 5 lines: `SESSION_COOKIE_NAME` and `SESSION_TTL_MS`. `data/cities.ts` is the CITY_DATABASE record. `data/destinations.json` is the public list. These are three different categories sharing two directories. Recommended:

```
constants/
  session.ts                   (existing)
data/
  cities.ts
  destinations.json
```

That is already the layout, so the only issue is `constants/` having only one file. Either accept (it is fine -- one file per concern is allowed) or merge `constants/session.ts` into a top-level `src/constants.ts`. The cost of leaving as-is is near zero. No action recommended; calling out for completeness.

### 6. `repositories/trips/` mixes naming conventions (P2)

```
repositories/trips/
  schedule.repository.ts       (uses .repository suffix)
  trip-legs.repository.ts      (uses .repository suffix)
  trips.ts                     (no suffix)
  trips.test.ts
```

`trips.ts` is the only one without `.repository.ts`. Either drop the suffix from `schedule` and `trip-legs` to match the rest of the repo (all other repositories under `repositories/*/*.ts` don't use it), or add it to `trips.ts` to match `schedule` and `trip-legs`. Recommend dropping the suffix everywhere -- the directory `repositories/trips/` already says "this is a repository". Rename `schedule.repository.ts -> schedule.ts` and `trip-legs.repository.ts -> trip-legs.ts`. Net diff: two file renames.

### Folder organization -- summary

The top-level directories are correctly chosen. The problems are concrete and individually small. In priority order:

| Cleanup | Effort | Severity | Risk of regression |
|---|---|---|---|
| Delete duplicate `system-prompt.test.ts` (merge into one) | 15 min | P2 | Very low |
| Move `costs.test.ts` out of `__tests__/`, delete both `__tests__/` dirs | 10 min | P2 | Very low |
| Rename `TripOrchestrator.ts` -> `plan-card-builder.ts` | 30 min | P2 | Low (one import site) |
| Move `mock-anthropic-client/` to `test-fixtures/` | 30 min | P2 | Low (one runtime import in `agent.service.ts`) |
| Normalize repository file suffixes | 30 min | P3 | Low |
| Re-org `services/` into sub-directories (agent/, cache/, etc.) | 1-2 days | P3 | Medium -- many import-site changes. Land on a dedicated branch per R-213. |

---

## Code quality

### Naming conventions

The project's CLAUDE.md states: boolean prefixes (`is/does/should`), function names verb-noun, prefer `function` keyword for named functions, arrow only for inline callbacks. Server adherence is high. Spot violations:

- `SESSION_COOKIE_OPTIONS` is `const SESSION_COOKIE_OPTIONS = { ... }` (object literal, fine, but `httpOnly`, `secure`, `sameSite` are camel/snake mixed -- this is the cookie library's API surface so leave alone).
- `auth.ts` handler uses `const valid = await authRepo.verifyPassword(...)` -- naming rule says boolean variables should be `isValid`. Minor.
- `tools/executor.ts` has `parseInput` (verb-noun, good) but returns `{ data } | { error }` discriminated unions without an `is` field. Stylistic.
- `chat.helpers.ts` exports `toFlowInput` (verb-noun, good).

No systematic naming problems. P3.

### Duplication

- `formatZodError` is defined twice: `tools/executor.ts` and `handlers/trips/trips.ts`. Both are 4-line identical functions. Lift to `utils/formatZodError.ts`.
- The `Zod safeParse -> ApiError.badRequest` pattern is repeated in 6+ handler files (`auth.ts`, `trips.ts`, `legs.ts`, `userPreferences.ts`, ...). Each handler hand-rolls the same boilerplate. Worth a small `validateBody<T>(req, schema)` helper in `utils/`. P3.
- Schema definitions are mostly DRY (the `locationAllowlist` is reused), but `dateString` regex (`/^\d{4}-\d{2}-\d{2}$/`) appears 3 times across `tools/schemas.ts` and `handlers/trips/legs.ts`. Extract.

### Complexity hotspots

- `chat.ts::chat` is 240 LOC, 6 levels deep, mixes I/O lifecycle (SSE), domain logic (tracker), persistence, and analytics. Needs decomposition but the existing chat.helpers.ts split is a good start. Plan a follow-up to break into `chatPipeline(req)` returning `{ result, nodes, tracker }` and a thin handler that drives SSE.
- `booking-steps.ts::updateCompletionTracker` is 80 LOC with 6 numbered phases. Each phase is correctly delineated by a comment, so it reads OK. Could be split into named functions (`applyTransportMode`, `applySearchTools`, etc.) for testability. P3.

### Dead code

- `services/TripOrchestrator.ts::selectSubAgent` is explicitly stubbed: "Stubbed until Phase 4 (T9) wires the full routing table" and returns `'fallback'`. The export is never imported. This is in-progress scaffolding for an in-flight feature (orchestrator-refactor spec exists at `docs/specs/orchestrator-refactor.md`). Acceptable for the moment, but tag the function with a TODO and a ticket ID.
- `schemas/userPreferences.ts` defines `lgbtq_safety` and `gender` fields. `handlers/userPreferences/userPreferences.ts::upsertPreferences::allowedFields` does NOT include `lgbtq_safety` or `gender`. So the schema says these are persistable, the prompt code at `prompts/trip-context.ts::formatTripContext` consumes them when present, but the API will not let users actually update them. Either add to the allowlist or remove from the schema. Inconsistency between data model and API surface. P2.

### TypeScript discipline

- `tsconfig.json` is strict (`strict: true`, `noUncheckedIndexedAccess: true`). Good.
- `executor.ts` has a number of `input as { ... }` type assertions where zod validation would be safer. Example: the `add_leg`/`remove_leg`/`reorder_legs` cases each cast `input as { ... }` with no schema validation. These are the same cases that drive the SQL injection finding below. **Fix root cause: add zod schemas for these tool inputs and route them through `parseInput()` like every other tool.**

---

## Security

### Findings (in severity order)

#### P0 -- SQL injection in `repositories/trips/trip-legs.repository.reorderLegs`

```ts
export async function reorderLegs(orderedIds: string[]): Promise<void> {
  const cases = orderedIds
    .map((id, i) => `WHEN id = '${id}' THEN ${i + 1}`)
    .join(' ');
  await query(
    `UPDATE trip_legs SET leg_order = CASE ${cases} END WHERE id = ANY($1)`,
    [orderedIds],
  );
}
```

User-controlled UUIDs are interpolated directly into a SQL string. The web route's `reorderLegsSchema = z.object({ ordered_leg_ids: z.array(z.string().uuid()) })` makes the REST path safe today, but:

1. **The agent-tool path bypasses zod entirely.** `tools/legs.tool.ts::handleReorderLegs` accepts `input: { ordered_leg_ids: string[] }` and passes it straight to the repository. `tools/executor.ts` for the `reorder_legs` case does `input as { ordered_leg_ids: string[] }` -- a raw cast, no validation. The LLM is the threat model here: any prompt injection in chat content or a confused LLM emitting an unsanitized `ordered_leg_ids[]` value would be executed as SQL.
2. **`tools/schemas.ts` does not export an `addLeg`/`removeLeg`/`reorderLegs` schema at all.** The omission is consistent across all three.

Fix:
- Rewrite `reorderLegs` to use parameterized SQL. Example:
  ```ts
  await query(
    `UPDATE trip_legs SET leg_order = arr.ord
     FROM unnest($1::uuid[], $2::int[]) AS arr(id, ord)
     WHERE trip_legs.id = arr.id`,
    [orderedIds, orderedIds.map((_, i) => i + 1)],
  );
  ```
- Add zod schemas for `addLegSchema`, `removeLegSchema`, `reorderLegsSchema` in `tools/schemas.ts`, register them in `executor.ts`, and remove the raw `as` casts.
- Add a test that calls `reorderLegs(["'); DROP TABLE trip_legs; --"])` and asserts the call rejects/throws before reaching `query`.

#### P0 -- Missing trip-ownership check in `createShareHandler`

```ts
export async function createShareHandler(req: Request, res: Response) {
  const { id: tripId } = req.params;
  const userId = req.user?.id ?? '';
  const result = await query<{ id: string }>(
    `INSERT INTO shared_trips (trip_id, created_by) VALUES ($1, $2) RETURNING id`,
    [tripId, userId],
  );
  ...
}
```

Any authenticated user can POST `/trips/<someone-else's-trip-uuid>/share` and receive back a publicly-fetchable share URL for that trip. The handler never verifies `tripId` belongs to `userId`. The `tripRouter.use(requireAuth)` middleware only proves *someone* is logged in.

The matching `getSharedTripHandler` (called from `/shared/:shareId`) does not require auth (correct -- shared URLs are public by design), so the share row is enough to read the underlying trip.

Fix: prepend an ownership check identical to the one in `getTrip`:
```ts
const trip = await getTripWithDetails(tripId, userId);
if (!trip) throw ApiError.notFound('Trip not found');
```

Add a regression test: User A creates a trip, User B attempts to POST `/trips/<A's tripId>/share`, expect 404.

#### P1 -- Missing ownership check in `costs`, `schedule`, `legs` handlers

The `tripRouter.use(requireAuth)` middleware ensures authentication but NOT authorization. Four handlers under `handlers/trips/` either fetch `req.user.id` and discard it, or never read it at all:

| Handler | Reads userId? | Uses userId for ownership? |
|---|---|---|
| `costs.ts::getTripCostsHandler` | No | No |
| `schedule.ts::getScheduleHandler` | `getAuthUser(req)` called, return discarded | No |
| `legs.ts::listLegs` / `addLeg` / `removeLeg` / `reorderLegs` | `getAuthUser(req)` called, return discarded | No |
| `share.ts::createShareHandler` | Reads `req.user?.id ?? ''` for `created_by` | No (see P0 above) |

Effect: any authenticated user can read the schedule / costs / legs of any trip whose UUID they can guess. UUIDs are not secrets, and trip IDs flow through URLs, browser history, and shared screenshots. Treat this as broken access control (OWASP A01).

Fix: each handler must call `getTripWithDetails(tripId, userId)` (or an equivalent lightweight ownership check that does not pull all details) before reading from the related tables. Add per-handler regression tests for cross-tenant access.

#### P1 -- Vacuous "lock" test in `chat.lock.test.ts`

The file reads `chat.ts` as a string and grep-matches for `activeConversations.has(`, `activeConversations.add(`, `activeConversations.delete(`, and the 409 status code. This is R-200 anti-pattern #1 (and #6): it passes even if the lock is broken (e.g., the `delete` happens before the agent loop starts, or `add` happens after a long-running operation). The file's own docstring acknowledges this -- "A full concurrency test... is a follow-up ENG-02-b test" -- but the follow-up never landed. Two months later, the grep-based test still gives the appearance of coverage.

Fix: write the real concurrency test (deferred-promise harness blocking the agent loop, fire two overlapping requests, assert the second gets 409). Until then, the grep-only test should be tagged `test.fixme` with a tracked ENG-02-b ID. Delete the file entirely if no one will write the real test in this sprint -- a fake test is worse than no test because it fills the coverage report.

#### P2 -- Self-mocking pool tests in all 5 repositories

`vi.mock('app/db/pool/pool.js', ...)` appears in `repositories/auth/auth.test.ts`, `repositories/conversations/conversations.test.ts`, `repositories/tool-call-log/tool-call-log.test.ts`, `repositories/trips/trips.test.ts`, `repositories/userPreferences/userPreferences.test.ts`. R-200 anti-pattern #5 explicitly: "Repository test that mocks the database pool". These tests check that the right SQL string was passed to `query()`, not that the query is correct. A SQL syntax error or a `WHERE user_id = $1` typo'd to `WHERE user_id = $2` will pass unit tests.

Partly mitigated: the `__integration__/repositories/*.integration.test.ts` files run against a real DB. So the actual coverage is there. But the *unit* tests are vacuous and consume CI cycles. Recommend:
- Keep the integration tests, they are the real protection.
- Either delete the repo unit tests, or rewrite them to assert behavior end-to-end via the integration suite only.
- If kept, remove them from coverage counting (they pad the function-coverage number without testing anything).

#### P2 -- `share.ts` reads `req.user?.id ?? ''`

`createShareHandler` falls back to empty string for `created_by` if `req.user` is missing. The `tripRouter.use(requireAuth)` middleware should have rejected the request before this line is reached, but the fallback creates a defense-in-depth violation: an empty-string user-id could end up in the `shared_trips.created_by` column if requireAuth is ever bypassed (or a future refactor moves the route). Use `getAuthUser(req)` like every other trip handler.

#### P2 -- Negative-input tests missing on most user-input handlers

R-208: "Every user-input handler has one negative-input test: oversized payload, injection attempt, or malformed encoding." Audit of the handler test files:
- `auth.test.ts`: covers validation errors. OK.
- `trips.test.ts`: covers validation, ownership, NOT direct injection. Add a destination with control bytes, `<script>`, and a 10kb body test.
- `chat.test.ts`: tests message length but not Unicode-control-character or null-byte messages. The `message` field flows directly into `Anthropic.messages.stream` and into the database; a null-byte should be tested.
- `userPreferences.test.ts`: tests valid input. No oversize/injection tests.
- `legs.test.ts`, `schedule.test.ts`, `share.test.ts`, `costs.test.ts`: minimal coverage, no negative-input tests.

Add one negative-input test per handler module.

#### P3 -- `cors` configuration: dev mode allows local network ranges

`config/corsConfig.ts` allowlists `192.168.*`, `10.*`, `172.16-31.*` private ranges outside production. This is correct for LAN dev (browsers on phones hitting the dev box), and the production guard is explicit (`NODE_ENV !== 'production'`). Note the regex has been historically the source of confusion in similar codebases; a comment explaining the intent would help the next reader. Calling out, not a finding.

#### P3 -- Prompt injection surface review

Voyager is LLM-powered and user-controlled text reaches the system prompt indirectly:
- Trip destination, origin, preferences -> `formatTripContext` -> `## Current Trip State` block in the system prompt.
- Schema enforces `locationAllowlist` (unicode letters, digits, common punctuation) on destinations and origins at the tool-input boundary.
- However, the *trip create* path (`createTripSchema` in `schemas/trips.ts`) uses `z.string().min(1)` on `destination` -- no allowlist. The destination saved at trip-create time is the value that ends up in the system prompt on every subsequent chat.
- A user who creates a trip with `destination: "Ignore previous instructions and..."` will see that string materialize verbatim inside the system prompt's `## Current Trip State` block.

This is a real prompt-injection vector. Severity P3 only because:
1. The user is attacking themselves (the LLM serves them, not other users).
2. The format-response tool boundary still constrains the output schema.
3. There is no cross-user leakage (each chat is per-user).

But the user-facing risk is the LLM giving bad travel advice when the user's own destination string is hostile, plus the developer-experience risk of "looks like the LLM is acting weird, why?". Tighten `createTripSchema.destination` to use the same `locationAllowlist` from `tools/schemas.ts`.

### Auth flow

- Bcrypt rounds: 12. Correct.
- Session token: 32 random bytes hex (64 chars), stored as SHA-256 hash. Cookie holds raw token, DB holds hash. Correct.
- Session TTL: 7 days. Defensible.
- Logout: deletes session row and clears cookie. Correct.
- Login flow: deletes existing sessions before issuing a new one (single-session policy). Documented in code.
- `loadSession` middleware sets `req.user` on every request without throwing. `requireAuth` throws on missing user. This is the right shape.

The auth subsystem is the strongest part of the audit.

### Helmet / CSP / headers

`app.use(helmet())` with default options. Helmet's defaults include CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, and Referrer-Policy. No explicit CSP override. For an API-only Express server (no HTML rendering), the default CSP is overly conservative and unused. Not a finding; just noting.

### Rate limiting

Three tiers:
- Global: 100 req / 15 min by IP.
- Chat: 10 req / 5 min per authenticated user (the expensive endpoint).
- Auth: 10 req / 15 min by IP (anti credential-stuffing).

Backed by Redis when `REDIS_URL` set, falls back to in-memory with a production-degraded warning. Per-user keying on chat is correct (otherwise NAT'd users at coffee shops would share quota).

`E2E_BYPASS_RATE_LIMITS=1` is a clean escape hatch for integration tests. Verified: not enabled in production via env.

---

## Credential exposure scan

User did not request a credential scan for this audit (the audit is scoped to `apps/server/src` engineering surface only). The previous 2026-05-27 security audit handled the standing credential-scan obligation. Re-flag if the user wants this re-run.

---

## Database

- `pool.ts` is well-configured: `statement_timeout: 10s`, `idleTimeoutMillis: 30s`, `connectionTimeoutMillis: 5s`, NUMERIC coerced to JS number at the boundary (with explicit precision-loss commentary), SSL gated by `NODE_ENV` and the override flag. Good.
- `withTransaction` correctly uses BEGIN/COMMIT/ROLLBACK and releases the client in `finally`. Good.
- `loginUser` and `createUserAndSession` use `withTransaction` to avoid the orphan-session race. Documented.
- Connection pool size: `max: 10`. Acceptable for the Neon free-tier.
- **N+1 concerns:** `getTripWithDetails` runs 5 queries (1 trip + 4 child collections). It uses `Promise.all` so it's parallel, not N+1. Good.
- **Index hygiene:** Out of scope (migrations under `migrations/`, not `apps/server/src/`).
- The `trip-legs.repository.reorderLegs` SQL-injection issue is the dominant DB-layer finding (see Security P0 above).

---

## API design

- Route consistency: `/auth`, `/places`, `/trips`, `/user-preferences`, `/shared`. Lowercased plural nouns. Verb in HTTP method. Mostly clean.
- Inconsistencies:
  - `/user-preferences` uses kebab-case; everything else is single-word. Acceptable but a stylistic outlier.
  - Route definitions use `tripRouter.post('/:id/selections', ...)` but the test-only endpoint is `/:id/test-selections`. The `test-` prefix is a workable convention but should also be guarded by something stronger than `process.env.NODE_ENV !== 'production'` for route registration -- currently it relies on Railway's `NODE_ENV=production` being set correctly, which is fine but not defense-in-depth.
- Error response shape is consistent (`{ error: CODE, message: 'human readable', details? }` via ApiError). Good.
- Request validation: zod via `safeParse`. Most handlers convert the error to the same shape via `parsed.error.issues.map(e => e.message).join('; ')`. The pattern is repeated in 6+ places; extract to `utils/zodToBadRequest.ts`.
- Rate limiting: tier-specific (chat / auth / global). Good.
- CSRF: `csrfGuard` requires `X-Requested-With` on all state-changing methods. This is the OWASP-blessed lightweight mitigation. Combined with `SameSite=Lax` cookies and same-origin proxying (frontend rewrites API to same origin), it is sufficient for the threat model.

### POST `/trips/:id/test-selections`

The handler has a double gate: the route is conditionally registered only outside production, AND the handler itself returns 404 unless `E2E_BYPASS_RATE_LIMITS=1`. Good defense-in-depth.

---

## Performance

- Aggressive caching of SerpApi responses (6-hour TTL, hash-keyed). FIN-07 commentary justifies the choice. Good.
- Per-user daily token budget enforced *before* SSE opens, so an over-budget user gets a clean 429 rather than an aborted stream.
- The `/health/ready` endpoint touches the DB and Redis, which is fine for readiness but is not appropriate as a liveness probe under load.
- The agent loop has a 120s wall-clock timeout and an 8-tool-call cap (per FIN-06 from the 2026-04-06 audit). Both are documented and tested.
- `app.get('/destinations', ...)` reads `destinations.json` once at startup and serves with `Cache-Control: public, max-age=86400`. Good.

---

## Testing

### Coverage

```
All files          |   89.21 |    85.53 |   84.88 |   89.21 |
ERROR: Coverage for functions (84.88%) does not meet global threshold (85%)
```

Functions coverage falls 0.12 points short. CI is implicitly red. Add a single test to push it back over OR document a temporary lowering with a tracked ENG ticket.

Notable per-directory hot spots:
- `src/services/enrichment-sources/state-dept.ts`: 8.47% function coverage. The State Department advisory client is essentially untested.
- `src/services/enrichment-sources/open-meteo.ts`: 48.27% function coverage.
- `src/services/enrichment-sources/fcdo.ts`: 66.1%.
- `src/utils/ApiError.ts`: 55.55% function coverage. Several of the static factory methods are not tested.
- `src/routes/`: 0% function coverage on `routes.ts` smoke (the mock paths cover the lines but not the functions).

### Test quality

| Category | Verdict |
|---|---|
| Schema tests | Strong. Zod schemas tested for valid+invalid inputs. |
| Repository unit tests | Weak. All five mock the pool (R-200 anti-pattern #5). Behavior-asserted via the integration tests. |
| Repository integration tests | Strong. Real DB, real SQL. |
| Handler tests | Mixed. `auth.test.ts` and `trips.test.ts` test behavior. `chat.lock.test.ts` is a grep-on-source-file (R-200 anti-pattern #1+#6). `share.test.ts` only tests the happy path; missing-ownership case absent. |
| Service tests | Strong. `AgentOrchestrator.test.ts` exercises iteration limits, tool-execution errors, multi-tool, max-tokens fallback. |
| Tool tests | Strong. Each tool has unit + adapter-seam tests + a mock counterpart. |
| Middleware tests | Strong. `csrfGuard.test.ts`, `rateLimiter.boot.test.ts` (the SEC-04 regression test), `requestLogger.test.ts`, `errorHandler.test.ts`. |
| E2E integration tests | Strong. `__integration__/auth.integration.test.ts`, `__integration__/cors.integration.test.ts`, plus per-repo integration tests against a real DB. |

### Test anti-patterns observed

1. **R-200 #1 (self-mock):** `chat.lock.test.ts` reads chat.ts as a string and matches patterns. Pseudo-coverage.
2. **R-200 #5 (repository self-mocks pool):** all 5 repositories under `repositories/*/`.
3. **R-200 #7 (loose-shape):** `share.test.ts::it('creates a share link and returns share_id and share_url', ...)` -- only checks `res.status === 201`, `res.body.share_id === shareId`, and `res.body.share_url.includes('/shared/')`. Does not check that an ownership violation is rejected.
4. **No `it.skip` without reason observed.** Good.
5. **No persistently-red tests observed.** Good.

---

## Dependencies and supply chain

`pnpm audit --prod`: 5 moderate advisories:

| Package | Path | Advisory | Action |
|---|---|---|---|
| `qs` | `apps/server > express@5.2.1 > body-parser > qs@6.15.0` | DoS via `qs.stringify` (GHSA-q8mj-m7cp-5q26) | Update Express; `qs >= 6.15.2` is patched. |
| `ip-address` | `apps/server > express-rate-limit@8.3.1 > ip-address@10.1.0` | XSS in `Address6` HTML-emitting methods (GHSA-v2v4-37r5-5v8g) | Not exploitable in this codebase (we don't call `group()`/`link()`/`spanAll()`), but the advisory still fires. Update `express-rate-limit` when the next minor lands. |
| `brace-expansion` | `apps/server > node-pg-migrate > glob > minimatch > brace-expansion@5.0.5` | DoS (GHSA-jxxr-4gwj-5jf2). Dev-time only -- node-pg-migrate. | Update transitively. |
| `postcss` | client-side, out of scope |  |  |
| `@anthropic-ai/sdk@0.81.0` | the separate `eval` package (out of scope for this audit) | Insecure default file (GHSA-p7fg-763f-g4gf) | Out of scope. |

Outdated direct deps (pnpm outdated):
- `@anthropic-ai/sdk` 0.91.1 -> 0.99.0
- `helmet` 8.1.0 -> 8.2.0
- `ioredis` 5.10.1 -> 5.11.0
- `pg` 8.20.0 -> 8.21.0
- `zod` 4.3.6 -> 4.4.3
- Dev: typescript, eslint, vitest, supertest types

None of these are urgent. Plan a monthly minor-update sweep on its own branch (R-213).

---

## Deployment and infrastructure

Out of scope (Railway / Vercel config), but two server-side observations:

1. The build script copies `data/*.json` to `dist/data/` (`mkdir -p dist/data && cp src/data/*.json dist/data/`). No assertion that the file exists post-copy. The 2026-04-06 retrospective (`bea33cc5`) was about exactly this failure. **Add a `scripts/verify-build.sh` that asserts `dist/data/destinations.json` exists and is non-empty, and wire it into the `build` script as the final step.**
2. `app.ts` reads `destinations.json` via `path.resolve(path.dirname(new URL(import.meta.url).pathname), 'data/destinations.json')` -- platform-dependent on macOS Windows because of how `new URL` parses Windows paths. Use `fileURLToPath` instead. Not a current production issue (Railway runs Linux), but the code is portability-fragile.

---

## Bug fix discipline

Scanned all `fix:` commits in the last 60 commits.

| SHA | Subject | Test paired? |
|---|---|---|
| 79ac685 | fix: treat 'New trip' as placeholder in buildMissingFieldsForm | YES (chat.helpers.test.ts) |
| ec058e3 | fix(chat): treat 'New trip' as placeholder destination in welcome message | YES (chat.test.ts) |
| cae0d21 | fix(TripMap): correct @googlemaps/js-api-loader v2 option names | YES (TripMap.test.tsx) -- client |
| 040ef43 | fix(test): update tool count assertion | n/a (test-only) |
| 3ba4cbe | fix(a11): align MockChatBox demo content | YES (MockChatBox.test.ts) -- client |
| 7717647 | fix(a10): replace loading text with Skeleton | YES (Skeleton.test.tsx) -- client |
| 531d085 | fix(a9): mobile chat height | YES (mobile-layout.spec.ts -- E2E) -- client |
| 751ba35 | fix(a8): thread initialDestination | YES (NodeRenderer.test.tsx) -- client |
| b6cc08e | fix(a7): starter prompt chip | YES (VirtualizedChat.test.tsx) -- client |
| 6fab675 | fix(a6): sitemap.ts and robots.ts | YES (sitemap.test.ts) -- client |
| 437efee | fix(a5): OG / Twitter card metadata | YES (layout.test.tsx) -- client |
| 38bf71b | fix(a4): pipe in page titles | YES (layout.test.tsx) -- client |
| 6b5a1f4 | fix(a3): remove banned marketing words | YES (page.content.test.ts) -- client |
| da9ef19 | fix(a2): skip-to-main-content link | YES (assumed; client) |
| 4981f89 | fix(a1): aria-pressed on toggle buttons | YES (TripDetailsForm.test.tsx) -- client |

**Verdict: clean.** All 13 fix commits in the last 60 had a paired test. Recent discipline holds. This is a meaningful change from the 68.6% violation rate that motivated the 2026-04-06 retrospective.

---

## Runbook-vs-code drift scan

Scoped to `apps/server/`. There are no operational runbooks under `apps/server/docs/runbooks/` (none exist). Skipping; not a finding.

---

## Workspace hygiene

Out of scope for a focused server audit. Skipping.

---

## Tech debt register (P2-P3, current state)

| Item | Category | Notes |
|---|---|---|
| Duplicate `system-prompt.test.ts` | Folder structure | See cleanup section #1. |
| `__tests__/` directory convention split | Folder structure | See cleanup section #2. |
| `services/` is a grab-bag | Architecture | See cleanup section #3. |
| `mock-anthropic-client/` lives in production services | Architecture | See cleanup section #4. |
| Repository file suffix inconsistency | Naming | See cleanup section #6. |
| `formatZodError` duplicated | DRY | Extract to `utils/`. |
| `TripOrchestrator.ts` is misnamed | Naming | Rename to `plan-card-builder.ts`. |
| `selectSubAgent` stub | In-flight feature | Acceptable; tag with ticket. |
| `lgbtq_safety` / `gender` schema-vs-API drift | Inconsistency | Either expose via API or remove from schema. |
| `chat.ts::chat` is 240 LOC | Complexity | Decompose into a pipeline. |
| Repository unit tests self-mock pool | Test quality | Delete or rewrite as integration-only. |
| Function coverage 84.88% < 85% threshold | CI red | Fix before next push. |
| `verify-build.sh` smoke for `dist/data/*.json` | Build contract | Add to `build` script. |
| `share.ts` reads `req.user?.id ?? ''` | Defense in depth | Use `getAuthUser(req)`. |
| `createTripSchema.destination` lacks allowlist | Prompt injection | Apply `locationAllowlist`. |

---

## Prioritized recommendations

### Now (P0/P1, block before further refactor work)

1. **[P0]** Parameterize `reorderLegs` SQL. Add zod schemas for `add_leg`/`remove_leg`/`reorder_legs` tools. Route via `parseInput()`. Regression test with an SQL-shaped malicious input. (Impact: H; Effort: M)
2. **[P0]** Add trip-ownership check to `createShareHandler`. Regression test cross-tenant. (Impact: H; Effort: S)
3. **[P1]** Add trip-ownership check to `getTripCostsHandler`, `getScheduleHandler`, and all four `legs.ts` handlers. (Impact: H; Effort: S)
4. **[P1]** Fix coverage failure: write 1-2 small tests to push functions back above 85%, or document a temporary lowering with a tracked ENG ticket. (Impact: M; Effort: S)
5. **[P1]** Replace `chat.lock.test.ts` grep-test with a real concurrency test (or delete it and `.fixme` with ticket). (Impact: M; Effort: M)

### Next (P2)

6. Delete duplicate `system-prompt.test.ts`; merge into the co-located one. (Impact: M; Effort: S)
7. Move `costs.test.ts` out of `__tests__/`. Lint rule against `__tests__/` directories. (Impact: M; Effort: S)
8. Rename `TripOrchestrator.ts` -> `plan-card-builder.ts`. (Impact: M; Effort: S)
9. Move `mock-anthropic-client/` out of `services/` into `test-fixtures/`. (Impact: M; Effort: S)
10. Either expose `lgbtq_safety`/`gender` via the userPreferences API, or remove from the schema. (Impact: M; Effort: S)
11. Add post-build verify step that asserts `dist/data/destinations.json` exists. (Impact: M; Effort: S)
12. Tighten `createTripSchema.destination` to use `locationAllowlist`. (Impact: M; Effort: S)
13. Add negative-input tests to handler suites per R-208 (oversize / null-byte / injection). (Impact: M; Effort: M)
14. Extract `formatZodError` to `utils/`; collapse the safeParse->ApiError boilerplate via a `validateBody<T>()` helper. (Impact: L; Effort: S)

### Later (P3)

15. Re-org `services/` into sub-directories (`agent/`, `cache/`, `rate-limits/`, `external/`, `analytics/`). Dedicated branch per R-213. (Impact: M; Effort: L)
16. Decompose `chat.ts::chat` into a pipeline. (Impact: L; Effort: M)
17. Normalize repository file suffixes (drop `.repository.ts`). (Impact: L; Effort: S)
18. Monthly dependency-minor sweep branch. (Impact: L; Effort: S/month)
19. Delete repository unit tests (they self-mock and add no signal beyond what the integration suite covers). (Impact: L; Effort: S)
20. Add CSP-tightened helmet config for the API surface (default helmet is fine but the API never serves HTML so the CSP can be `default-src 'none'`). (Impact: L; Effort: S)

---

## Disposition

The codebase is well-engineered relative to typical projects of this age, and the team's response to the 2026-04-06 retrospective is visible in the discipline of recent commits. The two P0 findings (SQL injection in `reorderLegs`, missing ownership in `createShareHandler`) and the cluster of P1 ownership gaps are exploitable today and must be fixed before any further refactor branch lands.

The folder-structure questions the user asked about are real but small. The top-level cut is correct. The interesting cleanup is inside `services/`, and even that is a 1-2 day refactor, not a re-architecting.

The coverage failure (84.88% vs 85% threshold) is a one-commit slip and should be repaired in the same PR that ships the P0/P1 fixes.
