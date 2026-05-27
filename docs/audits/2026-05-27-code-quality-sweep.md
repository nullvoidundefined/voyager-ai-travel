# Code Quality Sweep - 2026-05-27

## Summary

- P0: 2 findings -- 2 RESOLVED
- P1: 28 findings -- 17 RESOLVED, 8 deferred to ISSUES.md (CQS-01 through CQS-08), 3 addressed by P0 fixes
- P2: 56 findings -- deferred to ISSUES.md (CQS-09 through CQS-27)
- P3: 34 findings -- deferred to ISSUES.md (CQS-28 through CQS-30, remainder documented in sweep)

## Server

### Zone 1: config/, constants/, data/

#### [P2] `server/src/data/cities.ts:1323` (naming)

Entry keyed as `'luang'` represents Luang Prabang, Laos (IATA: LPQ). `lookupCity` lowercases and does exact key match, so "Luang Prabang" misses this entry.

#### [P2] `server/src/data/cities.ts:1658` (duplication)

`'addis'` and `'addis ababa'` are separate entries with divergent coordinates (lat 9.145 vs 9.0249, lon 40.4897 vs 38.7469) despite representing the same airport (ADD). Could produce inconsistent timezone/enrichment lookups.

#### [P3] `server/src/data/cities.ts:197-206` (duplication)

`'panama'` and `'panama city'` share identical fields. Undocumented alias duplication could silently drift.

#### [P3] `server/src/config/env.ts:1` (dead-code)

`isProduction()` wraps a single `process.env.NODE_ENV` comparison, used in two files. No additional safety from the abstraction.

### Zone 2: db/

#### [P2] `server/src/db/pool/pool.ts:11` (type-safety)

`parseFloat` on NUMERIC type parser silently returns `NaN` for non-numeric strings. A narrowing check or hard throw would surface corrupt data instead of propagating `NaN` into budget arithmetic.

#### [P2] `server/src/db/pool/pool.test.ts:16-20` (test-quality)

Test named "parses NUMERIC null sentinel into 0 only when input is non-null" does not test a null input. Misleading name; no null-input path is tested.

#### [P3] `server/src/db/pool/pool.ts:60-74` (error-handling)

In `withTransaction`, if `ROLLBACK` itself throws, that error is swallowed. No log, no wrapping. Standard but invisible.

### Zone 3: handlers/

#### [P1] `server/src/handlers/chat/chat.ts:198-199` (type-safety)

`updateBookingState(conversation.id, newTracker as unknown as Record<string, unknown>)` double-casts through `unknown`. Bypasses type safety; a mismatch silently sends wrong data to the DB.

#### [P1] `server/src/handlers/chat/chat.ts:47` (type-safety)

`req.user!.id` non-null assertion. Safe behind `requireAuth` but creates a hidden contract not enforced by the type system. Same pattern at `chat.ts:239`, `trips.ts:27/43/60/148/170/264`, `userPreferences.ts:8/14`.

#### [P1] `server/src/handlers/chat/chat.ts:250` (type-safety)

`.filter((m) => m.role !== ('tool' as string))` casts `'tool'` to `string` to suppress a type error. The cast likely hid a real type mismatch rather than fixing it.

#### [P1] `server/src/handlers/trips/trips.ts:85-87` (bug)

Date comparison `departure_date < today` compares ISO strings lexicographically. Works for `YYYY-MM-DD` but breaks if dates arrive as datetime strings or with different separators. Same issue at line 93.

#### [P2] `server/src/handlers/chat/chat.lock.test.ts:39-50` (test-quality)

Tests assert string patterns exist in source code (regex on source text), not behavioral assertions. Would pass even if the lock was broken.

#### [P2] `server/src/handlers/chat/chat.ts:113-122` (error-handling)

SSE error event writes `'Agent encountered an error'` with no actionable detail to the client. Consider including a client-safe error type code.

#### [P2] `server/src/handlers/auth/auth.ts` vs `trips.ts` (consistency)

Auth uses inline `res.status(400).json(...)` for validation failures. Trips uses `throw ApiError.badRequest(...)`. Inconsistent but functionally equivalent.

#### [P2] `server/src/handlers/places/photoProxy.handler.test.ts:13-25` (test-quality)

`mockReq` returns `{ query } as any`. Using `any` in test helpers defeats type checking on the tests.

#### [P3] `server/src/handlers/userPreferences/userPreferences.ts:15` (type-safety)

`req.body as Record<string, unknown>` without Zod `safeParse`. Allowlist filter rejects unknown fields but values pass through unvalidated.

