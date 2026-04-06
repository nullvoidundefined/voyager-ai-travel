# /audit-ux: Voyager UX Audit

Invoke the canonical UX (Chief Experience Officer) audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/ux.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical UX role to Voyager with these project-specific inputs.

**Primary read targets:**

- `web-client/src/app/`. Every page / route
- `web-client/src/components/`. Especially the chat UI, tile-card flow, and any wizard / onboarding components
- `docs/USER_STORIES.md`. **exhaustively walk through every user story (US-1 through US-35)** per the canonical role's User Story Coverage requirement. For each story, mark passed / failed / blocked with evidence, and flag any story without an E2E test.
- `e2e/`. Current E2E coverage (expect only `auth.spec.ts` and `navigation.spec.ts`; everything else is a coverage gap)

**Voyager-specific surfaces to evaluate carefully:**

- **Conversational agent UX**: Voyager's core value is a multi-turn chat with Claude that calls tools (flights, hotels, experiences) mid-conversation. Evaluate: turn latency perception, loading states during tool calls, tool-call transparency (can users see what the agent is doing? what it found? why it chose this flight?), perceived user control, how users feel when the agent makes decisions for them.
- **Error recovery mid-conversation**: what happens if a tool call fails, if Claude hallucinates a result, if SerpApi returns empty, or if the user changes their mind mid-plan? Can the user undo? Can they steer the agent back on track?
- **Trip iteration experience**: per user stories US-16 through US-24 (chat & booking flow), how does a user iterate on a plan? Swap a flight? Adjust budget? Undo a confirmed tile-card selection?
- **Onboarding & preferences wizard**: US-29 through US-33. Is the wizard's time-to-value acceptable? Does it explain what the product does?
- **Destructive / paid action guardrails**: US-27 ("Confirm and book the trip") is the most sensitive. Confirmation dialog required, clear itemized breakdown, no one-click-book footguns.
- **User story coverage gap**: flag that only 2 of 35 user stories currently have E2E coverage. This is the biggest UX-hygiene finding and feeds directly into Plan B (E2E coverage).

**Product documents:**

- `docs/FULL_APPLICATION_SPEC.md`
- `docs/USER_STORIES.md`
- `CLAUDE.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-ux.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** executive summary, yes/no on whether a new user can complete the primary happy path without help, and the full user story coverage table.
