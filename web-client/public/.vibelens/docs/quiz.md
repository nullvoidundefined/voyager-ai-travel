<!-- vibelens format:1 -->

# Technical Quiz -- Voyager AI Travel Concierge

---

**Q1. What is the name of the AI model used by the AgentOrchestrator?**
? This is defined as a constant in AgentOrchestrator.ts.

- A) gpt-4-turbo
- B) claude-sonnet-4-20250514
- C) claude-3-opus
- D) claude-3-haiku
  > **B)** The `DEFAULT_MODEL` constant in `server/src/services/AgentOrchestrator.ts` is set to `"claude-sonnet-4-20250514"`. This is the Claude model used for all agentic tool-use interactions.
  > [difficulty:easy]

---

**Q2. How many tools are registered with Claude for the agent loop?**
? Check the TOOL_DEFINITIONS array in server/src/tools/definitions.ts.

- A) 8
- B) 10
- C) 12
- D) 15
  > **C)** Twelve tools are defined: `search_flights`, `search_hotels`, `search_car_rentals`, `search_experiences`, `calculate_remaining_budget`, `update_trip`, `get_destination_info`, `select_flight`, `select_hotel`, `select_car_rental`, `select_experience`, and `format_response`.
  > [difficulty:easy]

---

**Q3. What package manager does this monorepo use?**
? Look at the packageManager field in the root package.json.

- A) npm
- B) yarn
- C) pnpm
- D) bun
  > **C)** The root `package.json` specifies `"packageManager": "pnpm@9.15.9"` and uses `pnpm-workspace.yaml` for workspace configuration.
  > [difficulty:easy]

---

**Q4. What is the maximum number of tool calls allowed per agent turn?**
? This is a safety limit defined in the AgentOrchestrator.

- A) 5
- B) 8
- C) 10
- D) 15
  > **D)** `DEFAULT_MAX_ITERATIONS` in `AgentOrchestrator.ts` is set to 15. The shared rules in category prompts also mention this limit: "Max 15 tool calls per turn."
  > [difficulty:easy]

---

**Q5. What external service provides flight search data?**
? The flights tool calls an external search API.

- A) Amadeus API
- B) Skyscanner API
- C) SerpApi (Google Flights engine)
- D) Kayak API
  > **C)** `searchFlights()` in `flights.tool.ts` calls `serpApiGet("google_flights", params)`, which queries SerpApi's Google Flights engine.
  > [difficulty:easy]

---

**Q6. How does Voyager protect against CSRF attacks?**
? Look at the csrfGuard middleware and the frontend API client headers.

- A) CSRF tokens generated per session
- B) Double-submit cookie pattern
- C) X-Requested-With header requirement on state-changing requests
- D) Origin header validation only
  > **C)** The `csrfGuard` middleware rejects state-changing requests (POST, PUT, PATCH, DELETE) that do not include the `X-Requested-With: XMLHttpRequest` header. The frontend API client adds this header to every request.
  > [difficulty:easy]

---

**Q7. How many curated destinations are available on the Explore page?**
? Check the DESTINATIONS array in web-client/src/data/destinations.ts.

- A) 15
- B) 20
- C) 30
- D) 50
  > **C)** The `DESTINATIONS` array contains 30 curated destinations, each with full guide data including experiences, dining, neighborhoods, weather, and visa summaries.
  > [difficulty:easy]

---

**Q8. What are the four booking categories tracked by the state machine?**
? Look at the CategoryName type in booking-steps.ts.

- A) flights, hotels, restaurants, activities
- B) flights, hotels, car_rental, experiences
- C) transport, accommodation, food, entertainment
- D) flights, lodging, car_rental, tours
  > **B)** The `CategoryName` type is a union of `'flights' | 'hotels' | 'car_rental' | 'experiences'`. These are tracked as individual `CategoryState` objects within the `BookingState` JSONB column.
  > [difficulty:easy]

---

**Q9. What are the five possible statuses for a booking category?**
? Look at the CategoryStatus type in booking-steps.ts.

- A) new, searching, selected, booked, cancelled
- B) idle, asking, presented, done, skipped
- C) pending, active, complete, failed, skipped
- D) open, in_progress, resolved, closed, cancelled
  > **B)** The `CategoryStatus` type is `'idle' | 'asking' | 'presented' | 'done' | 'skipped'`. Categories progress through idle -> asking -> presented -> done, or can be skipped at any point.
  > [difficulty:easy]

---

**Q10. What is the cache TTL for SerpApi responses in Redis?**
? Look at the CACHE_TTL constant in the tool files.

- A) 5 minutes
- B) 15 minutes
- C) 1 hour
- D) 24 hours
  > **C)** All API tool files define `const CACHE_TTL = 3600` (3600 seconds = 1 hour).
  > [difficulty:easy]

---

**Q11. How does the frontend receive real-time updates during an agent turn?**
? The chat handler sets specific response headers.

- A) WebSocket connection
- B) Server-Sent Events (SSE) via text/event-stream
- C) Long polling with 2-second intervals
- D) GraphQL subscriptions
  > **B)** The chat handler sets `Content-Type: text/event-stream` and emits typed SSE events (`node`, `text_delta`, `tool_progress`, `done`, `error`). The `useSSEChat` hook reads the stream.
  > [difficulty:medium]

---

**Q12. Which library manages all server state on the frontend?**
? This is the primary data-fetching library used throughout the frontend.

- A) Redux Toolkit
- B) Zustand
- C) SWR
- D) TanStack Query (React Query)
  > **D)** TanStack Query (`@tanstack/react-query` v5) manages all server state. The app uses `useQuery` for fetching (trips, messages, auth, preferences) and `useMutation` for mutations (trip deletion with optimistic updates).
  > [difficulty:easy]

---

**Q13. What are the four phases of the FlowPosition type?**
? Look at the FlowPosition discriminated union in booking-steps.ts.

- A) INIT, SEARCH, SELECT, COMPLETE
- B) COLLECT_DETAILS, CATEGORY, CONFIRM, COMPLETE
- C) WELCOME, PLANNING, BOOKING, DONE
- D) SETUP, BROWSE, CHECKOUT, FINISHED
  > **B)** `FlowPosition` is a discriminated union with phases: `COLLECT_DETAILS` (missing required fields), `CATEGORY` (working on a specific category), `CONFIRM` (all categories done), `COMPLETE` (trip booked).
  > [difficulty:medium]

