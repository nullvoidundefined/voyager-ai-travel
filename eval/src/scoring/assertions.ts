import type { AssertionResults, Persona } from '../types.js';

export interface ToolResult {
  tool_name: string;
  result: unknown;
}

interface AssertionInput {
  transcript: Array<{ role: string; content: string; tool_calls?: string[] }>;
  completed: boolean;
  tool_calls: string[];
  tool_results?: ToolResult[];
  error?: string;
  persona: Persona;
  tripRecord?: Record<string, unknown> | null;
}

export function runAssertions(input: AssertionInput): AssertionResults {
  const {
    transcript,
    completed,
    tool_calls,
    tool_results = [],
    error,
    persona,
    tripRecord,
  } = input;

  const details_collected =
    !!tripRecord?.destination &&
    !!tripRecord?.origin &&
    !!tripRecord?.departure_date;

  const searchTools = [
    'search_flights',
    'search_hotels',
    'search_car_rentals',
    'search_experiences',
  ];
  const search_executed = tool_calls.some((tc) => searchTools.includes(tc));

  const no_errors = !error;

  const assistantMessages = transcript.filter((t) => t.role === 'assistant');
  const avgWords =
    assistantMessages.length > 0
      ? assistantMessages.reduce(
          (sum, m) => sum + m.content.split(/\s+/).length,
          0,
        ) / assistantMessages.length
      : 0;
  const response_length = avgWords <= 150;

  let budget_respected = true;
  if (persona.budget && tripRecord?.total_spent) {
    const threshold = persona.budget * 1.2;
    budget_respected = (tripRecord.total_spent as number) <= threshold;
  }

  const format_response_used = assistantMessages.every(
    (m) => m.content !== '[No text response]',
  );

  const conversation_completed = completed;

  // Data-quality assertions on search results
  const { search_results_have_prices, search_results_have_names } =
    checkSearchResultQuality(tool_results);

  return {
    details_collected,
    search_executed,
    no_errors,
    response_length,
    budget_respected,
    format_response_used,
    conversation_completed,
    search_results_have_prices,
    search_results_have_names,
  };
}

/**
 * Validate that search results contain required price and name fields.
 * Returns true for each check if no search results are present (vacuously true).
 */
export function checkSearchResultQuality(toolResults: ToolResult[]): {
  search_results_have_prices: boolean;
  search_results_have_names: boolean;
} {
  const searchResults = toolResults.filter((tr) =>
    ['search_flights', 'search_hotels', 'search_experiences'].includes(
      tr.tool_name,
    ),
  );

  // Vacuously true when no search results present
  if (searchResults.length === 0) {
    return {
      search_results_have_prices: true,
      search_results_have_names: true,
    };
  }

  let allHavePrices = true;
  let allHaveNames = true;

  for (const tr of searchResults) {
    const node = tr.result as Record<string, unknown>;

    if (tr.tool_name === 'search_flights') {
      const flights = (node.flights ?? []) as Array<Record<string, unknown>>;
      for (const f of flights) {
        if (typeof f.price !== 'number' || f.price <= 0) allHavePrices = false;
        if (typeof f.airline !== 'string' || f.airline.trim() === '')
          allHaveNames = false;
      }
    }

    if (tr.tool_name === 'search_hotels') {
      const hotels = (node.hotels ?? []) as Array<Record<string, unknown>>;
      for (const h of hotels) {
        if (typeof h.price_per_night !== 'number' || h.price_per_night <= 0)
          allHavePrices = false;
        if (typeof h.name !== 'string' || h.name.trim() === '')
          allHaveNames = false;
      }
    }

    if (tr.tool_name === 'search_experiences') {
      const experiences = (node.experiences ?? []) as Array<
        Record<string, unknown>
      >;
      for (const e of experiences) {
        // Experiences with estimated_cost must have it > 0
        if (
          'estimated_cost' in e &&
          (typeof e.estimated_cost !== 'number' || e.estimated_cost <= 0)
        ) {
          allHavePrices = false;
        }
        if (typeof e.name !== 'string' || e.name.trim() === '')
          allHaveNames = false;
      }
    }
  }

  return {
    search_results_have_prices: allHavePrices,
    search_results_have_names: allHaveNames,
  };
}

export function computeAssertionScore(results: AssertionResults): number {
  const values = Object.values(results);
  const passed = values.filter(Boolean).length;
  return Math.round((passed / values.length) * 100) / 100;
}

export function isCriticalFailure(results: AssertionResults): boolean {
  return !results.no_errors || !results.conversation_completed;
}
