import pool from 'app/db/pool/pool.js';
import { describe, expect, it } from 'vitest';

describe('trip_schedule table', () => {
  it('exists with required columns', async () => {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'trip_schedule'
       ORDER BY ordinal_position`,
    );
    const cols = result.rows.map((r: { column_name: string }) => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('trip_id');
    expect(cols).toContain('day_date');
    expect(cols).toContain('day_number');
  });
});

describe('trip_schedule_items table', () => {
  it('exists with required columns', async () => {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'trip_schedule_items'
       ORDER BY ordinal_position`,
    );
    const cols = result.rows.map((r: { column_name: string }) => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('schedule_id');
    expect(cols).toContain('time_of_day');
    expect(cols).toContain('title');
    expect(cols).toContain('description');
    expect(cols).toContain('item_type');
    expect(cols).toContain('item_order');
  });
});
