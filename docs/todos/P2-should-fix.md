# P2: Should Fix

Fix before actively promoting this. These are polish gaps, design-system violations, and ops blind spots that weaken the overall impression.

---

## Add Favicon and Logo (B15)

Header shows plain text "Voyager" with no icon. Browser tab has no favicon.

**Why P2:** A portfolio piece with no visual identity looks unfinished before the demo starts. Cheapest signal of "this is shipped."

**Scope:** Create a coral/orange compass SVG icon for the header and a matching favicon.

**Roles:** Criticism, UX, Design

---

## Fix DemoBanner Link (404 in Production)

The DemoBanner links to `/docs/audits/2026-04-06-engineering.md` which is a raw markdown file path that 404s in production.

**Why P2:** A broken link on the primary "Read the engineering audit" CTA actively undermines credibility with technical reviewers.

**Scope:** Either link to the GitHub blob URL or create a rendered page for the audit.

**Roles:** UX

---

## Fix SelectableCardGroup Shadow Mismatch

The confirm button uses `--shadow-glow` (orange-tinted CTA shadow) on an `--accent`-colored (blue) button. The blue button glows orange on hover.

**Why P2:** Semantic mismatch between the shadow token and the button color. A design-savvy reviewer will notice.

**Scope:** Introduce `--shadow-accent-glow` or use `--shadow-md` on accent-colored buttons.

**Roles:** Design

---

## Replace Hardcoded `#fff` with `--cta-text` Token

Four files use `#fff`/`#ffffff` for text on dark backgrounds instead of `var(--cta-text)`.

**Why P2:** Token violations that will break if the palette shifts. Signals incomplete design-system discipline.

**Scope:** `trips.module.scss` delete button, `AlertDialog.module.scss` (2 instances), `explore/[slug]/page.module.scss`.

**Roles:** Design

---

## Fix ItineraryTimeline Accordion Max-Height Cap

Expand animation uses `max-height: 0 -> 500px` hard cap that clips any day card with 8+ items.

**Why P2:** Multi-day itineraries with many experiences will be visibly truncated.

**Scope:** Swap to JS-measured height or `grid-template-rows: 0fr -> 1fr`.

**Roles:** Design

---

## Extract Shared ChatBubble/ChatInput Base Module

`MockChatBox` and `ChatBox` share nearly identical SCSS as two fully separate files with a subtle height difference (540px vs 620px).

**Why P2:** Portfolio reviewers who look at the code will see the duplication. Demo and live UIs will diverge further over time.

**Scope:** Extract shared `ChatBubble` and `ChatInput` base SCSS module.

**Roles:** Design

---

## Migrate activeConversations Lock to Redis

The concurrent-request lock (`chat.ts:38`) is an in-memory `Set`. Across Railway replicas it provides zero protection.

**Why P2:** Two simultaneous agent loops per user per replica, doubling token burn and SerpApi quota. Already noted as pending in `rateLimiter.ts:25`.

**Scope:** Redis SET-NX based lock. The Redis instance already exists on Railway.

**Roles:** Security

---

## Run pnpm audit and Fix Dependency CVEs

`pnpm audit` reports 13 high and 19 moderate vulnerabilities including lodash code-injection via `_.template` (transitive through `@trivago/prettier-plugin-sort-imports`).

**Why P2:** The Vite CVEs are dev-only but the lodash one is worth verifying the dep chain cannot reach production.

**Scope:** `pnpm audit --fix` and manual resolution of remaining overrides.

**Roles:** Security

---

## Audit Railway and Neon Billing

Both remain "Unaudited" in `docs/BILLING.md` (FIN-09) with no verified monthly charge or plan tier.

**Why P2:** Two infrastructure cost lines with zero visibility. No billing alerts configured.

**Scope:** Log into both dashboards, record current MTD spend, confirm billing alerts are set.

**Roles:** Financial

---

## Verify Anthropic $50/Month Cap Still Active

Last confirmed 2026-04-07, now 7 weeks ago. Workspace billing settings can be reset by plan changes.

**Why P2:** The model runs up to 8 iterations x 4096 max tokens per turn. Worst-case ~$0.48/turn with no per-turn cost tracking.

**Scope:** Verify cap in Anthropic Console.

**Roles:** Financial

---

## Add Per-Turn Cost Tracking

No per-turn or per-user cost is persisted to the database (FIN-04 remains open).

**Why P2:** Without this, estimate-vs-actual drift is invisible and the $50/month cap is the only defense against margin erosion.

**Scope:** Persist token counts and estimated cost per chat turn to the database.

**Roles:** Financial

---

## Rewrite Step-02 Description for Non-Engineers

"It calls 3-8 real APIs per turn, reasoning between each" is engineer-speak.

**Why P2:** Portfolio reviewers include non-engineers. Should read: "The agent searches flights, hotels, and experiences in parallel, then reasons over the results before responding."

**Scope:** Update the step-02 description in the homepage component.

**Roles:** Marketing

---

## Add Author Attribution to Page Title

The `<title>` is "Voyager -- AI Travel Concierge" but the domain is `interviewiangreenough.xyz` with no brand recognition.

**Why P2:** When a recruiter has 40 tabs open, the tab label should attribute the work. Add "by Ian Greenough" to the title.

**Scope:** Update the title in `layout.tsx` metadata.

**Roles:** Marketing

---

## Verify Vercel Analytics Cookie Mode

Unknown whether Vercel Analytics is running in cookieless mode.

**Why P2:** If not cookieless, a cookie consent banner is required for EU visitors before analytics scripts load.

**Scope:** Check Vercel Analytics config and document the decision.

**Roles:** Legal

---

## Confirm README Audit Links Render on GitHub

The README's audit trail is the strongest portfolio differentiator. All linked audit files should render cleanly on GitHub.

**Why P2:** Stale self-assessment is worse than no self-assessment. Verify the criticism audit quote is still accurate after B12 and selection fixes.

**Scope:** Click every audit link in the README from a GitHub browser session. Fix broken paths.

**Roles:** Criticism
