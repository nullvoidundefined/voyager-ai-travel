# /audit-security: Voyager Security Audit

Invoke the canonical Security (CISO) audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/security.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Security role to the Voyager codebase with these project-specific inputs.

**Primary read targets:**

- `server/src/`. All auth, middleware, agent loop, tool executors, API routes
- `server/migrations/`. Schema for RLS-relevant tables
- `web-client/src/`. Auth flows, API calls, credential handling
- `Dockerfile.server`, `railway.toml`, environment variable configuration
- `package.json` and `pnpm-lock.yaml` for dependency vulnerability review

**Voyager-specific concerns to evaluate carefully:**

- **LLM & agent loop security**: how is the Anthropic API key handled inside the agent loop? Can it leak through tool results, error messages, or response streams? Is the max-15 tool-call budget enforced? Are malformed tool responses handled safely?
- **Prompt injection surface**: Voyager takes free-text user messages and feeds them into Claude's tool-use loop, which then constructs queries to SerpApi and Google Places. Evaluate the injection path: user message → agent reasoning → tool call arguments → third-party API query. What is the worst an attacker can do with a crafted user message?
- **External API key management**: SerpApi key, Google Places key, Anthropic key. Rotation hygiene, scoping per environment (dev/staging/prod), env var scoping across Railway and Vercel.
- **Supabase auth & RLS**: is Supabase auth configured correctly? Are RLS policies in place on trip data so users can only see their own trips?
- **CSRF pattern**: verify which variant Voyager uses (header-based or cookie-based) and evaluate whether it works with Vercel preview URL origins.
- **CORS config**: `CORS_ORIGIN` is comma-separated for Railway; confirm every preview URL origin is covered and credentials flow works.
- **Known-issues cross-check**: read `~/.claude/KNOWN-ISSUES.md` for prior incident patterns (CSRF SameSite, cookie scoping, Vercel env var baking) and verify none are repeated in Voyager.

**Project convention files (read before writing):**

- `.claude/bottomlessmargaritas/CLAUDE-BACKEND.md`
- `.claude/bottomlessmargaritas/CLOUD-DEPLOYMENT.md`

**Product documents:**

- `docs/FULL_APPLICATION_SPEC.md`
- `CLAUDE.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-security.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** executive summary, top 3 critical findings, and any credential / config requiring immediate rotation or hardening.
