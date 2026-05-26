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