---

**Q14. What hashing algorithm is used to store session tokens in the database?**
? The auth repository hashes tokens before storing them.

- A) MD5
- B) SHA-1
- C) SHA-256
- D) bcrypt
  > **C)** The `hashSessionToken()` function uses `crypto.createHash("sha256")` to hash session tokens. The raw token goes in the cookie; the hash goes in the `sessions` table.
  > [difficulty:medium]

---

**Q15. How many unit tests does the server test suite contain?**
? Run the test suite to see the count.

- A) 150
- B) 250
- C) 330
- D) 500
  > **C)** The server test suite has 330 tests across 37 test files, covering handlers, repositories, tools, middleware, services, prompts, and schemas.
  > [difficulty:easy]

---

**Q16. What happens when the AgentOrchestrator encounters a tool execution error?**
? Look at the try/catch block inside the tool execution loop.

- A) The entire agent loop throws and terminates
- B) The error is caught and sent back to Claude as an is_error tool result
- C) The tool is retried up to 3 times
- D) The error is silently ignored
  > **B)** When a tool throws, the error is caught, `isError` is set to true, and the result is set to `"Error: {message}"`. The `toolResults` array entry includes `is_error: true`, which tells Claude the tool failed.
  > [difficulty:medium]

---

**Q17. How does the `calculate_remaining_budget` tool differ from other tools?**
? Consider what external resources each tool uses.

- A) It is the only asynchronous tool
- B) It is the only tool that modifies the database
- C) It is pure computation with no external API calls or database access
- D) It is the only tool that requires authentication
  > **C)** The `calculateRemainingBudget` function performs pure arithmetic on the provided inputs. It does not call any external API or touch the database.
  > [difficulty:medium]

---

**Q18. What is the purpose of the `format_response` tool?**
? Look at the tool's description and the shared rules in category prompts.

- A) It formats tool results into pretty JSON
- B) It is the agent's mandatory final tool call every turn -- all text, citations, quick replies, and skip_category go through it
- C) It converts markdown to HTML for the frontend
- D) It formats the system prompt before sending it to Claude
  > **B)** `format_response` is required as the agent's last tool call every turn. All text goes in the `text` field, with optional `citations`, `quick_replies`, `advisory`, and `skip_category` fields.
  > [difficulty:medium]

---

**Q19. What does the `skip_category` field in `format_response` do?**
? Look at how advanceBookingState handles this field.

- A) It removes the category from the UI
- B) It transitions the current category to "skipped" status in the booking state machine
- C) It hides the search results
- D) It sends a notification to the user
  > **B)** When `format_response.skip_category` is `true`, `advanceBookingState()` sets the current category's status to `'skipped'`, which causes `getFlowPosition()` to advance to the next category.
  > [difficulty:medium]

---

**Q20. How many category filter options are available on the Explore page?**
? Count the CATEGORY_FILTERS array.

- A) 5
- B) 7
- C) 9
- D) 12
  > **C)** The `CATEGORY_FILTERS` array has 9 entries: All, Beach & Islands, City Breaks, Adventure, Romantic, Food & Wine, Culture & History, Budget-Friendly, and Family.
  > [difficulty:easy]

---

**Q21. What is the purpose of the `normalizeCacheKey()` function?**
? This function is used before every Redis cache get/set operation.

- A) It encrypts the cache key for security
- B) It creates deterministic cache keys by lowercasing strings and sorting object keys
- C) It validates that the cache key does not exceed Redis key length limits
- D) It adds a timestamp to prevent stale cache hits
  > **B)** `normalizeCacheKey()` sorts the parameter object keys alphabetically and lowercases string values, producing `api_cache:{provider}:{endpoint}:{sorted_params_json}`.
  > [difficulty:medium]

---

**Q22. Why does the system prompt instruct Claude to call `update_trip` immediately?**
? Read the shared rules in category-prompts.ts.

- A) To validate that the trip exists in the database
- B) Because the trip record starts with placeholder data and needs real details persisted immediately
- C) To lock the trip record and prevent concurrent modifications
- D) To trigger a webhook notification to the user
  > **B)** Trips are created with `destination: "Planning..."` and no dates or budget. The shared rules say: "Call update_trip when the user provides trip details."
  > [difficulty:medium]

---

**Q23. How many steps does the Preferences Wizard have?**
? Look at the WIZARD_STEPS array.

- A) 4
- B) 5
- C) 6
- D) 7
  > **C)** The `WIZARD_STEPS` array has 6 entries: Accommodation, Travel Pace, Dining, Activities, Travel Party, and Budget. Note that the Dining step covers 2 categories (dietary restrictions and dining style), making 7 total preference categories across 6 steps.
  > [difficulty:easy]

---

**Q24. How many preference categories does the user preferences system track?**
? Count the fields in the UserPreferences interface.

- A) 5
- B) 6
- C) 7
- D) 10
  > **C)** The `UserPreferences` interface has 7 preference categories: accommodation, travel_pace, dietary, dining_style, activities, travel_party, and budget_comfort. (Plus `version` and `completed_steps` which are metadata.)
  > [difficulty:easy]

---

**Q25. What image service provides destination photos?**
? Look at web-client/src/lib/destinationImage.ts.

- A) Pexels API
- B) Unsplash CDN (direct URLs, no API key)
- C) Cloudinary with uploaded images
- D) Google Places Photos API
  > **B)** The `CITY_IMAGES` map stores Unsplash photo IDs. `getDestinationImageUrl()` constructs direct CDN URLs like `https://images.unsplash.com/photo-{id}?w={width}&h={height}&fit=crop&q=80`. No API key is needed.
  > [difficulty:easy]

---

**Q26. How many cities are in the explore hero carousel?**
? Look at the HERO_IMAGES array in destinationImage.ts.

- A) 3
- B) 5
- C) 7
- D) 10
  > **B)** The `HERO_IMAGES` array contains 5 destinations: Santorini, Tokyo, Paris, Bali, and New York. These rotate every 5 seconds on the Explore page.
  > [difficulty:easy]

---

**Q27. What query key pattern does TanStack Query use for trip-specific messages?**
? Look at the useQuery call in ChatBox.tsx.

