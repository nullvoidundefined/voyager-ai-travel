# /audit-legal: Voyager Legal & Compliance Audit

Invoke the canonical Legal & Compliance audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/legal.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Legal role to Voyager. **Expected output is a checklist of missing legal documents rather than findings in existing ones**: Voyager is an early-stage product and is unlikely to have Terms of Service, a Privacy Policy, or any of the other legally-required documents yet. The audit's job is to enumerate what is missing, not to critique what exists.

**Things to look for (and expect to be missing):**

- **Terms of Service**: does any page link to a `/terms` or similar? Is there a TOS markdown file anywhere in the repo?
- **Privacy Policy**: does any page link to `/privacy`? Is there a policy document? If it exists, does it match Voyager's actual data handling (which includes sending user messages to Anthropic's API for LLM processing)?
- **Cookie Policy / Consent**: does the product set any non-essential cookies? Is there a consent mechanism?
- **Data Processing Agreements**: with Anthropic (LLM provider processing user trip queries), SerpApi (search queries), Google Places (location searches), Supabase (auth + user data), Neon / Railway (database host). These are all third-party data processors under GDPR.
- **AI disclosures**: Voyager is an AI product. Is it clearly disclosed to users that their trip queries are processed by an LLM? Are model accuracy claims substantiated?
- **Travel booking legal**: if the product actually books trips (as opposed to "research only"), there is a large additional legal surface: fiduciary responsibility, consumer protection, refund handling. If it is "research only," the positioning must say so clearly.
- **Accessibility compliance**: ADA / EAA exposure based on target markets.
- **Marketing claims**: "AI travel agent" is a claim. Does the product do what that phrase implies?

**Primary read targets:**

- `web-client/src/app/`. Look for `/terms`, `/privacy`, `/cookies`, or any legal page
- `web-client/src/app/layout.tsx`. Cookie consent banner? Footer legal links?
- Everything referenced in `docs/FULL_APPLICATION_SPEC.md` around data handling
- `README.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-legal.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** compliance posture (Missing / Partial / Adequate), the checklist of missing legal documents, and the top 3 launch blockers (items that must exist before Voyager can be shown publicly without legal exposure).
