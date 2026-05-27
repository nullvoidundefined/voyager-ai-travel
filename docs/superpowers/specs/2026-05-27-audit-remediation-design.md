# Audit Remediation: 2026-05-27 All-Hands Findings

**Goal:** Fix all 50 actionable code findings from the 2026-05-27 all-hands audit (Engineering, Security, Criticism, UX, Design). Three items requiring manual user action (DATABASE_URL rotation, Google Maps key verification, projects/voyager repo cleanup) are deferred.

**Execution:** 5 domain batches, each producing a discrete commit (or small set of commits). Batches are independent and can be parallelized.

---

## Batch 1: Security (8 items)

1. Replace real Neon credential in `server/.env.example` with placeholder `postgresql://user:password@host:5432/dbname`
2. Bump `next` from 15.5.14 to `^15.5.18` in `web-client/package.json`, run `pnpm install`
3. Apply `locationAllowlist` regex to `categories[]` in `server/src/tools/schemas.ts:49`
4. Apply `locationAllowlist` to `select_hotel`, `select_car_rental`, `select_experience` string fields in `schemas.ts`
5. Add `MAX_MESSAGE_LENGTH = 2000` constant; validate in chat handler before processing
6. Bump `@anthropic-ai/sdk` to `^0.91.1` in `server/package.json`, run `pnpm install`
7. Gate `POST /:id/test-selections` route registration on `process.env.NODE_ENV !== 'production'`
8. Add `updateTripSchema.partial()` Zod validation to `updateTrip` handler in `server/src/handlers/trips/trips.ts`

## Batch 2: Engineering/CI (10 items)

1. Add `pnpm --filter voyager-web run test` step to `.github/workflows/ci.yml`
2. Fix `cors.integration.test.ts` to set `CORS_ORIGIN` explicitly before app import
3. Migrate `rateLimiter.ts` private Redis client to `import { getRedis } from './redis.service.js'`
4. Bump `web-client/tsconfig.json` target from `ES2017` to `ES2018` (or remove `/s` regex flag)
5. Add `rm -rf dist &&` prefix to `build` script in `server/package.json`
6. Add `USER node` after `COPY` stage in `Dockerfile.server`
7. Move `query('SELECT NOW()')` health check from module scope into `startServer()` in `server/src/app.ts`
8. Add `pnpm --filter voyager-web run test:smoke` to CI if smoke script exists
9. Add `setInterval(() => deleteExpiredSessions(), 60 * 60 * 1000)` in `startServer()` (or a dedicated startup hook)
10. Add `pnpm --filter voyager-web exec -- npx next info` or `pnpm audit` for web-client to CI

## Batch 3: UX/A11y (12 items)

1. Add `useSearchParams()` to `trips/new/page.tsx`; seed `destination` field from `?destination=` query param
2. Migrate PreferencesWizard overlay to Radix Dialog (provides focus trap, Esc handling, aria)
3. Migrate BookingConfirmation overlay to Radix Dialog
4. Add `role="alert"` and `aria-live="assertive"` to `Toast.tsx` root element
5. Preserve redirect target in AuthGuard: store intended path, redirect after login (US-12)
6. Add `role="alert"` to form error `<p>` elements in login, register, trip forms
7. Add `aria-live="polite"` region in ChatBox for agent status ("Agent is thinking...")
8. Remove FAQ claim about account deletion (faq/page.tsx) OR implement delete-account feature
9. Convert weather table in destination detail from ARIA roles to native `<table>` with `scope` attributes
10. Unify "Book now" chip, "Booked" badge, "Save itinerary" button to consistent "Save itinerary" / "Saved" language
11. Add `aria-label="Sending message"` to send button during loading state
12. Add `jest-axe` to vitest setup and add axe assertions to existing component tests

## Batch 4: Design/Tokens (14 items)

1. Rewrite `DemoBanner.module.scss` to use Voyager tokens (`--warning`, `--surface-alt`, `--border`)
2. Fix `AlertDialog.module.scss` fallback from `#c2410c` to correct `--accent` value; use `--ease-out` for animations
3. Define and document: `--cta` = primary action (coral), `--accent` = secondary/info (blue). Update chat-flow buttons to use `--cta`.
4. Define spacing tokens in `globals.scss`: `--space-2xs: 2px`, `--space-xs: 4px`, `--space-sm: 8px`, `--space-md: 16px`, `--space-lg: 24px`, `--space-xl: 32px`, `--space-2xl: 48px`
5. Define breakpoint tokens: `--bp-mobile: 480px`, `--bp-tablet: 768px`, `--bp-desktop: 1024px`, `--bp-wide: 1440px`
6. Fix logo: both header and footer use `--cta` (coral) or both use `--foreground` (navy). Pick one.
7. Define `--overlay-bg: rgba(0, 0, 0, 0.5)` token; replace 3 different backdrop treatments
8. Extract duplicated `@keyframes` (slideUp, typingDot, spin, fadeSlideIn) to `web-client/src/styles/animations.scss`; import in consumers
9. Define `--font-weight-bold: 700` token in `globals.scss`; replace raw `700` values
10. Define `--font-mono` token; replace raw `font-family: monospace`
11. Fix `ErrorBoundary.module.scss` to use `px` consistent with rest of codebase
12. Add success (green) and info (blue) Toast color variants alongside existing danger (red)
13. Add peek/fade gradient on tile horizontal scroll to signal more content
14. Fix PreferencesWizard select focus ring (use `outline` not just `border-color`)

## Batch 5: Docs/Cleanup (6 items)

1. Update CLAUDE.md line 7, README lines 48/201/212: change "15 tool calls" to "8 tool calls"
2. Remove dead `FULL_APPLICATION_SPEC.md` pointer from `.claude/bottomlessmargaritas/CLAUDE.md` if present
3. Delete `server/src/services/metrics.service.ts` and remove any imports
4. Replace `BookingConfirmation.content.test.ts` string-grep assertions with actual render tests
5. Replace ChatBox magic-string "Confirm booking" intercept with explicit event/prop
6. Clean up stale `settings.local.json` permissions for deleted paths

---

## Out of scope (manual user action, deferred)

- Rotate DATABASE_URL in Neon dashboard
- Verify NEXT_PUBLIC_GOOGLE_MAPS_KEY has HTTP referrer restrictions in Google Cloud Console
- Resolve `projects/voyager` vs `production/voyager` workspace divergence
- Sentry integration (ENG-05, infrastructure decision)
- Chat endpoint integration test (ENG-07, requires real SSE + auth + rate limit orchestration)

## Testing strategy

- Each batch runs full verification: `pnpm format:check && pnpm lint && pnpm test && pnpm build`
- Security batch: run `pnpm audit` after dependency bumps
- UX batch: run existing E2E suite to verify no regressions
- Design batch: visual verification of token changes (dev server)
- New test files required for: message length validation, updateTrip Zod validation, deleteExpiredSessions scheduling, jest-axe integration, BookingConfirmation render tests
