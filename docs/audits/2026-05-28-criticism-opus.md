# Voyager Criticism Audit -- Opus Second Opinion

**Date:** 2026-05-28
**Auditor:** Criticism (Devil's Advocate) role -- Opus pass
**Scope:** Today's 58 commits, with adversarial focus on the eight specific lenses flagged by the dispatch
**Baseline Sonnet audit:** `d38ad0b` (recovered from git history; the audit file was consumed in `d305b2b`)
**Sibling audit read:** `8096a61` -- Engineering Opus second opinion (also recovered from git history)

---

## The Brutal Truth

Voyager is demonstrating a pattern that is more concerning than the specific bugs it ships: it is building discipline infrastructure at a rate that exceeds the rate at which it fixes things that are visibly broken to any human who uses the product. Today, 4 of 58 commits were audit documents. The codebase now contains an adversarial eval suite (50 attacks, multi-turn LLM red-teaming), a scoring pipeline, a persona generator, a two-layer judge, and a full eval runner -- none of which will ever catch that the hotel address field is empty for every real user, because the hotel address being empty is a production data gap, not an adversarial robustness failure. The eval harness is solving for the wrong threat model and doing so in a way that requires ongoing maintenance. Meanwhile, `investigate-llm-orchestration` -- a live worktree with 5 commits not on main, two of which are labeled P1 bug fixes -- is sitting idle. P1 fixes exist in a dead worktree while the team ships eval infrastructure. That is the signal this session leaves.

There is also a structural honesty problem in the eval itself. The adversarial judge and the orchestrator were both temporarily upgraded to `claude-sonnet-4-6`, immediately failed (the model rejects assistant-prefill), and were reverted to `claude-sonnet-4-20250514` -- with the commit message noting "Eval score restored to 0.79." That phrase deserves careful reading. It does not say "eval score maintained at 0.79 despite model change." It says "eval score restored" -- implying the score dropped when the model changed and recovered when the team reverted to the model the eval was calibrated against. This is a form of evaluation lock-in: the eval cannot be separated from the model it was tuned to, which means the number 0.79 is measuring "how well does claude-sonnet-4-20250514 handle attacks designed for claude-sonnet-4-20250514" rather than "how robust is Voyager's agent to adversarial inputs regardless of model." The eval is not wrong. It is not theater. But it is a narrower measurement than it appears to be.

---

## What's Actually Good

Verified against current repo state, not prior audit claims:

- **SEC-01 (IDOR on leg delete/reorder) is real and unambiguous.** `trip-legs.repository.ts:47-48` executes `DELETE FROM trip_legs WHERE id = $1` with no `trip_id` join. `legs.ts:63-65` calls `assertTripOwnership` on the trip URL param and then calls `deleteLeg(req.params.legId)` with no verification that `req.params.legId` belongs to `req.params.id`. The Opus engineering audit found this correctly and the Sonnet criticism audit did not.

- **ORC-01 (dead tools) is real.** `sub-agent.service.ts:20-55` confirms that `add_leg`, `remove_leg`, `reorder_legs`, and `plan_daily_schedule` appear in none of the seven `SUB_AGENT_TOOLS` partitions. The multi-city legs feature and daily schedule feature are non-functional through agent-driven chat. This is not a documentation gap; it is silent feature death.

- **The adversarial eval implementation is technically correct.** The two-layer architecture (deterministic `must-not` detector plus LLM judge, with pre-check violations overriding the judge) is the right design. The judge prompt is specific, the antagonist uses Haiku (appropriate cost tier for an LLM attacker), and the `runAttack` loop properly tracks violations across turns. The eval is genuinely adversarial, not theatrical.

- **The `parseJudgeResponse` bug is real but recoverable.** Line 80: `const text = '{' + raw.trim()`. The API call at line 119 seeds the response with `{ role: 'assistant', content: '{' }` as a prefill, so the raw response from the model does not include the opening brace. The `parseJudgeResponse` prepends it. If the model returns a complete valid JSON object without the leading brace (which it will, given the prefill contract), this works. If the model returns an empty string or something unexpected, `JSON.parse('{' + '')` throws and the catch returns a hard fail (`passed: false`). The failure mode biases toward false negatives (attacks appear to succeed when the judge misparsed), not false positives. That is the safer failure direction for an adversarial eval.

- **The auto-confirm `plan_card` change in `31ffafd` is legitimate calibration**, not score juking. The `conversation.ts` change adds a check for `plan_card` nodes in the SSE response and saves the confirmation for the next request turn (`pendingPlanConfirmation`). Without this, every eval persona would get stuck waiting for a user interaction that the harness cannot simulate. The change is necessary for the eval to reach the PLANNING phase at all and is correctly documented in the commit message.

---

## What's Broken

### [Fatal] Two P1 security/correctness fixes are sitting unmerged in a dead worktree

The `investigate-llm-orchestration` worktree at `.claude/worktrees/investigate-llm-orchestration` has 5 commits not on main, including:

- `4aa4fce fix(P1-03): budget tool uses DB-truth costs instead of Claude-supplied values`
- `ebf2c6b fix(P1-05): multi-airport support for destination lookups`

These are P1 labeled bug fixes. They are not on main. They are not in production. They predate today's work session -- the worktree's HEAD at `e67af61` is from a prior session. Every hour these fixes sit in a worktree is an hour a real user could encounter the unfixed behavior.

The project's own CLAUDE.md says "Push directly to main." The worktree has been there across at least one full session boundary (it appears in the Opus engineering audit's findings, meaning it was there when that audit was written and is still there now). This is not a planning failure. This is a hygiene failure that the team is aware of and has not resolved.

