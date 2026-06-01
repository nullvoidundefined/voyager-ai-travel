# Voyager, Open Issues

Rolling log of open issues, P2 and P3 severity. P0 and P1 items live in the current triage file under `docs/audits/`. Resolved items are removed; git history is the archive.

Each entry includes severity, effort, category, and source (which audit surfaced it).

---

## 2026-05-27 code quality sweep

Source: `docs/audits/2026-05-27-code-quality-sweep.md`
Fixed in this sweep: 2 P0, 25 P1. Remaining P2/P3 items below.

### P2 findings

### [CQS-09] `cities.ts` data quality issues

- **Severity:** P2 . **Effort:** S . **Category:** naming/duplication
- `'luang'` key misses "Luang Prabang" lookups; `'addis'`/`'addis ababa'` have divergent coordinates

### [CQS-10] `pool.ts` NUMERIC parser returns NaN silently

- **Severity:** P2 . **Effort:** S . **Category:** type-safety
- `parseFloat` on non-numeric strings returns NaN that propagates into budget arithmetic

### [CQS-11] Enrichment sources swallow errors silently

- **Severity:** P2 . **Effort:** S . **Category:** error-handling
- `fcdo.ts:266`, `open-meteo.ts:101`, `state-dept.ts:22,70` all catch and return `[]` with no logging
- `enrichment.ts:23-38` drops rejected `Promise.allSettled` results silently

### [CQS-12] `visa-matrix.ts` only covers US and GB

- **Severity:** P2 . **Effort:** M . **Category:** dead-code
- All other countries get a false `warning` advisory claiming no data. No tracking ticket.

### [CQS-13] `schemas/trips.ts` date fields lack format validation

- **Severity:** P2 . **Effort:** S . **Category:** type-safety
- `departure_date`/`return_date` typed as `z.string().optional()` with no regex or `.date()` check

### [CQS-14] `userSchema` nullable mismatch with `registerSchema`

- **Severity:** P2 . **Effort:** S . **Category:** type-safety
- `first_name`/`last_name` nullable in `userSchema` but required in `registerSchema`

### [CQS-15] `car-rentals.tool.ts` cache key includes unused `car_type`

- **Severity:** P2 . **Effort:** S . **Category:** dead-code
- `car_type` in cache key but never sent to SerpApi. Produces separate cache entries for identical results.

### [CQS-16] `hotels.tool.ts` address always empty in production

- **Severity:** P2 . **Effort:** S . **Category:** bug
- `address: ''` hardcoded. Mock returns non-empty address. Mock fidelity diverges.

### [CQS-17] `app.ts` module-level side effects

- **Severity:** P2 . **Effort:** M . **Category:** bug
- `query('SELECT NOW()')` fires on import (affects test isolation)
- `fs.readFileSync('destinations.json')` at load time with no error handling
- `PORT=0` treated as falsy

### [CQS-18] Client data duplication across server and web-client

- **Severity:** P2 . **Effort:** L . **Category:** duplication
- `web-client/src/data/destinations.ts`, `web-client/src/lib/destinationImage.ts`, `web-client/src/lib/preferenceOptions.ts` all duplicate data from server
- No shared source of truth; changes in one require manual updates in the other

### [CQS-19] `BookingConfirmation` sums mixed-currency prices

- **Severity:** P2 . **Effort:** S . **Category:** bug
- `grandTotal` sums item prices without currency normalization

### [CQS-20] `AuthContext` missing token refresh / expiry handling

- **Severity:** P2 . **Effort:** M . **Category:** consistency
- `staleTime: Infinity` means auth state never re-fetched after initial load

### [CQS-21] Missing test coverage for multiple web-client components

- **Severity:** P2 . **Effort:** L . **Category:** test-quality
- No render tests: ErrorBoundary, Header, MockChatBox, PreferencesWizard (container), BookingConfirmation
- No test files: Footer, GoogleIcon, VibeLensBar

### [CQS-22] `userPreferences` route uses per-route `requireAuth` instead of `router.use()`

- **Severity:** P2 . **Effort:** S . **Category:** consistency
- Error-prone when adding routes. `trips.ts` uses `router.use(requireAuth)`.

### [CQS-23] `CircuitBreaker` allows concurrent probes in half-open state

- **Severity:** P2 . **Effort:** S . **Category:** bug
- Two simultaneous requests can both pass through when cooldown expires

