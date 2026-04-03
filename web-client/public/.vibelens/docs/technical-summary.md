<!-- vibelens format:1 -->

# Technical Summary

## Architecture at a Glance

Voyager is a fullstack monorepo with a Next.js 15 frontend and an Express 5 + TypeScript API. The core feature is an **agentic tool-use loop** where Claude calls external travel APIs iteratively, reasoning between calls to build budget-aware itineraries. A per-category **booking state machine** guides the conversation through flights, hotels, car rentals, and experiences in order. A `packages/shared-types` workspace package defines the typed chat protocol shared between server and frontend.

```
Browser (Next.js)  -->  Vercel rewrites (/api/*)  -->  Express API  -->  Anthropic Claude
                                                          |                    |
                                                          |              Tool calls (3-8 per turn)
                                                          |                    |
                                                      PostgreSQL         SerpApi / Google Places
                                                          |                    |
                                                        Redis (cache)    Auto-enrichment (State Dept,
                                                                        FCDO, Open-Meteo, visa matrix)
```

## Core Concepts

### The Agent Loop

The `AgentOrchestrator` class (`server/src/services/AgentOrchestrator.ts`) implements a while-loop that:

1. Sends conversation messages + tool definitions to Claude via `messages.stream()`
2. If Claude returns `stop_reason: "end_turn"` -- return the text response
3. If Claude returns `stop_reason: "tool_use"` -- execute each tool, append results as `tool_result` messages, and loop back to step 1
4. Safety limit: 15 tool calls per turn maximum

The orchestrator emits `ProgressEvent`s (`tool_start`, `tool_result`, `assistant`) that the chat handler streams to the frontend via SSE.

### Per-Category State Machine

`server/src/prompts/booking-steps.ts` defines a state machine that tracks each booking category through a lifecycle:

- **BookingState**: JSONB column on the `trips` table with versioned schema. Tracks four categories: `flights`, `hotels`, `car_rental`, `experiences`. Each has a `CategoryStatus`: `idle` -> `asking` -> `presented` -> `done` (or `skipped`).
- **FlowPosition**: Computed from trip details and booking state. Phases: `COLLECT_DETAILS` (missing required fields), `CATEGORY` (working on a specific category), `CONFIRM` (all categories done), `COMPLETE` (trip booked).
- **Category order**: flights, hotels, car_rental, experiences. Flights are auto-skipped when `transport_mode` is `"driving"`.
- **State transitions**: `advanceBookingState()` advances the current category based on which tools were called and whether selections exist. `skip_category` in `format_response` transitions directly to `skipped`.

### Per-Category Prompts

`server/src/prompts/category-prompts.ts` provides tailored system prompts for each category and status combination. Instead of one monolithic system prompt, the agent receives a focused prompt for the current step (e.g., "Ask the user if they need a hotel" for `hotels.idle`, or "The user is browsing flight options -- do NOT re-describe the results" for `flights.presented`). User preferences are injected into relevant category prompts (accommodation preference for hotels, activities for experiences, travel party for all).

### Tools

Twelve tools are registered with Claude via `TOOL_DEFINITIONS` in `server/src/tools/definitions.ts`:

| Tool                         | Implementation                   | External API                            |
| ---------------------------- | -------------------------------- | --------------------------------------- |
| `search_flights`             | `flights.tool.ts`                | SerpApi `google_flights` engine         |
| `search_hotels`              | `hotels.tool.ts`                 | SerpApi `google_hotels` engine          |
| `search_car_rentals`         | `car-rentals.tool.ts`            | SerpApi `google_car_rental` engine      |
| `search_experiences`         | `experiences.tool.ts`            | Google Places Text Search               |
| `calculate_remaining_budget` | `budget.tool.ts`                 | Local computation (no API)              |
| `get_destination_info`       | `destination.tool.ts`            | Consolidated city database (197 cities) |
| `update_trip`                | `executor.ts` -> `trips.ts` repo | PostgreSQL update                       |
| `select_flight`              | `executor.ts` -> `trips.ts` repo | PostgreSQL insert                       |
| `select_hotel`               | `executor.ts` -> `trips.ts` repo | PostgreSQL insert                       |
| `select_car_rental`          | `executor.ts` -> `trips.ts` repo | PostgreSQL insert                       |
| `select_experience`          | `executor.ts` -> `trips.ts` repo | PostgreSQL insert                       |
| `format_response`            | Handled in chat handler          | None (agent text + citations)           |