- A) ["chat", tripId]
- B) ["messages", tripId]
- C) ["trips", tripId, "messages"]
- D) ["conversation", tripId]
  > **B)** In `ChatBox.tsx`, the messages query uses `queryKey: ["messages", tripId]` and fetches from `/trips/${tripId}/messages`.
  > [difficulty:easy]

---

**Q28. What happens when an authenticated user navigates to the landing page?**
? Look at the useEffect in the Home component.

- A) They see the landing page normally
- B) They are automatically redirected to /trips via router.replace
- C) They see a "Welcome back" banner
- D) They are redirected to their most recent trip
  > **B)** The `Home` component has a `useEffect` that checks `if (user) { router.replace("/trips") }`. Logged-in users skip the landing page.
  > [difficulty:easy]

---

**Q29. How does the login handler prevent session accumulation?**
? Look at the loginUser function in the auth repository.

- A) Sessions expire automatically after a timeout
- B) It deletes all existing sessions for the user before creating a new one, inside a transaction
- C) It limits users to 3 concurrent sessions
- D) Old sessions are cleaned up by a background cron job
  > **B)** `loginUser()` uses `withTransaction` to first `DELETE FROM sessions WHERE user_id = $1`, then `createSession(userId, client)`. Each user has exactly one active session after login.
  > [difficulty:medium]

---

**Q30. What is the relationship between the `conversations` and `trips` tables?**
? Look at the getOrCreateConversation function.

- A) Many conversations per trip
- B) One-to-one: one conversation per trip, enforced by UPSERT on trip_id
- C) Conversations are independent of trips
- D) Trips reference conversations via a foreign key
  > **B)** `getOrCreateConversation()` uses `INSERT INTO conversations (trip_id) VALUES ($1) ON CONFLICT (trip_id) DO UPDATE SET updated_at = NOW()`. This enforces a 1:1 relationship.
  > [difficulty:medium]

---

**Q31. What does the Vercel rewrite rule in next.config.ts do?**
? Look at the rewrites function.

- A) Redirects old URLs to new ones
- B) Proxies `/api/*` requests to the Railway backend, making API calls same-origin
- C) Rewrites URLs for SEO purposes
- D) Serves static files from a different directory
  > **B)** The rewrite rule `{ source: '/api/:path*', destination: '${apiUrl}/:path*' }` proxies API requests through Vercel to the Railway backend, solving Safari ITP cookie blocking for cross-origin requests.
  > [difficulty:medium]

---

**Q32. Why was the same-origin API proxy added?**
? Consider Safari's cookie handling for cross-origin requests.

- A) To reduce latency by serving from a CDN
- B) To solve Safari ITP (Intelligent Tracking Prevention) blocking cross-origin cookies
- C) To avoid CORS configuration entirely
- D) To enable server-side rendering of API data
  > **B)** Safari's ITP blocks cookies on cross-origin `credentials: "include"` requests. The Vercel rewrite makes API calls same-origin from the browser's perspective, so `SameSite` cookies work correctly.
  > [difficulty:hard]

---

**Q33. What is the purpose of the `BookingState` JSONB column on the trips table?**
? Look at how bookingState is used in booking-steps.ts.

- A) Stores the user's payment information
- B) Tracks each booking category's lifecycle status (idle/asking/presented/done/skipped) with versioning
- C) Stores the complete itinerary
- D) Caches search results for each category
  > **B)** `BookingState` is a versioned JSONB object with four category slots (`flights`, `hotels`, `car_rental`, `experiences`), each containing a `CategoryState` with a `status` field.
  > [difficulty:medium]

---

**Q34. What happens to the flights category when transport_mode is "driving"?**
? Look at getFlowPosition in booking-steps.ts.

- A) It shows car rental options instead
- B) It is automatically skipped in the category order
- C) It shows driving route options
- D) The user must manually skip it
  > **B)** In `getFlowPosition()`, the loop checks `if (cat === 'flights' && trip.transport_mode === 'driving') { continue; }`, automatically skipping the flights category when the user is driving.
  > [difficulty:medium]

---

**Q35. How does the `advanceBookingState()` function determine state transitions?**
? Look at the switch statement in advanceBookingState.

- A) It checks the user's text message for keywords
- B) It checks which tools were called and whether selections exist in the trip record
- C) It uses a timer to auto-advance
- D) The frontend sends the new state directly
  > **B)** The function checks `searchCalled` (whether the search tool for the category was called) and `hasSelection` (whether selections exist in the trip). `idle` -> `asking` always; `asking` -> `presented` if search was called; `presented` -> `done` if a selection exists.
  > [difficulty:hard]

---

**Q36. What is the category order in the booking flow?**
? Look at the CATEGORY_ORDER constant.

- A) hotels, flights, experiences, car_rental
- B) flights, hotels, car_rental, experiences
- C) flights, car_rental, hotels, experiences
- D) flights, hotels, experiences, car_rental
  > **B)** `CATEGORY_ORDER` is defined as `['flights', 'hotels', 'car_rental', 'experiences']`. This determines the order in which categories are presented to the user.
  > [difficulty:easy]

---

**Q37. What are the four `select_*` tools used for?**
? Look at select_flight, select_hotel, select_car_rental, select_experience in definitions.ts.

- A) They search for options in each category
- B) They persist the user's selected choice to dedicated database tables
- C) They filter search results based on user preferences
- D) They display selected items in the UI
  > **B)** The `select_*` tools persist user selections to `trip_flights`, `trip_hotels`, `trip_car_rentals`, and `trip_experiences` tables. The agent calls them when the user confirms a selection from the tile cards.
  > [difficulty:medium]

---

**Q38. How does the Preferences Wizard save progress?**
? Look at the saveCurrentStep function in PreferencesWizard.tsx.

- A) All preferences are saved at once when the user clicks "Done"
- B) Each step saves immediately via `PUT /user-preferences` when the user clicks Next
- C) Preferences are stored in localStorage and synced periodically
- D) Preferences are saved only if the user completes all steps
  > **B)** The `saveCurrentStep()` function calls `put('/user-preferences', { ...payload, completed_steps: newCompleted })` on each Next click, immediately persisting the current step's values and updating the `completed_steps` array.
  > [difficulty:medium]

---

**Q39. What is the `normalizeBookingState()` function used for?**
? Look at booking-steps.ts.