**What would make me wrong:** Show that `4aa4fce` and `ebf2c6b` are already cherry-picked or rebased onto main under different commit hashes, or show that the bugs they fix are still actively being investigated and the worktree is still live for that reason.

### [Fatal] The scoring judge is hardcoded to a deprecated model that the eval was calibrated against, creating measurement lock-in

`eval/src/scoring/judge.ts:51`: `model: 'claude-sonnet-4-20250514'`

`87576dc` commit message: "Eval score restored to 0.79."

The adversarial judge at `eval/src/adversarial/judge.ts:111` uses `claude-sonnet-4-6` (the current model). The persona-quality scoring judge at `eval/src/scoring/judge.ts` uses `claude-sonnet-4-20250514`. These are different judges measuring different things with different models, both contributing to the overall eval score.

The deeper problem: the commit history shows the eval score changed when the model changed and was restored when reverted. A measurement system whose score changes based on which version of the grader you use is not measuring the system under test; it is measuring the grader. This is not evaluation of Voyager's robustness -- it is measurement of one model's assessment of another model, calibrated to a specific model version. When `claude-sonnet-4-20250514` is deprecated and traffic migrated, the score will change not because Voyager changed, but because the grader changed.

This is the eval-as-theater finding Sonnet soft-pedaled. Sonnet called the eval harness "meta-system performance art" because it lacks users and SLAs. That is true. But the deeper problem is more specific: the 0.79 pass rate is a property of the grader, not of the product.

**What would make me wrong:** Show that the eval was re-run with multiple different judge models and the pass rate is stable across models within a range that the team has defined as acceptable. If 0.79 holds within +-0.05 across claude-sonnet-4-6, claude-haiku-4-5, and a fresh run with claude-sonnet-4-20250514, then the number is meaningful. Without that cross-model validation, it is not.

### [Significant] `d20af7f` violated the explicit ban on bundled P0/P1 commits -- again -- using the exact mechanism the retrospective documented

The 2026-04-06 retrospective codified a rule: one commit per triage ID, never bundle more than two IDs. The rule was motivated by commits like `5ab42753` (B1, B3, B8, B9) and `047679bc` (B15-B23).

`d20af7f` bundles: P0 timeout fix, P1 budget fix, flexible dates migration, form visual changes, map bbox zoom, stale chips -- in 30 files touching a migration, a new feature, three separate P1 items, and style changes. This is exactly what the retrospective banned.

The Opus engineering audit correctly identified that the `feat:` label bypassed the `fix-commit-gate` hook. This is not a one-off slip; it is the same pattern the retrospective documented under "relabeling does not dodge the rule." A hook that fires only on `fix:`-labeled commits and can be bypassed by labeling a P0 fix as a `feat:` is not enforcement; it is a suggestion. The enforcement gap is structural.

