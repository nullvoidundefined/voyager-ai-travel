import { describe, expect, it } from 'vitest';

import {
  type CompletionTracker,
  DEFAULT_COMPLETION_TRACKER,
  type TripState,
  getFlowPosition,
  normalizeCompletionTracker,
  updateCompletionTracker,
} from './booking-steps.js';

const baseTripState: TripState = {
  destination: 'Paris',
  origin: 'JFK',
  departure_date: '2026-06-01',
  return_date: '2026-06-10',
  budget_total: 5000,
  transport_mode: 'flying',
  flights: [],
  hotels: [],
  experiences: [],
  status: 'planning',
};

describe('normalizeCompletionTracker', () => {
  it('should return defaults for null input', () => {
    const result = normalizeCompletionTracker(null);
    expect(result).toEqual(DEFAULT_COMPLETION_TRACKER);
  });

  it('should return defaults for undefined input', () => {
    const result = normalizeCompletionTracker(undefined);
    expect(result).toEqual(DEFAULT_COMPLETION_TRACKER);
  });

  it('should migrate v1 BookingState to v2 CompletionTracker', () => {
    const v1 = {
      version: 1,
      flights: { status: 'idle' },
      hotels: { status: 'asking' },
      car_rental: { status: 'presented' },
      experiences: { status: 'done' },
    };
    const result = normalizeCompletionTracker(v1);
    expect(result.version).toBe(2);
    expect(result.flights).toBe('pending');
    expect(result.hotels).toBe('pending');
    expect(result.car_rental).toBe('searching');
    expect(result.experiences).toBe('selected');
    expect(result.turns_since_last_progress).toBe(0);
  });

  it('should migrate v1 skipped status', () => {
    const v1 = {
      version: 1,
      flights: { status: 'skipped' },
      hotels: { status: 'idle' },
      car_rental: { status: 'idle' },
      experiences: { status: 'idle' },
    };
    const result = normalizeCompletionTracker(v1);
    expect(result.flights).toBe('skipped');
  });

  it('should pass through valid v2 data', () => {
    const v2: CompletionTracker = {
      version: 2,
      transport: 'flying',
      flights: 'selected',
      hotels: 'searching',
      car_rental: 'pending',
      experiences: 'pending',
      turns_since_last_progress: 2,
    };
    const result = normalizeCompletionTracker(v2);
    expect(result).toEqual(v2);
  });

  it('should fill missing fields in v2 data', () => {
    const partial = { version: 2, flights: 'selected' };
    const result = normalizeCompletionTracker(partial);
    expect(result.flights).toBe('selected');
    expect(result.hotels).toBe('pending');
    expect(result.transport).toBe('pending');
    expect(result.turns_since_last_progress).toBe(0);
  });
});

describe('getFlowPosition', () => {
  it('should return COMPLETE when trip status is not planning', () => {
    const trip = { ...baseTripState, status: 'saved' };
    const result = getFlowPosition(trip);
    expect(result.phase).toBe('COMPLETE');
  });

  it('should return COLLECT_DETAILS when origin is missing', () => {
    const trip = { ...baseTripState, origin: null };
    const result = getFlowPosition(trip);
    expect(result.phase).toBe('COLLECT_DETAILS');
  });

  it('should return COLLECT_DETAILS when departure_date is missing', () => {
    const trip = { ...baseTripState, departure_date: null };
    const result = getFlowPosition(trip);
    expect(result.phase).toBe('COLLECT_DETAILS');
  });

  it('should return PLANNING when all required fields are present', () => {
    const result = getFlowPosition(baseTripState);
    expect(result.phase).toBe('PLANNING');
  });

  it('should allow null return_date for one_way trips', () => {
    const trip = {
      ...baseTripState,
      return_date: null,
      trip_type: 'one_way' as const,
    };
    const result = getFlowPosition(trip);
    expect(result.phase).toBe('PLANNING');
  });

  it('should require return_date for round trips', () => {
    const trip = { ...baseTripState, return_date: null };
    const result = getFlowPosition(trip);
    expect(result.phase).toBe('COLLECT_DETAILS');
  });

  it('should not require budget for PLANNING', () => {
    const trip = { ...baseTripState, budget_total: null };
    const result = getFlowPosition(trip);
    expect(result.phase).toBe('PLANNING');
  });
});

describe('updateCompletionTracker', () => {
  it('should mark category as searching when search tool is called', () => {
    const tracker = { ...DEFAULT_COMPLETION_TRACKER };
    const result = updateCompletionTracker(
      tracker,
      {
        tool_calls: [{ tool_name: 'search_flights' }],
        formatResponse: null,
      },
      baseTripState,
    );
    expect(result.flights).toBe('searching');
    expect(result.turns_since_last_progress).toBe(0);
  });

  it('should mark category as selected when trip has selections', () => {
    const tracker = {
      ...DEFAULT_COMPLETION_TRACKER,
      flights: 'searching' as const,
    };
    const tripWithFlight = { ...baseTripState, flights: [{ id: '1' }] };
    const result = updateCompletionTracker(
      tracker,
      {
        tool_calls: [{ tool_name: 'select_flight' }],
        formatResponse: null,
      },
      tripWithFlight,
    );
    expect(result.flights).toBe('selected');
  });

  it('should mark category as skipped when skip_category names it', () => {
    const tracker = { ...DEFAULT_COMPLETION_TRACKER };
    const result = updateCompletionTracker(
      tracker,
      {
        tool_calls: [],
        formatResponse: { skip_category: 'hotels' },
      },
      baseTripState,
    );
    expect(result.hotels).toBe('skipped');
  });

  it('should update transport when update_trip sets transport_mode', () => {
    const tracker = { ...DEFAULT_COMPLETION_TRACKER };
    const tripDriving = {
      ...baseTripState,
      transport_mode: 'driving' as const,
    };
    const result = updateCompletionTracker(
      tracker,
      {
        tool_calls: [{ tool_name: 'update_trip' }],
        formatResponse: null,
      },
      tripDriving,
    );
    expect(result.transport).toBe('driving');
    expect(result.flights).toBe('skipped');
  });

  it('should increment turns_since_last_progress when no status changes', () => {
    const tracker = {
      ...DEFAULT_COMPLETION_TRACKER,
      transport: 'flying' as const,
      turns_since_last_progress: 1,
    };
    const result = updateCompletionTracker(
      tracker,
      {
        tool_calls: [],
        formatResponse: null,
      },
      baseTripState,
    );
    expect(result.turns_since_last_progress).toBe(2);
  });

  it('should reset turns_since_last_progress when any status changes', () => {
    const tracker = {
      ...DEFAULT_COMPLETION_TRACKER,
      turns_since_last_progress: 5,
    };
    const result = updateCompletionTracker(
      tracker,
      {
        tool_calls: [{ tool_name: 'search_hotels' }],
        formatResponse: null,
      },
      baseTripState,
    );
    expect(result.turns_since_last_progress).toBe(0);
  });
});
