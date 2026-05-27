import type { PoolClient } from 'app/db/pool/pool.js';
import { query, withTransaction } from 'app/db/pool/pool.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearSelectionsForTrip,
  insertTripCarRental,
  insertTripExperience,
  insertTripFlight,
  insertTripHotel,
  updateTrip,
} from './trips.js';

vi.mock('app/db/pool/pool.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  withTransaction: vi.fn(),
}));

const mockQuery = vi.mocked(query);
const mockWithTransaction = vi.mocked(withTransaction);

describe('clearSelectionsForTrip', () => {
  const tripId = 'trip-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (fn) => {
      const fakeClient = { query: vi.fn() } as unknown as PoolClient;
      return fn(fakeClient);
    });
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('should use withTransaction for atomicity', async () => {
    await clearSelectionsForTrip(tripId);

    expect(mockWithTransaction).toHaveBeenCalledOnce();
    expect(mockWithTransaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should pass the transaction client to all 4 DELETE queries', async () => {
    const fakeClient = { query: vi.fn() } as unknown as PoolClient;
    mockWithTransaction.mockImplementation(async (fn) => fn(fakeClient));

    await clearSelectionsForTrip(tripId);

    expect(mockQuery).toHaveBeenCalledTimes(4);
    for (const call of mockQuery.mock.calls) {
      expect(call[2]).toBeDefined();
      expect(call[2]).toBe(fakeClient);
    }
  });

  it('should DELETE from all 4 selection tables', async () => {
    await clearSelectionsForTrip(tripId);

    const queries = mockQuery.mock.calls.map((c) => c[0]);
    expect(queries).toContain('DELETE FROM trip_flights WHERE trip_id = $1');
    expect(queries).toContain('DELETE FROM trip_hotels WHERE trip_id = $1');
    expect(queries).toContain(
      'DELETE FROM trip_car_rentals WHERE trip_id = $1',
    );
    expect(queries).toContain(
      'DELETE FROM trip_experiences WHERE trip_id = $1',
    );
  });

  it('should pass tripId as parameter to each DELETE', async () => {
    await clearSelectionsForTrip(tripId);

    for (const call of mockQuery.mock.calls) {
      expect(call[1]).toEqual([tripId]);
    }
  });
});

describe('insertTripSelection functions', () => {
  const tripId = 'trip-456';

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
  });

  it('insertTripFlight inserts with correct columns', async () => {
    await insertTripFlight(tripId, {
      airline: 'Delta',
      flight_number: 'DL100',
      origin: 'JFK',
      destination: 'BCN',
      price: 450,
      currency: 'USD',
    });
    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    expect(sql).toContain('INSERT INTO trip_flights');
    expect(sql).toContain('selected');
    const values = mockQuery.mock.calls[0]![1] as unknown[];
    expect(values[0]).toBe(tripId);
    expect(values).toContain('Delta');
  });

  it('insertTripHotel inserts with correct columns', async () => {
    await insertTripHotel(tripId, {
      name: 'Hotel Barcelona',
      price_per_night: 150,
      total_price: 750,
      currency: 'EUR',
    });
    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    expect(sql).toContain('INSERT INTO trip_hotels');
    const values = mockQuery.mock.calls[0]![1] as unknown[];
    expect(values).toContain('Hotel Barcelona');
  });

  it('insertTripCarRental inserts with correct columns', async () => {
    await insertTripCarRental(tripId, {
      provider: 'Hertz',
      car_name: 'Compact',
      total_price: 200,
      currency: 'USD',
    });
    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    expect(sql).toContain('INSERT INTO trip_car_rentals');
  });

  it('insertTripExperience inserts with correct columns', async () => {
    await insertTripExperience(tripId, {
      name: 'Sagrada Familia',
      estimated_cost: 25,
    });
    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    expect(sql).toContain('INSERT INTO trip_experiences');
  });
});

describe('updateTrip column allowlist', () => {
  const tripId = 'trip-789';
  const userId = 'user-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({
      rows: [{ id: tripId, user_id: userId, destination: 'Paris' }],
      rowCount: 1,
    } as never);
  });

  it('should reject keys not in the UpdateTripInput allowlist', async () => {
    await updateTrip(tripId, userId, {
      destination: 'Paris',
      user_id: 'attacker',
    } as never);

    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    // Extract the SET clause only (between SET and WHERE)
    const setClause = sql.slice(sql.indexOf('SET'), sql.indexOf('WHERE'));
    expect(setClause).not.toContain('user_id');
    expect(setClause).toContain('destination');
  });

  it('should include only allowed columns in SET clause', async () => {
    await updateTrip(tripId, userId, {
      destination: 'Tokyo',
      status: 'saved',
      id: 'injected-id',
      created_at: '2020-01-01',
    } as never);

    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    // Extract the SET clause only (between SET and WHERE)
    const setClause = sql.slice(sql.indexOf('SET'), sql.indexOf('WHERE'));
    expect(setClause).toContain('destination');
    expect(setClause).toContain('status');
    expect(setClause).not.toContain('id =');
    expect(setClause).not.toContain('created_at');
    // Only 2 allowed columns should produce $1 and $2 params in SET
    const values = mockQuery.mock.calls[0]![1] as unknown[];
    expect(values).toHaveLength(4); // 2 SET values + tripId + userId
  });

  it('should return null when all keys are disallowed', async () => {
    const result = await updateTrip(tripId, userId, {
      id: 'injected',
      created_at: '2020-01-01',
    } as never);

    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should accept all valid UpdateTripInput fields', async () => {
    await updateTrip(tripId, userId, {
      destination: 'Berlin',
      origin: 'NYC',
      departure_date: '2026-07-01',
      return_date: '2026-07-10',
      budget_total: 3000,
      travelers: 2,
      transport_mode: 'flying',
      trip_type: 'round_trip',
      status: 'planning',
    });

    expect(mockQuery).toHaveBeenCalledOnce();
    const sql = mockQuery.mock.calls[0]![0] as string;
    expect(sql).toContain('destination');
    expect(sql).toContain('origin');
    expect(sql).toContain('departure_date');
    expect(sql).toContain('return_date');
    expect(sql).toContain('budget_total');
    expect(sql).toContain('travelers');
    expect(sql).toContain('transport_mode');
    expect(sql).toContain('trip_type');
    expect(sql).toContain('status');
  });
});