The bundled migration makes this worse: `1779970908000_add-flexible-dates.js` cannot be independently reverted from the P0 timeout fix. If the flexible dates feature introduces a production issue, reverting `d20af7f` also reverts the P0 fix. This is the exact reversion-risk the one-commit-per-ID rule was designed to prevent.

**What would make me wrong:** Show a justification for why the six changes in `d20af7f` are inseparable (they share a single root cause or a single rollback unit). They do not appear to be inseparable; the timeout fix, the NaN coercion fix, the flexible dates schema change, and the form styling are all independent.

### [Significant] The eval's deprecated model is also in production

`apps/server/src/services/agent/AgentOrchestrator.ts:13`: `const DEFAULT_MODEL = 'claude-sonnet-4-20250514'`

`87576dc` reverted the orchestrator from `claude-sonnet-4-6` because "the judge and orchestrator both depend on multi-turn patterns that only work on the prior model." The revert commit is honest. But the consequence is that the production agent is running on a deprecated model ID. The model API still responds (Anthropic routes deprecated model IDs to the nearest successor), but the routing is opaque and the team cannot know which model version is actually serving responses. This is relevant because the eval was calibrated to `claude-sonnet-4-20250514` behavior. If Anthropic transparently migrates the alias, the eval score changes for the same reason identified above.

---

## What's Weak

### The adversarial eval cannot detect the actual failure mode it is positioned to detect

The 50 attacks cover: grounding (Mars, Hogwarts, Sentinel Island), impossible logistics, harmful itineraries, inappropriate requests, privacy/data extraction, scope creep, jailbreaks, and social engineering. These are real attack categories.

The `must-not` detector (`adversarial/must-not.ts`) checks for: flights to specific impossible destinations, hotels in specific impossible cities, itinerary content containing specific strings, node counts exceeding limits, and specific keywords in agent text.

What the detector cannot catch: an agent that responds to "plan a trip to Chernobyl" by searching for nearby accessible destinations and presenting them as alternatives while narrating about Chernobyl -- which is a reasonable travel-agent response, not a jailbreak -- but which the string-match detector might flag as a violation if "Chernobyl" appears in the response. The must-not rules are written as semantic descriptions ("flight_tile with destination Mars") but implemented as keyword/node-type checks. The gap between the description and the implementation is where false positives live. This is not theater; it is a known limitation the team should document.

### B35 (search_flights never fires after chip click) is a P1 in a worrying state

`docs/bugs.md` does not yet contain B35 as a named entry. The P1 todos file (`docs/todos/P1-high-priority.md`) has a task to "instrument the real E2E spec to diagnose B35" -- but the diagnostic task is itself the P1, not the fix. The bug was discovered in `3637273` (real-API E2E journey) and the team's response was to add an instrumentation task. That is the correct response per R-201 (reproduce before fixing). But this means there is a known P1 bug -- "search_flights does not fire after a complete first message plus chip click" -- that has no confirmed root cause and no fix in progress.

For a portfolio demo, the core happy path failing on real API keys is the most damaging possible failure mode. This should not be sitting behind a "needs instrumentation first" gate for another session.

### Sonnet called the process ratio "not meta-system performance art overall" and was too generous

Today's 58 commits break down as:
- `feat:` or `fix:` (product-functional): 3 items (c03d502, f82babb, 75fdc26, 8bcc51e -- orchestrator features; the security fixes 3e17fca, d0ff914, 4cbce5c; the trip-form polish d20af7f)
- `docs(audit)`: 4 commits (f2b27d7, d38ad0b, fee62ec, 8096a61)
- `docs(plan)` + `docs(spec)`: 2 commits (7070c0d, a69d41c)
- `chore(eval)` + `feat(eval)`: 3 commits (87576dc, 31ffafd, db94e80)
- `chore(bugs)`: 2 commits (68376f0, f6ecf88)
- `docs(todos)` + `docs` + `chore`: 4 commits (d305b2b, 03832b9, fbd42a1, b005381)

That is roughly 10-12 commits building or describing product-functional work and 15-16 commits that are auditing, documenting, planning, or maintaining the meta-layer. If you strip out the eval commits (which are product-adjacent), the ratio of audit/process/docs to product work is approximately 1:1. For a session described as a "major sub-agent rollout day," half the commit count being non-functional output is a signal worth naming.

