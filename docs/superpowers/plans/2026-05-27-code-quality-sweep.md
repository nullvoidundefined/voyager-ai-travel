# Code Quality Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sweep `server/src/` and `web-client/src/` directory-by-directory, catalog every code quality issue as a P0-P3 finding in a single audit document, then fix findings in priority order.

**Architecture:** Serial directory walk through 10 server zones and 6 web-client zones. Each zone reads every source file (not test files), checks against the per-file checklist, and appends findings to the audit doc. After the sweep, fixes are applied P0-first with one commit per finding.

**Tech Stack:** TypeScript, Express 5, Next.js 15, Vitest, pnpm monorepo

---

### Task 0: Create worktree and scaffold findings document

**Files:**

- Create: `docs/audits/2026-05-27-code-quality-sweep.md`

- [ ] **Step 0.1: Create and switch to worktree branch**

```bash
git worktree add ../voyager-code-sweep audit/code-quality-sweep -b audit/code-quality-sweep
cd ../voyager-code-sweep
```

- [ ] **Step 0.2: Create the findings document scaffold**

Create `docs/audits/2026-05-27-code-quality-sweep.md` with this content:

```markdown
# Code Quality Sweep - 2026-05-27

## Summary

- P0: 0 findings (production correctness)
- P1: 0 findings (should fix soon)
- P2: 0 findings (tech debt)
- P3: 0 findings (nice to have)

## Server

### Zone 1: config/, constants/, data/

(sweep pending)

### Zone 2: db/

(sweep pending)

### Zone 3: handlers/

(sweep pending)

### Zone 4: middleware/

(sweep pending)

### Zone 5: prompts/

(sweep pending)

### Zone 6: repositories/

(sweep pending)

### Zone 7: routes/

(sweep pending)

### Zone 8: schemas/

(sweep pending)

### Zone 9: services/

(sweep pending)

### Zone 10: tools/

(sweep pending)

### Zone 11: utils/, types/, app.ts, index.ts

(sweep pending)

## Web Client

### Zone 12: app/

(sweep pending)

### Zone 13: components/ChatBox/

(sweep pending)

### Zone 14: Other components/

(sweep pending)

### Zone 15: context/, providers/

(sweep pending)

### Zone 16: lib/

(sweep pending)

### Zone 17: data/, test/

(sweep pending)

## Cross-cutting

(sweep pending)
```

- [ ] **Step 0.3: Commit scaffold**

```bash
git add docs/audits/2026-05-27-code-quality-sweep.md
git commit -m "docs: scaffold code quality sweep findings document"
```

---

### Task 1: Sweep server Zone 1 -- config/, constants/, data/

**Files to read:**

- `server/src/config/env.ts`
- `server/src/config/corsConfig.ts`
- `server/src/config/corsConfig.test.ts`
- `server/src/constants/session.ts`
- `server/src/data/cities.ts`

**Checklist per file:**

- [ ] **Step 1.1: Read every source file in Zone 1**

Read each file listed above. For each file, check:

1. Dead code: unused exports, unreachable branches, commented-out blocks
2. Type safety: `any` usage, missing narrowing, unsafe casts
3. Error handling: consistent patterns
4. Naming/structure: consistency within the layer
5. Security: unvalidated inputs, injection vectors
6. Import hygiene: circular deps, unused imports

- [ ] **Step 1.2: Read test files for Zone 1**

Read `server/src/config/corsConfig.test.ts`. Check for R-200 anti-patterns:

1. Self-mock: test for `foo.ts` does `vi.mock('./foo')`
2. Mocked dependency that IS the thing under test
3. Mock-call-only assertions with no behavior assertion
4. Tautological: `mockReturn(42); expect(thing()).toBe(42)`
5. Loose-shape-only assertion on value-computing function

- [ ] **Step 1.3: Append findings to Zone 1 section**

Replace `(sweep pending)` under Zone 1 with findings in this format:

```markdown
#### [P2] `server/src/config/env.ts:1` (dead-code)

`isProduction()` is only used in one place (corsConfig.ts). Consider inlining.

#### [P2] `server/src/data/cities.ts` (build)

1863-line static data file. No test coverage for `lookupCity()`.
```