- A) It validates booking state against a JSON schema
- B) It handles missing fields and version migration for BookingState JSONB data
- C) It computes the total cost of all bookings
- D) It resets the booking state to defaults
  > **B)** `normalizeBookingState()` handles null/undefined input (returns defaults), objects without a version field (treats as v0), and objects with the current version (fills missing categories with defaults). It ensures safe handling of raw JSONB from the database.
  > [difficulty:medium]

---

**Q40. What is the `normalizePreferences()` function used for?**
? Look at server/src/schemas/userPreferences.ts.

- A) It validates preferences against Zod schemas
- B) It migrates legacy v0 preferences (intensity/social fields) to v1 format and fills missing fields
- C) It sorts preferences alphabetically
- D) It removes invalid preference values
  > **B)** `normalizePreferences()` handles legacy v0 format (which used `intensity` and `social` field names) by mapping them to `travel_pace` and `travel_party`. It also fills any missing v1 fields with defaults.
  > [difficulty:medium]

---

**Q41. How many variants does the `ChatNode` discriminated union have?**
? Count the type branches in packages/shared-types/src/nodes.ts.

- A) 6
- B) 8
- C) 10
- D) 12
  > **D)** The `ChatNode` union has 12 variants: `text`, `flight_tiles`, `hotel_tiles`, `car_rental_tiles`, `experience_tiles`, `travel_plan_form`, `itinerary`, `advisory`, `weather_forecast`, `budget_bar`, `quick_replies`, and `tool_progress`.
  > [difficulty:easy]

---

**Q42. How does `NodeRenderer` enforce that every `ChatNode` variant has a UI component?**
? Look at the default case in NodeRenderer.tsx.

- A) It has a runtime check that throws if a node type is unregistered
- B) It uses TypeScript's `never` type in the default case for exhaustiveness checking
- C) It uses a Map of registered components
- D) It relies on ESLint to catch unhandled cases
  > **B)** The `default` branch assigns `node` to a `never`-typed variable: `const _exhaustive: never = node`. If a new variant is added without a corresponding `case`, TypeScript will produce a compile error.
  > [difficulty:hard]

---

**Q43. What does `useSSEChat` do when the stream ends successfully?**
? Look at the finally block in useSSEChat.ts.

- A) It triggers a page reload
- B) It clears streaming state and invalidates TanStack Query caches for messages and trip
- C) It stores the completed message in localStorage
- D) It emits a custom DOM event
  > **B)** The `finally` block clears `isSending`, `toolProgress`, `streamingNodes`, and `streamingText`, then invalidates `["messages", tripId]` and `["trips", tripId]` queries to replace streaming state with persisted data.
  > [difficulty:medium]

---

**Q44. What is TanStack Virtual used for in this application?**
? Look at VirtualizedChat.tsx.

- A) Virtual scrolling for the trip list page
- B) Virtualizing the chat message list so only visible messages are in the DOM
- C) Lazy loading components outside the viewport
- D) Server-side rendering of the message list
  > **B)** `VirtualizedChat` uses `useVirtualizer` to render only visible messages. Each message's height is estimated by node type (e.g., `flight_tiles = 240px`, `budget_bar = 48px`) and measured after render.
  > [difficulty:medium]

---

**Q45. What is the dual-column pattern in the `messages` table?**
? Look at the messages table structure.

- A) Two columns store the same data in different formats for redundancy
- B) `nodes` (JSONB ChatNode[]) stores UI state; `content` + `tool_calls_json` store Claude API conversation state
- C) One column stores user messages; the other stores assistant messages
- D) One column is compressed; the other is decompressed for fast reads
  > **B)** The frontend reads `nodes` for rendering. The agent service reads `content` and `tool_calls_json` for conversation reconstruction. These are separate concerns that evolve independently.
  > [difficulty:hard]

---

**Q46. What tool does the agent call first in the flights category when the user hasn't specified flying or driving?**
? Look at the flights.idle prompt in category-prompts.ts.

- A) search_flights
- B) get_destination_info
- C) update_trip (to set transport_mode based on user's answer)
- D) calculate_remaining_budget
  > **C)** The `flights.idle` prompt says: "Ask the user: will you be flying or driving? If flying, call update_trip with transport_mode: 'flying'. If driving, call update_trip with transport_mode: 'driving' and set skip_category: true."
  > [difficulty:medium]

---

**Q47. How does the frontend handle optimistic updates when deleting a trip?**
? Look at the deleteMutation in the trips list page.

- A) It waits for the server response before updating the UI
- B) It uses useMutation's onMutate to immediately remove the trip from query data; on error it rolls back
- C) It sets a loading state on the trip card
- D) It removes the trip from a Zustand store
  > **B)** The `deleteMutation` uses TanStack Query's optimistic update pattern: `onMutate` cancels in-flight queries, saves previous data, and filters out the deleted trip. `onError` restores previous data.
  > [difficulty:medium]

---

**Q48. What is the BookingConfirmation component's three-stage flow?**
? Look at the stage state machine in BookingConfirmation.tsx.

- A) Select -> Pay -> Receipt
- B) Review (cost breakdown) -> Booking (spinner, 2.2s) -> Confirmed (checkmark, 1.5s auto-dismiss)
- C) Cart -> Checkout -> Payment
- D) Preview -> Edit -> Save
  > **B)** The component uses a `stage` state of `"review" | "booking" | "confirmed"`. Review shows cost breakdown with Confirm/Cancel. Clicking Confirm shows a spinner for 2200ms, then a checkmark for 1500ms before calling `onConfirm()`.
  > [difficulty:hard]

---

**Q49. How does the CORS configuration determine which origins are allowed?**
? Look at server/src/config/corsConfig.ts.

- A) It allows all origins with a wildcard
- B) It reads the CORS_ORIGIN env var, splits on commas, and checks each request origin against the allowlist
- C) It only allows the Vercel deployment URL
- D) It uses a regex to match any .vercel.app domain
  > **B)** `corsConfig.ts` splits `process.env.CORS_ORIGIN` on commas, trims whitespace, and checks `if (!origin || allowedOrigins.includes(origin))`.
  > [difficulty:medium]

---

**Q50. What is the `packages/shared-types` package's role in the architecture?**
? Consider what it exports and who imports it.

