import { query } from 'app/db/pool/pool.js';
import * as prefsRepo from 'app/repositories/userPreferences/userPreferences.js';
import type { UserPreferences } from 'app/schemas/userPreferences.js';
import { mockResult } from 'app/utils/tests/mockResult.js';
import { uuid } from 'app/utils/tests/uuids.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/db/pool/pool.js', () => {
  const queryFn = vi.fn();
  return {
    query: queryFn,
    withTransaction: vi.fn((fn: (client: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  };
});

const mockQuery = vi.mocked(query);

describe('userPreferences repository', () => {
  const userId = uuid();
  const prefId = uuid();

  // A valid JSONB row as returned from the database
  const preferencesJsonb: Record<string, unknown> = {
    schema_version: 1,
    accommodation: 'mid-range',
    travel_pace: 'moderate',
    dietary: ['vegetarian', 'gluten-free'],
    dining_style: 'casual',
    activities: ['history-culture'],
    travel_party: 'solo',
    budget_comfort: 'value-seeker',
    completed_steps: ['accommodation'],
  };

  const dbRow = {
    id: prefId,
    user_id: userId,
    preferences: preferencesJsonb,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  };

  // The normalized UserPreferences we expect findByUserId to return
  const expectedPrefs: UserPreferences = {
    schema_version: 1,
    accommodation: 'mid-range',
    travel_pace: 'moderate',
    dietary: ['vegetarian', 'gluten-free'],
    dining_style: 'casual',
    activities: ['history-culture'],
    travel_party: 'solo',
    budget_comfort: 'value-seeker',
    completed_steps: ['accommodation'],
    lgbtq_safety: false,
    gender: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('returns normalized preferences when found', async () => {
      mockQuery.mockResolvedValueOnce(mockResult([dbRow]));

      const result = await prefsRepo.findByUserId(userId);

      expect(result).toEqual(expectedPrefs);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId],
      );
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce(mockResult([]));

      const result = await prefsRepo.findByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('uses atomic JSONB merge and returns normalized result', async () => {
      const partial: Partial<UserPreferences> = {
        accommodation: 'budget',
        completed_steps: ['accommodation'],
      };

      // Single call: the atomic INSERT ... ON CONFLICT with JSONB merge
      const updatedRow = {
        ...dbRow,
        preferences: {
          ...preferencesJsonb,
          accommodation: 'budget',
          completed_steps: ['accommodation'],
        },
      };
      mockQuery.mockResolvedValueOnce(mockResult([updatedRow]));

      const result = await prefsRepo.upsert(userId, partial);

      expect(result.accommodation).toBe('budget');
      expect(result.completed_steps).toEqual(['accommodation']);
      // Only one query call (no separate findByUserId)
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id)'),
        expect.arrayContaining([userId]),
      );
    });

    it('SQL uses atomic JSONB merge operator (user_preferences.preferences ||)', async () => {
      const partial: Partial<UserPreferences> = { accommodation: 'upscale' };
      mockQuery.mockResolvedValueOnce(mockResult([dbRow]));

      await prefsRepo.upsert(userId, partial);

      const sql = mockQuery.mock.calls[0]![0] as string;
      expect(sql).toContain('user_preferences.preferences || $2');
    });

    it('handles upsert for a new user (no existing row)', async () => {
      const partial: Partial<UserPreferences> = { accommodation: 'upscale' };

      const normalizedNew: UserPreferences = {
        schema_version: 1,
        accommodation: 'upscale',
        travel_pace: null,
        dietary: [],
        dining_style: null,
        activities: [],
        travel_party: null,
        budget_comfort: null,
        completed_steps: [],
        lgbtq_safety: false,
        gender: null,
      };
      const newRow = {
        ...dbRow,
        preferences: normalizedNew,
      };
      mockQuery.mockResolvedValueOnce(mockResult([newRow]));

      const result = await prefsRepo.upsert(userId, partial);

      expect(result.accommodation).toBe('upscale');
      // Only one query call (atomic upsert, no read)
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteByUserId', () => {
    it('returns true when deleted', async () => {
      mockQuery.mockResolvedValueOnce(mockResult([], 1));

      const result = await prefsRepo.deleteByUserId(userId);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_preferences'),
        [userId],
      );
    });

    it('returns false when not found', async () => {
      mockQuery.mockResolvedValueOnce(mockResult([], 0));

      const result = await prefsRepo.deleteByUserId(userId);

      expect(result).toBe(false);
    });
  });
});