If no findings, write `No findings.`

- [ ] **Step 1.4: Update summary counts**

Update the P0/P1/P2/P3 counts in the Summary section to reflect new findings.

---

### Task 2: Sweep server Zone 2 -- db/

**Files to read:**

- `server/src/db/pool/pool.ts`
- `server/src/db/pool/pool.test.ts`

- [ ] **Step 2.1: Read every source file in Zone 2**

Apply the same per-file checklist from Task 1 Step 1.1.

- [ ] **Step 2.2: Read test files for Zone 2**

Read `pool.test.ts`. Apply R-200 anti-pattern checklist.

- [ ] **Step 2.3: Append findings to Zone 2 section**

Replace `(sweep pending)` under Zone 2 with findings.

- [ ] **Step 2.4: Update summary counts**

---

### Task 3: Sweep server Zone 3 -- handlers/

**Files to read:**

- `server/src/handlers/auth/auth.ts`
- `server/src/handlers/auth/auth.test.ts`
- `server/src/handlers/chat/chat.ts`
- `server/src/handlers/chat/chat.helpers.ts`
- `server/src/handlers/chat/chat.helpers.test.ts`
- `server/src/handlers/chat/chat.test.ts`
- `server/src/handlers/chat/chat.lock.test.ts`
- `server/src/handlers/places/photoProxy.handler.ts`
- `server/src/handlers/places/photoProxy.handler.test.ts`
- `server/src/handlers/trips/trips.ts`
- `server/src/handlers/trips/trips.test.ts`
- `server/src/handlers/userPreferences/userPreferences.ts`
- `server/src/handlers/userPreferences/userPreferences.test.ts`

- [ ] **Step 3.1: Read all handler source files**

Apply per-file checklist. Pay special attention to:

- Consistency of error response shape across handlers (auth uses `{ error, message }` inline; trips uses `ApiError`)
- Validation approach consistency (auth does `safeParse` + inline response; trips does `safeParse` + `throw ApiError`)
- Non-null assertion `!` usage on `req.user` (should be safe behind `requireAuth` middleware but verify)

- [ ] **Step 3.2: Read all handler test files**

Apply R-200 anti-pattern checklist to each test file.

- [ ] **Step 3.3: Append findings to Zone 3 section**

- [ ] **Step 3.4: Update summary counts**

---

### Task 4: Sweep server Zone 4 -- middleware/

**Files to read:**

- `server/src/middleware/csrfGuard/csrfGuard.ts` + `.test.ts`
- `server/src/middleware/errorHandler/errorHandler.ts` + `.test.ts`
- `server/src/middleware/notFoundHandler/notFoundHandler.ts` + `.test.ts`
- `server/src/middleware/rateLimiter/rateLimiter.ts` + `.boot.test.ts` + `.ipv6.test.ts` + `.test.ts`
- `server/src/middleware/requestLogger/requestLogger.ts` + `.test.ts`
- `server/src/middleware/requireAuth/requireAuth.ts` + `.test.ts`

- [ ] **Step 4.1: Read all middleware source files**

Apply per-file checklist. Pay special attention to:

- Middleware signature consistency (`(req, res, next)` shape)
- Error propagation patterns (does each middleware call `next(err)` correctly?)
- `loadSession` in requireAuth: race conditions or error swallowing

- [ ] **Step 4.2: Read all middleware test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 4.3: Append findings to Zone 4 section**

- [ ] **Step 4.4: Update summary counts**

---

### Task 5: Sweep server Zone 5 -- prompts/

**Files to read:**

- `server/src/prompts/booking-steps.ts` + `.test.ts`
- `server/src/prompts/system-prompt.ts` + `.test.ts`
- `server/src/prompts/trip-context.ts` + `.test.ts`

- [ ] **Step 5.1: Read all prompt source files**

Apply per-file checklist. Also check:

- String template injection risks in prompt construction
- Exported types/interfaces consistency

- [ ] **Step 5.2: Read all prompt test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 5.3: Append findings to Zone 5 section**

- [ ] **Step 5.4: Update summary counts**

---

### Task 6: Sweep server Zone 6 -- repositories/

