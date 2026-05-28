import { query } from 'app/db/pool/pool.js';

export interface TripLeg {
  id: string;
  trip_id: string;
  origin: string;
  destination: string;
  depart_date: string;
  leg_order: number;
  created_at: string;
}

export interface CreateLegInput {
  origin: string;
  destination: string;
  depart_date: string;
  leg_order: number;
}

export async function createLeg(
  tripId: string,
  input: CreateLegInput,
): Promise<TripLeg> {
  const result = await query<TripLeg>(
    `INSERT INTO trip_legs (trip_id, origin, destination, depart_date, leg_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      tripId,
      input.origin,
      input.destination,
      input.depart_date,
      input.leg_order,
    ],
  );
  return result.rows[0];
}

export async function listLegs(tripId: string): Promise<TripLeg[]> {
  const result = await query<TripLeg>(
    `SELECT * FROM trip_legs WHERE trip_id = $1 ORDER BY leg_order ASC`,
    [tripId],
  );
  return result.rows;
}

export async function deleteLeg(legId: string): Promise<void> {
  await query(`DELETE FROM trip_legs WHERE id = $1`, [legId]);
}

export async function reorderLegs(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  // Build a VALUES list of (uuid, order) pairs so every id is a query
  // parameter. String interpolation is intentionally avoided here to prevent
  // SQL injection via attacker-controlled leg IDs.
  const placeholders = orderedIds.map(
    (_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::int)`,
  );
  const params: Array<string | number> = orderedIds.flatMap((id, i) => [
    id,
    i + 1,
  ]);
  await query(
    `UPDATE trip_legs
     SET leg_order = v.new_order
     FROM (VALUES ${placeholders.join(', ')}) AS v(leg_id, new_order)
     WHERE trip_legs.id = v.leg_id`,
    params,
  );
}
