import type { TripState } from 'app/prompts/booking-steps.js';
import { describe, expect, it } from 'vitest';

import { buildDefaultPlanCard } from './TripOrchestrator.js';

const baseTripState: TripState = {
  destination: 'New Orleans',
  origin: 'JFK',
  departure_date: '2026-07-01',
  return_date: '2026-07-06',
  budget_total: 3000,
  transport_mode: 'flying',
  trip_type: 'round_trip',
  flights: [],
  hotels: [],
  experiences: [],
  status: 'planning',
};

describe('buildDefaultPlanCard', () => {
  describe('flights category', () => {
    it('enables flights for a standard flying trip', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      expect(flights.enabled).toBe(true);
      expect(flights.not_applicable).toBe(false);
    });

    it('marks flights not_applicable for driving trips', () => {
      const trip = { ...baseTripState, transport_mode: 'driving' as const };
      const card = buildDefaultPlanCard(trip);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      expect(flights.enabled).toBe(false);
      expect(flights.not_applicable).toBe(true);
      expect(flights.not_applicable_reason).toBe('Driving trip');
    });

    it('marks flights not_applicable when transport_mode is null but driving', () => {
      const trip = { ...baseTripState, transport_mode: null };
      const card = buildDefaultPlanCard(trip);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      // null transport_mode = unknown, so flights should be enabled
      expect(flights.not_applicable).toBe(false);
    });

    it('pre-selects round_trip in trip_type sub-option', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      const tripTypeOpt = flights.sub_options?.find(
        (o) => o.id === 'trip_type',
      );
      expect(tripTypeOpt?.type).toBe('radio');
      if (tripTypeOpt?.type === 'radio') {
        expect(tripTypeOpt.value).toBe('round_trip');
      }
    });

    it('pre-selects one_way in trip_type sub-option for one_way trips', () => {
      const trip = { ...baseTripState, trip_type: 'one_way' as const };
      const card = buildDefaultPlanCard(trip);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      const tripTypeOpt = flights.sub_options?.find(
        (o) => o.id === 'trip_type',
      );
      if (tripTypeOpt?.type === 'radio') {
        expect(tripTypeOpt.value).toBe('one_way');
      }
    });

    it('includes all three trip type options', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      const tripTypeOpt = flights.sub_options?.find(
        (o) => o.id === 'trip_type',
      );
      if (tripTypeOpt?.type === 'radio') {
        const ids = tripTypeOpt.options.map((o) => o.id);
        expect(ids).toContain('one_way');
        expect(ids).toContain('round_trip');
        expect(ids).toContain('multi_city');
      }
    });
  });

  describe('hotels category', () => {
    it('enables hotels by default', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const hotels = card.categories.find((c) => c.id === 'hotels')!;
      expect(hotels.enabled).toBe(true);
      expect(hotels.not_applicable).toBe(false);
    });

    it('marks hotels not_applicable for day trips', () => {
      const trip = {
        ...baseTripState,
        departure_date: '2026-07-01',
        return_date: '2026-07-01',
      };
      const card = buildDefaultPlanCard(trip);
      const hotels = card.categories.find((c) => c.id === 'hotels')!;
      expect(hotels.not_applicable).toBe(true);
      expect(hotels.not_applicable_reason).toBe('Day trip');
    });

    it('enables hotels when return_date is null (unknown, not a day trip)', () => {
      const trip = { ...baseTripState, return_date: null };
      const card = buildDefaultPlanCard(trip);
      const hotels = card.categories.find((c) => c.id === 'hotels')!;
      expect(hotels.not_applicable).toBe(false);
    });

    it('has no sub_options', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const hotels = card.categories.find((c) => c.id === 'hotels')!;
      expect(hotels.sub_options).toBeUndefined();
    });
  });

  describe('car_rental category', () => {
    it('is disabled by default', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const car = card.categories.find((c) => c.id === 'car_rental')!;
      expect(car.enabled).toBe(false);
      expect(car.not_applicable).toBe(false);
    });
  });

  describe('experiences category', () => {
    it('is always enabled', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const exp = card.categories.find((c) => c.id === 'experiences')!;
      expect(exp.enabled).toBe(true);
      expect(exp.not_applicable).toBe(false);
    });

    it('includes all six interest options with empty initial selection', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const exp = card.categories.find((c) => c.id === 'experiences')!;
      const interests = exp.sub_options?.find((o) => o.id === 'interests');
      expect(interests?.type).toBe('multi');
      if (interests?.type === 'multi') {
        expect(interests.values).toEqual([]);
        const ids = interests.options.map((o) => o.id);
        expect(ids).toEqual([
          'dining',
          'nightlife',
          'activities',
          'theater',
          'wellness',
          'work',
        ]);
      }
    });
  });

  describe('category ordering', () => {
    it('returns categories in flights, hotels, car_rental, experiences order', () => {
      const card = buildDefaultPlanCard(baseTripState);
      const ids = card.categories.map((c) => c.id);
      expect(ids).toEqual(['flights', 'hotels', 'car_rental', 'experiences']);
    });
  });

  describe('road trip scenario', () => {
    it('marks flights not_applicable and leaves other categories pending', () => {
      const trip = { ...baseTripState, transport_mode: 'driving' as const };
      const card = buildDefaultPlanCard(trip);
      const flights = card.categories.find((c) => c.id === 'flights')!;
      const hotels = card.categories.find((c) => c.id === 'hotels')!;
      const car = card.categories.find((c) => c.id === 'car_rental')!;
      expect(flights.not_applicable).toBe(true);
      expect(hotels.enabled).toBe(true);
      expect(car.enabled).toBe(false); // user must explicitly enable
    });
  });
});