**Files to read:**

- `server/src/repositories/agent-turn-cost/agent-turn-cost.ts` + `.test.ts`
- `server/src/repositories/auth/auth.ts` + `.test.ts`
- `server/src/repositories/conversations/conversations.ts` + `.test.ts`
- `server/src/repositories/tool-call-log/tool-call-log.ts` + `.test.ts`
- `server/src/repositories/trips/trips.ts` + `.test.ts`
- `server/src/repositories/userPreferences/userPreferences.ts` + `.test.ts`

- [ ] **Step 6.1: Read all repository source files**

Apply per-file checklist. Pay special attention to:

- SQL injection: are all queries parameterized? The `updateTrip` function in `trips.ts` builds dynamic SET clauses from `Object.entries(input)` -- verify column names are not user-controlled
- Consistent return types across repos (some return `T | null`, some throw)
- Transaction usage consistency

- [ ] **Step 6.2: Read all repository test files**

Apply R-200 anti-pattern checklist. Specifically watch for repository tests that mock the database pool (R-200 anti-pattern #5).

- [ ] **Step 6.3: Append findings to Zone 6 section**

- [ ] **Step 6.4: Update summary counts**

---

### Task 7: Sweep server Zone 7 -- routes/

**Files to read:**

- `server/src/routes/auth.ts`
- `server/src/routes/places.ts`
- `server/src/routes/trips.ts`
- `server/src/routes/userPreferences.ts`
- `server/src/routes/routes.test.ts`
- `server/src/routes/routes.trips-places.test.ts`

- [ ] **Step 7.1: Read all route source files**

Apply per-file checklist. Check:

- Middleware application consistency (does every protected route use `requireAuth`?)
- Route naming conventions
- Handler wiring correctness

- [ ] **Step 7.2: Read route test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 7.3: Append findings to Zone 7 section**

- [ ] **Step 7.4: Update summary counts**

---

### Task 8: Sweep server Zone 8 -- schemas/

**Files to read:**

- `server/src/schemas/auth.ts` + `.test.ts`
- `server/src/schemas/trips.ts`
- `server/src/schemas/userPreferences.ts` + `.test.ts`

- [ ] **Step 8.1: Read all schema source files**

Apply per-file checklist. Check:

- Zod schema completeness (do schemas validate all fields the handlers expect?)
- Type exports: are inferred types (`z.infer<>`) exported for handler/repo use?
- `trips.ts` has no test file -- flag if it has non-trivial validation logic

- [ ] **Step 8.2: Read schema test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 8.3: Append findings to Zone 8 section**

- [ ] **Step 8.4: Update summary counts**

---

### Task 9: Sweep server Zone 9 -- services/

**Files to read:**

- `server/src/services/agent.service.ts` + `.test.ts`
- `server/src/services/AgentOrchestrator.ts` + `.test.ts`
- `server/src/services/cache.service.ts` + `.test.ts`
- `server/src/services/enrichment.ts` + `.test.ts`
- `server/src/services/metrics.service.ts` + `.test.ts`
- `server/src/services/node-builder.ts` + `.test.ts`
- `server/src/services/serpapi.service.ts` + `.test.ts`
- `server/src/services/serpApiQuota.service.ts` + `.test.ts`
- `server/src/services/tokenBudget.service.ts` + `.test.ts`
- `server/src/services/mock-anthropic-client/mock-anthropic-client.ts` + `.test.ts`
- `server/src/services/enrichment-sources/driving.ts`
- `server/src/services/enrichment-sources/fcdo.ts`
- `server/src/services/enrichment-sources/open-meteo.ts`
- `server/src/services/enrichment-sources/state-dept.ts`
- `server/src/services/enrichment-sources/visa-matrix.ts`

- [ ] **Step 9.1: Read all service source files**

Apply per-file checklist. Pay special attention to:

- Naming: `AgentOrchestrator.ts` uses PascalCase (class file) vs `agent.service.ts` uses kebab-dot (module). Check if this is intentional/consistent.
- External API error handling in enrichment sources
- Cache key consistency and TTL management
- Token budget edge cases (overflow, negative values, Redis failures)

- [ ] **Step 9.2: Read all service test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 9.3: Append findings to Zone 9 section**

- [ ] **Step 9.4: Update summary counts**

---

### Task 10: Sweep server Zone 10 -- tools/

**Files to read:**

- `server/src/tools/budget.tool.ts` + `.test.ts`
- `server/src/tools/car-rentals.tool.ts` + `.test.ts`
- `server/src/tools/definitions.ts` + `.test.ts`
- `server/src/tools/destination.tool.ts` + `.test.ts`
- `server/src/tools/executor.ts` + `.test.ts` + `.adapters.test.ts`
- `server/src/tools/experiences.tool.ts` + `.test.ts`
- `server/src/tools/flights.tool.ts` + `.test.ts`
- `server/src/tools/hotels.tool.ts` + `.test.ts`
- `server/src/tools/schemas.ts` + `.test.ts`
- `server/src/tools/mock/index.ts`
- `server/src/tools/mock/isMockMode.ts` + `.test.ts`
- `server/src/tools/mock/flights.mock.ts` + `.test.ts`
- `server/src/tools/mock/hotels.mock.ts` + `.test.ts`
- `server/src/tools/mock/experiences.mock.ts` + `.test.ts`
- `server/src/tools/mock/car-rentals.mock.ts` + `.test.ts`

- [ ] **Step 10.1: Read all tool source files**

Apply per-file checklist. Check:

- Tool definition consistency (do all tools follow the same interface shape?)
- Mock tool fidelity (do mocks return the same shape as real tools?)
- Executor error handling (does it catch tool failures gracefully?)

- [ ] **Step 10.2: Read all tool test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 10.3: Append findings to Zone 10 section**

- [ ] **Step 10.4: Update summary counts**

---

### Task 11: Sweep server Zone 11 -- utils/, types/, app.ts, index.ts

**Files to read:**

- `server/src/utils/ApiError.ts`
- `server/src/utils/CircuitBreaker.ts` + `.test.ts`
- `server/src/utils/logs/logger.ts` + `.test.ts`
- `server/src/utils/parsers/parseIdParam.ts` + `.test.ts`
- `server/src/utils/parsers/parsePagination.ts` + `.test.ts`
- `server/src/utils/tests/mockResult.ts`
- `server/src/utils/tests/uuids.ts`
- `server/src/types/express.d.ts`
- `server/src/app.ts`
- `server/src/index.ts`

- [ ] **Step 11.1: Read all utility, type, and entry-point files**

Apply per-file checklist. Check:

- `ApiError` class: does it extend Error correctly? Is `instanceof` reliable?
- `CircuitBreaker`: state machine correctness
- Test utilities in `utils/tests/`: are they actually used? If not, dead code.
- `app.ts`: middleware registration order (security-critical)
- `express.d.ts`: type augmentation completeness

- [ ] **Step 11.2: Read test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 11.3: Append findings to Zone 11 section**

- [ ] **Step 11.4: Update summary counts and commit server sweep**

```bash
git add docs/audits/2026-05-27-code-quality-sweep.md
git commit -m "docs: complete server-side code quality sweep (zones 1-11)"
```

---

### Task 12: Sweep web-client Zone 12 -- app/

**Files to read:**

- `web-client/src/app/layout.tsx`
- `web-client/src/app/page.tsx` + `.content.test.ts`
- `web-client/src/app/globals.content.test.ts`
- `web-client/src/app/(auth)/login/page.tsx`
- `web-client/src/app/(auth)/register/page.tsx` + `.content.test.ts`
- `web-client/src/app/(protected)/layout.tsx`
- `web-client/src/app/(protected)/account/page.tsx`
- `web-client/src/app/(protected)/trips/page.tsx` + `.content.test.ts`
- `web-client/src/app/(protected)/trips/new/page.tsx` + `.content.test.ts`
- `web-client/src/app/(protected)/trips/[id]/page.tsx` + `.test.tsx`
- `web-client/src/app/explore/page.tsx`
- `web-client/src/app/explore/[slug]/page.tsx`
- `web-client/src/app/faq/page.tsx` + `.content.test.ts`

- [ ] **Step 12.1: Read all app page files**

Apply per-file checklist. Check:

- `'use client'` directives: are they on every component that uses hooks/state? Are they missing from pages that should be server components?
- Layout nesting: does the protected layout enforce auth correctly?
- Page prop types: are params properly typed?
- Metadata exports for SEO

- [ ] **Step 12.2: Read test files**

Apply R-200 anti-pattern checklist. Note the `.content.test.ts` naming pattern -- check if these are actual behavior tests or just snapshot/existence checks.

- [ ] **Step 12.3: Append findings to Zone 12 section**

- [ ] **Step 12.4: Update summary counts**

---

### Task 13: Sweep web-client Zone 13 -- components/ChatBox/

**Files to read:**

- `web-client/src/components/ChatBox/ChatBox.tsx`
- `web-client/src/components/ChatBox/ChatBox.invariants.test.tsx`
- `web-client/src/components/ChatBox/NodeRenderer.tsx`
- `web-client/src/components/ChatBox/VirtualizedChat.tsx`
- `web-client/src/components/ChatBox/useSSEChat.ts` + `.content.test.ts`
- `web-client/src/components/ChatBox/TripDetailsForm.tsx`
- `web-client/src/components/ChatBox/nodes/AdvisoryCard.tsx`
- `web-client/src/components/ChatBox/nodes/BookingPrompt.tsx` + `.test.tsx`
- `web-client/src/components/ChatBox/nodes/BudgetBar.tsx`
- `web-client/src/components/ChatBox/nodes/CarRentalCard.tsx`
- `web-client/src/components/ChatBox/nodes/CarRentalTiles.tsx`
- `web-client/src/components/ChatBox/nodes/ExperienceTiles.tsx`
- `web-client/src/components/ChatBox/nodes/FlightTiles.tsx`
- `web-client/src/components/ChatBox/nodes/HotelTiles.tsx`
- `web-client/src/components/ChatBox/nodes/MarkdownText.tsx`
- `web-client/src/components/ChatBox/nodes/WeatherForecast.tsx`
- `web-client/src/components/ChatBox/widgets/ChatProgressBar.tsx` + `.test.tsx`
- `web-client/src/components/ChatBox/widgets/ExperienceCard.tsx`
- `web-client/src/components/ChatBox/widgets/FlightCard.tsx`
- `web-client/src/components/ChatBox/widgets/HotelCard.tsx`
- `web-client/src/components/ChatBox/widgets/InlineBudgetBar.tsx`
- `web-client/src/components/ChatBox/widgets/ItineraryTimeline.tsx`
- `web-client/src/components/ChatBox/widgets/MapPreviewCard.tsx`
- `web-client/src/components/ChatBox/widgets/QuickReplyChips.tsx`
- `web-client/src/components/ChatBox/widgets/SelectableCardGroup.tsx` + `.test.tsx`

- [ ] **Step 13.1: Read ChatBox core files**

Read `ChatBox.tsx`, `NodeRenderer.tsx`, `VirtualizedChat.tsx`, `useSSEChat.ts`, `TripDetailsForm.tsx`.

Check:

- Component size: is any single file doing too much?
- State management: are there redundant state variables?
- `document.getElementById` usage in ChatBox.tsx (lines 118-120) -- this is a code smell in React; flag if form data access could use refs instead
- SSE parsing robustness: does `useSSEChat` handle malformed SSE data?

- [ ] **Step 13.2: Read ChatBox node components**

Read all files in `nodes/`. Check:

- Props interface consistency across tile components
- Shared rendering patterns that could be deduplicated
- Accessibility: aria labels, keyboard navigation

- [ ] **Step 13.3: Read ChatBox widget components**

Read all files in `widgets/`. Check:

- Widget/node boundary clarity: is the split between `nodes/` and `widgets/` consistent?
- Card component consistency (FlightCard, HotelCard, ExperienceCard)

- [ ] **Step 13.4: Read ChatBox test files**

Read `ChatBox.invariants.test.tsx`, `BookingPrompt.test.tsx`, `ChatProgressBar.test.tsx`, `SelectableCardGroup.test.tsx`, `useSSEChat.content.test.ts`. Apply R-200 anti-pattern checklist.

- [ ] **Step 13.5: Append findings to Zone 13 section**

- [ ] **Step 13.6: Update summary counts**

---

### Task 14: Sweep web-client Zone 14 -- Other components/

**Files to read:**

- `web-client/src/components/AuthGuard/AuthGuard.tsx` + `.test.tsx`
- `web-client/src/components/BookingConfirmation/BookingConfirmation.tsx` + `.content.test.ts`
- `web-client/src/components/DemoBanner/DemoBanner.tsx` + `.test.tsx`
- `web-client/src/components/ErrorBoundary/ErrorBoundary.tsx`
- `web-client/src/components/Footer/Footer.tsx`
- `web-client/src/components/GoogleIcon/GoogleIcon.tsx`
- `web-client/src/components/Header/Header.tsx`
- `web-client/src/components/MockChatBox/MockChatBox.tsx`
- `web-client/src/components/PreferencesWizard/PreferencesWizard.tsx`
- `web-client/src/components/PreferencesWizard/steps/AccommodationStep.tsx`
- `web-client/src/components/PreferencesWizard/steps/ActivitiesStep.tsx`
- `web-client/src/components/PreferencesWizard/steps/BudgetComfortStep.tsx`
- `web-client/src/components/PreferencesWizard/steps/DiningStep.tsx`
- `web-client/src/components/PreferencesWizard/steps/TravelPaceStep.tsx`
- `web-client/src/components/PreferencesWizard/steps/TravelPartyStep.tsx`
- `web-client/src/components/Toast/Toast.tsx` + `.test.tsx`
- `web-client/src/components/ui/AlertDialog/AlertDialog.tsx` + `.test.tsx`
- `web-client/src/components/VibeLensBar/VibeLensBar.tsx`

- [ ] **Step 14.1: Read all other component source files**

Apply per-file checklist. Check:

- Missing test files: ErrorBoundary, Footer, GoogleIcon, Header, MockChatBox, VibeLensBar, PreferencesWizard steps
- PreferencesWizard step consistency: do all 6 steps follow the same props interface?
- MockChatBox: is this dead code or used in dev/demo mode?

- [ ] **Step 14.2: Read test files**

Apply R-200 anti-pattern checklist.

- [ ] **Step 14.3: Append findings to Zone 14 section**

- [ ] **Step 14.4: Update summary counts**

---

### Task 15: Sweep web-client Zone 15 -- context/, providers/

**Files to read:**

- `web-client/src/context/AuthContext.tsx`
- `web-client/src/providers/QueryProvider.tsx`

- [ ] **Step 15.1: Read context and provider files**

Apply per-file checklist. Check:

- AuthContext: does it handle token refresh/expiry?
- QueryProvider: default query options (staleTime, retry, etc.)
- Are these the only two providers? Cross-check with `layout.tsx` provider tree.

- [ ] **Step 15.2: Append findings to Zone 15 section**

- [ ] **Step 15.3: Update summary counts**

---

### Task 16: Sweep web-client Zone 16 -- lib/

**Files to read:**

- `web-client/src/lib/api.ts`
- `web-client/src/lib/constants.ts`
- `web-client/src/lib/destinationImage.ts`
- `web-client/src/lib/format.ts`
- `web-client/src/lib/preferenceOptions.ts`

- [ ] **Step 16.1: Read all lib files**

Apply per-file checklist. Check:

- `api.ts`: the `return undefined as T` cast on 204 responses is a type lie -- flag if `T` could be non-undefined
- `constants.ts`: magic numbers or strings that should be shared with server
- Unused exports across lib files

- [ ] **Step 16.2: Append findings to Zone 16 section**

- [ ] **Step 16.3: Update summary counts**

---

### Task 17: Sweep web-client Zone 17 -- data/, test/

**Files to read:**

- `web-client/src/data/destinations.ts`
- `web-client/src/test/setup.ts`

- [ ] **Step 17.1: Read data and test setup files**

Apply per-file checklist. Check:

- `destinations.ts`: duplication with `server/src/data/cities.ts`? Should these share a source of truth via `@voyager/shared-types`?
- `setup.ts`: test environment configuration correctness

- [ ] **Step 17.2: Append findings to Zone 17 section**

- [ ] **Step 17.3: Update summary counts**

---

### Task 18: Cross-cutting checks

- [ ] **Step 18.1: Build hygiene -- test files in dist**

Run:

```bash
find server/dist -name '*.test.*' | wc -l
```

Log finding if count > 0. The fix is adding `"exclude": ["**/*.test.ts", "**/__integration__/**"]` to `server/tsconfig.json` (or creating a `tsconfig.build.json`).

- [ ] **Step 18.2: `any` usage scan**

Run:

```bash
grep -rn ': any' server/src/ --include='*.ts' | grep -v node_modules | grep -v '.test.' | grep -v '.d.ts'
grep -rn ': any' web-client/src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.test.'
```

Log each instance with file and line number.

- [ ] **Step 18.3: Unused export scan**

Run TypeScript compiler in `--noEmit` mode and check for unused exports, or use `ts-prune` if available:

```bash
cd server && npx tsc --noEmit 2>&1 | head -50
cd ../web-client && npx tsc --noEmit 2>&1 | head -50
```

- [ ] **Step 18.4: Circular dependency check**

```bash
npx madge --circular server/src/index.ts 2>/dev/null || echo "madge not installed -- skip"
```

- [ ] **Step 18.5: Append cross-cutting findings**

Replace `(sweep pending)` under Cross-cutting with all findings.

- [ ] **Step 18.6: Final summary update and commit**

Update all P0/P1/P2/P3 counts in the Summary section. Commit:

```bash
git add docs/audits/2026-05-27-code-quality-sweep.md
git commit -m "docs: complete code quality sweep -- all zones and cross-cutting checks"
```

---

### Task 19: Fix P0 findings

- [ ] **Step 19.1: Review all P0 findings from the sweep document**

Read `docs/audits/2026-05-27-code-quality-sweep.md` and list every P0 finding.

- [ ] **Step 19.2: Fix each P0 finding**

For each P0 finding:

1. Write a failing test that demonstrates the bug (if applicable and the finding is a correctness issue)
2. Run the test, confirm it fails
3. Apply the minimal fix
4. Run the test, confirm it passes
5. Run `pnpm test` in the affected package to check for regressions
6. Commit: `fix(<category>): <one-line description>`

One commit per P0 finding. Do not bundle.

- [ ] **Step 19.3: Mark P0 findings as resolved in the sweep doc**

Prefix each resolved finding with `[RESOLVED]`.

---

### Task 20: Fix P1 findings

- [ ] **Step 20.1: Review all P1 findings**

- [ ] **Step 20.2: Fix each P1 finding**

Same process as P0 but commit prefix is `refactor:` or `test:` depending on finding category. One commit per finding.

- [ ] **Step 20.3: Mark P1 findings as resolved**

---

### Task 21: Triage P2/P3 findings

- [ ] **Step 21.1: Review all P2 and P3 findings**

- [ ] **Step 21.2: Fix trivial P2 items inline**

Items that are one-line fixes (unused imports, naming nits) -- fix and commit together as `chore: clean up P2 findings from code quality sweep`.

- [ ] **Step 21.3: Log remaining P2/P3 to ISSUES.md**

Append unresolved P2/P3 findings to `ISSUES.md` under a new section header:

```markdown
## Code Quality Sweep (2026-05-27)

### [P2] <finding title>

<one-line description>
File: `<path>:<line>`
```

Commit:

```bash
git add ISSUES.md docs/audits/2026-05-27-code-quality-sweep.md
git commit -m "docs: triage P2/P3 findings from code quality sweep to ISSUES.md"
```

---

### Task 22: Final verification and merge

- [ ] **Step 22.1: Run full verification suite**

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

All four must pass.

- [ ] **Step 22.2: Merge to main**

```bash
cd /Users/iangreenough/Desktop/code/personal/production/voyager
git merge --squash audit/code-quality-sweep
git commit -m "refactor: code quality sweep -- P0/P1 fixes and P2/P3 triage"
```

- [ ] **Step 22.3: Clean up worktree**

```bash
git worktree remove ../voyager-code-sweep
git branch -d audit/code-quality-sweep
```
