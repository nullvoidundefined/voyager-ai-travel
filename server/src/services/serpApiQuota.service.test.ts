import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedisInstance = {
  get: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  connect: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedisInstance),
  Redis: vi.fn(() => mockRedisInstance),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

let quota: typeof import('app/services/serpApiQuota.service.js');

describe('serpApiQuota.service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.REDIS_URL = 'redis://localhost:6379';
    quota = await import('app/services/serpApiQuota.service.js');
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  describe('SERPAPI_MONTHLY_CAP', () => {
    it('is set to 200 (reserving 50 of the 250 free-tier budget as safety)', () => {
      expect(quota.SERPAPI_MONTHLY_CAP).toBe(200);
    });
  });

  describe('getMonthlyUsage', () => {
    it('returns 0 when counter does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const usage = await quota.getMonthlyUsage();
      expect(usage).toBe(0);
    });

    it('returns the parsed integer from Redis', async () => {
      mockRedisInstance.get.mockResolvedValue('175');
      const usage = await quota.getMonthlyUsage();
      expect(usage).toBe(175);
    });

    it('uses a key scoped to current YYYY-MM', async () => {
      mockRedisInstance.get.mockResolvedValue('0');
      await quota.getMonthlyUsage();
      const callArg = mockRedisInstance.get.mock.calls[0]?.[0] as string;
      expect(callArg).toContain('serpapi-quota');
      const yyyymm = new Date().toISOString().slice(0, 7);
      expect(callArg).toContain(yyyymm);
    });

    it('returns 0 when Redis is unavailable (fails open)', async () => {
      vi.resetModules();
      delete process.env.REDIS_URL;
      const mod = await import('app/services/serpApiQuota.service.js');
      const usage = await mod.getMonthlyUsage();
      expect(usage).toBe(0);
    });
  });

  describe('incrementMonthlyUsage', () => {
    it('increments the counter by 1', async () => {
      mockRedisInstance.incr.mockResolvedValue(10);
      mockRedisInstance.expire.mockResolvedValue(1);
      await quota.incrementMonthlyUsage();
      expect(mockRedisInstance.incr).toHaveBeenCalledWith(
        expect.stringContaining('serpapi-quota'),
      );
    });

    it('sets a TTL so the counter resets monthly', async () => {
      mockRedisInstance.incr.mockResolvedValue(1);
      mockRedisInstance.expire.mockResolvedValue(1);
      await quota.incrementMonthlyUsage();
      expect(mockRedisInstance.expire).toHaveBeenCalled();
    });

    it('is a no-op when Redis is unavailable', async () => {
      vi.resetModules();
      delete process.env.REDIS_URL;
      const mod = await import('app/services/serpApiQuota.service.js');
      await expect(mod.incrementMonthlyUsage()).resolves.toBeUndefined();
    });
  });

  describe('isOverMonthlyCap', () => {
    it('returns false when usage is under the cap', async () => {
      mockRedisInstance.get.mockResolvedValue('100');
      const over = await quota.isOverMonthlyCap();
      expect(over).toBe(false);
    });

    it('returns true when usage equals the cap', async () => {
      mockRedisInstance.get.mockResolvedValue('200');
      const over = await quota.isOverMonthlyCap();
      expect(over).toBe(true);
    });

    it('returns true when usage exceeds the cap', async () => {
      mockRedisInstance.get.mockResolvedValue('250');
      const over = await quota.isOverMonthlyCap();
      expect(over).toBe(true);
    });

    it('fails open (returns false) when Redis is unavailable', async () => {
      vi.resetModules();
      delete process.env.REDIS_URL;
      const mod = await import('app/services/serpApiQuota.service.js');
      const over = await mod.isOverMonthlyCap();
      expect(over).toBe(false);
    });
  });
});
