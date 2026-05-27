import { describe, expect, it, vi } from 'vitest';

import {
  handleAddLeg,
  handleRemoveLeg,
  handleReorderLegs,
} from './legs.tool.js';

const mockCreate = vi.fn().mockResolvedValue({
  id: 'leg-1',
  origin: 'NYC',
  destination: 'LAX',
  depart_date: '2026-08-01',
  leg_order: 1,
});
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockReorder = vi.fn().mockResolvedValue(undefined);
const mockList = vi.fn().mockResolvedValue([]);

const adapters = {
  createLeg: mockCreate,
  listLegs: mockList,
  deleteLeg: mockDelete,
  reorderLegs: mockReorder,
};

describe('add_leg tool', () => {
  it('calls createLeg with tripId and input fields', async () => {
    const result = await handleAddLeg(
      {
        origin: 'NYC',
        destination: 'LAX',
        depart_date: '2026-08-01',
        leg_order: 1,
      },
      { tripId: 'trip-1', userId: 'user-1' },
      adapters,
    );
    expect(mockCreate).toHaveBeenCalledWith(
      'trip-1',
      expect.objectContaining({ origin: 'NYC' }),
    );
    expect(result.leg.id).toBe('leg-1');
  });
});

describe('remove_leg tool', () => {
  it('calls deleteLeg with the provided leg_id', async () => {
    await handleRemoveLeg(
      { leg_id: 'leg-1' },
      { tripId: 'trip-1', userId: 'user-1' },
      adapters,
    );
    expect(mockDelete).toHaveBeenCalledWith('leg-1');
  });
});

describe('reorder_legs tool', () => {
  it('calls reorderLegs with the ordered id array', async () => {
    await handleReorderLegs(
      { ordered_leg_ids: ['b', 'a'] },
      { tripId: 'trip-1', userId: 'user-1' },
      adapters,
    );
    expect(mockReorder).toHaveBeenCalledWith(['b', 'a']);
  });
});
