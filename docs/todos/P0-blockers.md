# P0: Blockers

Must fix before sharing this with anyone. These are visible failures on the happy path or legal exposure from the product being publicly deployed.

---

## Publish Privacy Policy at `/privacy`

The product is deployed publicly and accepts user registrations. Every registered user's messages are sent to Anthropic, SerpApi, and Google Places. No privacy policy exists anywhere.

**Why P0:** GDPR Art. 13 and FTC Section 5 exposure. Even as a portfolio demo, collecting registrations without a privacy policy is legally actionable.

**Scope:** Create `/privacy` page naming every processor (Anthropic, SerpApi, Google Places, Neon, Vercel). Can be a static MDX page.

**Roles:** Legal

---

## Publish Terms of Service at `/terms`

No terms of service or liability limitation exists. The product generates AI travel recommendations that could be inaccurate.

**Why P0:** Public product with user registrations and zero liability protection. A user acting on a hallucinated flight price has no disclaimer to refer to.

**Scope:** Create `/terms` page with AI disclaimer, limitation of liability, and "verify prices before booking" language.

**Roles:** Legal

---

## Fix B21: Hotel Tiles Missing Prices

Many hotel tiles don't display prices. This is immediately visible on the primary happy path.

**Why P0:** A portfolio reviewer who plans a trip sees blank price fields on hotel results. Signals broken code, not a polish gap.

**Scope:** Ensure `price_per_night` and `total_price` render on all hotel tiles. Likely a data-mapping issue similar to B12's string coercion.

**Roles:** Engineering, Criticism, UX

---

## Fix B22: Over-Budget Value Shows NaN

When `total_spent` exceeds `budget_total`, the remaining budget displays NaN instead of a negative number.

**Why P0:** NaN in the budget card -- the centerpiece of the product's value prop -- signals an unfinished app. Visible any time a user exceeds budget.

**Scope:** Fix the budget calculation to handle negative remaining values. Same reducer area as B12.

**Roles:** Engineering, Criticism, UX

---

## Upgrade Next.js from 15.5.14

8 high-severity CVEs in the current pinned version, including middleware/proxy-bypass and SSRF via WebSocket upgrade.

**Why P0:** Known exploits against the running version. `pnpm audit` will flag these. A security-minded portfolio reviewer will check.

**Scope:** `pnpm --filter web-client update next` to >=15.5.18, redeploy to Vercel. Verify no breaking changes in the upgrade range.

**Roles:** Engineering, Security
