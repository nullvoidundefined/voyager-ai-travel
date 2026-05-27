import pool from 'app/db/pool/pool.js';
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