Sonnet's verdict was "not meta-system performance art overall." This audit's verdict is: the audit infrastructure specifically (4 audit commits, 2 plan/spec commits, eval harness maintenance) represents a meaningful fraction of today's output, and the returns are diminishing. Four separate audit documents were written and then immediately deleted (`d305b2b` consumed them). The deletion was correct -- ship, don't accumulate -- but it means a substantial chunk of today's token budget and engineering attention produced artifacts with a 3-hour half-life.

---

## Lies the Team Tells Itself

### "The eval score of 0.79 means the agent is robust to 79% of adversarial attacks"

It does not. It means that when `claude-sonnet-4-20250514` (acting as both orchestrator and quality judge) evaluates `claude-sonnet-4-20250514` (acting as the Voyager agent) being attacked by `claude-haiku-4-5-20251001` (acting as adversarial user), 79% of attacks are assessed as handled correctly by the first instance of the model judging the second instance. The number has internal validity but cannot be extrapolated to "real users trying to break Voyager" because real users are not claude-haiku-4-5-20251001 executing a predefined attack script.

### "We fixed the rule violations from April"

The April retrospective explicitly documented: "Relabeling a `fix:` to `chore:` does not make a latent test unnecessary." Today's `d20af7f` demonstrates the other direction: labeling a P0 fix as `feat:` bypasses the hook that enforces the fix-commit discipline. The rule has a documented enforcement gap. The gap was exercised. The team knows about it and has added it to the P3 backlog (TFP-01 in the engineering audit). This is process theater: a rule that looks like enforcement but can be bypassed by a one-word commit prefix change.

### "The sub-agent architecture demonstrates production-ready engineering"

ORC-01 directly contradicts this. The multi-city legs feature and daily schedule feature -- both shipped in recent commits -- are invisible to the agent because the tools implementing them are not in any `SUB_AGENT_TOOLS` partition. A production-ready architecture does not silently drop features. It fails loudly or it does not fail. This one fails silently: the agent never sees the tools, never calls them, and the user never knows the feature exists through chat.

---

## The User's Experience, Honestly

A hiring manager who clicks through the live demo encounters:

1. A DemoBanner on every page that correctly says "portfolio demo." Trust maintained.
2. A preferences wizard that works. Registration flow is clean.
3. A trip planning chat that responds in 10-30 seconds. The `ToolTimeline` makes this comprehensible.
4. Hotel cards with no addresses. Every single one. Because `hotels.tool.ts` hardcodes `address: ''` in production. This has been in ISSUES.md since May 27. It is now in the P1 todos. It has not been fixed.
5. If the hiring manager clicks "Find flights" after entering a complete trip -- which is the natural next step -- `search_flights` may not fire (B35). This is the core demo loop failing on real API keys.
6. If they enter a multi-city trip and try to manage legs via chat, the agent cannot call `add_leg` or `remove_leg` because those tools are not in any sub-agent partition (ORC-01).

The hotel address issue and B35 are the two most visible failures. One has been open for over 24 hours with a confirmed cause. The other was discovered today with an unknown cause. Both will be encountered by any human who uses the product. Both have been deprioritized in favor of shipping an adversarial eval suite.

---

## The Business Model Problem

There is no business model. This is correctly framed everywhere in the product. The one observation Sonnet made here that is worth restating: `SERPAPI_MONTHLY_CAP` in code is 200, not 250. The README says "250 searches/month free tier." Anyone reading the README to assess operational discipline will get the wrong number for how constrained the system actually is.

The more interesting unit economics question is audit ROI. Each full three-role audit run costs approximately $15-40 in API calls based on Opus model pricing and typical token counts for this codebase. Today there were four audit document commits. If each audit cost $15, today's audit infrastructure consumed $60 in direct API costs plus engineering attention. Against a zero-revenue portfolio demo. This is a cost the team is choosing to pay on the theory that the audit infrastructure demonstrates engineering judgment to hiring managers. That theory is partially correct. But it requires that hiring managers read the audit files, not just the product. The audit trail is buried; the product is front.

---

## If I Were Competing Against This

The two P1 unmerged fixes in the worktree (`fix(P1-03)`: budget tool uses DB-truth costs; `fix(P1-05)`: multi-airport support) are the most exploitable gap. A competitor who knew about them would demo a trip where Claude-supplied cost data diverges from actual costs -- precisely the failure mode P1-03 fixes -- and show a screenshot of the bug. Voyager has the fix. It is just not deployed.

