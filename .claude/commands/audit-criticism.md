# /audit-criticism: Voyager Criticism Audit

Invoke the canonical Criticism (Devil's Advocate) audit role. **Your persona, mission, advisory autonomy, required report structure, failure modes, and disposition are all defined in `~/.claude/audits/criticism.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Criticism role to Voyager. Your job is to evaluate whether the product should exist in its current form, not whether it is well-executed. The other 7 audits will cover execution quality. Yours covers intent, strategy, unit economics, moat, and organizational self-deception.

**Voyager-specific concerns you are expected to address directly:**

- **The core idea**: is "agentic AI travel planner" a real product category or a feature? Is this solving a problem anyone actually has, or is it a tech demo that needs a use case?
- **Unit economics (REQUIRED. See canonical role's Business Model Problem section)**: Voyager's per-trip cost structure is the most obvious strategic risk:
  - Anthropic tokens per agent turn × 3–5 turns per trip × average turn size
  - SerpApi searches per trip (250 free tier / month divides by calls-per-trip = how many trips before you're paying)
  - Google Places calls per trip
  - **Do the unit economics work?** Show the math. If the free tier supports fewer than N trips per month before paid tiers kick in, flag it.
- **Moat**: what prevents ChatGPT Plus with browsing from eating this category? What prevents Kayak or Expedia from adding "chat to plan a trip"? What does Voyager know or do that competitors cannot replicate in 6 months?
- **Positioning drift**: the spec calls it an "Agentic Travel Agent" but the repo was renamed to "Voyager." Is the product's identity clear to the team? Clear to users?
- **Dead code as signal**: the dead Amadeus references (in `server/src/schemas/trips.ts`, migrations, tests, docs) suggest a feature was planned, partially scoped, and abandoned without cleanup. What does this say about the team's decision discipline?
- **Real bookings vs. research-only**: does Voyager actually book trips, or does it just generate itineraries? The difference is massive from a legal, business model, and trust standpoint. If it is research-only, why would a user pay for it vs. using ChatGPT?
- **User story reality check**: do the 35 user stories in `docs/USER_STORIES.md` describe a product users would actually pay for, or do they describe a feature tour?

**Read EVERYTHING** per the canonical role's instructions: full codebase, `docs/FULL_APPLICATION_SPEC.md`, `docs/USER_STORIES.md`, the landing page, the agent loop, the database schema, deployment config, marketing copy, `README.md`, recent commit history.

## Output

- **File:** `docs/audits/YYYY-MM-DD-criticism.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** the one-paragraph "Brutal Truth" and the top 5 things to fix before showing Voyager to anyone.
