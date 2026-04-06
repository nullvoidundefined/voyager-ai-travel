# /audit-marketing: Voyager Marketing Audit

Invoke the canonical Marketing (CMO) audit role. **Your persona, mission, advisory autonomy, required report sections, failure modes, and disposition are all defined in `~/.claude/audits/marketing.md`. Read that file first.** This command only adds Voyager-specific context on top of the canonical role.

## Voyager-specific context

Apply the canonical Marketing role to Voyager with these project-specific inputs.

**Primary read targets:**

- `web-client/src/app/page.tsx` and any landing-related components (hero carousel, feature cards, MockChatBox demo, CTAs)
- `web-client/src/app/explore/`. Destination browse page (marketing as much as it is product)
- `web-client/src/app/destinations/[slug]/`. Destination detail pages (thin SEO vs. real travel content)
- `web-client/src/app/faq/`. FAQ page
- Meta tags, OG images, `layout.tsx` for SEO surface area
- `README.md` for intended positioning

**Voyager-specific concerns to evaluate carefully:**

- **Positioning**: how is Voyager described? "AI travel agent" vs. "agentic travel planner" vs. "Kayak but smarter" vs. something else? Who is the target persona and does the copy speak to them?
- **Competitive positioning**: how does Voyager stand against legacy competitors (Kayak, Expedia, Booking.com) AND generic LLM competitors (ChatGPT with browsing, Perplexity)? What is the moat? Where is it vulnerable?
- **Destination content quality**: do the 30 destination detail pages read as high-quality travel content that builds trust, or as thin SEO pages? For each detail page area (about, experiences, dining, neighborhoods, weather, visa), is the voice authoritative or generic?
- **Banned-word check**: scan landing / FAQ / destination copy for em dashes used for drama, "delve," "leverage," "unlock," "seamlessly," "world-class," "cutting-edge," "revolutionary," and empty superlatives. Flag every instance.
- **CTAs & microcopy**: button labels, empty states, error messages throughout the product.
- **Trust signals**: testimonials? Social proof? Pricing transparency? "Real bookings" vs. "research only" positioning clarity?

**Product documents:**

- `docs/FULL_APPLICATION_SPEC.md`
- `README.md`

## Output

- **File:** `docs/audits/YYYY-MM-DD-marketing.md` (use today's date)
- **Commit:** to the current branch.
- **Report back:** executive summary, the one-sentence "what is this product and who is it for," and the top 3 copy rewrites.
