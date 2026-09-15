import cron, { type ScheduledTask } from 'node-cron';
import { recomputeAllUserScores } from '@services/recommendation/engine';
import { logger } from '@utils/logger';

// Every 6 hours by default — override via env for local testing (e.g. "*/5 * * * *").
const SCHEDULE = process.env.RECOMMENDATION_CRON_SCHEDULE || '0 */6 * * *';

let task: ScheduledTask | null = null;
let running = false;

async function runRecompute(): Promise<void> {
  if (running) {
    logger.warn('Recommendation recompute already in progress, skipping this tick.');
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const summary = await recomputeAllUserScores();
    logger.info(
      `Recommendation recompute finished in ${Date.now() - startedAt}ms — ` +
        `${summary.usersProcessed} users, ${summary.candidatePoolSize} candidate tracks, ` +
        `cleaned up ${summary.staleScoreUsersCleaned} churned users' scores and ${summary.expiredCacheRowsCleaned} expired cache rows.`
    );
  } catch (err) {
    logger.error('Recommendation recompute job failed:', err);
  } finally {
    running = false;
  }
}

/** Start the periodic recompute job. Call once at server startup. */
export function startRecommendationCron(): void {
  if (task) return; // already started
  task = cron.schedule(SCHEDULE, () => {
    void runRecompute();
  });
  logger.info(`🔁 Recommendation recompute cron scheduled: "${SCHEDULE}"`);
}

export function stopRecommendationCron(): void {
  task?.stop();
  task = null;
}