The ORC-01 dead tools gap is also exploitable: ask Voyager's agent to add a leg to a multi-city trip via chat. It cannot. This is the exact "impressive architecture that doesn't work" criticism that kills portfolio demos.

---

## Theater Check

### Confidence theater

1. **The scoring eval judge is calibrated to one model.** `eval/src/scoring/judge.ts:51` uses `claude-sonnet-4-20250514`. The pass rate of 0.79 is model-specific, not model-agnostic. The measurement looks like a product quality score but is a model self-consistency score. A real non-theatrical version would validate across at least two different model families.

2. **The `fix-commit-gate` hook enforces fix-commit discipline for commits labeled `fix:` only.** It is bypassed by labeling P0/P1 fixes as `feat:`. This is documented, known, and unresolved. The hook creates the appearance of enforcement while the actual behavior is a one-word prefix away from being bypassed. A real enforcement mechanism would check whether files touched in any commit intersect with open P0/P1 entries in `docs/bugs.md`, regardless of commit prefix. The current hook is process theater.

3. **Sonnet's confidence theater findings (11 `readFileSync` source-grep tests)** are confirmed. Not re-audited in detail here; the finding is correct and unresolved. These tests pass when strings appear in comments, dead branches, or disabled code. They are not behavioral tests.

### Security theater

**SEC-01 IDOR on leg delete/reorder** is confirmed real and unresolved. The security fix batch (`3e17fca`, `d0ff914`, `4cbce5c`) was described as comprehensive. It was not. `deleteLeg` and `reorderLegs` in the repository layer have no `trip_id` constraint. This is not a theoretical gap; the attack vector is described precisely in the Opus engineering audit and verified here.

The interesting meta-question: the security audit (`3e17fca`, `d0ff914`, `4cbce5c`) was presented as resolving the P0/P1 security findings from the engineering audit. The Sonnet criticism audit accepted this and wrote "None confirmed" under Security theater. The Opus engineering audit -- written after the Sonnet criticism audit, working from the same codebase -- found SEC-01. This is the exact failure mode the criticism role exists to catch: a sibling audit concluded "security findings addressed" and the criticism audit accepted that conclusion without verifying it.

The Sonnet criticism audit's "Theater Check -- Security theater: None confirmed" section is wrong. SEC-01 is security theater by definition: an ownership check that fires at the handler layer but not the repository layer creates the appearance of ownership enforcement while allowing cross-user deletion.

### Process theater

1. **Four audit documents deleted within 3 hours of creation** (`d305b2b` consumed `f2b27d7`, `d38ad0b`, `fee62ec` and their predecessor). The audit-then-delete-then-consolidate cycle is the right workflow. But it produces audit artifacts whose primary value is the downstream P1/P2/P3 todos, not the audit documents themselves. If the todos are what matters, the team should consider whether multi-thousand-word audit reports are the right intermediate format for a solo-developer portfolio project.

2. **The `investigate-llm-orchestration` worktree with 5 unmerged commits** exists. Trunk-based development is the stated practice. A worktree with 5 commits -- two of them P1 fixes -- that has survived across session boundaries is a process discipline failure, not a workflow tool. The worktree should have been merged or deleted at the end of the session that created it.

### Metrics theater

None confirmed beyond what Sonnet found.

---

## Is It Actually Running?

| Component | Claim | Verified? |
|---|---|---|
| `deleteLeg` SQL prevents cross-user deletion | `3e17fca` fix batch claimed to address ownership | NO. `trip-legs.repository.ts:47-48` executes `WHERE id = $1` with no `trip_id`. **UNVERIFIED SECURITY CLAIM.** |
| `add_leg` / `remove_leg` tools available to agent | Sub-agent architecture routes to them | NO. `sub-agent.service.ts:20-55` confirms they are in no partition. **FEATURES ARE DEAD.** |
| Eval score of 0.79 measures product robustness | Eval reports 79% pass rate | PARTIAL. Score is model-calibrated. Cross-model validation does not exist. |
| P1-03 budget fix deployed | fix(P1-03) exists | NO. The commit is in the `investigate-llm-orchestration` worktree only. Not on main. |
| P1-05 multi-airport fix deployed | fix(P1-05) exists | NO. Same worktree. Not on main. |
| Deprecated model `claude-sonnet-4-20250514` serving live | Revert commit confirmed | UNVERIFIABLE. Anthropic routes deprecated aliases opaquely. |

