# Code Quality Sweep - Design Spec

**Date:** 2026-05-27
**Scope:** `server/src/` (~20k LOC) and `web-client/src/` (~13k LOC)
**Goal:** Comprehensive quality audit -- bugs, consistency, dead code, build hygiene, naming conventions -- cataloged as P0-P3 findings, then fixed in priority order.

## Approach

Directory-by-directory serial sweep. Walk each subdirectory in order, read every source file, note issues into a single findings document. Fix phase follows after the sweep is complete.

## Output

Single findings document: `docs/audits/2026-05-27-code-quality-sweep.md`

### Severity definitions

| Severity | Definition                                                                     | Action                      |
| -------- | ------------------------------------------------------------------------------ | --------------------------- |
| P0       | Production correctness: bugs, data loss, security                              | Fix immediately after sweep |
| P1       | Should fix soon: wrong patterns that will cause bugs, R-200 test anti-patterns | Fix in same session         |
| P2       | Tech debt: dead code, build hygiene, inconsistency, unnecessary complexity     | Fix or log to ISSUES.md     |
| P3       | Nice to have: naming nits, minor style drift, doc gaps                         | Log to ISSUES.md            |

### Finding format

Each finding includes:

- Severity tag (P0/P1/P2/P3)
- File path with line number
- One-sentence description
- Category tag (bug, dead-code, build, type-safety, test-quality, consistency, security, naming, duplication, imports)

## Server sweep order (10 zones)

| Zone | Directories                | Key files                                                                                                                                                                                                                             |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | config/, constants/, data/ | env.ts, corsConfig.ts, session.ts, cities.ts                                                                                                                                                                                          |
| 2    | db/                        | pool.ts                                                                                                                                                                                                                               |
| 3    | handlers/                  | auth.ts, chat.ts, chat.helpers.ts, photoProxy.handler.ts, trips.ts, userPreferences.ts                                                                                                                                                |
| 4    | middleware/                | csrfGuard.ts, errorHandler.ts, notFoundHandler.ts, rateLimiter.ts, requestLogger.ts, requireAuth.ts                                                                                                                                   |
| 5    | prompts/                   | booking-steps.ts, system-prompt.ts, trip-context.ts                                                                                                                                                                                   |
| 6    | repositories/              | agent-turn-cost.ts, auth.ts, conversations.ts, tool-call-log.ts, trips.ts, userPreferences.ts                                                                                                                                         |
| 7    | routes/                    | auth.ts, places.ts, trips.ts, userPreferences.ts                                                                                                                                                                                      |
| 8    | schemas/                   | auth.ts, trips.ts, userPreferences.ts                                                                                                                                                                                                 |
| 9    | services/                  | agent.service.ts, AgentOrchestrator.ts, cache.service.ts, enrichment.ts, metrics.service.ts, node-builder.ts, serpapi.service.ts, serpApiQuota.service.ts, tokenBudget.service.ts, mock-anthropic-client.ts, enrichment-sources/\*.ts |
| 10   | tools/                     | budget.tool.ts, car-rentals.tool.ts, definitions.ts, destination.tool.ts, executor.ts, experiences.tool.ts, flights.tool.ts, hotels.tool.ts, schemas.ts, mock/\*.ts                                                                   |

Also: utils/ (ApiError, CircuitBreaker, logger, parsers), types/express.d.ts, app.ts, index.ts.

## Web-client sweep order (6 zones)

| Zone | Directories           | Key files                                                                                                                                                 |
| ---- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | app/                  | layout.tsx, page.tsx, all route pages (login, register, account, trips, explore, faq)                                                                     |
| 2    | components/ChatBox/   | ChatBox.tsx, NodeRenderer.tsx, VirtualizedChat.tsx, useSSEChat.ts, TripDetailsForm.tsx, 10 node types, 8 widgets                                          |
| 3    | Other components/     | AuthGuard, BookingConfirmation, DemoBanner, ErrorBoundary, Footer, Header, MockChatBox, PreferencesWizard (+ 6 steps), Toast, VibeLensBar, ui/AlertDialog |
| 4    | context/ + providers/ | AuthContext.tsx, QueryProvider.tsx                                                                                                                        |
| 5    | lib/                  | api.ts, constants.ts, destinationImage.ts, format.ts, preferenceOptions.ts                                                                                |
| 6    | data/ + test/         | destinations.ts, setup.ts                                                                                                                                 |

## Checklist per file

- [ ] Dead code: unused exports, unreachable branches, commented-out blocks
- [ ] Build hygiene: test files in dist (128 already identified), unnecessary includes
- [ ] Type safety: `any` usage, missing narrowing, unsafe casts
- [ ] R-200 test anti-patterns: self-mock, tautological, mock-only assertions, snapshot-only
- [ ] Error handling: consistent patterns across similar modules
- [ ] Naming/structure: consistency within each layer (all handlers same shape, all repos same shape)
- [ ] Duplication: between files that should share logic
- [ ] Security: unvalidated inputs, injection vectors
- [ ] Import hygiene: circular deps, unused imports

## Known issue (pre-sweep)

128 test files are compiled into `server/dist/`. The `tsconfig.json` includes `src/**/*.ts` without excluding `**/*.test.ts`. This will be logged as a P2 build hygiene finding.

## Post-sweep fix phase

1. Commit findings doc to the worktree branch
2. Fix P0 issues first, one commit per finding (per R-204)
3. Fix P1 issues next
4. P2/P3: fix trivial items inline, log the rest to ISSUES.md
5. Squash merge the branch to main when complete