- A) It provides shared test utilities
- B) It is the single source of truth for the typed chat protocol -- ChatNode, tile interfaces, SSEEvent types
- C) It provides shared ESLint and Prettier configuration
- D) It re-exports the Anthropic SDK
  > **B)** `@agentic-travel-agent/shared-types` exports `ChatNode`, `Flight`, `Hotel`, `CarRental`, `Experience`, `FormField`, `DayPlan`, `WeatherDay`, `Citation`, `SSEEvent`, and helper types. Both server and frontend import from it.
  > [difficulty:medium]

---

**Q51. What external sources does the auto-enrichment service use?**
? Look at server/src/services/enrichment.ts.

- A) Only weather data from Open-Meteo
- B) US State Dept, FCDO, Open-Meteo (async) + visa matrix and driving requirements (sync)
- C) Google Maps, Yelp, and Weather.com
- D) All five sources are fetched from paid APIs
  > **B)** The enrichment service computes visa and driving nodes synchronously from static tables, then fetches US State Dept advisory, FCDO advisory, and Open-Meteo weather asynchronously via `Promise.allSettled`.
  > [difficulty:hard]

---

**Q52. What does `Promise.allSettled` do in the enrichment service?**
? Consider the difference between allSettled and all.

- A) It waits for all promises to resolve and throws if any fail
- B) It waits for all promises to settle (resolve or reject), so a single source failure does not block others
- C) It returns the first resolved promise
- D) It retries failed promises up to 3 times
  > **B)** Using `allSettled` means a transient failure from any single source (e.g., FCDO API down) does not prevent other enrichment data from being returned.
  > [difficulty:medium]

---

**Q53. How many cities are in the consolidated server-side city database?**
? Count the entries in server/src/data/cities.ts.

- A) 24
- B) 50
- C) 100
- D) 197
  > **D)** The `CITY_DATABASE` in `server/src/data/cities.ts` contains 197 city entries with lat/lon, country code, IATA code, timezone, currency, and optional fields.
  > [difficulty:medium]

---

**Q54. What data does each city entry in the consolidated database contain?**
? Look at the CityData interface in cities.ts.

- A) Just the IATA code and city name
- B) lat, lon, country_code, country_name, iata_code, timezone, currency, optional best_time_to_visit and unsplash_id
- C) Name, population, area, and GDP
- D) IATA code, timezone, and weather data
  > **B)** The `CityData` interface has `lat`, `lon`, `country_code`, `country_name`, `iata_code`, `timezone`, `currency`, and optional `best_time_to_visit` and `unsplash_id` fields.
  > [difficulty:medium]

---

**Q55. What is the `Destination` interface in the frontend data layer?**
? Look at web-client/src/data/destinations.ts.

- A) Just a name and country
- B) A rich data type with slug, name, country, categories, price_level, best_season, description, currency, language, estimated daily budgets, visa summary, top experiences, dining highlights, neighborhoods, and weather data
- C) An API response type from Google Places
- D) A subset of the CityData interface from the server
  > **B)** The `Destination` interface contains comprehensive guide data including `top_experiences` (with names, categories, descriptions, costs), `dining_highlights`, `neighborhoods`, and 12-month `weather` arrays.
  > [difficulty:medium]

---

**Q56. What is the `schema_version` column on the messages table used for?**
? Consider how the node schema might evolve over time.

- A) It tracks which API version created the message
- B) It enables forward-compatible rendering as the ChatNode schema evolves
- C) It determines which database migration was last applied
- D) It stores the version of Claude used
  > **B)** The server sets `schema_version` when persisting a message. This allows the frontend to render older messages gracefully if the node schema changes in future versions.
  > [difficulty:hard]

---

**Q57. What is the `sequence` column on the messages table used for?**
? Look at how messages are ordered.

- A) It stores the token count of each message
- B) It provides strict message ordering with a unique constraint on (conversation_id, sequence)
- C) It tracks the number of tool calls in the message
- D) It is an auto-incrementing primary key
  > **B)** The `sequence` INTEGER column has a unique constraint on `(conversation_id, sequence)` to enforce strict ordering. Messages are queried by sequence order, not by `created_at`.
  > [difficulty:medium]

---

**Q58. How does the frontend API client handle 204 No Content responses?**
? Look at the request function in web-client/src/lib/api.ts.

- A) It throws an error
- B) It returns an empty object
- C) It returns undefined cast as the generic type T
- D) It retries the request
  > **C)** The `request()` function checks `if (res.status === 204) { return undefined as T; }`. This handles endpoints like `POST /auth/logout` and `DELETE /trips/:id` that return no body.
  > [difficulty:medium]

---

**Q59. What is the `tool_call_log` table used for?**
? Look at the onToolExecuted callback.

- A) It stores tool definitions for dynamic loading
- B) It logs every tool execution for observability: tool name, input/result JSON, latency, cache hit, error
- C) It tracks rate limits for external APIs
- D) It queues tools for async execution
  > **B)** The `insertToolCallLog()` function records `conversation_id`, `tool_name`, `tool_input_json`, `tool_result_json`, `latency_ms`, `cache_hit`, and `error` for every tool call.
  > [difficulty:medium]

---

**Q60. How does the `SelectableCardGroup` component handle user selections?**
? Look at the component's state management and confirm flow.

- A) It uses radio buttons with form submission
- B) Cards are clickable to toggle selection; a "Confirm Selection" button finalizes the choice
- C) It uses drag-and-drop ranking
- D) It auto-selects the cheapest option
  > **B)** `SelectableCardGroup` maintains a `selectedId` state. Clicking a card toggles selection. When selected, a "Confirm Selection" button appears. Clicking it calls `onConfirm(item.label)`.
  > [difficulty:medium]

---

**Q61. What does the `ToolContext` interface carry?**
? Look at how update*trip and select*\* tools use context.

- A) API keys for external services
- B) tripId and userId for authorization of database writes
- C) Cache TTL configuration
- D) Which tools have been called this turn
  > **B)** `ToolContext` has `tripId` and `userId` fields. Tools like `update_trip` and `select_*` require context to scope database operations to the correct trip and authorized user.
  > [difficulty:medium]

---

**Q62. What theme does the frontend use?**
? Look at the styling approach in globals.scss.

- A) Dark mode with neon accents
- B) Mediterranean Warmth -- light-only with warm coral, terracotta, and cream tones
- C) Material Design with light and dark modes
- D) Tailwind UI default theme
  > **B)** The app uses a "Mediterranean Warmth" light-only theme with CSS custom properties defined in `globals.scss`. No dark mode toggle exists.
  > [difficulty:easy]