---

## Process vs. Outcome Balance

Today: 58 commits. Of those:
- 4 are audit documents (written and then deleted)
- 2 are spec/plan documents
- 3 are eval harness commits (one of which reverts the previous one)
- 2 are bugs backlog bookkeeping
- 1 is session handoff docs

That is 12 commits that are explicitly non-product. Against 46 that are product-adjacent. That ratio is tolerable. What is not tolerable is the specific sequencing: audit infrastructure and eval harness were built and maintained while two P1 bug fixes sit unmerged in a worktree, the hotel address is still empty, and B35 is undiagnosed.

The question is not "is the process ratio bad?" It is "are the process investments being made at the expense of the right product work?" The answer today is yes. The 3 eval harness commits (db94e80, 31ffafd, 87576dc) collectively spent significant time making the eval work with a new model, failing, and reverting -- while the four P1 items in the worktree sat idle.

**Verdict: not "meta-system performance art" by count, but yes by opportunity cost.**

---

## Where the Sibling Audits Are Wrong

### Engineering Opus audit (8096a61)

Substantively correct. Two additions:

1. **The audit confirms SEC-01 and ORC-01 as P1 findings.** The Sonnet criticism audit accepted the security fix batch as comprehensive and wrote "None confirmed" under security theater. The Opus engineering audit found what the Sonnet criticism audit missed. The Sonnet criticism audit should have verified the repository SQL layer, not just the handler layer. It did not.

2. **The worktree finding is correctly flagged but understated.** The audit notes "Do not delete without confirming intent." The stronger statement is: P1 labeled fixes sitting in an unmerged worktree across session boundaries are production regressions by omission. The intent question is secondary to the state question.

### Sonnet Criticism audit (d38ad0b)

1. **"Security theater: None confirmed" is wrong.** SEC-01 is security theater as defined in the audit role: a control (ownership check) that fires at the wrong layer. The handler checks that the user owns the trip. The repository deletes any leg with a matching UUID, regardless of whether it belongs to that trip. The check exists; it just doesn't check the right thing.

2. **The eval-as-theater finding is correct in conclusion but underspecified in mechanism.** Sonnet called the eval "process theater" because it has no users and no SLA. That is true. The more specific and more damning problem is that the 0.79 score is model-calibrated, not model-agnostic, which means the number will change when Anthropic deprecates the alias -- not because Voyager changed, but because the grader changed.

3. **The conclusion "not meta-system performance art overall" is too generous given the worktree situation.** Sonnet correctly flagged the worktree as a concern. It should have escalated the two P1 unmerged fixes from "concern" to "finding."

4. **What Sonnet got right that this audit endorses:** the hotel address (CQS-16) escalation to P1 is correct. The 10 `readFileSync` source-grep tests as confidence theater is correct and verified. The five items in "The Hard Prioritization" are the right five items, in roughly the right order.

---

## The Rules That Run Claude

**Files read:** `~/.claude/CLAUDE.md`, `~/.claude/rules/session-types.md`, `~/.claude/rules/audits.md`, `~/.claude/rules/cost.md`, project `CLAUDE.md`, `lefthook.yml`, `ci.yml`.

### Gaps

1. **The `fix-commit-gate` hook enforces only on `fix:`-prefixed commits.** The CLAUDE.md and project CLAUDE.md document "Bug fix path: (1) failing test... (4) commit test+fix together." Neither rule says "this applies to commits labeled `feat:` that happen to contain P0/P1 fixes." The hook is the enforcement mechanism. It has a bypass. The gap should be explicitly documented: "commit prefix does not determine whether the test-first-bug-fix rule applies; the presence of an open P0/P1 entry in BUGS.md that the commit touches does."

2. **No rule governs worktree lifecycle.** CLAUDE.md says "Push directly to main. No branch protection, no PR requirement." There is no rule about when worktrees must be closed or merged. The `investigate-llm-orchestration` worktree has survived multiple sessions without a merge-or-delete decision. A rule stating "worktrees must be merged or deleted before the next session boundary" would prevent this class of failure.

