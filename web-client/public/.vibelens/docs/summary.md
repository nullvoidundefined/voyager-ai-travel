<!-- vibelens format:1 -->

# Voyager -- AI Travel Concierge

## What It Does

Voyager is an AI-powered travel planning application. Users describe a trip -- destination, dates, budget, and preferences -- and an AI agent powered by Anthropic Claude searches real travel APIs to assemble a complete, budget-aware itinerary. The agent uses a per-category state machine to guide users through flights, hotels, car rentals, and experiences in order, calling 3-8 tools per conversational turn and reasoning between each call. Users can also explore 30 curated destination guides, set 7-category travel preferences, and finalize trips through a checkout flow.

## The Problem It Solves

Planning a trip involves juggling multiple booking sites, mentally tracking budgets across flights, hotels, activities, and car rentals, and making trade-offs without clear cost visibility. Voyager consolidates this into a single conversational interface where an AI agent handles the search, comparison, and budget math -- presenting options as interactive cards that users can select with a click. The per-category booking state machine ensures a structured flow (flights, then hotels, then car rentals, then experiences) while still allowing conversational flexibility.

## How It Works (User Perspective)

1. **Explore destinations** -- Browse 30 curated destination guides on the public Explore page. Filter by category (Beach, City, Adventure, Romantic, Food & Wine, etc.), search by name, and read detailed guides with experiences, dining, neighborhoods, weather charts, and visa info. Each destination features a curated Unsplash photo.
2. **Set preferences** -- After registering, a 6-step wizard collects travel preferences across 7 categories: accommodation style, travel pace, dietary restrictions, dining style, activities, travel party, and budget comfort. These are stored as versioned JSONB and injected into the agent's prompts.
3. **Create a trip** -- Click "New Trip" and the app creates a blank trip record and drops you into a chat with the Voyager AI concierge.
4. **Describe your trip** -- Tell the agent where you want to go, your dates, and your budget. The agent renders an inline form to collect structured details (origin, dates, budget, travelers).
5. **Agent searches by category** -- The booking state machine tracks each category's status (idle, asking, presented, done, skipped). The agent first asks "flying or driving?" to set transport mode. If flying, it searches flights via SerpApi Google Flights. Then it proceeds to hotels, car rentals, and experiences in order. Results appear as interactive tile cards.
6. **Auto-enrichment** -- When a destination is recognized, the app automatically fetches travel advisories (US State Dept + UK FCDO), a 7-day weather forecast (Open-Meteo), visa requirements, and local driving rules -- displayed as advisory and weather cards alongside the search results.
7. **Select and confirm** -- Click a tile card to select it, then "Confirm Selection." The agent calls the appropriate selection tool (`select_flight`, `select_hotel`, `select_car_rental`, or `select_experience`) to persist the choice, then calls `calculate_remaining_budget` and advances to the next category.
8. **Checkout** -- After all categories are filled (or skipped), the agent presents the full itinerary and offers a "Confirm booking" quick reply. Clicking it opens the BookingConfirmation modal, which shows an itemized cost breakdown and transitions through review, booking (spinner), and confirmed (checkmark) stages. The trip status changes to "saved."
9. **Iterate** -- At any point, send another message to adjust the plan. Quick reply chips appear for common follow-up actions. The agent respects user preferences loaded from the account settings and uses per-category prompts tailored to the current booking step.

## Key Features

