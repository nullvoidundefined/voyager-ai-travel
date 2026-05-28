# Session Handoff -- 2026-05-28 (Opus sweep)

## Last commit

`bcd7502` chore(marketing): portfolio-appropriate final CTA copy

## Production state

No deploy. All changes on `main`, not pushed.

## What shipped

**Bug fixes (TDD)**

- `dfad2a8` fix(SEC-01) -- IDOR on leg delete/reorder closed. Repo SQL scopes to `trip_id`. 3 integration tests + 2 handler tests. CVSS 7.1 closed.
- `94914a1` fix(ORC-01) -- `add_leg`/`remove_leg`/`reorder_legs` added to `flight`+`conversation` partitions; `plan_daily_schedule` added to `experience`+`conversation`. 4 partition tests.
- `bcd7502` chore(marketing) -- "Get Started Free" -> "Try the live demo".

**Audits + todo cleanup**

- `c10e3df` 3 Opus second-opinion audits (criticism, security, UX); engineering Opus at `8096a61`.
- `a502275` Audit findings folded into P1/P2/P3 todos.
- `8e6eaba` Worktree-merge P1 split into 3 forward-port entries (worktree predates monorepo restructure `2672b52`; cherry-pick fails).
- `5388cb6` + `c16c515` + `6ee5545` Removed 12 stale P1s (OG metadata, BILLING.md, Toast role, focus traps, US-5/US-12, useSSEChat, trips/new, handleNext, DemoBanner, schemas allowlist, chat length cap, SEC-01, ORC-01).

**Net P1: 25 -> 13.** 10 of the deletions were stale audit recommendations already addressed but never removed from the todos.

## Pending P1 (`docs/todos/P1-high-priority.md`)

**Highest impact / smallest scope:**

1. CQS-16 hotel address empty -- `apps/server/src/tools/hotels.tool.ts:81` `address: ''`. ~30 min.
2. F-06 instant tile selection -- `SelectableCardGroup.tsx:33-38` removed Confirm. Re-add gate or surface Undo chip. ~45 min.
3. B13 agent ignores explicit selections -- tune `apps/server/src/prompts/sub-agents/{flight,hotel,experience}.prompt.ts`. ~1 hr.

**Larger scope:**

4. Forward-port P1-03 (DB-truth budget) -- add `getActualCostsForTrip(tripId)` to `apps/server/src/repositories/trips/trips.ts`, wire executor. Reference worktree `4aa4fce`. ~2 hr.
5. Forward-port P1-05 (multi-airport) -- extend `apps/server/src/data/cities.ts` schema, update `destination.tool.ts`. Reference `ebf2c6b`. ~1 hr.
6. CQS-11 enrichment swallows errors -- `enrichment.ts:23-39` rejection branch needs `logger.warn`. ~30 min.
7. B18 itinerary above chat -- swap layout in `apps/client/web/src/app/(protected)/trips/[id]/page.tsx`. ~30 min.
8. B20 double confirm buttons on flight tile -- locate duplicate site below SelectableCardGroup. ~30 min.
9. trips/[id] PUT errors -- `handleConfirmBooking:211-219` needs optimistic rollback + Toast. ~30 min.
10. AI disclosure at chat entry (EU AI Act Art. 52). ~30 min.

**Marketing / docs:**

11. GitHub source link in `apps/client/web/src/components/Header/Header.tsx`. ~15 min.
12. Font-size pixel literals -> design tokens. 574 instances. Dedicated session, sed-rewrite + smoke.

**Manual external (user action):**

13. Sign Anthropic DPA.
14. Verify GCP Places billing cap.
15. Rotate Mapbox public token (still retrievable via `git show f36d7d6:web-client/.env.example`).

## Worktree cleanup gate

`.claude/worktrees/investigate-llm-orchestration` has 5 unmerged commits. Delete only after forward-ports for P1-03, P1-05, P2-01 (Redis lock), P2-04 (car_rental_cost), P3-08 (experience categories) land on main.

## Next session entry

1. Read `docs/todos/P1-high-priority.md` (13 entries).
2. Start CQS-16 -- smallest, most visible, ~30 min TDD.
3. Strict TDD per R-511 still in force; the SEC-01 / ORC-01 RED -> GREEN pattern worked cleanly.
4. P2 and P3 likely contain similar ~30-50% staleness. Audit before fixing.

## Lessons (avoid repeating)

- Verify audit-as-todos against current code before fixing. The 2026-05-27 sweep was 40%+ stale.
- Don't auto-cherry-pick worktrees that predate the monorepo restructure.
- Copy changes are `chore:` / `style:`, not `fix:` -- the gate hook will block.