---

**Q63. Are any hardcoded colors used in component SCSS files?**
? Look at the styling conventions.

- A) Yes, hex colors are used directly in component styles
- B) No, all colors reference CSS custom properties from globals.scss
- C) Colors are defined inline in JSX
- D) Tailwind utility classes provide all colors
  > **B)** The project convention is to use CSS custom properties (e.g., `var(--color-coral)`) for all colors. No hardcoded color values appear in component `.module.scss` files.
  > [difficulty:easy]

---

**Q64. What CSS methodology is used for component styling?**
? Look at the file naming convention for styles.

- A) Tailwind CSS utility classes
- B) CSS-in-JS with styled-components
- C) SCSS Modules with co-located .module.scss files
- D) BEM with global CSS
  > **C)** Each component has a co-located `.module.scss` file. SCSS Modules provide component-scoped class names. No Tailwind or CSS-in-JS is used.
  > [difficulty:easy]

---

**Q65. How does the Explore page hero carousel work?**
? Look at the useEffect in ExplorePage.

- A) It uses a third-party carousel library
- B) It uses a setInterval that increments heroIndex every 5 seconds, cycling through HERO_IMAGES
- C) It responds to scroll position
- D) The user manually clicks arrows to advance
  > **B)** A `useEffect` sets up a 5-second interval that increments `heroIndex`, cycling through the 5 `HERO_IMAGES`. The active image gets the `heroImageActive` CSS class.
  > [difficulty:easy]

---

**Q66. What is the fallback when a city doesn't have a curated Unsplash photo?**
? Look at getDestinationImage in destinationImage.ts.

- A) A default placeholder image from a CDN
- B) The function returns `url: null` and the component renders a gradient fallback with the city name
- C) It fetches a random image from the Unsplash API
- D) No image is shown at all
  > **B)** `getDestinationImage()` returns `{ url: null, unsplashId: null }` for unknown cities. Components check for `null` and render a `cardImageFallback` div with the city name text.
  > [difficulty:medium]

---

**Q67. How many user stories are documented in the project?**
? Check docs/USER_STORIES.md.

- A) 15
- B) 25
- C) 35
- D) 50
  > **C)** `docs/USER_STORIES.md` contains 35 user stories organized by domain: Public Pages (US-1 to US-7), Authentication (US-8 to US-12), Trip Management (US-13 to US-17), Chat & Booking (US-18 to US-24), Checkout (US-25 to US-28), Preferences (US-29 to US-33), Account (US-34, US-35).
  > [difficulty:easy]

---

**Q68. How many Playwright E2E test files exist?**
? Check the test file mapping in USER_STORIES.md.

- A) 4
- B) 6
- C) 8
- D) 12
  > **C)** There are 8 E2E test files: `public.spec.ts`, `explore.spec.ts`, `auth.spec.ts`, `trips.spec.ts`, `chat.spec.ts`, `checkout.spec.ts`, `preferences.spec.ts`, and `account.spec.ts`.
  > [difficulty:easy]

---

**Q69. What does the Lefthook pre-commit hook check?**
? Look at lefthook.yml.

- A) Only linting
- B) Format checking and linting, run in parallel
- C) All tests
- D) TypeScript compilation
  > **B)** The pre-commit hook runs `pnpm format:check` and `pnpm lint` in parallel. Both must pass for the commit to proceed.
  > [difficulty:easy]

---

**Q70. What does the Lefthook pre-push hook check that pre-commit does not?**
? Compare the pre-commit and pre-push sections of lefthook.yml.

- A) E2E tests
- B) Server build verification (`pnpm --filter agentic-travel-agent-server build`)
- C) Database migrations
- D) Docker build
  > **B)** The pre-push hook adds `pnpm --filter agentic-travel-agent-server build` to the format and lint checks. This ensures TypeScript compilation succeeds before pushing.
  > [difficulty:medium]

---

**Q71. What is the maximum request body size allowed by the Express server?**
? Look at the express.json() middleware configuration.

- A) 1KB
- B) 10KB
- C) 100KB
- D) 1MB
  > **B)** The server configures `express.json({ limit: "10kb" })` and `express.urlencoded({ extended: true, limit: "10kb" })`. This caps request bodies at 10 kilobytes.
  > [difficulty:easy]

---

**Q72. What Dockerfile strategy is used for the production image?**
? Look at Dockerfile.server.

- A) Single-stage with Alpine Linux
- B) Multi-stage: first stage installs all deps and compiles TypeScript; second stage installs only production deps and copies compiled output
- C) Docker layer caching only
- D) Runs from TypeScript source with ts-node
  > **B)** The Dockerfile uses two stages. The `base` stage compiles TypeScript. The `production` stage starts fresh from `node:22-slim`, installs only production dependencies, and copies `server/dist` and `server/migrations`.
  > [difficulty:hard]

---

**Q73. What SSE event types does the chat endpoint emit?**
? Look at the SSEEvent type in shared-types.

- A) message, error
- B) node, text_delta, tool_progress, done, error
- C) start, chunk, end
- D) data, heartbeat, close
  > **B)** Five SSE event types are defined: `node` (complete ChatNode), `text_delta` (streaming text fragment), `tool_progress` (tool start/completion), `done` (stream complete), `error` (error condition).
  > [difficulty:medium]

---

**Q74. How does token streaming work in the agent loop?**
? Consider how messages.stream() differs from messages.create().

- A) The server buffers the entire response and sends it at once
- B) The orchestrator uses `messages.stream()` which emits text deltas as they arrive, streamed to the frontend as `text_delta` SSE events
- C) WebSockets carry individual tokens
- D) The frontend polls every 100ms for new tokens
  > **B)** The `AgentOrchestrator.run()` method uses `messages.stream()` instead of `messages.create()`, enabling real-time text delivery. Text deltas are forwarded to the frontend as `text_delta` SSE events.
  > [difficulty:medium]

---

**Q75. What is the `ErrorBoundary` component used for?**
? Look at layout.tsx.

- A) It catches network errors from API calls
- B) It wraps the main content area to catch React render errors and display a fallback UI
- C) It logs errors to Sentry
- D) It retries failed component renders
  > **B)** In `layout.tsx`, `ErrorBoundary` wraps `{children}` inside `<main>`. It catches unhandled errors during rendering and displays a fallback UI instead of a blank screen.
  > [difficulty:easy]

