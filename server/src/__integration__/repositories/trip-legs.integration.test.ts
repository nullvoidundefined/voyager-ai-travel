import pool from 'app/db/pool/pool.js';
import {
  createLeg,
  deleteLeg,
  listLegs,
  reorderLegs,
} from 'app/repositories/trips/trip-legs.repository.js';
import { describe, expect, it } from 'vitest';

import { seedTrip, seedUser } from '../helpers/seed.js';

describe('trip_legs table', () => {
  it('exists with required columns', async () => {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'trip_legs'
       ORDER BY ordinal_position`,
    );
    const cols = result.rows.map((r: { column_name: string }) => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('trip_id');
    expect(cols).toContain('origin');
    expect(cols).toContain('destination');
    expect(cols).toContain('depart_date');
    expect(cols).toContain('leg_order');
  });
});

describe('TripLegsRepository', () => {
  let tripId: string;
  let legId: string;

  it('setup: seed a user and trip', async () => {
    const user = await seedUser();
    const trip = await seedTrip(user.id);
    tripId = trip.id;
  });

  it('createLeg inserts a row and returns it', async () => {
    const leg = await createLeg(tripId, {
      origin: 'NYC',
      destination: 'LAX',
      depart_date: '2026-08-01',
      leg_order: 1,
    });
    expect(leg.id).toBeTruthy();
    expect(leg.origin).toBe('NYC');
    legId = leg.id;
  });

  it('listLegs returns legs ordered by leg_order', async () => {
    await createLeg(tripId, {
      origin: 'LAX',
      destination: 'ORD',
      depart_date: '2026-08-05',
      leg_order: 2,
    });
    const legs = await listLegs(tripId);
    expect(legs.length).toBeGreaterThanOrEqual(2);
    expect(legs[0].leg_order).toBeLessThan(legs[1].leg_order);
  });

  it('deleteLeg removes the row', async () => {
    await deleteLeg(legId);
    const legs = await listLegs(tripId);
    expect(legs.find((l) => l.id === legId)).toBeUndefined();
  });

  it('reorderLegs updates leg_order for all provided ids', async () => {
    const a = await createLeg(tripId, {
      origin: 'A',
      destination: 'B',
      depart_date: '2026-09-01',
      leg_order: 1,
    });
    const b = await createLeg(tripId, {
      origin: 'B',
      destination: 'C',
      depart_date: '2026-09-02',
      leg_order: 2,
    });
    await reorderLegs([b.id, a.id]);
    const legs = await listLegs(tripId);
    const aAfter = legs.find((l) => l.id === a.id)!;
    const bAfter = legs.find((l) => l.id === b.id)!;
    expect(bAfter.leg_order).toBeLessThan(aAfter.leg_order);
  });
});
