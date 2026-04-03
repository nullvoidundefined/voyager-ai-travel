# Bugs

Track bugs here. Clear them in batches.

---

## Open

### B1: No typing animation for streaming text
The `messages.stream()` switch was implemented but need to verify the `stream.on('text')` listener actually produces character-by-character animation on the frontend, or if batching is still happening at the SSE/network layer.

### B2: Claude still produces walls of text
Despite prompt constraints saying "1-2 sentences max," Claude frequently writes multi-paragraph responses with numbered lists, especially in the COLLECT_DETAILS and TRANSPORT steps. The per-category state machine prompts (not yet implemented) should help, but may need further prompt iteration.

### B3: Tool progress indicators not visible during streaming
The `tool_progress` SSE events are emitted but may render too briefly to be noticed, or the streaming message assembly in VirtualizedChat may not display them prominently enough.

### B4: ESLint config path doubling
All 98 lint errors are `Parsing error: Cannot read file '.../server/server/tsconfig.json'` — the eslint config doubles the `server/` path. Pre-existing but blocks `pnpm lint` from being a useful gate.

### B5: total_spent always hardcoded to 0
In `chat.ts`, `tripContext.total_spent` is always `0`. Should be derived from the selected flights, hotels, car rentals, and experiences price fields already loaded on the trip.

### B6: selected_car_rentals always empty
In `chat.ts`, `tripContext.selected_car_rentals` is always `[]`. The `getTripWithDetails` query doesn't join `trip_car_rentals` table yet.

### B7: ExperienceCard uses raw $ instead of formatCurrency
`ExperienceCard.tsx` line 57 hardcodes USD `$` prefix (`~$${estimatedCost}`) while all other cards use the shared `formatCurrency` utility.

### B8: Duplicate city lookup tables
`enrichment.ts` has `CITY_COORDS` and `destination.tool.ts` has `CITY_DATABASE` — same cities maintained in two places. Should consolidate into one shared dataset.

---

## Resolved

_(none)_
