import { Job } from 'bullmq';
import { prisma } from '@config/database';
import { recomputeAllUserScores, getPrecomputedScores } from '@services/recommendation/engine';
import { PermanentJobError } from '@jobs/errors';
import { logger } from '@utils/logger';

export interface GenerateUserRecommendationsData {
  userId: string;
}

export interface GenerateUserRecommendationsResult {
  userId: string;
  scoresGenerated: number;
}

/**
 * On-demand recommendation refresh for a single user — reuses the exact
 * same collaborative-filtering + content-based engine as the periodic cron
 * (src/jobs/recommendationCron.ts), not a reimplementation. Collaborative
 * filtering inherently needs every user's ratings to score anyone (a
 * target user's neighbors have to be found across the whole matrix), so
 * this necessarily recomputes for all users — the same cost the cron
 * already pays every 6 hours — but lets the API (e.g. a "refresh my
 * recommendations" button) trigger it in the background between cron
 * ticks for one specific user, without that request blocking on the full
 * batch or the cron interval.
 *
 * Idempotent: recomputeAllUserScores() replaces (delete + recreate) each
 * user's RecommendationScores rows rather than appending to them.
 */
export async function generateUserRecommendations(
  job: Job<GenerateUserRecommendationsData>
): Promise<GenerateUserRecommendationsResult> {
  const { userId } = job.data;

  if (!userId || typeof userId !== 'string') {
    throw new PermanentJobError('generateUserRecommendations requires a userId.');
  }

  logger.info(`[job:generateUserRecommendations] started — userId=${userId}, jobId=${job.id}`);

  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) {
    // Permanent: no amount of retrying makes a missing user appear.
    throw new PermanentJobError(`generateUserRecommendations: user ${userId} does not exist.`);
  }

  // Errors from here on (DB connectivity, Saavn upstream inside the engine)
  // are transient and left to propagate so BullMQ retries with backoff.
  await recomputeAllUserScores();
  const scores = await getPrecomputedScores(userId);

  logger.info(`[job:generateUserRecommendations] completed — userId=${userId}, ${scores.length} score(s), jobId=${job.id}`);

  return { userId, scoresGenerated: scores.length };
}