---

**Q76. Why does the New Trip page use a `useRef` for `creating`?**
? Look at the useEffect in trips/new/page.tsx.

- A) To store the trip ID after creation
- B) To prevent React Strict Mode's double-invocation of useEffect from creating two trips
- C) To track the loading animation state
- D) To reference the form element
  > **B)** React Strict Mode calls effects twice in development. Without the `creating.current` guard, two trips would be created. The `useRef` persists across renders without triggering re-renders.
  > [difficulty:hard]

---

**Q77. What does the `formatCurrency` utility do for performance?**
? Look at web-client/src/lib/format.ts.

- A) It uses React.memo
- B) It caches Intl.NumberFormat instances in a Map keyed by currency code
- C) It uses a simple string template
- D) It delegates to a server-side endpoint
  > **B)** `formatCurrency` maintains a `formatterCache` Map. On the first call with a given currency, it creates an `Intl.NumberFormat` and caches it. Subsequent calls reuse the cached formatter.
  > [difficulty:hard]

---

**Q78. What happens when the `InlineBudgetBar` is over budget?**
? Look at the overBudget logic.

- A) A red warning modal appears
- B) The bar fills to 100% with an "over" CSS class and shows the overage amount
- C) The bar disappears
- D) The bar turns yellow and pulses
  > **B)** When `allocated > total`, the bar width caps at 100%, adds the `styles.over` CSS class, and displays the absolute overage amount with "over" text instead of "remaining."
  > [difficulty:medium]

---

**Q79. What accommodation options are available in the preferences wizard?**
? Look at ACCOMMODATION_OPTIONS in userPreferences.ts.

- A) Hotel, Motel, Hostel
- B) Budget, Mid-Range, Upscale, Unique Stays
- C) 1-Star through 5-Star
- D) Hotel, Airbnb, Camping
  > **B)** The four accommodation options are: Budget (hostels, budget hotels), Mid-Range (3-star hotels, vacation rentals), Upscale (4-5 star hotels, boutique), and Unique Stays (glamping, ryokans, treehouses, eco-lodges).
  > [difficulty:easy]

---

**Q80. What travel pace options are available?**
? Look at TRAVEL_PACE_OPTIONS.

- A) Slow, Medium, Fast
- B) Relaxed, Moderate, Packed
- C) Chill, Normal, Intense
- D) Leisurely, Balanced, Athletic
  > **B)** The three travel pace options are: Relaxed (1-2 activities per day), Moderate (balanced mix), and Packed (early mornings, late nights, see everything).
  > [difficulty:easy]

---

**Q81. How many activity interest options can a user select?**
? Look at ACTIVITY_OPTIONS.

- A) 5
- B) 8
- C) 10
- D) 15
  > **C)** There are 10 activity options: History & Culture, Nature & Outdoors, Beach & Water Sports, Nightlife, Shopping, Wellness & Spa, Adventure Sports, Art & Museums, Photography, and Local Experiences. Activities is a multi-select field.
  > [difficulty:easy]

---

**Q82. What dietary restriction options are available?**
? Look at DIETARY_OPTIONS.

- A) Vegetarian, Vegan, None
- B) Vegetarian, Vegan, Halal, Kosher, Gluten-free, Dairy-free, Nut-free, None
- C) Low-carb, Keto, Paleo, None
- D) Only "None" and "Other"
  > **B)** Eight dietary options: vegetarian, vegan, halal, kosher, gluten-free, dairy-free, nut-free, none. Dietary is a multi-select field.
  > [difficulty:easy]

---

**Q83. What travel party options are available?**
? Look at TRAVEL_PARTY_OPTIONS.

- A) Solo, Couple, Group
- B) Solo, Romantic Partner, Friends Group, Family with Kids, Family / Adults
- C) Individual, Pair, Team
- D) Solo, Couple, Family
  > **B)** Five travel party options with descriptions: Solo (traveling alone), Romantic Partner (honeymoon/anniversary), Friends Group (social travel), Family with Kids (children under 12), Family / Adults (no kid constraints).
  > [difficulty:easy]

---

**Q84. What budget comfort options are available?**
? Look at BUDGET_COMFORT_OPTIONS.

- A) Cheap, Normal, Expensive
- B) Budget-Conscious, Value Seeker, Comfort First, No Budget Concerns
- C) Low, Medium, High
- D) Economy, Business, First Class
  > **B)** Four budget comfort options: Budget-Conscious (cheapest options first), Value Seeker (best bang for the buck), Comfort First (willing to pay more), No Budget Concerns (show me the best).
  > [difficulty:easy]

---

**Q85. How does the flights.idle prompt handle the flying vs. driving decision?**
? Read the flights idle prompt in category-prompts.ts.

- A) It automatically assumes flying
- B) It asks "Will you be flying or driving?" and provides quick replies for both options
- C) It skips the question and searches flights
- D) It checks the user's location to determine transport mode
  > **B)** The prompt says: "Ask the user one question: 'Will you be flying or driving?' If flying, call update_trip with transport_mode: 'flying'. If driving, call update_trip with transport_mode: 'driving' and set skip_category: true." Quick replies: ["I'll be flying", "I'll drive"].
  > [difficulty:medium]

---

**Q86. What shared rules do all category prompts follow?**
? Look at the SHARED_RULES constant.

- A) No rules -- each category is independent
- B) 1-2 sentences max, never describe search results, always call format_response last, max 15 tools, set skip_category when user declines
- C) Always explain all options in detail
- D) Always present 10 options
  > **B)** The shared rules enforce: "1-2 sentences max. No numbered lists. No bullet points for questions. NEVER describe search results in text. Always call format_response as your LAST tool call. Set skip_category: true when user declines. Max 15 tool calls per turn."
  > [difficulty:medium]

---

**Q87. How are user preferences injected into category prompts?**
? Look at getCategoryPrompt in category-prompts.ts.

- A) All preferences are included in every prompt
- B) Accommodation preference for hotels, activities/dining for experiences, travel party for all non-presented categories
- C) Preferences are sent as tool inputs
- D) Preferences are only shown on the account page
  > **B)** In `getCategoryPrompt()`, when `status !== 'presented'`: accommodation is appended for hotels, activities and dining_style for experiences, and travel_party for all categories.
  > [difficulty:hard]