### [CQS-24] `register/page.tsx` wizard close always redirects to `/trips/new`

- **Severity:** P2 . **Effort:** S . **Category:** bug
- User who cancels preferences wizard is still routed to start a new trip

### [CQS-25] `faq/page.tsx` uses `dangerouslySetInnerHTML` for JSON-LD

- **Severity:** P2 . **Effort:** S . **Category:** security
- Static content now, but future dynamic content would introduce XSS

### [CQS-26] Commented-out Google OAuth blocks in login/register pages

- **Severity:** P2 . **Effort:** S . **Category:** dead-code
- Large commented-out blocks with `TODO`. Should be tracked and removed.

### [CQS-27] `loginWithGoogle` throws "not yet implemented"

- **Severity:** P2 . **Effort:** S . **Category:** dead-code
- Exported in AuthContext but immediately throws. No tracking issue.

### [CQS-28] `metrics.service.ts` largely unused instrumentation

- **Severity:** P3 . **Effort:** S . **Category:** dead-code
- `trackApiCall`, `trackRateLimit`, `trackCacheOperation` never called by the services that should use them

### [CQS-29] `toolSchemas` export in `schemas.ts` is dead code

- **Severity:** P3 . **Effort:** S . **Category:** dead-code
- Never imported. Executor uses individual named schemas.

### [CQS-30] `TripDetailsForm` trip_type field is dead state

- **Severity:** P3 . **Effort:** S . **Category:** dead-code
- Full rendering logic but `handleSubmit` never reads `values.trip_type`

---

## 2026-04-06 audit run (P2 and P3 findings)

### Engineering (tech debt)

### [ENG-05] No Sentry / error tracking integrated

- **Source:** engineering §Operational Basics
- **Severity:** P2 · **Effort:** M · **Category:** observability
- **Notes:** logs-plus-post-deploy-check partially mitigates. Adding Sentry to both server and web-client is a significant observability win for an agentic product that has many failure modes.

### [ENG-06] No `pnpm audit` in CI, no Dependabot / Renovate

- **Source:** engineering §Dependencies
- **Severity:** P2 · **Effort:** L · **Category:** security / tech-debt
- **Notes:** A repo with ~40 dependencies and no automated dependency updates will drift into CVEs within 6-12 months. Add `pnpm audit --prod` to CI and wire up Dependabot via `.github/dependabot.yml`.

### [ENG-07] Chat endpoint has no integration test

- **Source:** engineering §Testing
- **Severity:** P2 · **Effort:** M · **Category:** testing
- **Notes:** SSE flow, auth, rate limit, 409 conflict under lock. The critical-path endpoint has only unit tests.

### [ENG-08] Dockerfile runs as root

- **Source:** engineering §Deployment, security §Infrastructure
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Use `USER node` (already present in `node:22-slim`). Quick hardening win.

### [ENG-09] Smoke test script not wired to CI

- **Source:** engineering §Operational Basics
- **Severity:** P2 · **Effort:** S · **Category:** testing
- **Notes:** `scripts/smoke-test.sh` is referenced from `package.json` but may not exist. Verify and wire into CI.

### [ENG-15] Evaluate test suite for bloat, thinness, AND confidence theater

