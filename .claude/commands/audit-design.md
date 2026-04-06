# /audit-design: Voyager Design Audit

Invoke the canonical Design (CDO) audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/design.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Design role to the Voyager web-client with these project-specific inputs.

**Primary read targets:**

- `web-client/src/app/`. Next.js 15 App Router pages (home, explore, destinations, trips, account)
- `web-client/src/components/`. All shared components
- `web-client/src/styles/`. Global styles, CSS custom properties, design tokens
- SCSS modules throughout the web-client (`*.module.scss`)
- Image assets in `web-client/public/`

**Voyager-specific surfaces to evaluate carefully:**

- **Home page**: hero carousel (5 destination photos), feature highlight cards, live demo chat (MockChatBox), CTAs ("Get Started", "Discover destinations"). Does the visual execution match a premium travel brand?
- **Explore page**: 30-destination grid with category filtering. Card consistency, photography quality, responsive grid behavior.
- **Destination detail pages**: hero, quick stats bar, about, top experiences, dining, neighborhoods, weather chart, visa info, "Plan a trip" CTA. Information density vs. calm layout.
- **Chat & trip pages**: the chat UI is the product's core. Evaluate message bubbles, loading/thinking indicators during tool calls, tile-card layouts for flights/hotels/experiences, selection states, confirmation flows.
- **Itinerary display**: how is a completed trip presented? Visual hierarchy across flights, hotels, activities.
- **Mobile breakpoints**: test at 375, 390, 414 widths. The itinerary and chat experience on mobile are critical.

**Project convention files (read before writing):**

- `.claude/bottomlessmargaritas/CLAUDE-FRONTEND.md`
- `.claude/bottomlessmargaritas/CLAUDE-STYLING.md`

**Product documents:**

- `docs/FULL_APPLICATION_SPEC.md`
- `docs/USER_STORIES.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-design.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** executive summary and the top 3 style-drift or visual-consistency issues.