### Typed Chat Protocol

All messages are stored and streamed as ordered arrays of `ChatNode` objects, defined in `packages/shared-types/src/nodes.ts`. The `ChatNode` type is a TypeScript discriminated union with 12 variants: `text`, `flight_tiles`, `hotel_tiles`, `car_rental_tiles`, `experience_tiles`, `travel_plan_form`, `itinerary`, `advisory`, `weather_forecast`, `budget_bar`, `quick_replies`, and `tool_progress`.

This is a **server-driven UI** protocol: the server decides what nodes to render; the frontend maps each node type to a React component via the `NodeRenderer` registry. TypeScript enforces exhaustiveness -- if a new node type is added to shared-types but no component is registered, the frontend will not compile.

### Auto-Enrichment Service

`server/src/services/enrichment.ts` runs automatically whenever a destination is resolved. It fans out to five sources in parallel:

- **US State Dept advisory** -- fetches current travel advisory level
- **UK FCDO advisory** -- fetches Foreign Commonwealth & Development Office advisory
- **Open-Meteo** -- 7-day weather forecast using the destination's coordinates from the consolidated city database
- **Visa matrix** -- static lookup table for visa requirements by origin/destination country pair
- **Driving requirements** -- static table of left/right-hand traffic, license requirements per country

Results arrive as `advisory` and `weather_forecast` ChatNodes appended to the message stream. The agent did not have to call any tools to produce this -- enrichment is orchestrated by the server, not by Claude.

### Node Builder Layer

`server/src/services/node-builder.ts` sits between tool execution and message persistence. After each tool result, the node builder converts the raw JSON result into the appropriate `ChatNode` (e.g., `search_flights` result -> `flight_tiles` node, `calculate_remaining_budget` result -> `budget_bar` node). This keeps the serialization logic in one place and ensures the agent's raw tool output never reaches the frontend directly.

### Data Flow for a Chat Turn

1. Frontend sends `POST /trips/:id/chat` with `{ message }` and `X-Requested-With` header (via same-origin Vercel rewrite proxy)
2. Chat handler loads trip (including `booking_state` JSONB), user preferences, and conversation history from PostgreSQL
3. Computes `FlowPosition` from trip state and booking state; selects the appropriate per-category prompt
4. Calls `runAgentLoop()` which delegates to `AgentOrchestrator.run()` with `messages.stream()` for token streaming
5. Tool results are converted to ChatNodes by the node builder and streamed via SSE
6. After the agent turn, `advanceBookingState()` updates the booking state machine based on which tools were called
7. Auto-enrichment nodes are appended when a destination is resolved
8. User and assistant messages are persisted to `messages` table with both `nodes` (frontend) and `content`/`tool_calls_json` (agent conversation) columns
9. Frontend `useSSEChat` hook reads the typed SSE stream and updates UI in real time

### User Preferences System

`server/src/schemas/userPreferences.ts` defines a 7-category preference model:

| Category       | Options                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Accommodation  | budget, mid-range, upscale, unique                                                                     |
| Travel Pace    | relaxed, moderate, packed                                                                              |
| Dietary        | vegetarian, vegan, halal, kosher, gluten-free, dairy-free, nut-free, none                              |
| Dining Style   | street-food, casual, fine-dining, food-tours                                                           |
| Activities     | 10 options (history, nature, beach, nightlife, shopping, wellness, adventure, art, photography, local) |
| Travel Party   | solo, romantic-partner, friends, family-with-kids, family-adults                                       |
| Budget Comfort | budget-conscious, value-seeker, comfort-first, no-concerns                                             |

Preferences are stored as versioned JSONB (`version: 1`) with a `normalizePreferences()` function that migrates legacy v0 format (which used `intensity` and `social` field names) to the current schema. A `completed_steps` array tracks which wizard steps the user has finished.

