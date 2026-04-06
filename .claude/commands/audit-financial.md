# /audit-financial: Voyager Financial Audit

Invoke the canonical Financial (CFO) audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/financial.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Financial role to Voyager with these project-specific inputs.

**Paid services to inventory:**

- **Anthropic**: Claude API for the agent loop. Cost per agent turn in tokens. Is there a hard monthly spending cap configured? Voyager's agent loop can call tools up to 15 times per turn, and tool calls are billed.
- **SerpApi**: Google Flights + Google Hotels. Free tier is **250 searches / month**. This is uncomfortably close to exhaustion after even light testing. Calculate the realistic searches-per-trip-plan and divide into 250 to project how many trip plans the free tier supports.
- **Google Places API**: for experiences / destination content. What tier? What is the per-request cost?
- **Railway**: API server + Postgres (Neon is separate or hosted on Railway?). Plan, current monthly cost, resource usage.
- **Vercel**: web-client deployment. Plan, usage.
- **Neon**: Postgres (if hosted here rather than Railway). Plan, usage.
- **Supabase**: auth. Plan, MAU.
- **Any other service referenced in env vars**: scan `.env.example` and deploy configs for clues.

**Voyager-specific concerns to evaluate carefully:**

- **Unit economics**: what is the projected cost per full trip plan (one end-to-end multi-turn agent conversation)? Anthropic tokens + SerpApi searches + Google Places calls + Postgres queries. Compare to any monetization model (currently: none visible. So every trip plan is subsidized cost with no revenue).
- **Free-tier cliffs**: SerpApi 250/month is the most dangerous. What happens on search 251? Does the agent loop crash, degrade, or fall back? Is there a cache that reduces calls per search?
- **Missing spending caps**: every third-party API should have a hard monthly cap configured. Flag each that does not. Anthropic in particular is a P0 risk. An infinite tool-call loop bug could produce a five-figure surprise bill in hours.
- **Cache effectiveness**: the spec mentions aggressive SerpApi caching. Evaluate `server/src/services/cache.service.ts` and related code. Is the cache actually saving calls?
- **Dead paid integrations**: Amadeus is referenced in the spec and schema but there is no actual client. Is a paid account accidentally provisioned for it?

**Product documents:**

- `docs/FULL_APPLICATION_SPEC.md`
- `CLAUDE.md` (especially the "Critical implementation note" about SerpApi free tier)
- `README.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-financial.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** projected cost per trip plan, the free-tier cliff analysis (how many trips before SerpApi / Anthropic caps are hit), and any missing spending caps as P0 findings.