#### [P3] `server/src/handlers/chat/chat.ts:39` (dead-code)

`getActiveConversationCount` exported for health monitoring but no evidence it is wired into any health/metrics endpoint.

### Zone 4: middleware/

#### [P2] `server/src/middleware/rateLimiter/rateLimiter.ts:88` (type-safety)

`(client as any).call(...)` to forward Redis commands. The `as any` is documented but bypasses type safety on a security-critical path.

#### [P2] `server/src/middleware/rateLimiter/rateLimiter.ts:27-61` (dead-code)

Module-level `redisClient` singleton never closed on server shutdown. Minor resource leak.

#### [P2] `server/src/middleware/requestLogger/requestLogger.ts:9-11` (type-safety)

Ternary else branch after `randomUUID()` is unreachable since `randomUUID()` returns a string. Dead code.

#### [P2] `server/src/middleware/requireAuth/requireAuth.test.ts:80-90` (test-quality)

Test "calls next(err) when getSessionWithUser throws" relies on Express default error handler, not the app's `errorHandler`. Verifies Express fallback, not the middleware's `next(err)` propagation.

#### [P3] `server/src/middleware/requestLogger/requestLogger.test.ts:61-73` (test-quality)

Test name "serializes the response status code" does not match actual assertion (verifies request-id header presence). Misleading name.

#### [P3] `server/src/middleware/notFoundHandler/notFoundHandler.test.ts` (test-quality)

Only one test case. No coverage for HEAD/OPTIONS or routes with query parameters.

#### [P3] `server/src/middleware/csrfGuard/csrfGuard.ts:3` (naming)

`STATE_CHANGING_METHODS` at module scope but only used inside `csrfGuard`. Could be function-scoped.

### Zone 5: prompts/

#### [P2] `server/src/prompts/system-prompt.test.ts:14-18` (test-quality)

Duplicate identical assertion (`expect(result).toContain('Collecting Details')` appears twice). Copy-paste artifact.

#### [P3] `server/src/prompts/booking-steps.ts:151-153` (dead-code)

`_legacyBookingState` parameter in `getFlowPosition` is entirely unused. Underscore prefix signals intentional discard but the parameter adds noise to every call site.

### Zone 6: repositories/

#### [P0] `server/src/repositories/trips/trips.ts:103-123` (security)

`updateTrip` builds dynamic SQL SET clauses from `Object.entries(input)` and interpolates keys directly into SQL: `${key} = $${paramIndex}`. Column names have no runtime allowlist. The Zod schema is the only gate. A future caller that constructs an `UpdateTripInput` from untrusted input without Zod validation would expose SQL column injection.

#### [P1] `server/src/repositories/auth/auth.ts:107-110` (bug)

JSDoc above `deleteExpiredSessions` is copy-pasted from `createUserAndSession`. Wrong description.

#### [P1] `server/src/repositories/userPreferences/userPreferences.ts:27-44` (bug)

`upsert` performs read-then-write outside a transaction. Two concurrent requests for the same `userId` can clobber each other's merged state. Fix: use `ON CONFLICT DO UPDATE SET preferences = user_preferences.preferences || $2` for atomic JSONB merge, or wrap in a transaction with `FOR UPDATE`.

#### [P1] `server/src/repositories/auth/auth.test.ts` (test-quality)

R-200 anti-pattern #5: mocks the database pool. All assertions verify mock calls with SQL strings, not behavioral outcomes. `loginUser` and `deleteExpiredSessions` have zero test coverage.

#### [P1] `server/src/repositories/conversations/conversations.test.ts` (test-quality)

Same R-200 anti-pattern #5. `getOrCreateConversation` shape assertion is tautological. `updateBookingState` has zero test coverage.

#### [P1] `server/src/repositories/tool-call-log/tool-call-log.test.ts` (test-quality)

Same R-200 anti-pattern #5. `insertToolCallLog` assertion is tautological (asserts mock returns what it was told to return).

#### [P1] `server/src/repositories/trips/trips.test.ts` (test-quality)

Same R-200 anti-pattern #5. Only covers `clearSelectionsForTrip` and `insertTrip*`. `createTrip`, `listTrips`, `getTripWithDetails`, `updateTrip`, `deleteTrip` have zero coverage.

#### [P1] `server/src/repositories/userPreferences/userPreferences.test.ts` (test-quality)

Same R-200 anti-pattern #5. Cannot detect the concurrent-overwrite bug because it controls the mock sequence.

#### [P2] `server/src/repositories/agent-turn-cost/agent-turn-cost.ts:7-8` (naming)

