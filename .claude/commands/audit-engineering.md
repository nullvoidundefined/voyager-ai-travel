# /audit-engineering: Voyager Engineering Audit

Invoke the canonical Engineering (CTO) audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/engineering.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Engineering role to the Voyager codebase with these project-specific inputs.

**Primary read targets:**

- `server/`. Express API, services, repositories, handlers, middleware
- `web-client/`. Next.js 15 frontend
- `packages/`. Shared packages across the pnpm workspace
- `server/migrations/`. Postgres migrations (pg driver, raw SQL, no ORM)
- `Dockerfile.server`, `railway.toml`. Deploy config
- `.github/workflows/`. CI / CD (if present)
- `lefthook.yml`. Pre-commit / pre-push hooks

**Voyager-specific concerns to evaluate carefully:**

- **Agent loop correctness**: `server/src/services/agent.service.ts` and related tool executor code. Evaluate tool-call budget enforcement (max 15 per turn), malformed tool-response handling, reasoning-between-calls integrity, streaming behavior, and critically: **does the tool executor support adapter injection so E2E tests can swap SerpApi / Google Places for mocks via an env flag? This is a prerequisite for Plan B (E2E coverage).** If adapters are not supported, flag it as P1.
- **External API integration**: SerpApi caching + quota management (250 searches/month free tier is unforgiving), Google Places rate limiting, retry logic, cost per agent turn in Claude tokens.
- **Monorepo hygiene**: pnpm workspace structure, shared types between `server/` and `web-client/`, duplication across packages.
- **Dead Amadeus references**: `server/src/schemas/trips.ts` has `amadeus_offer_id` / `amadeus_hotel_id` columns, and several tests reference Amadeus as a label string, but there is no Amadeus client in `server/src/`. Call out this spec-vs-implementation drift and recommend either removing the dead references or actually implementing the integration.
- **Docker & Railway build**: `Dockerfile.server` multi-stage effectiveness, image size, env var hygiene, `railway.toml` `dockerfilePath` correctness.
- **E2E readiness**: per the canonical role's "Operational Basics" requirement: do E2E tests exist? Are they wired to any trigger (pre-push, CI, nightly)? Voyager currently has only minimal E2E coverage. `e2e/auth.spec.ts` and `e2e/navigation.spec.ts`. Flag the gap.

**Project convention files (read before writing):**

- `.claude/bottomlessmargaritas/CLAUDE-BACKEND.md`
- `.claude/bottomlessmargaritas/CLAUDE-DATABASE.md`
- `.claude/bottomlessmargaritas/CLAUDE-FRONTEND.md`
- `.claude/bottomlessmargaritas/CLOUD-DEPLOYMENT.md`

**Product documents:**

- `docs/FULL_APPLICATION_SPEC.md`
- `docs/USER_STORIES.md`
- `CLAUDE.md` (project root)
- `README.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-engineering.md` (use today's date)
- **Commit:** to the current branch. Do not create a separate audit branch.
- **Report back:** executive summary plus the top 3 blockers per the canonical role's required output format.