- **Source:** Plan B / option B follow-up (2026-04-06), reinforced by the Doppelscript Haiku code-fence incident the same day
- **Severity:** P2 · **Effort:** M · **Category:** testing / quality
- **Notes:** Run a research subagent (after option B merges so the CI baseline is green) that produces `docs/audits/YYYY-MM-DD-test-suite-evaluation.md`. Goal: smallest set of tests that catches the bugs that matter, with zero confidence theater. Three failure modes to evaluate: bloat (redundant), thinness (gaps), confidence theater (passing tests that wouldn't catch real bugs).

  **Bloat signals:** redundant assertions, coverage delta of zero when a test is removed, test:source LoC ratio outliers, runtime per assertion, tests that have never failed in CI history.

  **Thinness signals:** files with no tests, branch coverage gaps, fix commits without paired tests (cross-ref the fix-commit-gate violations from the 2026-04-06 retrospective: 35 of 51 fix commits violate test-first), user stories without real E2E coverage (the 10 current test.fixme markers are hidden gaps).

  **Confidence theater signals (per the no-confidence-theater rule in `~/.claude/CLAUDE.md`):**
  1. Self-mock: `vi.mock('./foo')` inside `foo.test.ts`
  2. Mocked dependency that IS the thing being tested (parser tested with pre-parsed input)
  3. Mock-call assertions without behavior assertions (`toHaveBeenCalled` only)
  4. Snapshot-only tests with no behavioral assertion
  5. Mocking the integration boundary the test claims to cross (repository tests that mock the db pool)
  6. Tautological assertions (assertion guaranteed by setup)
  7. Loose-shape only assertions (`toBeDefined`, `toBeTruthy`, "no throw")
  8. Skipped tests with no comment or triage reference
  9. Always-failing tests that linger
  10. LLM-consumer tests that hand-mock the model response shape instead of using a real captured fixture (the Doppelscript anchor incident: a Haiku markdown code-fence bug shipped because tests mocked the JSON the parser was supposed to consume; only a live calibration run caught it)

  Deliverable sections: per-package inventory (server, web-client, e2e), top 10 bloat candidates, top 10 thinness gaps, top 10 confidence theater violations with file:line evidence, top 10 untested files with addition candidates, never-failed-in-CI list, coverage map by user story / audit ID / fix commit, concrete add/delete/rewrite recommendations.

  **Deletion threshold:** redundant AND source is stable AND removing it does not drop branch coverage. Three signals before touching anything.

  **Confidence-theater rewrite threshold:** any test that fails the "if I delete the implementation and throw, would this test fail?" check must be rewritten to assert behavior, not interactions. LLM-consumer tests must use a real captured fixture, not a hand-mock.

### [ENG-14] E2E config has no fail-fast smoke check; misconfigurations burn CI time

- **Source:** Plan B / option B follow-up (2026-04-06 incident)
- **Severity:** P2 · **Effort:** S · **Category:** testing / CI / DX
- **Notes:** A 15-minute CI run failed because `CORS_ORIGIN` defaulted to the legacy `http://localhost:5173` (Vite) while Next.js dev runs on `:3000`. Every browser request from the test runner returned `net::ERR_FAILED` and Playwright dutifully retried each of 35 specs three times before reporting failure. The actual problem was a single env var. The lesson: any precondition that, if wrong, would invalidate every test, must be checked BEFORE Playwright spins up. Concrete fix: add a `scripts/e2e-smoke.sh` (or extend `e2e-precheck.sh`) that runs after the webServer is up and BEFORE the test step, hitting `GET /health` and `OPTIONS /auth/login` from `Origin: http://localhost:3000`, and exits non-zero with a clear message if either the server is down OR CORS is misconfigured. Wire it as a workflow step between `playwright install` and `pnpm test:e2e`. Same principle for any future "every test depends on X being true" precondition: assert it explicitly, fail fast, do not let Playwright discover it via 35 consecutive timeouts. Related class: any "legacy default" in a config file (Vite port, old project name, deprecated env var name) is a landmine; add a startup-time validation that flags suspicious defaults when `NODE_ENV=test` or `CI=true`.

### [ENG-13] E2E suite runtime is slower than it should be

- **Source:** Plan B / option B follow-up (2026-04-06)
- **Severity:** P2 · **Effort:** M · **Category:** testing / CI
- **Notes:** Voyager has ~42 Playwright tests with all externals mocked (SerpApi, Google Places, Anthropic via `MockAnthropicClient`). A healthy run at this size and config should land around 6 to 8 minutes; observed CI runs are sitting at 11+ minutes. Two concrete fixes: (1) bump `workers` from 1 to 2 or 4 in `playwright.config.ts` with per-worker test database isolation so the seedUser fixture does not collide. About 2x speedup. (2) Investigate retry frequency. With `retries: 2` a single flaky spec costs 3x its base time. If 10 percent of specs retry, that adds roughly 30 percent wall time. Goal: zero retries on a green run. Once the suite is below 5 minutes the `e2e-fast` lefthook hook can be promoted from warning to blocking.

### [ENG-10] Partial tool-call progress visibility lost at 15-call limit

- **Source:** engineering §AgentOrchestrator
- **Severity:** P3 · **Effort:** M · **Category:** observability
- **Notes:** When the tool-call limit is hit mid-batch, the `toolCallsUsed` and `nodes` arrays lose partial progress visibility. Preserve them in the orchestrator result.

### [ENG-11] No rollback runbook in `docs/`

- **Source:** engineering §Operational Basics
- **Severity:** P3 · **Effort:** S · **Category:** documentation
- **Notes:** Railway has built-in rollback but the procedure is not written down.

---

### Security (hardening)

### [SEC-05] Postgres RLS policies missing

- **Source:** security §Authorization
- **Severity:** P2 · **Effort:** L · **Category:** security
- **Notes:** CLAUDE.md promises RLS but none is configured. Add RLS policies on all user-owned tables (trips, conversations, user_preferences).

### [SEC-06] CSRF uses header-presence check, not synchronizer-token pair

- **Source:** security §CSRF
- **Severity:** P2 · **Effort:** M · **Category:** security
- **Notes:** Upgrade to a synchronizer-token cookie pair for stronger CSRF protection.

### [SEC-07] `err.message` returned in non-production can leak SerpApi error bodies

- **Source:** security §Secrets Management
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** `errorHandler` returns `err.message` when `NODE_ENV !== 'production'`. Log full, respond scrubbed always.

### [SEC-08] Auth rate limiter is single (login + register + reset)

- **Source:** security §API Security
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Separate into `loginLimiter` and `registerLimiter` with different budgets.

### [SEC-09] `activeConversations` exposed in `/health/ready` payload

- **Source:** security §API Security
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Don't leak active user IDs in a public health endpoint.

### [SEC-10] Password complexity weak

- **Source:** security §P2
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Reject top-1000 breached passwords. Require >=12 chars OR mixed classes.

### [SEC-11] Per-account failed-login backoff not enforced

- **Source:** security §P2
- **Severity:** P2 · **Effort:** M · **Category:** security
- **Notes:** After N failed logins for the same account, introduce exponential backoff independent of IP rate limiting.

### [SEC-12] `requestLogger` may log `req.body`

- **Source:** security §Data Protection
- **Severity:** P2 · **Effort:** S · **Category:** privacy
- **Notes:** Verify the request logger does not record `req.body` at any log level.

### [SEC-13] `deleteExpiredSessions` not scheduled

- **Source:** security §Data Protection
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Sessions never expire without a scheduled cleanup job.

### [SEC-14] Tool input schemas too permissive

- **Source:** security §Input Validation §IV3
- **Severity:** P2 · **Effort:** M · **Category:** security
- **Notes:** Tighten tool input schemas to a restrictive character class. Cross-ref SEC-03 (P1).

### [SEC-15] `updateTrip` body not Zod-parsed

- **Source:** security §IV4
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Use `updateTripSchema.partial()` on the body.

### [SEC-16] Strip system-prompt-like substrings from tool output before return

- **Source:** security §L2
- **Severity:** P2 · **Effort:** M · **Category:** security
- **Notes:** Defense in depth against prompt-injection exfiltration.

### [SEC-17] Remaining moderate CVEs plus CI audit gate

- **Source:** security §D5-D7
- **Severity:** P2 · **Effort:** S · **Category:** security
- **Notes:** Cross-ref ENG-06.

### [SEC-18] Session rotation hooks for password / email change

- **Source:** security §P3
- **Severity:** P3 · **Effort:** S · **Category:** security
- **Notes:** Rotate session on password / email change when those endpoints ship.

### [SEC-19] Session TTL and refresh semantics not verified

- **Source:** security §P3
- **Severity:** P3 · **Effort:** S · **Category:** security

### [SEC-20] Circuit breaker uses substring error classification

- **Source:** security §P3
- **Severity:** P3 · **Effort:** S · **Category:** reliability
- **Notes:** Replace with structured error codes.

### [SEC-21] `NEXT_PUBLIC_GOOGLE_MAPS_KEY` may be shared with server key

- **Source:** security §Secrets
- **Severity:** P3 · **Effort:** S · **Category:** security
- **Notes:** Verify referrer-restricted and separate from server-side Places key. If shared, split and rotate.

### [SEC-22] Dockerfile HEALTHCHECK directive missing

- **Source:** security §I2
- **Severity:** P3 · **Effort:** S · **Category:** infra
- **Notes:** Railway has its own probe; useful for other runtimes.

### [SEC-23] Helmet CSP may break SSE

- **Source:** security §I3
- **Severity:** P3 · **Effort:** S · **Category:** security
- **Notes:** Verify CSP does not block the SSE chat endpoint in production.

### [SEC-24] HSTS preload submission for production domain

- **Source:** security §I4
- **Severity:** P3 · **Effort:** S · **Category:** security

### [SEC-25] `railway.server.toml` / `railway.web.toml` healthcheck path and restart policy

- **Source:** security §I5
- **Severity:** P3 · **Effort:** S · **Category:** infra

---

### UX (polish)

### [UX-09] Loading state inconsistency across routes

- **Source:** ux §Feedback & State Communication
- **Severity:** P2 · **Effort:** S · **Category:** ux
- **Notes:** `trips/new` has spinner + message; `trips/[id]` has plain "Loading trip..."; `trips` has plain "Loading trips...". Normalize.

### [UX-10] No client-side welcome coachmark on first trip detail view

- **Source:** ux §Onboarding
- **Severity:** P2 · **Effort:** M · **Category:** ux

### [UX-11] Tool-call progress nodes do not summarize what the agent found

- **Source:** ux §Feedback
- **Severity:** P2 · **Effort:** M · **Category:** ux
- **Notes:** Each `tool_progress` node should render a collapsible summary on completion ("Searched flights DEN to SFO Apr 15-20, found 42 options, picked 3 under $450").

### [UX-12] BookingConfirmation modal has 2.2s hardcoded animation without `prefers-reduced-motion` check

- **Source:** ux §Accessibility
- **Severity:** P2 · **Effort:** S · **Category:** a11y
- **Notes:** Cross-ref DES-03. Users with vestibular disorders forced through the animation.

### [UX-13] DOM-scraping auto-save in ChatBox

- **Source:** ux §Forms & Input
- **Severity:** P2 · **Effort:** M · **Category:** tech-debt
- **Notes:** `ChatBox.tsx:91-117` uses `document.getElementById()` to scrape form values on send. Replace with controlled form state lifted to ChatBox.

### [UX-14] Booking success state auto-dismisses after 1.5s

- **Source:** ux §Feedback
- **Severity:** P2 · **Effort:** S · **Category:** ux
- **Notes:** Let the user dismiss manually. 1.5s is too fast to savor the moment.

### [UX-15] 404 vs 500 not distinguished on trip detail error

- **Source:** ux §Error Recovery
- **Severity:** P2 · **Effort:** S · **Category:** ux

### [UX-16] PreferencesWizard does not explain "why we ask" before personal questions

- **Source:** ux §Critical Path
- **Severity:** P2 · **Effort:** S · **Category:** ux

### [UX-17] SelectableCardGroup selection is reversible only via chat

- **Source:** ux §Destructive Actions, §Error Recovery
- **Severity:** P2 · **Effort:** M · **Category:** ux
- **Notes:** Add an "unselect" affordance.

### [UX-18] Verify US-4 (destination detail page) exists

- **Source:** ux §US Coverage
- **Severity:** Verify-first · **Effort:** S · **Category:** ux
- **Notes:** Not confirmed during audit. Blocks US-5 if missing.

### [UX-19] Verify US-5 pre-fill from destination page to `/trips/new`

- **Source:** ux §US Coverage
- **Severity:** P2 · **Effort:** S · **Category:** ux
- **Notes:** `trips/new/page.tsx` does not accept a query param. Story is not implemented as written.

### [UX-20] Wizard overlay click closes without confirming unsaved state

- **Source:** ux §Forms & Input
- **Severity:** P3 · **Effort:** S · **Category:** ux

### [UX-21] Unify "Booked" vs "Saved" terminology

- **Source:** ux §Consistency
- **Severity:** P3 · **Effort:** S · **Category:** ux
- **Notes:** DB status is `saved`, UI label is "Booked". Pick one.

---

### Design (polish)

### [DES-05] Type scale drift in extended tokens (beyond the P1 core)

- **Source:** design §Typography
- **Severity:** P2 · **Effort:** M · **Category:** design

### [DES-06] Component library structure (`components/ui/`) not established

- **Source:** design §Design System Maturity
- **Severity:** P2 · **Effort:** L · **Category:** design
- **Notes:** Cross-ref DES-04 (P1).

### [DES-07] Empty state visuals inconsistent

- **Source:** design §Polish & Craft
- **Severity:** P2 · **Effort:** M · **Category:** design

### [DES-08] Skeleton screens missing on several routes

- **Source:** design §Polish & Craft
- **Severity:** P2 · **Effort:** M · **Category:** design

### [DES-09] Focus states visible on some interactive elements and not others

- **Source:** design §Polish & Craft
- **Severity:** P2 · **Effort:** S · **Category:** a11y

### [DES-10] Alt text strategy inconsistent (decorative vs meaningful)

- **Source:** design §Hero & Imagery
- **Severity:** P3 · **Effort:** M · **Category:** a11y

---

### Marketing (polish)

### [MKT-09] Onboarding does not recurrently explain the product

- **Source:** marketing §Onboarding
- **Severity:** P2 · **Effort:** M · **Category:** marketing

### [MKT-10] No referral or retention loop

- **Source:** marketing §Growth Loops & Retention
- **Severity:** P2 · **Effort:** L · **Category:** marketing

### [MKT-11] No "save a trip to email" or similar re-engagement mechanic

- **Source:** marketing §Growth Loops
- **Severity:** P2 · **Effort:** M · **Category:** marketing

### [MKT-12] Destination page SEO opportunities not exploited

- **Source:** marketing §SEO
- **Severity:** P2 · **Effort:** M · **Category:** marketing

### [MKT-13] FAQ does not lead with the most common question

- **Source:** marketing §CTAs & Microcopy
- **Severity:** P3 · **Effort:** S · **Category:** marketing

### [MKT-14] MockChatBox demo caption says Barcelona but shows Monterey

- **Source:** marketing §Top copy rewrites
- **Severity:** P3 · **Effort:** S · **Category:** marketing

---

### Financial (observability)

### [FIN-08] Amadeus cleanup (separate from ENG-03 schema migration)

- **Source:** financial §Amadeus
- **Severity:** P2 · **Effort:** M · **Category:** tech-debt
- **Notes:** Verify no personal Amadeus dev account is sitting active with a stored credit card from early prototyping.

### [FIN-09] Infrastructure plans and MTD spend not documented

- **Source:** financial §Unaudited Services
- **Severity:** P2 · **Effort:** S · **Category:** financial
- **Notes:** Create `docs/BILLING.md` documenting current plan and monthly cost per service.

### [FIN-10] Anthropic "no training on API data" setting not verified

- **Source:** financial §Compliance
- **Severity:** P2 · **Effort:** S · **Category:** privacy / financial

### [FIN-11] `/health/cost` admin endpoint for MTD spend per provider

- **Source:** financial §P3 rec 12
- **Severity:** P3 · **Effort:** M · **Category:** observability
- **Notes:** Depends on FIN-04 (P1) being landed first.

---

### Legal (backlog)

### [LEG-13] `ATTRIBUTIONS.md` for images, fonts, icons

- **Source:** legal §Copyright
- **Severity:** P2 · **Effort:** S · **Category:** legal

### [LEG-14] License scan in CI

- **Source:** legal §Open Source License Compliance
- **Severity:** P2 · **Effort:** M · **Category:** legal / security
- **Notes:** Run `pnpm licenses list` with an allowlist. Fail CI on GPL/AGPL/SSPL packages in production deps.

### [LEG-15] Internal RoPA (GDPR Art. 30)

- **Source:** legal §Missing Documents
- **Severity:** P2 · **Effort:** M · **Category:** legal
- **Notes:** Not public, but required.

### [LEG-16] `/accessibility` statement

- **Source:** legal §Accessibility Compliance
- **Severity:** P2 · **Effort:** S · **Category:** legal / a11y
- **Notes:** EAA requirement.

### [LEG-17] Sub-processors list page

- **Source:** legal §Data Processing Agreements
- **Severity:** P2 · **Effort:** S · **Category:** legal

### [LEG-18] `security.txt` and responsible disclosure policy

- **Source:** legal §Post-launch
- **Severity:** P3 · **Effort:** S · **Category:** security / legal

### [LEG-19] Quarterly review of FTC guidance on AI deceptive practices

- **Source:** legal §Post-launch
- **Severity:** P3 · **Effort:** ongoing · **Category:** legal

---

## How to use this file

- New audit runs append a new `## YYYY-MM-DD audit run` section at the top.
- P0 and P1 items go to the current triage file under `docs/audits/`, not here.
- Resolved items are removed entirely. Git history preserves the record.
- Deduplicate across audits by cross-referencing IDs (e.g., `cross-ref LEG-02`).
