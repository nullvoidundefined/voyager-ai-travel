# P1: High Priority

Fix in the first work session. These are trust-breakers, layout inversions, or missing signals that undermine the portfolio impression within 2 minutes of use.

---

## Fix B18: Itinerary Items Above Chat

On the trip detail page, the itinerary section renders above the chat. The chat is the product -- it should be the first thing a reviewer sees.

**Why P1:** Layout inversion contradicts the app's stated UX model. First impressions of the chat-first design are broken.

**Scope:** Swap the ordering in the trip detail page layout. Chat first, itinerary below.

**Roles:** Engineering, Criticism, UX

---

## Fix B20: Double Confirm Buttons on Flight Tile

After selecting a flight, both a card-group "Confirm Selection" button and additional confirm buttons below appear.

**Why P1:** Redundant UI on a core interaction. A reviewer who clicks a flight sees duplicated actions, which reads as "unfinished."

**Scope:** Remove the duplicate confirm button. The card group's confirm should be the only one.

**Roles:** Engineering, UX

---

## Fix B13: Agent Ignores Explicit User Selections

When a user says "I want the InterContinental Plaza Hotel," Claude presents alternatives instead of confirming the selection.

**Why P1:** For a portfolio piece whose thesis is "agentic reasoning," an agent that ignores explicit instructions is the worst possible demo of the capability.

**Scope:** Update category prompts to instruct Claude to honor explicit selections and confirm rather than suggest alternatives.

**Roles:** Criticism, UX

---

## Add OpenGraph Metadata

The site has zero OG tags. Shared links on LinkedIn, Slack, or recruiter emails show a broken unfurl.

**Why P1:** The primary distribution channel for a portfolio piece is link sharing. Broken unfurls mean the first impression is a blank card.

**Scope:** Add `openGraph` metadata block to `web-client/src/app/layout.tsx` (title, description, `og:image`, `og:type`).

**Roles:** Marketing

---

## Add GitHub Source Link to Hero/Header

The hero subtitle says "Full source and audit trail linked below" but there is no such link on the page.

**Why P1:** Recruiters will not scroll to find the repo link. The whole point of a portfolio piece is letting them click straight to the code.

**Scope:** Add a GitHub icon link to the header nav or a prominent CTA in the hero section.

**Roles:** Marketing

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

## Add Chat Message Length Cap

`chat.ts:50` validates only `typeof message === 'string'` with no length limit. A user can send a multi-megabyte string that gets stored and forwarded to Claude on every subsequent turn.

**Why P1:** Token cost amplification and potential DoS vector. Single guard at the handler entry point.

**Scope:** Add `message.length` guard (e.g., 4000 chars) before the `isOverDailyBudget` check.

**Roles:** Security

---

## Verify Google Cloud Places API Billing Cap

`docs/BILLING.md` shows the GCP billing cap as "Blocked" since 2026-04-07. 7+ weeks stale.

**Why P1:** No cap means any photo-proxy or text-search runaway hits Google's pay-as-you-go tier with no ceiling.

**Scope:** Log into GCP Billing, set the $50/month budget cutoff if the audit blocker has cleared. Update BILLING.md.

**Roles:** Financial

---

## Update BILLING.md SerpApi Status

`docs/BILLING.md` shows SerpApi enforcement as "Pending code enforcement" but `serpApiQuota.service.ts` is fully implemented with a 200-search hard cap.

**Why P1:** Stale documentation makes a solved risk look open. A future auditor will treat it as unresolved.

**Scope:** Update BILLING.md to reflect "Code gated / In place."

**Roles:** Financial

---

## Replace Font-Size Pixel Literals with Design Tokens

140+ raw `font-size` pixel literals scattered across SCSS modules bypass the existing `--text-*` scale tokens in `globals.scss`.

**Why P1:** The token system was built for this but components bypass it. Any new component written without checking will diverge further. A design-savvy reviewer will notice the inconsistency.

**Scope:** Replace `14px`, `13px`, `12px`, `11px` occurrences with `var(--text-sm)`, `var(--text-xs)`, etc. from the existing scale.

**Roles:** Design

---

## Replace "Get Started Free" CTA Copy

The final-section CTA says "Get Started Free" which signals a commercial product.

**Why P1:** Creates a credibility mismatch with the "portfolio demo" eyebrow label visible earlier on the page.

**Scope:** Replace with "Try the live demo" or similar portfolio-appropriate language.

**Roles:** Marketing

---

## Fix CQS-16: Hotel Address Always Empty in Production

`hotels.tool.ts` hardcodes `address: ''` in production. Every hotel card shown to any user has no address. Mock returns a real address, so tests pass while production is broken.

**Why P1:** Most visible data quality failure in the core product loop. Escalated from P2 by 2026-05-28 criticism audit.

**Scope:** Parse the address from SerpApi hotel response and populate the field. Update mock to match.

**Source:** 2026-05-28 criticism audit, 2026-05-27 code quality sweep (CQS-16)

---

## Fix CQS-11: Enrichment Sources Silently Swallow Errors