- **Agentic tool-use loop**: Claude calls tools iteratively (up to 15 per turn), reasoning between each call. This is not single-pass -- the agent plans its tool calls based on prior results.
- **Per-category state machines**: A `BookingState` JSONB column tracks each category (flights, hotels, car_rental, experiences) through states: idle, asking, presented, done, skipped. A `FlowPosition` type determines which phase the user is in: COLLECT_DETAILS, CATEGORY (with specific category and status), CONFIRM, or COMPLETE.
- **Per-category prompts**: Each category has tailored prompts for each state (idle, asking, presented). The prompts are minimal (1-2 sentences) and instruct the agent to let the tile cards speak for themselves.
- **12 tools**: search_flights, search_hotels, search_car_rentals, search_experiences, calculate_remaining_budget, get_destination_info, update_trip, select_flight, select_hotel, select_car_rental, select_experience, format_response.
- **Selection persistence**: Four `select_*` tools let the agent persist user choices to dedicated database tables (`trip_flights`, `trip_hotels`, `trip_car_rentals`, `trip_experiences`) immediately when the user confirms a selection.
- **Real API data**: Flights from Google Flights via SerpApi, hotels from Google Hotels via SerpApi, car rentals from Google Car Rentals via SerpApi, experiences from Google Places API. No hallucinated prices.
- **Auto-enrichment**: When a trip destination is set, the server automatically fetches travel advisories (US State Dept + UK FCDO), a 7-day weather forecast (Open-Meteo), visa requirements (matrix lookup by origin/destination country pair), and driving requirements -- no extra tool calls needed from the agent.
- **7-category user preferences**: A 6-step wizard collects accommodation, travel pace, dietary restrictions, dining style, activities, travel party, and budget comfort preferences. Stored as versioned JSONB with legacy value migration. Injected into per-category prompts to personalize recommendations.
- **30 curated destination guides**: Public Explore page with category filtering (9 categories), text search, destination detail pages with experiences, dining, neighborhoods, weather charts, and visa summaries. Each destination has a curated Unsplash photo.
- **Destination imagery**: 30 curated Unsplash photos mapped by city name. Used on explore cards, destination detail pages, trip cards, and the explore hero carousel. Gradient fallback for unknown cities.
- **Typed chat protocol**: Every message is stored and streamed as an ordered array of typed `ChatNode` objects (text, flight_tiles, hotel_tiles, car_rental_tiles, experience_tiles, advisory, weather_forecast, budget_bar, quick_replies, tool_progress, itinerary, travel_plan_form). The server controls what the UI renders.
- **Token streaming**: The agent loop uses `messages.stream()` for real-time text streaming via SSE. The frontend receives `text_delta` events for partial text and `node` events for complete structured nodes.
- **Budget tracking**: The `calculate_remaining_budget` tool computes exact spend breakdowns. The frontend shows a `BudgetBar` node and a cost breakdown card on the trip detail page.
- **Checkout flow**: BookingConfirmation modal with three stages (review, booking, confirmed). Itemized cost breakdown, spinner animation, checkmark animation. Trip status transitions to "saved."
- **SSE streaming**: The chat endpoint streams typed node events and text deltas via Server-Sent Events. The frontend reads the stream with the `useSSEChat` hook and updates UI in real time.
- **Same-origin API proxy**: Vercel rewrites proxy `/api/*` requests to the Railway backend, solving Safari ITP cookie issues with cross-origin credentials.
- **Mediterranean Warmth theme**: Light-only design with warm coral, terracotta, and cream tones. CSS custom properties throughout -- no hardcoded colors.
- **Conversation persistence**: All messages are stored in PostgreSQL as `ChatNode[]` arrays. Returning to a trip restores the full visual conversation history.
- **Redis caching**: SerpApi and Google Places responses are cached for 1 hour to conserve the 250 searches/month SerpApi free tier.
- **330 unit tests**: 37 test files covering handlers, repositories, tools, middleware, services, prompts, and schemas.
- **35 user stories**: Documented in `docs/USER_STORIES.md` covering public pages, auth, trip management, chat, checkout, preferences, and account flows.
- **Playwright E2E suite**: 8 test files covering all user story domains.
- **Pre-commit/pre-push hooks**: Lefthook runs format checks, linting, and build verification.
- **Topic guardrail**: The system prompt restricts the agent to travel-related topics only.

## Target Users

Travelers who want a fast, conversational way to plan a complete trip with real pricing data, travel advisories, and budget constraints, without switching between multiple booking sites.