3. **R-200 anti-pattern list omits the `readFileSync` source-grep pattern.** This has been noted by both audits. It should be added as anti-pattern 9.

### Conflicts

1. **`claude-sonnet-4-20250514` is both "deprecated" (per the revert commit message) and the current production model (per `AgentOrchestrator.ts`).** There is no rule governing model deprecation response. When Anthropic deprecates a model, what is the team's obligation? The absence of a rule means the team can use a deprecated model indefinitely with no trigger for review.

2. **CLAUDE.md says "Squash merge feature branches" (R-212) but the project uses trunk-based development.** Sonnet flagged this as a dead rule. It is. Dead rule in a project-level context.

### Waste

1. **The audit-write-then-delete-within-session cycle** is currently uncosted. Writing a 4,000-word engineering audit, consuming it into todos, and deleting it is the right workflow. But when it happens four times in one day, the team should ask whether the todo output is proportional to the audit input. A leaner format -- 500-word triage report plus structured todos -- might produce the same P1/P2/P3 output at lower cost.

2. **R-212 and R-213** are dead rules for this project. They should either be overridden explicitly in the project CLAUDE.md or removed from the global rules for projects that are trunk-based.

### Redundancy

None material beyond what Sonnet found.

### Dead rules

- **R-212 (squash merge):** Dead for this project. Not harmful, just inapplicable.
- **R-213 (cross-cutting refactors on dedicated branch):** `3fd7d7d` (services reorganization, 5+ files, 3+ directories) landed directly on main. Not followed. Dead in practice for this project.
- **`fix-commit-gate` hook:** Functions as written, but can be bypassed by commit prefix selection. Functionally dead for any fix labeled `feat:`.

### Thoroughness

Convention files cover the active stack. The hook installation is confirmed. Session-type routing is clean. The one gap: no rule covers model version lifecycle or deprecated model response.

**Overall rule-layer health rating: Significant.**

The worktree lifecycle gap is generating real consequences (P1 fixes not in production). The fix-commit hook bypass is generating real consequences (P0/P1 fixes bundled into a `feat:` commit with a migration that cannot be independently reverted). These are not theoretical gaps; they fired today.

---

## The Opus-vs-Sonnet Question

The dispatch framing asks directly: if Sonnet's audit output requires Opus review on a regular cadence, is the cost model broken? Should Opus have done the original work?

The honest answer: **yes for targeted audits, no for routine audits.**

The two most consequential findings this pass produced -- SEC-01 (IDOR on leg delete/reorder was accepted by the Sonnet criticism audit as fixed) and the eval model-lock-in finding -- required reading specific code files and reasoning carefully about what the code actually guarantees versus what the audit claimed it guarantees. Sonnet accepted "security fixes landed same day" as evidence that the security surface was clean. It was not. That gap required either: (a) an Opus pass to catch it, or (b) a Sonnet pass with explicit instructions to verify the repository SQL layer independently, not just accept the handler-layer check. Option (b) is cheaper and probably sufficient.

The more productive framing: Sonnet criticism audits should have a mandatory step to verify the repository layer whenever a security fix is claimed at the handler layer. That step costs 2-3 additional tool calls and eliminates the need for a separate Opus pass for this class of finding. The Opus pass is not wrong; it is overkill for a finding that Sonnet would have caught with better instructions.

For strategic findings (the eval model-lock-in, the worktree lifecycle policy question, the process-vs-outcome imbalance judgment), Opus adds genuine value because these require integrating multiple signals across the full session history and making judgment calls about priorities. For code-level verification findings, better-scoped Sonnet instructions would suffice.

**The cost model recommendation:** do not make Opus second-opinion criticism audits a regular cadence. Instead, route Sonnet criticism audits with explicit verification checklists for claimed security fixes. Reserve Opus for audits that require strategic judgment across multiple surfaces (major architectural pivots, go/no-go decisions, or post-incident retrospectives).

---

## The Hard Prioritization

If the team could only fix 5 things before showing this to anyone:

1. **Merge or cherry-pick `4aa4fce` (P1-03) and `ebf2c6b` (P1-05) from `investigate-llm-orchestration` to main.** P1 bug fixes not in production is the highest-priority state cleanup. Effort: 15 minutes.