Pricing constants named `SONNET_4_INPUT_USD_PER_MTOK` will silently misrepresent pricing if model is upgraded. Name should encode the model version or come from a config structure.

#### [P2] `server/src/repositories/agent-turn-cost/agent-turn-cost.test.ts:44-47` (test-quality)

Tautological: asserts `SONNET_4_INPUT_USD_PER_MTOK` equals `3` -- just checks a constant hasn't changed. The meaningful test (cost computation) is covered elsewhere.

#### [P2] `server/src/repositories/conversations/conversations.ts:78` (consistency)

`getMessagesByConversation` orders by `created_at ASC` but `Message` interface declares `sequence`. Ordering by `sequence` would be semantically safer.

#### [P2] `server/src/repositories/trips/trips.ts:126-138` (security)

`insertTripSelection` interpolates `table` and `columns` directly into SQL. All call sites hardcode values, but the function is non-private and lacks runtime validation.

#### [P2] `server/src/repositories/trips/trips.ts:59-84` (consistency)

`getTripWithDetails` issues 5 sequential queries not in a transaction. Detail rows could reflect a mid-fetch state change. Acceptable for display but undocumented.

#### [P2] `server/src/repositories/trips/trips.test.ts:33-37` (test-quality)

`clearSelectionsForTrip` test asserts only `expect(mockWithTransaction).toHaveBeenCalledOnce()` -- mock-call-only, no behavioral outcome.

### Zone 7: routes/

#### [P2] `server/src/routes/auth.ts:10` (consistency)