---

**Q88. What does the CONFIRM phase prompt tell the agent to do?**
? Look at PHASE_PROMPTS in category-prompts.ts.

- A) End the conversation
- B) Summarize the trip briefly, ask "Ready to book?", and provide ["Confirm booking", "Make changes"] quick replies
- C) Ask the user to rate their experience
- D) Redirect to a payment page
  > **B)** The CONFIRM prompt says: "Summarize the trip briefly: destination, dates, selected flight, hotel, car rental, experiences, total cost. Ask 'Ready to book?' Provide quick_replies: ['Confirm booking', 'Make changes']."
  > [difficulty:medium]

---

**Q89. What does the COLLECT_DETAILS phase prompt do?**
? Look at the COLLECT_DETAILS prompt.

- A) It asks the user 10 questions about their trip
- B) It acknowledges the destination in one friendly sentence and lets the form handle data collection
- C) It collects details via tool calls
- D) It redirects to a form page
  > **B)** The prompt says: "A form is being shown to collect trip details. Acknowledge the destination in one friendly sentence. Do NOT ask questions -- the form handles data collection."
  > [difficulty:medium]

---

**Q90. How does the Express server handle graceful shutdown?**
? Look at the shutdown function.

- A) It calls process.exit() immediately
- B) It closes the HTTP server, then ends the PostgreSQL pool, then exits
- C) It relies on the process manager
- D) It sets a shutting down flag and waits for requests
  > **B)** The `shutdown()` function listens for `SIGTERM` and `SIGINT`, closes the HTTP server with `server.close()`, calls `pool.end()` to close PostgreSQL connections, then exits with code 0.
  > [difficulty:medium]

---

**Q91. Why does `searchFlights` need IATA airport codes instead of city names?**
? Consider what the SerpApi Google Flights engine requires.

- A) IATA codes are shorter and save tokens
- B) The SerpApi Google Flights engine uses departure_id and arrival_id parameters that require IATA codes
- C) City names are always ambiguous
- D) The database stores flights by IATA code
  > **B)** The `searchFlights` function passes `departure_id: input.origin` and `arrival_id: input.destination` to SerpApi. These parameters expect IATA codes. The system prompt tells Claude to call `get_destination_info` first to resolve city names.
  > [difficulty:medium]

---

**Q92. What happens to the preferences wizard after user registration?**
? Look at the registration flow.

- A) The user is redirected to the trips page
- B) The preferences wizard opens automatically
- C) An email is sent asking the user to complete preferences
- D) Nothing -- the user must navigate to account settings
  > **B)** After registration, the Preferences Wizard opens automatically, starting with the Accommodation step. This ensures trips are personalized from the user's first interaction.
  > [difficulty:easy]

---

**Q93. What happens when a destination detail page's "Plan a trip" CTA is clicked by an unauthenticated user?**
? Look at user story US-5.

- A) A login modal appears
- B) The user is redirected to /login
- C) The trip is created as a guest
- D) An error message appears
  > **B)** Clicking "Plan a trip to [city]" as an unauthenticated user redirects to `/login`. After login, the user is redirected to trip creation with the destination pre-filled.
  > [difficulty:easy]

---

**Q94. What does the `search_car_rentals` tool use as its SerpApi engine?**
? Look at the serpApiGet call in car-rentals.tool.ts.

- A) google_flights
- B) google_hotels
- C) google_car_rental
- D) google_travel
  > **C)** `searchCarRentals()` calls `serpApiGet("google_car_rental", params)`. This queries SerpApi's Google Car Rental engine.
  > [difficulty:easy]

---

**Q95. How does the Explore page search work?**
? Look at the filtered logic in ExplorePage.

- A) It searches via an API endpoint
- B) It filters the DESTINATIONS array client-side by comparing searchQuery against destination names (case-insensitive)
- C) It uses Algolia for full-text search
- D) It searches by country only
  > **B)** The filter checks `d.name.toLowerCase().includes(searchQuery.toLowerCase())` along with the category filter. Both are applied client-side to the static `DESTINATIONS` array.
  > [difficulty:easy]

---

**Q96. What is the incomplete preferences badge in the header?**
? Look at user story US-32.

- A) A red notification count
- B) A small coral dot next to "Account" that disappears when all 6 wizard steps are completed
- C) A warning icon
- D) A tooltip message
  > **B)** A small coral dot appears next to "Account" in the header when the user has incomplete preferences. It disappears when all 6 steps are completed.
  > [difficulty:medium]

---

**Q97. What does the `MockChatBox` component do?**
? It appears on the landing page.

- A) It provides a sandbox for testing the real chat API
- B) It renders a simulated chat demo to show how the agent works without making real API calls
- C) It is a fallback for when the real ChatBox fails
- D) It mocks the chat API for unit tests
  > **B)** `MockChatBox` is rendered in the "Demo" section of the landing page. It shows a simulated conversation to demonstrate the product to unauthenticated visitors.
  > [difficulty:easy]

---

**Q98. What does the trip detail page show when a trip has selected bookings?**
? Look at user story US-15.

- A) Only the chat interface
- B) Destination hero image, budget card, itinerary items (flights, hotels, experiences), and the chat section
- C) A printable itinerary
- D) Payment options
  > **B)** The trip detail page shows a destination hero image (if known), budget card with total and allocated, itinerary items for selected bookings, the chat section with input field, and a "Back to trips" link.
  > [difficulty:easy]

---

**Q99. What trip status does the BookingConfirmation modal set after confirmation?**
? Look at the checkout flow.

- A) "booked"
- B) "confirmed"
- C) "saved"
- D) "complete"
  > **C)** The BookingConfirmation modal calls `put(/trips/${id}, { status: "saved" })`. The trip status transitions to "saved" after the confirmation animation completes.
  > [difficulty:medium]

---

**Q100. What happens to the chat input when a trip is booked?**
? Look at user story US-28.

- A) It remains active for follow-up questions
- B) It is disabled with placeholder text "Trip booked! Enjoy your adventure."
- C) It disappears entirely
- D) It changes to a feedback form
  > **B)** When a trip has "Booked" status, the chat input is disabled with the placeholder "Trip booked! Enjoy your adventure." A "Booked" badge is also visible on the trip detail page.
  > [difficulty:easy]
