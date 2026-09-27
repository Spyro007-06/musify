import { Job } from 'bullmq';
import { prisma } from '@config/database';
import { logger } from '@utils/logger';

export interface CleanupExpiredDataResult {
  expiredCacheRowsDeleted: number;
}

/**
 * Deletes RecommendationCache rows past their own `expiresAt` — the only
 * table in the schema with an explicit expiry field that's already treated
 * as ephemeral/regenerable everywhere it's read (reads filter
 * `expiresAt: { gt: now }` and simply recompute on a miss; see
 * RecommendationService's dashboard-section cache and the cron's own
 * cleanupStaleData). Deliberately does NOT touch SearchHistory or any other
 * user-authored data — this task only ever removes rows that are already
 * being treated as dead everywhere else in the app, never something a user
 * would consider "their data".
 *
 * Runs hourly via a BullMQ repeatable job (src/jobs/queue.ts,
 * scheduleMaintenanceJobs) — more frequently than the 6-hourly full
 * recommendation recompute, since cache entries carry their own
 * (shorter, section-specific) TTLs.
 *
 * Idempotent by construction: a delete-where-expired query is safe to run
 * any number of times, back to back or overlapping.
 */
export async function cleanupExpiredData(job: Job): Promise<CleanupExpiredDataResult> {
  logger.info(`[job:cleanupExpiredData] started — jobId=${job.id}`);

  const { count } = await prisma.recommendationCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  logger.info(`[job:cleanupExpiredData] completed — deleted ${count} expired cache row(s), jobId=${job.id}`);

  return { expiredCacheRowsDeleted: count };
}