`fetchStateDeptAdvisory`, `fetchFCDOAdvisory`, `fetchWeatherForecast` have 0% function coverage. `enrichment.ts` drops rejected `Promise.allSettled` results with no `logger.warn`. A production advisory API outage is invisible.

**Why P1:** Escalated from P2 by 2026-05-28 engineering audit. Silent failure in a user-facing enrichment panel.

**Scope:** Add `logger.warn` to the `allSettled` rejection path. Add fetch-mocked unit tests for all three async sources.

**Source:** 2026-05-28 engineering audit

---

## Fix: Toast Has No `role="alert"`

`Toast.tsx` renders `<div className={styles.toast}>` with no `role="alert"` or `aria-live`. SSE errors, booking failures, and all status messages surfaced via Toast are invisible to screen readers.

**Why P1:** Toast is the primary mechanism for server error communication. WCAG 2.1 violation.

**Scope:** Add `role="alert"` to the Toast root div.

**Source:** 2026-05-27 UX audit

---

## Fix: PreferencesWizard and BookingConfirmation Missing Focus Traps

Neither component uses `focus-trap-react` or Radix Dialog. Keyboard users can Tab past the modal boundary into background page elements. WCAG 2.1 SC 2.1.2 violation.

**Why P1:** The two highest-traffic modals leak keyboard focus. Radix AlertDialog (used for trip deletion) has proper focus trapping; these don't.

**Scope:** Migrate both to Radix Dialog or add `focus-trap-react`. Also restore focus to trigger element when BookingConfirmation closes (WCAG 2.1 SC 2.4.3).

**Source:** 2026-05-27 UX audit

---

## Fix US-5: Destination Pre-fill Silently Broken

`explore/[slug]/page.tsx` generates a link to `/trips/new?destination=Paris` but `trips/new/page.tsx` never reads `useSearchParams`. The query param is silently discarded.

**Why P1:** Breaks the documented acceptance criteria for US-5. The CTA says "Plan a trip to Paris" but the trip is created with destination "New trip."

**Scope:** Read `?destination=` query param in `trips/new/page.tsx` and seed the trip with the value.

**Source:** 2026-05-27 UX audit

---

## Fix US-12: AuthGuard Redirect Loses Intended Destination

`AuthGuard.tsx` always redirects to `/login` with no `?next=` parameter. A user who clicks "Plan a trip to Paris" logs in and lands on `/trips`, never returning to the destination page.

**Why P1:** US-12 acceptance criterion says "After login, redirected back to the original page." Not implemented.

**Scope:** Preserve `?next=` in AuthGuard redirect; restore after login.

**Source:** 2026-05-27 UX audit

---

## Fix: `DemoBanner.tsx:25` Broken Audit Link

"Read the engineering audit" link href is `/docs/audits/2026-04-06-engineering.md` -- a git repo path, not a served Next.js route. 404s in production.

**Why P1:** Prominent link on every page that leads to a 404.

**Scope:** Either serve the audit file via a Next.js route, link to the GitHub raw file, or remove the link.

**Source:** 2026-05-27 code quality sweep

---

## Fix: `useSSEChat.ts:134` JSON.parse Not Wrapped in try/catch

Malformed SSE data line throws, caught by outer catch which shows misleading "Could not reach the agent" message instead of a parse error.

**Why P1:** Any malformed SSE event crashes the chat with a misleading error.

**Scope:** Wrap `JSON.parse(line.slice(6))` in try/catch with a specific parse-error message.

**Source:** 2026-05-27 code quality sweep

---

## Fix: `trips/new/page.tsx` Double-Create in React Strict Mode

`creating` ref guard does not cancel the in-flight POST on unmount. In React Strict Mode (double-invoke), two trips can be created.

**Why P1:** Every developer running in dev mode creates duplicate trips.

**Scope:** Add `controller.abort()` in cleanup, or use TanStack Query `useMutation`.

**Source:** 2026-05-27 code quality sweep

---

## Fix: `trips/[id]/page.tsx` Booking Silently Swallows PUT Errors

`handleConfirmBooking` silently swallows `put` errors. If endpoint fails, UI shows "Booked" while server still has `status: 'planning'`. Optimistic update not rolled back.

**Why P1:** User sees a false confirmation.

**Scope:** Add error handling to rollback optimistic state on PUT failure.

**Source:** 2026-05-27 code quality sweep

---

## Fix: `PreferencesWizard.tsx:158` Unhandled Promise Rejection on Save

`handleNext` calls `await saveCurrentStep()` with no try/catch. Network failure throws unhandled promise rejection with no error message shown.

**Why P1:** Silent failure on a core user flow.

**Scope:** Wrap in try/catch and show a Toast error.

**Source:** 2026-05-27 code quality sweep

---

## Fix: `schemas.ts:82-91` Select Schemas Bypass Injection Protection

`selectFlightSchema.origin/destination` use `z.string().min(1)` with no content restriction, while `searchFlightsSchema` uses `locationAllowlist` regex. Select schemas bypass injection protection applied at search time.

**Why P1:** Security gap -- select tools have weaker input validation than search tools for the same fields.

**Scope:** Apply the same `locationAllowlist` or content restrictions to select schemas.

**Source:** 2026-05-27 code quality sweep

