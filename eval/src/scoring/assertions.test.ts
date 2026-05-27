import { describe, expect, it } from 'vitest';

import { type ToolResult, checkSearchResultQuality } from './assertions.js';

describe('checkSearchResultQuality', () => {
  describe('vacuously true when no search results', () => {
    it('returns true for both checks with empty array', () => {
      const result = checkSearchResultQuality([]);
      expect(result.search_results_have_prices).toBe(true);
      expect(result.search_results_have_names).toBe(true);
    });

    it('returns true when only non-search tools present', () => {
      const toolResults: ToolResult[] = [
        { tool_name: 'calculate_remaining_budget', result: { total: 5000 } },
        { tool_name: 'get_destination_info', result: { iata: 'NRT' } },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
      expect(result.search_results_have_names).toBe(true);
    });
  });

  describe('search_results_have_prices', () => {
    it('passes when all flights have prices > 0', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [
              { airline: 'Delta', price: 450, flight_number: 'DL123' },
              { airline: 'United', price: 520, flight_number: 'UA456' },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
    });

    it('fails when a flight has price 0', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [
              { airline: 'Delta', price: 450, flight_number: 'DL123' },
              { airline: 'Unknown', price: 0, flight_number: 'XX000' },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
    });

    it('fails when a flight has no price field', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [{ airline: 'Delta', flight_number: 'DL123' }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
    });

    it('passes when all hotels have price_per_night > 0', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [
              { name: 'Hilton', price_per_night: 200 },
              { name: 'Marriott', price_per_night: 350 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
    });

    it('fails when a hotel has price_per_night 0', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [
              { name: 'Hilton', price_per_night: 200 },
              { name: 'Free Stay', price_per_night: 0 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
    });

    it('fails when a hotel has negative price_per_night', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [{ name: 'Buggy Hotel', price_per_night: -50 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
    });

    it('passes when experiences have estimated_cost > 0', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_experiences',
          result: {
            type: 'experience_tiles',
            experiences: [
              { name: 'Temple Tour', estimated_cost: 25 },
              { name: 'Cooking Class', estimated_cost: 60 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
    });

    it('fails when an experience has estimated_cost 0', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_experiences',
          result: {
            type: 'experience_tiles',
            experiences: [{ name: 'Free Walking Tour', estimated_cost: 0 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
    });

    it('passes when experiences lack estimated_cost entirely (not required)', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_experiences',
          result: {
            type: 'experience_tiles',
            experiences: [{ name: 'Park Visit' }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
    });

    it('checks prices across multiple tool results', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [{ airline: 'Delta', price: 450 }],
          },
        },
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [{ name: 'No Price Hotel' }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
    });
  });

  describe('search_results_have_names', () => {
    it('passes when all flights have non-empty airline', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [
              { airline: 'Delta', price: 450 },
              { airline: 'United', price: 520 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(true);
    });

    it('fails when a flight has empty airline string', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [
              { airline: 'Delta', price: 450 },
              { airline: '', price: 300 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(false);
    });

    it('fails when a flight has whitespace-only airline', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [{ airline: '   ', price: 300 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(false);
    });

    it('fails when a flight has no airline field', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [{ price: 300 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(false);
    });

    it('passes when all hotels have non-empty name', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [
              { name: 'Hilton', price_per_night: 200 },
              { name: 'Marriott', price_per_night: 350 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(true);
    });

    it('fails when a hotel has empty name', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [{ name: '', price_per_night: 200 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(false);
    });

    it('passes when all experiences have non-empty name', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_experiences',
          result: {
            type: 'experience_tiles',
            experiences: [
              { name: 'Temple Tour', estimated_cost: 25 },
              { name: 'Cooking Class', estimated_cost: 60 },
            ],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(true);
    });

    it('fails when an experience has empty name', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_experiences',
          result: {
            type: 'experience_tiles',
            experiences: [{ name: '', estimated_cost: 25 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_names).toBe(false);
    });
  });

  describe('combined price and name checks', () => {
    it('both pass with well-formed results', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [{ airline: 'Delta', price: 450 }],
          },
        },
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [{ name: 'Hilton', price_per_night: 200 }],
          },
        },
        {
          tool_name: 'search_experiences',
          result: {
            type: 'experience_tiles',
            experiences: [{ name: 'Tour', estimated_cost: 50 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
      expect(result.search_results_have_names).toBe(true);
    });

    it('names pass but prices fail', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: {
            type: 'flight_tiles',
            flights: [{ airline: 'Delta', price: 0 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(false);
      expect(result.search_results_have_names).toBe(true);
    });

    it('prices pass but names fail', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_hotels',
          result: {
            type: 'hotel_tiles',
            hotels: [{ name: '', price_per_night: 200 }],
          },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
      expect(result.search_results_have_names).toBe(false);
    });

    it('handles empty arrays inside nodes gracefully', () => {
      const toolResults: ToolResult[] = [
        {
          tool_name: 'search_flights',
          result: { type: 'flight_tiles', flights: [] },
        },
        {
          tool_name: 'search_hotels',
          result: { type: 'hotel_tiles', hotels: [] },
        },
      ];
      const result = checkSearchResultQuality(toolResults);
      expect(result.search_results_have_prices).toBe(true);
      expect(result.search_results_have_names).toBe(true);
    });
  });
});
