# Voyager Demo Walkthrough

A guided tour for technical reviewers evaluating Voyager as a portfolio
piece. The primary audience is a CTO or founder in the agentic-AI
travel space who has maybe 10 minutes to form an opinion. This doc
tells them exactly what to look at and in what order.

## 30-second version

Voyager is a multi-step Claude tool-use loop wrapped around a travel
planning UI, built as a portfolio demonstration of an agentic AI
pattern. It is not a commercial booking product. The architecture,
the tests, the audit trail, and the honest self-assessment are the
point, not the business case.

## 3-minute tour (no clicking required)

These are the three files that matter if you are evaluating the
engineering taste:

1. **Agent loop:** [`server/src/services/AgentOrchestrator.ts`](../server/src/services/AgentOrchestrator.ts). Read the `run()` method. Note `DEFAULT_MAX_ITERATIONS = 8` (lowered from 15 during the audit run in `fix(FIN-06)`), the wall-clock timeout, the clean separation between the tool executor call and the Anthropic client, and the structured streaming node emission. This is the shape a well-disciplined agent loop has.

2. **Tool executor adapter seam:** [`server/src/tools/executor.ts`](../server/src/tools/executor.ts). Read `ToolAdapters`, `DEFAULT_TOOL_ADAPTERS`, and the `adapters` parameter on `executeTool`. This seam exists specifically so E2E tests can swap real SerpApi / Google Places clients for fixtures at per-tool granularity. It was added during the audit run in `fix(ENG-04)` as a prerequisite for Plan B. This is the pattern every agentic AI product needs but few actually build.

3. **Audit trail:** [`docs/audits/`](./audits/). Eight role-specific audits run by autonomous Opus subagents on 2026-04-06, plus a consolidated triage file. Read `2026-04-06-criticism.md` first: it is the Devil's Advocate review of my own work and it does not hold back. Then read `2026-04-06-engineering.md` for the bug-fix discipline finding (13 of 20 `fix:` commits in the prior 30 days shipped with no test, which the audit caught and Plan C fixed).

## 10-minute interactive walkthrough

If you have time to click through the app, here is the exact path:

### 1. Home (`/`)

You will land on a page with a banner reading "Portfolio demo. This
is a technical demonstration of an agentic AI travel planning
pattern, not a commercial booking service." Below it, a hero that
says "An agentic trip planner, built as a portfolio piece" with a
subhead naming the real tech stack (Claude + SerpApi + Google
Flights). No SEO slop. No generic "AI travel concierge" language.

What to notice:

- The banner is explicit about what Voyager is and is not
- The hero names the real data sources, not abstract buzzwords
- There is a direct link to the engineering audit from the banner

### 2. Register (`/register`)

Create an account. Notice there is no "By signing up you agree to
our Terms of Service and Privacy Policy" line because no TOS or
Privacy Policy exists and claiming otherwise would be a
misrepresentation. This was a P0 legal finding (`fix(LEG-01)`).

### 3. Preferences wizard

Optional 6-step wizard. Skip if you want; it is not load-bearing
for the demo.

### 4. New trip (`/trips/new`)

Click "+ New Trip". You will land on `/trips/new` which creates a
trip with `destination: "New trip"` (not `"Planning..."` — that
literal string was a P1 UX finding fixed in `fix(UX-05)`) and
redirects you to the trip detail page.

### 5. Trip detail page (`/trips/:id`)

This is where the agent loop runs. Type something like:

> Plan a 5-day Monterey trip for two, budget $3000, we love food and hiking

Watch the streaming tool progress events appear. The agent will
call tools (flights, hotels, experiences) up to 8 times, reasoning
about budget between calls. Each tool call shows a progress
indicator. When the agent finishes, tile cards appear for each
selected flight / hotel / experience.

What to notice:

- The agent is calling real tools. The mocked fixtures are only
  used when `E2E_MOCK_TOOLS=1` is set for automated tests. In your
  browser, the agent is hitting real SerpApi / Google Places.
- The `serpApiQuota.service.ts` monthly counter is active; if this
  month has run out, flight / hotel searches will gracefully
  degrade with an honest "temporarily unavailable" message instead
  of hallucinating. This is `fix(FIN-02)`.
- Tool calls respect a per-user daily output-token budget. If you
  exhaust it, you will see a clean 429 with an explanation. This
  is `fix(FIN-01,FIN-05)`.
- Chat errors are routed through a Toast, not leaked inline as
  raw error strings. This is `fix(UX-03)`.

### 6. Save itinerary

When the agent finishes, click "Save itinerary" (renamed from
"Confirm Booking" in `fix(UX-02,CRIT-02)`). The modal shows an
itemized breakdown with a disclaimer reading "Nothing is actually
booked. Voyager is a portfolio demo: this action saves the
itinerary to your trip history. You book each leg yourself through
the linked provider." The old version ran a 2.2s auto-advance
animation with no cancel. This version requires an explicit click.

### 7. Trip deletion

Go back to `/trips`. Try to delete a trip. You will see a
confirmation prompt. The old version deleted on a single click with
no confirmation. This is `fix(UX-01)`.

### 8. FAQ (`/faq`)

Read the data source answer. It correctly names SerpApi, not
Amadeus. The old version falsely claimed Amadeus (the implementation
pivoted to SerpApi early but the copy was never updated; three
independent audit roles flagged this). This is `fix(LEG-02)`, also
closing `MKT-02` and `CRIT-03`.

## What to read next if you like what you see

- **Triage file:** [`docs/audits/2026-04-06-triage.md`](./audits/2026-04-06-triage.md). Every audit finding, severity-tagged, with a source pointer.
- **ISSUES.md:** rolling log of deferred items. See what the team decided not to fix now and why.
- **Plan C:** [`docs/superpowers/plans/2026-04-06-voyager-plan-c-p0p1-fixes.md`](./superpowers/plans/2026-04-06-voyager-plan-c-p0p1-fixes.md). The fix plan that turned the triage into commits. Every task has test-first steps. This is the plan that produced the fix branch you are probably looking at.
- **Plan B:** [`docs/superpowers/plans/2026-04-06-voyager-plan-b-e2e-and-gates.md`](./superpowers/plans/2026-04-06-voyager-plan-b-e2e-and-gates.md). The E2E test suite build-out that happens next. Unblocked by Plan C Task 21 (`fix(ENG-04)`).

## The honest pitch

I did not build Voyager because the travel agent market needs
another entrant. I built it because I wanted to demonstrate how I
approach a non-trivial agentic AI product end-to-end: the
architecture, the tests, the cost controls, the security
hygiene, and the willingness to run audits on my own work and act
on the findings. If any of that resonates, I would be interested in
working on an agentic AI product with real product-market fit.