### Authentication

Custom session-based auth (no Supabase for this app):

- `POST /auth/register` -- bcrypt hash (12 rounds), create user + session in a transaction
- `POST /auth/login` -- verify password, delete old sessions, create new session in a transaction
- Sessions stored as SHA-256 hashes in `sessions` table; raw token in httpOnly cookie
- `loadSession` middleware reads cookie on every request; `requireAuth` blocks unauthenticated access

### Caching Strategy

Redis caches SerpApi and Google Places responses with a 1-hour TTL:

- Cache keys are deterministic: `api_cache:{provider}:{endpoint}:{sorted_params_json}`
- `normalizeCacheKey()` lowercases and sorts params for consistent cache hits
- Critical for staying within SerpApi's 250 searches/month free tier

### Database Schema

13 migration files create these tables: `users`, `sessions`, `trips`, `trip_flights`, `trip_hotels`, `trip_experiences`, `trip_car_rentals`, `conversations`, `messages`, `api_cache`, `tool_call_log`, `user_preferences`

The `trips` table includes a `booking_state` JSONB column that stores the per-category state machine. The `messages` table uses a **dual-column pattern**: `nodes` (JSONB `ChatNode[]`) stores the display state the frontend renders; `content` + `tool_calls_json` store the raw Claude API conversation state the agent needs to reconstruct context. A `schema_version` INTEGER column enables forward-compatible rendering. A `sequence` INTEGER column (unique per conversation) provides strict message ordering.

### Explore Mode

`web-client/src/data/destinations.ts` defines 30 curated destinations with rich data: slug, name, country, categories, price level, best season, description, currency, language, estimated daily budgets, visa summary, top 10 experiences, dining highlights, neighborhoods, and 12-month weather data. The Explore page provides category filtering (9 categories: All, Beach & Islands, City Breaks, Adventure, Romantic, Food & Wine, Culture & History, Budget-Friendly, Family) and text search. Each destination has a detail page at `/explore/[slug]` with full guide content.

### Consolidated City Database

`server/src/data/cities.ts` contains 197 cities worldwide with lat/lon, country code, IATA code, timezone, currency, and optional best time to visit and Unsplash photo ID. Used by `get_destination_info` for IATA resolution, by the enrichment service for weather forecast coordinates, and for destination imagery.

### Frontend State Management

- **TanStack Query** for all server state (trips, messages, user preferences, auth)
- **`useSSEChat`** custom hook manages the SSE stream, typed node accumulation, and tool progress state
- **`VirtualizedChat`** component renders the message list with `@tanstack/react-virtual` for performance
- **`NodeRenderer`** component registry maps each `ChatNode` type to its React component
- `AuthContext` wraps the app with `useQuery` for `/auth/me` and provides `login`, `signup`, `logout`
- No client-side store (no Redux, no Zustand) -- all state is server-derived or component-local

### CSRF Protection

Header-only CSRF: all mutating requests must include `X-Requested-With: XMLHttpRequest`. The `csrfGuard` middleware rejects state-changing requests without this header.

### Same-Origin API Proxy

`web-client/next.config.ts` defines a Vercel rewrite rule: `/api/:path*` -> `${NEXT_PUBLIC_API_URL}/:path*`. This makes API requests same-origin from the browser's perspective, solving Safari ITP (Intelligent Tracking Prevention) cookie blocking for cross-origin `credentials: "include"` requests. The `SameSite` cookie attribute works correctly because the browser sees a same-origin request.

## Deployment

- **Frontend**: `cd web-client && npx vercel --prod` -- deploys to Vercel with `vercel.json` setting `framework: "nextjs"`
- **Backend**: `railway up --detach` from monorepo root -- builds `Dockerfile.server`, runs `node server/dist/index.js`
- Multi-stage Docker build: Node 22-slim base, pnpm workspace install, TypeScript compile, production-only deps in final image
- **Pre-commit hooks**: Lefthook runs `pnpm format:check` and `pnpm lint` in parallel
- **Pre-push hooks**: Lefthook runs format check, lint, and server build verification
