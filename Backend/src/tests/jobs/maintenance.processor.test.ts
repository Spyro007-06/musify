import type { Job } from 'bullmq';
import { prismaMock } from '../setup/prismaMock';
import { cleanupExpiredData } from '@jobs/processors/maintenance.processor';

const makeJob = (): Job<any> => ({ id: 'job-1', data: {} }) as unknown as Job<any>;

describe('cleanupExpiredData', () => {
  it('deletes only RecommendationCache rows whose expiresAt has passed, and reports the count', async () => {
    prismaMock.recommendationCache.deleteMany.mockResolvedValue({ count: 7 });

    const result = await cleanupExpiredData(makeJob());

    expect(prismaMock.recommendationCache.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
    expect(result).toEqual({ expiredCacheRowsDeleted: 7 });
  });

  it('is idempotent — running again when nothing is expired deletes zero rows without error', async () => {
    prismaMock.recommendationCache.deleteMany.mockResolvedValue({ count: 0 });

    const result = await cleanupExpiredData(makeJob());

    expect(result).toEqual({ expiredCacheRowsDeleted: 0 });
  });

  it('lets a transient database error propagate for BullMQ to retry', async () => {
    const dbError = new Error('connection reset');
    prismaMock.recommendationCache.deleteMany.mockRejectedValue(dbError);

    await expect(cleanupExpiredData(makeJob())).rejects.toBe(dbError);
  });
});
