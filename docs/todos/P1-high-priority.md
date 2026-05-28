# P1: High Priority

Fix in the first work session. These are trust-breakers, layout inversions, or missing signals that undermine the portfolio impression within 2 minutes of use.

---

## Fix B13: Agent Ignores Explicit User Selections

When a user says "I want the InterContinental Plaza Hotel," Claude presents alternatives instead of confirming the selection.

**Why P1:** For a portfolio piece whose thesis is "agentic reasoning," an agent that ignores explicit instructions is the worst possible demo of the capability.

**Scope:** Update category prompts to instruct Claude to honor explicit selections and confirm rather than suggest alternatives.

**Roles:** Criticism, UX

---

## Sign Anthropic DPA

Every registered user's messages are sent to Anthropic. Without a signed DPA, no GDPR data subject deletion request can be honored downstream.

**Why P1:** Self-service via Anthropic Console, 10 minutes. Removes a compliance gap.

**Scope:** Anthropic Console > sign DPA.

**Roles:** Legal

---

## Add AI Disclosure at Chat Entry Point

No disclosure that the user is chatting with an AI agent.

**Why P1:** EU AI Act Art. 52 requires disclosure at the point of interaction, not buried in docs.

**Scope:** Add a subtle banner or first-message system note: "You are chatting with an AI agent. Verify flight prices before booking."

**Roles:** Legal

---

## Verify Google Cloud Places API Billing Cap

`docs/BILLING.md` shows the GCP billing cap as "Blocked" since 2026-04-07. 7+ weeks stale.

**Why P1:** No cap means any photo-proxy or text-search runaway hits Google's pay-as-you-go tier with no ceiling.

**Scope:** Log into GCP Billing, set the $50/month budget cutoff if the audit blocker has cleared. Update BILLING.md.

**Roles:** Financial

---

## Replace Font-Size Pixel Literals with Design Tokens

140+ raw `font-size` pixel literals scattered across SCSS modules bypass the existing `--text-*` scale tokens in `globals.scss`.

**Why P1:** The token system was built for this but components bypass it. Any new component written without checking will diverge further. A design-savvy reviewer will notice the inconsistency.

**Scope:** Replace `14px`, `13px`, `12px`, `11px` occurrences with `var(--text-sm)`, `var(--text-xs)`, etc. from the existing scale.

**Roles:** Design

---

## Fix SEC-02: Rotate Mapbox Public Token Committed in Git History

Commit `f36d7d6` added a live Mapbox public token (`pk.*`) to `web-client/.env.example`. Cleared in `f0dee63` but still retrievable via `git show f36d7d6:web-client/.env.example`. The `secret-scan.sh` hook fired twice during the security audit on this history.

**Why P1:** Token in public git history is permanently exposed. Even read-only scope allows quota exhaustion billed to the token owner. Write scopes (Tilesets, Styles, Datasets) would let an attacker modify map assets.

**Scope:** Rotate token on Mapbox dashboard. Generate a new token scoped to Maps JS API read-only with HTTP origin restriction to production URL only. Update the Railway env var. The old history token becomes inert after rotation.

**Source:** 2026-05-28 security audit (Opus)

---

## Fix F-06: Instant Tile Selection Removes Confirm Step (US-23 AC Broken)

`31324d2` removed the "Confirm Selection" button from `apps/client/web/src/components/ChatBox/widgets/SelectableCardGroup.tsx:33-38`. A single click on a flight, hotel, or experience tile now immediately persists the selection to `/trips/{id}/selections`, sends "I've selected the [X]" to the agent, and advances the booking flow. No undo path exists short of asking the agent conversationally. US-23 acceptance criteria explicitly require a "Confirm Selection" button before commit.

**Why P1:** Documented user story acceptance criterion is broken on a core booking interaction. A user who misclicks is stuck.

**Scope:** Either re-introduce the confirm button OR surface an "Undo selection" chip in the agent's next message with rollback wired to `/trips/{id}/selections`.

**Source:** 2026-05-28 UX audit (Opus)

---

## Forward-port P1-03: Budget Tool Uses DB-Truth Costs

Worktree commit `4aa4fce` predates the monorepo restructure (`2672b52`). Cherry-pick fails because every file path has changed (`server/src/...` -> `apps/server/src/...`) and the surrounding code has diverged. Re-implementation under the new structure is required. The bug is unfixed in main: `apps/server/src/tools/budget.tool.ts:23` `calculateRemainingBudget` accepts costs as inputs from the agent (Claude-supplied), with no fallback to DB-truth values.

**Why P1:** Budget calculations driven by Claude-supplied numbers can diverge from actual confirmed selections, producing wrong "remaining budget" totals in the demo loop.

**Scope:** Add `getActualCostsForTrip(tripId)` to `apps/server/src/repositories/trips/trips.ts` that pulls confirmed flight/hotel/experience costs from the DB. Update executor to call this function and pass the DB-truth values to `calculateRemainingBudget` instead of trusting the agent input. Write a failing integration test that asserts DB-truth values win over agent-supplied values when they disagree. Reference: worktree commit `4aa4fce` (+194 lines, 4 files) for the original design.

**Source:** 2026-05-28 criticism audit (Opus); forward-port from `.claude/worktrees/investigate-llm-orchestration`

---

## Forward-port P1-05: Multi-Airport Support for Destination Lookups

Worktree commit `ebf2c6b` predates the monorepo restructure. Re-implementation required. The bug is unfixed in main: cities with multiple airports (NYC = JFK/LGA/EWR; London = LHR/LGW/STN; etc.) resolve to a single primary airport, so flight searches miss alternates.

**Why P1:** Major hub destinations miss valid flight options, producing visibly thin results on the most common demo cities.

**Scope:** Extend `apps/server/src/data/cities.ts` schema with an `airports: { primary: string; alternates: string[] }` field. Update `apps/server/src/tools/destination.tool.ts` to return all airport codes. Update `apps/server/src/tools/definitions.ts` flight schema if needed. Write a failing test asserting NYC returns ['JFK', 'LGA', 'EWR']. Reference: worktree commit `ebf2c6b` (+38 lines, 4 files).

**Source:** 2026-05-28 criticism audit (Opus); forward-port from `.claude/worktrees/investigate-llm-orchestration`

---

## Delete `.claude/worktrees/investigate-llm-orchestration` After Forward-Ports

Once P1-03 and P1-05 are forward-ported AND the P2 forward-ports for Redis lock, experience categories, and car_rental_cost are filed/landed, delete the worktree to close the open-worktree-across-sessions discipline gap.

**Why P1:** Worktree existence past forward-port complete is a hygiene failure (criticism audit finding).

**Scope:** `git worktree remove .claude/worktrees/investigate-llm-orchestration` and `git branch -D worktree-investigate-llm-orchestration`. Verify worktree-lifecycle rule update (filed as P3 process item) is in place to prevent recurrence.

**Source:** 2026-05-28 criticism audit (Opus)