`POST /logout` has no `requireAuth` guard. Not a security issue (can't log out without a token) but inconsistent with defense-in-depth.

#### [P2] `server/src/routes/trips.ts:21-23` (consistency)

`/:id/test-selections` E2E seam registered in the production router. The handler returns 404 in production but the route is visible to HTTP scanners. Better to not register it conditionally.

#### [P2] `server/src/routes/userPreferences.ts:6-8` (consistency)

`requireAuth` applied per-route individually, while `routes/trips.ts` uses `router.use(requireAuth)`. Per-route pattern is more error-prone when adding routes.

#### [P2] `server/src/routes/routes.test.ts` (test-quality)

`GET /auth/me` test only verifies 401 (unauthenticated). Does not test the authenticated path.

#### [P2] `server/src/routes/routes.trips-places.test.ts` (test-quality)

`userPreferencesRouter` has no wiring test. `GET /user-preferences` and `PUT /user-preferences` are untested at integration level.

#### [P3] `server/src/routes/routes.trips-places.test.ts:81-96` (consistency)

Dynamic import pattern for router setup inconsistent with static import in `routes.test.ts`.

### Zone 8: schemas/

#### [P1] `server/src/schemas/trips.ts` (test-quality)

No test file despite non-trivial validation: `budget_total: z.number().positive()`, `travelers: z.number().int().positive().default(1)`, nested `preferences.style` enum. This is the only server-side gate for `POST /trips` body.

#### [P2] `server/src/schemas/auth.ts:20-22` (type-safety)

`userSchema` declares `first_name`/`last_name` as `z.string().nullable()`, but `registerSchema` requires non-nullable. The inferred `User` type forces null handling that should never occur.

#### [P2] `server/src/schemas/trips.ts:6-7` (type-safety)

`departure_date` and `return_date` typed as `z.string().optional()` with no format validation. Arbitrary strings pass schema and reach the database.

#### [P2] `server/src/schemas/userPreferences.ts:203-207` (type-safety)

`detectSchemaVersion` doesn't validate version is a known value. `schema_version: 99` would skip all migrations and enter v1 normalization with no migration applied.

#### [P3] `server/src/schemas/trips.ts:22-38` (type-safety)

`Trip` interface is plain TypeScript, not Zod. DB rows are cast to `Trip` with no runtime validation. Schema drift is invisible.

#### [P3] `server/src/schemas/userPreferences.ts:152-173` (type-safety)

`normalizePreferences` casts values with `as UserPreferences['accommodation']` without validating against union members. Invalid DB values pass through undetected.

### Zone 9: services/

#### [P1] `server/src/services/AgentOrchestrator.ts:57` (type-safety)

No fallback when `stop_reason` is neither `end_turn` nor `tool_use`. If the API returns `max_tokens`, the loop continues making API calls for 120 seconds until the wall-clock timeout fires, burning tokens.

#### [P1] `server/src/services/serpApiQuota.service.ts:27-50` (duplication)

`serpApiQuota.service.ts` and `tokenBudget.service.ts` both define their own `getRedis(): Redis | null` with identical implementation. This is a third independent Redis client alongside `cache.service.ts`. Three separate connection pools in production.

#### [P1] `server/src/services/serpapi.service.ts:83` (bug)

`void incrementMonthlyUsage()` fires inside `serpApiBreaker.call(...)` on success. If `response.json()` throws after the counter is incremented, the quota counter drifts ahead of actual successful results.

#### [P1] `server/src/services/agent.service.test.ts:204` (test-quality)

Test comment says "Should stop at 15 tool calls" but `DEFAULT_MAX_ITERATIONS` is 8. The assertion `expect(result.tool_calls.length).toBeLessThanOrEqual(15)` passes trivially for any limit <= 15 and would not catch a regression.

#### [P2] `server/src/services/node-builder.ts:180-187` (type-safety)

`(data.total_spent as number) ?? 0` -- the `as number` cast makes `??` semantically misleading. Correct: `(data.total_spent as number | undefined) ?? 0`.

#### [P2] `server/src/services/enrichment-sources/visa-matrix.ts:1-85` (dead-code)

Only US and GB are populated. All other countries get a false `warning` advisory. No ticket tracks completing the matrix.

#### [P2] `server/src/services/enrichment-sources/state-dept.ts:18` (type-safety)

`const advisories = (data.advisories ?? data) as Record<string, unknown>[];` -- no schema validation before cast. API response shape change would be silent.

#### [P2] `server/src/services/enrichment-sources/fcdo.ts:266` (error-handling)

Outer catch block returns `[]` with no logging. Same pattern in `open-meteo.ts:101` and `state-dept.ts:22,70`. Enrichment failures are invisible in production logs.

#### [P2] `server/src/services/enrichment-sources/open-meteo.ts:52` (bug)

Cache key rounds `lat/lon` to 2 decimal places (~1.1km). Island chains or small countries could get wrong city's weather via cache collision.

#### [P2] `server/src/services/enrichment.ts:23-38` (consistency)

`Promise.allSettled` correctly isolates faults, but rejected results are silently dropped. No logging of rejected enrichment sources.

#### [P2] `server/src/services/cache.service.ts:77-93` (consistency)

`normalizeCacheKey` uses `JSON.stringify(sortedParams)` as the hash. No length capping or actual hashing. Keys can be 300+ bytes for long destination strings.

#### [P2] `server/src/services/metrics.service.test.ts:17-101` (test-quality)

Every assertion is mock-call-only (tautological). `LogMetricsService` is a logger wrapper; tests only verify logger was called with specific fields.

#### [P2] `server/src/services/serpapi.service.test.ts:31-107` (test-quality)

Tests depend on Redis being unavailable (quota returns 0 and fails open). Should explicitly mock `isOverMonthlyCap`.

#### [P2] `server/src/services/enrichment.test.ts:1-62` (test-quality)

Only tests synchronous lookups (`getDrivingRequirements`, `getVisaRequirement`). Does not test `getEnrichmentNodes` at all.

#### [P3] `server/src/services/` (naming)

`AgentOrchestrator.ts` (PascalCase) vs `agent.service.ts` (kebab-dot). Convention appears to be PascalCase for class-primary files but is undocumented.

#### [P3] `server/src/services/metrics.service.ts:1-111` (dead-code)

`MetricsService` defined and exported but `trackApiCall`, `trackRateLimit`, `trackCacheOperation` are never called by the services that should use them. Largely unused instrumentation.

#### [P3] `server/src/services/mock-anthropic-client/mock-anthropic-client.ts:186-218` (security)

`as unknown as Anthropic` cast means missing methods cause runtime crash, not TypeScript error. Acceptable for test-only path.

#### [P3] `server/src/services/mock-anthropic-client/mock-anthropic-client.test.ts:9` (test-quality)

`expect(typeof client.messages.stream).toBe('function')` is a loose shape assertion. Redundant with downstream tests that call `.stream(...)`.

### Zone 10: tools/

#### [P1] `server/src/tools/executor.ts:125-136` (bug)

`update_trip` returns `{ success: false, message: 'No fields to update' }` when update returns falsy. The agent receives a success-shaped JSON with `success: false` -- no indication to surface as error. No test covers this path.

#### [P1] `server/src/tools/schemas.ts:82-91` (security)

`selectFlightSchema.origin/destination` use `z.string().min(1)` with no content restriction, while `searchFlightsSchema` uses `locationAllowlist` regex. Select schemas bypass injection protection applied at search time. Same for `selectHotelSchema.city`, `selectCarRentalSchema.provider/car_name`.

#### [P1] `server/src/tools/mock/isMockMode.test.ts` (test-quality)

`isMockMode` reads `EVAL_MOCK_SEARCH` and `E2E_MOCK_TOOLS` but test only covers `EVAL_MOCK_SEARCH`. `E2E_MOCK_TOOLS` branch untested. Test isolation incomplete.

#### [P2] `server/src/tools/car-rentals.tool.ts:97` (dead-code)

`input.car_type` included in cache key but never sent to SerpApi. Cache more granular than query; different `car_type` values produce separate entries for identical results.

#### [P2] `server/src/tools/definitions.ts:247-302` (consistency)

`select_*` tool definitions use `{ type: 'string' }` with no descriptions, while `search_*` tools describe every property. Degrades model comprehension.

#### [P2] `server/src/tools/schemas.ts:145-158` (dead-code)

`toolSchemas` export is never imported. Executor uses individual named schema imports.

#### [P2] `server/src/tools/hotels.tool.ts:82` (bug)

`address: ''` always empty in production. Mock returns `"123 Main St, ${input.city}"`. Mock fidelity diverges from production.

#### [P2] `server/src/tools/mock/hotels.mock.ts:23` (consistency)

`total_price` always `pricePerNight * 5` regardless of actual stay duration. Real tool reflects actual stay. Mock fidelity degrades for non-5-night stays.

#### [P2] `server/src/tools/experiences.tool.ts:105` (security)

Google Places text query built via string interpolation. `categories` items validated as `z.string().min(1).max(50)` with no content restriction. Low risk (NLP API, not SQL) but injection surface exists.

#### [P2] `server/src/tools/flights.tool.ts:138` (type-safety)

`CABIN_MAP[input.cabin_class]` undefined case sends `travel_class: undefined` to SerpApi (silently dropped). Zod enum prevents this but type-level guarantee is via Zod not TypeScript.

#### [P2] `server/src/tools/budget.tool.ts:30` (type-safety)

`no_budget_set` path returns `remaining: 0, over_budget: false` when `totalSpent > 0`. Agent gets semantically incorrect signal.

#### [P3] `server/src/tools/definitions.ts` vs `schemas.ts` (dead-code)

`toolSchemas` map export in `schemas.ts` is never used anywhere in the codebase.

#### [P3] `server/src/tools/flights.tool.ts:85` (consistency)

A flight with zero `flights` entries produces empty strings for all fields via optional chaining. Edge case not tested. SerpApi guarantees at least one leg.

#### [P3] `server/src/tools/mock/flights.mock.ts:13` (bug)

Arrival time generator `14 + i * 4` breaks at N>3 airlines (hour 26 is invalid).

#### [P3] `server/src/tools/experiences.tool.ts:128` (type-safety)

`data.places || []` uses `||` instead of `??`. Functionally correct for arrays but `??` is more precise.

#### [P3] `server/src/tools/executor.test.ts:22-29` (test-quality)

`calculateRemainingBudget` test is tautological: mock returns value, test confirms schema validation passes. Acceptable for routing tests.

### Zone 11: utils/, types/, app.ts, index.ts

#### [P1] `server/src/app.ts:79-81` (bug)

`query('SELECT NOW()')` fires at module load time, not inside `startServer()`. Importing `app.ts` in tests immediately attempts a real database connection. `.catch()` swallows the error silently.

#### [P2] `server/src/app.ts:125-129` (security)

`fs.readFileSync` for `destinations.json` at module load. If absent from `dist/` (which has happened before -- `bea33cc5`), process throws synchronously before `validateEnv()` with no graceful error.

#### [P2] `server/src/app.ts:144` (bug)

`Number(process.env.PORT) || 3001` -- `PORT=0` (valid for OS-assigned port in testing) falls back to 3001 because `Number('0')` is falsy.

#### [P2] `server/src/utils/CircuitBreaker.ts:29-34` (bug)

Half-open state allows concurrent probes. Two requests arriving simultaneously when cooldown expires both transition to `half-open` and both pass through. Violates single-probe guarantee.

#### [P2] `server/src/utils/parsers/parseIdParam.ts:2` (type-safety)

UUID regex accepts versions `[1-5]` only. UUID v6/v7 (increasingly common) would be rejected. Verify what the database generates.

#### [P3] `server/src/types/express.d.ts:6` (type-safety)

`request.user` typed as `User | undefined`. No stricter `authenticatedUser` helper for required-auth routes. Each handler repeats the null check.

#### [P3] `server/src/app.ts:99-101` (consistency)

`getRedis()` imported dynamically inside `GET /health/ready`. Intentional for circular dep avoidance but undocumented; diverges from every other import.

## Web Client

### Zone 12: app/

#### [P1] `web-client/src/app/(protected)/account/page.tsx:104` (bug)

Completion count hardcoded as "N of **6** categories completed" but `PREFERENCE_CATEGORIES` has 7 entries. User who completes all sees "7 of 6 categories completed".

#### [P1] `web-client/src/app/(auth)/login/page.tsx:94` (bug)

"Forgot password?" link href is `/login` (current page). Dead self-link; clicking reloads instead of navigating to a reset flow.

#### [P1] `web-client/src/app/(protected)/trips/new/page.tsx:20-32` (bug)

`creating` ref guard does not cancel the in-flight `post` on unmount. In React Strict Mode (double-invoke) two trips can be created. Missing `controller.abort()` in cleanup.

#### [P1] `web-client/src/app/(protected)/trips/[id]/page.tsx:95-101` (type-safety)

`handleConfirmBooking` silently swallows `put` errors. If endpoint fails, UI shows "Booked" while server still has `status: 'planning'`. Optimistic update not rolled back.

#### [P2] `web-client/src/app/(protected)/register/page.tsx:57-59` (bug)

`handleWizardClose` always redirects to `/trips/new`. User who cancels preferences wizard is still routed to start a new trip.

#### [P2] `web-client/src/app/(auth)/login/page.tsx:54-68` (dead-code)

Large commented-out Google OAuth block with `TODO`. Same in `register/page.tsx:82-96`. Should be tracked and removed.

#### [P2] `web-client/src/app/(protected)/trips/page.tsx:81-84` (dead-code)

Inline comment explaining historical progression from `window.confirm` to `AlertDialog`. Belongs in commit history.

#### [P2] `web-client/src/app/(protected)/trips/page.tsx:136-153` (duplication)

Delete button JSX duplicated verbatim in both image and imageFallback branches. Extract to a variable.

#### [P2] `web-client/src/app/(protected)/trips/page.tsx:45-47` and `account/page.tsx:28-30` (duplication)

`statusLabel` and `capitalize` are independent implementations of the same one-liner. Extract to `lib/format.ts`.

#### [P2] `web-client/src/app/(protected)/account/page.tsx:89` (naming)

"Member since" paragraph uses `className={styles.email}`. Semantically wrong class name.

#### [P2] `web-client/src/app/(protected)/trips/new/page.tsx:20-32` (consistency)

`creating` ref + `useEffect` for one-time POST. Non-idiomatic for Next.js App Router. TanStack Query `useMutation` with `onSuccess: router.replace` is the conventional alternative.

#### [P2] `web-client/src/app/faq/page.tsx:137-138` (security)

`dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}` for structured data. Static content now, but any future dynamic content would introduce XSS.

#### [P3] `web-client/src/app/layout.tsx:15-19` (naming)

Root metadata title "AI Travel Concierge" vs `faq/page.tsx` "AI Trip Planner". Inconsistent copy.

#### [P3] `web-client/src/app/explore/[slug]/page.tsx:118` (consistency)

`key={i}` (array index) for description paragraphs. Unstable key if content reorders.

#### [P3] `web-client/src/app/(protected)/layout.tsx` (consistency)

No `'use client'` directive or comment explaining Server Component boundary.

#### [P3] `web-client/src/app/page.content.test.ts:1-51` (test-quality)

All assertions are `toContain`/`toMatch` against raw source text. Could false-pass if string appears only in comments.

### Zone 13: components/ChatBox/

#### [P0] `web-client/src/components/ChatBox/ChatBox.tsx:106-128` (security)

`document.getElementById('destination')`, `'origin'`, `'departure_date'`, etc. scrape form values by DOM ID. Any element on the page with a matching ID (third-party widget, browser extension) would have its value silently read and sent to the backend. Replace with `useRef` or shared form context.

#### [P1] `web-client/src/components/ChatBox/useSSEChat.ts:134` (bug)

`JSON.parse(line.slice(6))` not wrapped in try/catch. Malformed SSE data line throws, caught by outer catch which shows misleading "Could not reach the agent" message instead of a parse error.

#### [P1] `web-client/src/components/ChatBox/ChatBox.invariants.test.tsx:88-103` (type-safety)

Flight fixture uses `offer_id: 'F1'` and `segments: []`, but `Flight` type has `id: string` (not `offer_id`) and no `segments` field. Fixture violates the type contract. Related: `tsc --noEmit` produces TS2322 on this file.

#### [P1] `web-client/src/components/ChatBox/nodes/FlightTiles.tsx:43` (consistency)

Inline `style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}` repeated identically in `HotelTiles.tsx:47`, `CarRentalTiles.tsx:33`, `ExperienceTiles.tsx:43`. Should be a shared SCSS class.

#### [P1] `web-client/src/components/ChatBox/widgets/FlightCard.tsx:33-65` (accessibility)

Button has no `aria-label`. Screen reader announces raw text dump of all card content with no semantic structure.

#### [P1] `web-client/src/components/ChatBox/widgets/HotelCard.tsx:40-79` (accessibility)

Same issue: `<button>` wrapping hotel card has no `aria-label`.

#### [P2] `web-client/src/components/ChatBox/nodes/FlightTiles.tsx:24` (type-safety)

`as unknown as Record<string, unknown>` erases type information to satisfy `SelectableCardGroup`'s `data` prop. Same in `HotelTiles:24`, `CarRentalTiles:24`, `ExperienceTiles:24`. Should use a generic.

#### [P2] `web-client/src/components/ChatBox/NodeRenderer.tsx:111` (consistency)

`onSelect={cb.onQuickReply ?? (() => {})}` silently swallows clicks when no handler. Same at lines 138, 148. Should be `undefined` with conditional rendering.

#### [P2] `web-client/src/components/ChatBox/widgets/MapPreviewCard.tsx:14-36` (consistency)

`process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY` read in component body every render. No `useMemo`, no `loading='lazy'`, no `onError` handler on the `<img>`.

#### [P2] `web-client/src/components/ChatBox/ChatBox.invariants.test.tsx` (dead-code)

Header comment says "5 invariants" but file has 8 invariant groups. Numbering inconsistent and header stale.

#### [P2] `web-client/src/components/ChatBox/VirtualizedChat.tsx:117-120` (bug)

User-agent sniffing (`navigator.userAgent.indexOf('Firefox')`) for ResizeObserver decision. Unreliable. Should use feature detection.

#### [P2] `web-client/src/components/ChatBox/TripDetailsForm.tsx:42` (consistency)

`const isLocked = submitted || false` is equivalent to `submitted ?? false`. The `|| false` is redundant.

#### [P3] `web-client/src/components/ChatBox/TripDetailsForm.tsx` (dead-code)

`trip_type` has full rendering logic but `handleSubmit` never reads `values.trip_type`. Dead state.

#### [P3] `web-client/src/components/ChatBox/` (naming)

Boundary between `nodes/` and `widgets/` is undocumented. `ChatProgressBar` in `widgets/` is used by `VirtualizedChat` not via `NodeRenderer`, blurring the convention.

#### [P3] `web-client/src/components/ChatBox/widgets/ItineraryTimeline.tsx:57` (consistency)

`key={i}` for itinerary items. Unstable key if items reorder.

#### [P3] `web-client/src/components/ChatBox/ChatBox.invariants.test.tsx:409-460` (test-quality)

`queryByRole` with positive `.toBeInTheDocument()` assertion. Convention is `getByRole` for positive existence.

### Zone 14: Other components/

#### [P1] `web-client/src/components/DemoBanner/DemoBanner.tsx:25` (bug)

"Read the engineering audit" link href is `/docs/audits/2026-04-06-engineering.md` -- a git repo path, not a served Next.js route. 404s in production.

#### [P1] `web-client/src/components/PreferencesWizard/PreferencesWizard.tsx:158-165` (error-handling)

`handleNext` calls `await saveCurrentStep()` with no try/catch. Network failure throws unhandled promise rejection. No error message shown.

#### [P2] `web-client/src/components/BookingConfirmation/BookingConfirmation.tsx:63-67` (bug)

`grandTotal` sums prices from items without normalizing currencies. Mixed-currency items produce wrong total.

#### [P2] `web-client/src/components/BookingConfirmation/BookingConfirmation.tsx:93+99` (dead-code)

Two `<h2>` elements render same text. Duplicate heading landmark for screen readers.

#### [P2] `web-client/src/components/BookingConfirmation/BookingConfirmation.tsx` (test-quality)

No render test. Only test is a source-code regex guard. Budget math, conditional rendering, button callbacks uncovered.

#### [P2] `web-client/src/components/ErrorBoundary/ErrorBoundary.tsx` (test-quality)

No test file. `getDerivedStateFromError`, `componentDidCatch`, fallback branch all uncovered.

#### [P2] `web-client/src/components/Header/Header.tsx:41` (consistency)

`prefsIncomplete` hardcodes `< 6` instead of `WIZARD_STEPS.length`. If steps change, badge silently misbehaves.

#### [P2] `web-client/src/components/Header/Header.tsx:31-38` (consistency)

Uses query key `['preferences']` but `PreferencesWizard` primarily invalidates `['user-preferences']`. If secondary invalidation removed, Header serves stale data.

#### [P2] `web-client/src/components/PreferencesWizard/PreferencesWizard.tsx:104-121` (consistency)

`getStepPayload` not memoized; `eslint-disable-next-line` suppresses hook deps warning. Manual deps list must be updated whenever a new step field is added.

#### [P2] `web-client/src/components/PreferencesWizard/steps/TravelPartyStep.tsx:6-11` (consistency)

Has four extra optional props making its interface inconsistent with the other five steps' `{value, onChange}` shape.

#### [P3] `web-client/src/components/AuthGuard/AuthGuard.tsx:18` (consistency)

Returns `null` while loading AND while unauthenticated with no visual differentiation.

#### [P3] `web-client/src/components/ErrorBoundary/ErrorBoundary.tsx:27` (error-handling)

`componentDidCatch` logs to `console.error` only. No error reporting integration.

#### [P3] `web-client/src/components/Header/Header.tsx` (test-quality)

No test file. Conditional nav links, active-link styling, auth-gated logout, prefs badge all untested.

#### [P3] `web-client/src/components/MockChatBox/MockChatBox.tsx` (test-quality)

No test file. Animation loop, restart behavior, accessibility of disabled input untested.

#### [P3] `web-client/src/components/PreferencesWizard/PreferencesWizard.tsx` (test-quality)

No test file. Step navigation, save-on-next, skip, error state uncovered.

### Zone 15: context/, providers/

#### [P1] `web-client/src/context/AuthContext.tsx:23-35,108-118` (type-safety)

`authError` state is set and included in `useMemo` value but NOT declared in `AuthContextValue` interface. TypeScript silently narrows it out. Callers cannot consume it. The error path is never called -- field is entirely inert.

#### [P2] `web-client/src/context/AuthContext.tsx:93-96` (dead-code)

`loginWithGoogle` immediately throws `'Google OAuth not yet implemented'`. No tracking issue.

#### [P2] `web-client/src/context/AuthContext.tsx:34,99` (type-safety)

Interface declares `logout: () => void` (sync) but implementation is `async`. Callers don't know to await, risking race conditions on navigation-after-logout.

#### [P2] `web-client/src/context/AuthContext.tsx` (consistency)

No token refresh/expiry handling. `staleTime: Infinity` means auth state never re-fetched. Server session expiry leaves client showing logged-in state until hard reload.

#### [P3] `web-client/src/context/AuthContext.tsx` (test-quality)

No test file. Login/signup flows, 401 handling, optimistic state updates uncovered.

### Zone 16: lib/

#### [P1] `web-client/src/lib/api.ts:39-41` (type-safety)

`return undefined as T` for 204 responses is a type lie. If `T` is concrete (e.g. `get<{user: User}>('/auth/me')`), callers destructuring would throw at runtime. Current call sites are safe but pattern is dangerous.

#### [P2] `web-client/src/lib/destinationImage.ts:3-37` (duplication)

`CITY_IMAGES` duplicates Unsplash IDs already in `server/src/data/cities.ts` as `unsplash_id`. Update in one silently diverges from the other.

#### [P2] `web-client/src/lib/preferenceOptions.ts:1-2` (duplication)

Comment says "Duplicated from server/src/schemas/userPreferences.ts for frontend use". No compile-time enforcement if server schema changes.

#### [P3] `web-client/src/lib/constants.ts:1` (consistency)

Only exports `APP_NAME`. Magic numbers/strings used elsewhere (timeout values, step counts) should be centralized here.

### Zone 17: data/, test/

#### [P2] `web-client/src/data/destinations.ts` (duplication)

5,362-line file with 36 destinations overlapping with `server/src/data/cities.ts` (34 cities) and `server/src/data/destinations.json`. No shared source of truth for destination identity (slug, name, country, currency).

#### [P3] `web-client/src/data/destinations.ts` (test-quality)

No test asserts shape or completeness of `DESTINATIONS` array. Malformed entry fails silently at render time.

## Cross-cutting

#### [P2] Test files in `server/dist/`: 0 (clean)

Previously identified issue (128 test files in dist) appears to have been fixed.

#### [P2] `: any` usage: 0 in non-test server source, 0 in non-test web-client source (clean)

Note: `as any` casts exist (rateLimiter, test helpers) but were caught per-zone above.

#### TypeScript `--noEmit`: server clean, web-client has 1 error in `ChatBox.invariants.test.tsx:92` (TS2322, covered in Zone 13 finding).

#### Circular dependencies: none found (`madge --circular`).
