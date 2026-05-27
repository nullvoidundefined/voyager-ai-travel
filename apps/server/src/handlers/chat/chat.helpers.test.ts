import type { TripWithDetails } from 'app/schemas/trips.js';
import { describe, expect, it } from 'vitest';

import {
  buildClaudeMessages,
  buildMissingFieldsForm,
  buildTripContext,
  computeFlowPosition,
  toFlowInput,
} from './chat.helpers.js';

const baseTripDetails: TripWithDetails = {
  id: 'trip-1',
  user_id: 'user-1',
  destination: 'Barcelona',
  origin: 'JFK',
  departure_date: '2026-07-01',
  return_date: '2026-07-06',
  budget_total: 3000,
  budget_currency: 'USD',
  travelers: 2,
  preferences: {},
  status: 'planning',
  transport_mode: 'flying',
  trip_type: 'round_trip',
  created_at: new Date(),
  updated_at: new Date(),
  flights: [],
  hotels: [],
  car_rentals: [],
  experiences: [],
};

describe('chat.helpers', () => {
  describe('toFlowInput', () => {
    it('maps TripWithDetails to TripState correctly', () => {
      const result = toFlowInput(baseTripDetails);
      expect(result.destination).toBe('Barcelona');
      expect(result.origin).toBe('JFK');
      expect(result.status).toBe('planning');
      expect(result.flights).toEqual([]);
    });

    it('maps null optional fields', () => {
      const trip = { ...baseTripDetails, origin: null, transport_mode: null };
      const result = toFlowInput(trip);
      expect(result.origin).toBeNull();
      expect(result.transport_mode).toBeNull();
    });

    it('extracts only ids from sub-arrays', () => {
      const trip = {
        ...baseTripDetails,
        flights: [{ id: 'f1' }] as TripWithDetails['flights'],
      };
      const result = toFlowInput(trip);
      expect(result.flights).toEqual([{ id: 'f1' }]);
    });
  });

  describe('computeFlowPosition', () => {
    it('returns PLANNING for complete trip', () => {
      expect(computeFlowPosition(baseTripDetails).phase).toBe('PLANNING');
    });

    it('returns COLLECT_DETAILS when origin is missing', () => {
      const trip = { ...baseTripDetails, origin: null };
      expect(computeFlowPosition(trip).phase).toBe('COLLECT_DETAILS');
    });

    it('returns COMPLETE when status is saved', () => {
      const trip = { ...baseTripDetails, status: 'saved' as const };
      expect(computeFlowPosition(trip).phase).toBe('COMPLETE');
    });
  });

  describe('buildClaudeMessages', () => {
    it('adds current message and filters to user/assistant roles', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'tool', content: 'tool result' },
      ];
      const result = buildClaudeMessages(history, 'New message');
      expect(result).toHaveLength(3); // 2 from history + 1 current
      expect(result[result.length - 1]).toEqual({
        role: 'user',
        content: 'New message',
      });
    });

    it('truncates to first + last 20 messages', () => {
      const history = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      const result = buildClaudeMessages(history, 'Latest');
      // 25 + 1 = 26, truncated to first + last 20 = 21
      expect(result).toHaveLength(21);
      expect(result[0]!.content).toBe('Message 0');
      expect(result[result.length - 1]!.content).toBe('Latest');
    });

    it('handles null content as empty string', () => {
      const history = [{ role: 'user', content: null }];
      const result = buildClaudeMessages(history, 'Hi');
      expect(result[0]!.content).toBe('');
    });
  });

  describe('buildTripContext', () => {
    it('includes user preferences when provided', () => {
      const prefs = {
        schema_version: 1,
        accommodation: 'upscale' as const,
        travel_pace: 'relaxed' as const,
        dietary: ['vegan'],
        dining_style: 'fine-dining' as const,
        activities: ['history-culture'],
        travel_party: 'romantic-partner' as const,
        budget_comfort: 'comfort-first' as const,
        completed_steps: [],
        lgbtq_safety: false,
        gender: null,
      };
      const ctx = buildTripContext(baseTripDetails, prefs);
      expect(ctx.user_preferences?.accommodation).toBe('upscale');
    });

    it('omits user_preferences when null', () => {
      const ctx = buildTripContext(baseTripDetails, null);
      expect(ctx.user_preferences).toBeUndefined();
    });

    it('calculates total_spent from all selections', () => {
      const trip = {
        ...baseTripDetails,
        flights: [{ price: 400 }] as TripWithDetails['flights'],
        hotels: [{ total_price: 600 }] as TripWithDetails['hotels'],
        experiences: [{ estimated_cost: 50 }] as TripWithDetails['experiences'],
      };
      const ctx = buildTripContext(trip, null);
      expect(ctx.total_spent).toBe(1050);
    });
  });

  describe('buildMissingFieldsForm', () => {
    it('returns null when all fields are present', () => {
      expect(buildMissingFieldsForm(baseTripDetails)).toBeNull();
    });

    it('lists missing origin field', () => {
      const trip = { ...baseTripDetails, origin: null };
      const form = buildMissingFieldsForm(trip);
      expect(form).not.toBeNull();
      expect(
        (form as { fields: Array<{ name: string }> }).fields.find(
          (f) => f.name === 'origin',
        ),
      ).toBeDefined();
    });

    it('skips return_date for one-way trips', () => {
      const trip = {
        ...baseTripDetails,
        return_date: null,
        trip_type: 'one_way' as const,
      };
      const form = buildMissingFieldsForm(trip);
      // return_date should NOT be in missing fields for one-way
      if (form) {
        expect(
          (form as { fields: Array<{ name: string }> }).fields.find(
            (f) => f.name === 'return_date',
          ),
        ).toBeUndefined();
      }
    });

    it('includes destination for placeholder trips', () => {
      const trip = { ...baseTripDetails, destination: 'Planning...' };
      const form = buildMissingFieldsForm(trip);
      expect(form).not.toBeNull();
      expect(
        (form as { fields: Array<{ name: string }> }).fields.find(
          (f) => f.name === 'destination',
        ),
      ).toBeDefined();
    });

    it('includes destination for empty-string trips', () => {
      const trip = { ...baseTripDetails, destination: '' };
      const form = buildMissingFieldsForm(trip);
      expect(form).not.toBeNull();
      const fields = (form as { fields: Array<{ name: string }> }).fields;
      expect(fields.find((f) => f.name === 'destination')).toBeDefined();
    });

    it('lists missing departure_date field', () => {
      const trip = { ...baseTripDetails, departure_date: null };
      const form = buildMissingFieldsForm(trip);
      const fields = (form as { fields: Array<{ name: string }> }).fields;
      expect(fields.find((f) => f.name === 'departure_date')).toBeDefined();
    });

    it('lists missing return_date on round-trip', () => {
      const trip = { ...baseTripDetails, return_date: null };
      const form = buildMissingFieldsForm(trip);
      const fields = (form as { fields: Array<{ name: string }> }).fields;
      expect(fields.find((f) => f.name === 'return_date')).toBeDefined();
    });

    it('lists missing budget_total field', () => {
      const trip = { ...baseTripDetails, budget_total: null };
      const form = buildMissingFieldsForm(trip);
      const fields = (
        form as { fields: Array<{ name: string; required: boolean }> }
      ).fields;
      const budget = fields.find((f) => f.name === 'budget');
      expect(budget).toBeDefined();
      expect(budget?.required).toBe(false);
    });

    it('lists missing travelers field when null', () => {
      const trip = {
        ...baseTripDetails,
        travelers: null,
      } as unknown as TripWithDetails;
      const form = buildMissingFieldsForm(trip);
      const fields = (form as { fields: Array<{ name: string }> }).fields;
      expect(fields.find((f) => f.name === 'travelers')).toBeDefined();
    });

    it('lists missing travelers when value is less than 1', () => {
      const trip = { ...baseTripDetails, travelers: 0 };
      const form = buildMissingFieldsForm(trip);
      const fields = (form as { fields: Array<{ name: string }> }).fields;
      expect(fields.find((f) => f.name === 'travelers')).toBeDefined();
    });

    it('lists multiple missing fields in declared order', () => {
      const trip = {
        ...baseTripDetails,
        destination: 'Planning...',
        origin: null,
        departure_date: null,
        return_date: null,
        budget_total: null,
        travelers: null,
      } as unknown as TripWithDetails;
      const form = buildMissingFieldsForm(trip);
      const fieldNames = (
        form as { fields: Array<{ name: string }> }
      ).fields.map((f) => f.name);
      expect(fieldNames).toEqual([
        'destination',
        'origin',
        'departure_date',
        'return_date',
        'budget',
        'travelers',
      ]);
    });

    it('does not include return_date when trip is one_way', () => {
      const trip = {
        ...baseTripDetails,
        trip_type: 'one_way' as const,
        return_date: null,
      };
      const form = buildMissingFieldsForm(trip);
      // Form might be null if this is the only missing field.
      if (form) {
        const fields = (form as { fields: Array<{ name: string }> }).fields;
        expect(fields.find((f) => f.name === 'return_date')).toBeUndefined();
      }
    });
  });

  describe('buildTripContext edge cases', () => {
    it('uses sensible defaults when optional fields are null', () => {
      // The runtime code uses `?? 1` defaults for some fields whose
      // TS types require non-null. Cast through unknown to exercise
      // the default branches.
      const trip = {
        ...baseTripDetails,
        origin: null,
        departure_date: null,
        return_date: null,
        budget_total: null,
        budget_currency: null,
        travelers: null,
        transport_mode: null,
      } as unknown as TripWithDetails;
      const ctx = buildTripContext(trip, null);
      expect(ctx.origin).toBeNull();
      expect(ctx.departure_date).toBeNull();
      expect(ctx.return_date).toBeNull();
      expect(ctx.budget_total).toBe(0);
      expect(ctx.budget_currency).toBe('USD');
      expect(ctx.travelers).toBe(1);
      expect(ctx.transport_mode).toBeNull();
      expect(ctx.user_preferences).toBeUndefined();
    });

    it('maps selected flights and dates to ISO strings', () => {
      const departureAt = new Date('2026-07-01T08:00:00Z');
      const arrivalAt = new Date('2026-07-01T10:00:00Z');
      const trip: TripWithDetails = {
        ...baseTripDetails,
        flights: [
          {
            id: 'f1',
            airline: 'Delta',
            flight_number: 'DL100',
            price: 300,
            departure_time: departureAt,
            arrival_time: arrivalAt,
          } as unknown as TripWithDetails['flights'][number],
        ],
      };
      const ctx = buildTripContext(trip, null);
      expect(ctx.selected_flights[0]?.departure_time).toBe(
        departureAt.toISOString(),
      );
      expect(ctx.selected_flights[0]?.arrival_time).toBe(
        arrivalAt.toISOString(),
      );
    });

    it('sums total_spent across all selection types', () => {
      const trip: TripWithDetails = {
        ...baseTripDetails,
        flights: [
          { price: 300 } as unknown as TripWithDetails['flights'][number],
        ],
        hotels: [
          {
            total_price: 800,
          } as unknown as TripWithDetails['hotels'][number],
        ],
        car_rentals: [
          {
            total_price: 180,
            provider: 'Hertz',
            car_name: 'Camry',
            car_type: 'midsize',
            price_per_day: 60,
          } as unknown as TripWithDetails['car_rentals'][number],
        ],
        experiences: [
          {
            estimated_cost: 75,
            name: 'Bay Cruise',
            category: 'tour',
          } as unknown as TripWithDetails['experiences'][number],
        ],
      };
      const ctx = buildTripContext(trip, null);
      expect(ctx.total_spent).toBe(300 + 800 + 180 + 75);
    });

    it('defaults null prices to zero in total_spent', () => {
      const trip: TripWithDetails = {
        ...baseTripDetails,
        flights: [
          { price: null } as unknown as TripWithDetails['flights'][number],
        ],
        hotels: [
          {
            total_price: null,
          } as unknown as TripWithDetails['hotels'][number],
        ],
        car_rentals: [
          {
            total_price: null,
            provider: 'Hertz',
            car_name: 'Camry',
            car_type: 'midsize',
            price_per_day: null,
          } as unknown as TripWithDetails['car_rentals'][number],
        ],
        experiences: [
          {
            estimated_cost: null,
            name: 'Bay Cruise',
            category: 'tour',
          } as unknown as TripWithDetails['experiences'][number],
        ],
      };
      const ctx = buildTripContext(trip, null);
      expect(ctx.total_spent).toBe(0);
    });

    it('defaults null fields on selected flights and hotels to safe values', () => {
      const trip: TripWithDetails = {
        ...baseTripDetails,
        flights: [
          {
            airline: null,
            flight_number: null,
            price: null,
            departure_time: null,
            arrival_time: null,
          } as unknown as TripWithDetails['flights'][number],
        ],
        hotels: [
          {
            name: null,
            price_per_night: null,
            total_price: null,
            star_rating: null,
          } as unknown as TripWithDetails['hotels'][number],
        ],
        experiences: [
          {
            name: null,
            estimated_cost: null,
            category: null,
          } as unknown as TripWithDetails['experiences'][number],
        ],
      };
      const ctx = buildTripContext(trip, null);
      expect(ctx.selected_flights[0]?.airline).toBe('');
      expect(ctx.selected_flights[0]?.flight_number).toBe('');
      expect(ctx.selected_flights[0]?.price).toBe(0);
      expect(ctx.selected_flights[0]?.departure_time).toBe('');
      expect(ctx.selected_flights[0]?.arrival_time).toBe('');
      expect(ctx.selected_hotels[0]?.name).toBe('');
      expect(ctx.selected_hotels[0]?.price_per_night).toBe(0);
      expect(ctx.selected_hotels[0]?.total_price).toBe(0);
      expect(ctx.selected_hotels[0]?.star_rating).toBe(0);
      expect(ctx.selected_experiences[0]?.name).toBe('');
      expect(ctx.selected_experiences[0]?.estimated_cost).toBe(0);
      expect(ctx.selected_experiences[0]?.category).toBe('');
    });
  });
});