2. **Fix CQS-16: hotel address empty in production.** Every hotel card shows no address. This is the most visible data quality failure in the core product loop. It has been open since May 27. Effort: small (parse address from SerpApi response; update mock).

3. **Fix ORC-01: add the four dead tools to `conversation` sub-agent partition (or a new `itinerary` partition).** `add_leg`, `remove_leg`, `reorder_legs`, `plan_daily_schedule` are implemented but unreachable through agent chat. The multi-city and schedule features are silently non-functional. Effort: small (update `SUB_AGENT_TOOLS` map; write a unit test confirming the tools are in the partition).

4. **Fix SEC-01: add `AND trip_id = $N` to `deleteLeg` and `reorderLegs` SQL.** The IDOR is a real exploitable gap. Effort: small (two SQL changes; one test asserting cross-user deletion is rejected).

5. **Diagnose B35 and fix or document.** `search_flights` not firing after chip click on the core happy path is the most damaging possible demo failure. The P1 instrumentation task in the todos is the right first step but should not sit idle for another session. Effort: M (instrumentation + diagnosis + fix).

Items 1, 3, and 4 combined are under 2 hours. The sequencing matters: every session that ends without merging the worktree is a session where two P1 fixes stay out of production.

---

## What Would Make Me Wrong

**SEC-01 (IDOR on leg delete/reorder):** Show that `deleteLeg` and `reorderLegs` in the repository layer now include a `trip_id` constraint, or show that the handler layer calls `listLegs(req.params.id)` and verifies the target leg ID is in the returned list before calling `deleteLeg`.

**ORC-01 (dead tools):** Show that `add_leg`, `remove_leg`, `reorder_legs`, and `plan_daily_schedule` appear in at least one entry in `SUB_AGENT_TOOLS`, and show a unit test asserting that `selectSubAgent` returns a type whose partition includes at least one of these tools for a trip in the PLANNING phase.

**Eval model lock-in:** Show an eval run using a different judge model (anything other than `claude-sonnet-4-20250514`) that produces a pass rate within +-0.05 of 0.79. If the score is stable across models, the measurement is model-agnostic and the finding is retracted.

**P1-03 / P1-05 not in production:** Show the commit hashes of these fixes on the `main` branch. If they were cherry-picked under different hashes, the finding is resolved.

**Bundled `d20af7f` R-204 violation:** Show a justification for why the six changes are inseparable (shared rollback unit, shared root cause). If the timeout fix and the NaN coercion fix and the flexible dates migration share a single deployment unit that cannot be partially reverted in production, the bundling is defensible. The migration being a separate database operation suggests they are separable.

---

## Delta vs Sonnet Criticism (d38ad0b)

### What Sonnet softened or missed

1. **"Security theater: None confirmed"** -- wrong. SEC-01 is security theater at the repository layer. Sonnet accepted the handler-layer fix as comprehensive without verifying the SQL.

2. **The eval model lock-in finding** -- Sonnet called the eval "process theater" (correct) but did not identify the specific mechanism: the 0.79 score is a property of the grader model, not of the product.

3. **The worktree P1 fixes** -- Sonnet flagged the worktree as a "concern" but did not elevate it to a finding given that two of the unmerged commits are labeled P1 fixes not in production.

4. **The `feat:` label hook bypass** -- Sonnet correctly called this a "process recurrence" but noted it as P3. Given that the exact mechanism (relabeling) was documented in the April retrospective as the failure mode to watch for, and it recurred today in the first major commit of the day, this is better characterized as a systemic discipline failure, not a one-off.

### What Sonnet flagged that this audit thinks was correct

1. **The 10 `readFileSync` source-grep tests as confidence theater.** Correct and verified.
2. **CQS-16 (hotel address always empty) escalation to P1.** Correct.
3. **The eval harness as process theater.** Correct in the conclusion, underspecified in mechanism.
4. **The hard prioritization of 5 items.** The five are right; the ordering is close to right. This audit would put the worktree P1 fixes first rather than fifth.

### What Sonnet got right that this audit did not re-verify

1. **Web-client tests in CI confirmed.** Taken from Sonnet without re-reading the CI file; the finding is directionally correct per the CI file reviewed here.
2. **Session cleanup `setInterval` confirmed.** Not re-read; accepted from Sonnet.
3. **Fix-commit discipline holding (except d20af7f).** Accepted.
