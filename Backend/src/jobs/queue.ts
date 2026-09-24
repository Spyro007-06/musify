import { Queue } from 'bullmq';
import { queueConnection, queueEnabled } from '@config/queue';
import { logger } from '@utils/logger';

/**
 * One BullMQ queue per job domain (mirrors src/services' *.service.ts split
 * and the task's own tasks/music.ts, tasks/recommendations.ts,
 * tasks/maintenance.ts grouping) rather than one shared queue distinguished
 * only by job name — this keeps per-domain concurrency/retry tuning and
 * queue-level metrics independent.
 */
export const JOB_NAMES = {
  PROCESS_MUSIC_METADATA: 'processMusicMetadata',
  GENERATE_USER_RECOMMENDATIONS: 'generateUserRecommendations',
  CLEANUP_EXPIRED_DATA: 'cleanupExpiredData',
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  // Bounded result retention — BullMQ persists every completed/failed job's
  // data+result in Redis until removed; without a cap this grows forever.
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export const musicQueue = queueEnabled
  ? new Queue('music', { connection: queueConnection!, defaultJobOptions })
  : null;

export const recommendationQueue = queueEnabled
  ? new Queue('recommendations', { connection: queueConnection!, defaultJobOptions })
  : null;

export const maintenanceQueue = queueEnabled
  ? new Queue('maintenance', { connection: queueConnection!, defaultJobOptions })
  : null;

const QUEUES_BY_NAME: Record<string, Queue> = {};
if (musicQueue) QUEUES_BY_NAME.music = musicQueue;
if (recommendationQueue) QUEUES_BY_NAME.recommendations = recommendationQueue;
if (maintenanceQueue) QUEUES_BY_NAME.maintenance = maintenanceQueue;

const ALL_QUEUES = Object.values(QUEUES_BY_NAME);

export interface EnqueuedJob {
  taskId: string;
  status: 'queued';
}

/**
 * BullMQ's default job id is an auto-incrementing integer *scoped to its
 * own queue* — queue "music"'s job 1 and queue "maintenance"'s job 1 are
 * different jobs that happen to share an id. A taskId handed back to an API
 * caller has to be globally unambiguous on its own (the status endpoint has
 * no other context), so it's encoded here as `<queueName>:<jobId>` and
 * decoded by findJobById below, which looks the job up in exactly that
 * queue instead of guessing by searching every queue in order (silently
 * returning the wrong same-numbered job from a different queue).
 */
function encodeTaskId(queueName: string, jobId: string): string {
  return `${queueName}:${jobId}`;
}

/**
 * Enqueues a batch of track ids for background metadata resolution/cache
 * warming (see src/jobs/processors/music.processor.ts). Returns null (and
 * logs) instead of throwing when the queue is disabled, so a caller that
 * forgot to configure REDIS_URL in dev degrades to "job silently not run"
 * rather than a 500.
 */
export async function enqueueProcessMusicMetadata(trackIds: string[]): Promise<EnqueuedJob | null> {
  if (!musicQueue) {
    logger.warn('enqueueProcessMusicMetadata called but the job queue is disabled (REDIS_URL not set).');
    return null;
  }
  const job = await musicQueue.add(JOB_NAMES.PROCESS_MUSIC_METADATA, { trackIds });
  return { taskId: encodeTaskId('music', job.id!), status: 'queued' };
}

/** Enqueues an on-demand recommendation refresh for one user (see recommendations.processor.ts). */
export async function enqueueGenerateUserRecommendations(userId: string): Promise<EnqueuedJob | null> {
  if (!recommendationQueue) {
    logger.warn('enqueueGenerateUserRecommendations called but the job queue is disabled (REDIS_URL not set).');
    return null;
  }
  const job = await recommendationQueue.add(JOB_NAMES.GENERATE_USER_RECOMMENDATIONS, { userId });
  return { taskId: encodeTaskId('recommendations', job.id!), status: 'queued' };
}

const CLEANUP_REPEATABLE_JOB_ID = 'cleanup-expired-data-hourly';

/**
 * Registers the hourly expired-cache cleanup as a BullMQ repeatable job —
 * this is this project's equivalent of Celery Beat: BullMQ stores the
 * schedule itself in Redis and any worker listening on the `maintenance`
 * queue picks up each tick, so there's no separate scheduler process to run.
 * Adding a repeatable job with the same `jobId` is idempotent (BullMQ
 * updates the existing schedule rather than creating a duplicate), so this
 * is safe to call on every API boot / every instance in a multi-instance
 * deploy without causing duplicate hourly runs.
 */
export async function scheduleMaintenanceJobs(): Promise<void> {
  if (!maintenanceQueue) {
    logger.info('Job queue disabled — skipping maintenance job scheduling.');
    return;
  }
  // Upserting is idempotent — safe to call on every boot / every instance in
  // a multi-instance deploy without creating duplicate hourly schedules.
  await maintenanceQueue.upsertJobScheduler(
    CLEANUP_REPEATABLE_JOB_ID,
    { pattern: '0 * * * *' },
    { name: JOB_NAMES.CLEANUP_EXPIRED_DATA, data: {} }
  );
  logger.info('🔁 Maintenance cleanup job scheduled: "0 * * * *" (hourly)');
}

/** Not called anywhere in normal operation — the schedule is meant to persist across restarts/deploys, not be torn down on every shutdown. Exposed for ops/manual use only. */
export async function unscheduleMaintenanceJobs(): Promise<void> {
  if (!maintenanceQueue) return;
  await maintenanceQueue.removeJobScheduler(CLEANUP_REPEATABLE_JOB_ID);
}

/**
 * Looks up a job by the `<queueName>:<jobId>` taskId returned from an
 * enqueue* call above. Falls back to searching every queue for a bare id
 * (pre-encoding taskIds, or one pasted in without its prefix) — best
 * effort only, since a bare numeric id is genuinely ambiguous across
 * queues; the encoded form is what every enqueue* function actually hands
 * out and what callers should be using.
 */
export async function findJobById(taskId: string) {
  const separatorIndex = taskId.indexOf(':');
  if (separatorIndex > 0) {
    const queueName = taskId.slice(0, separatorIndex);
    const rawId = taskId.slice(separatorIndex + 1);
    const queue = QUEUES_BY_NAME[queueName];
    if (queue) return queue.getJob(rawId);
  }

  for (const queue of ALL_QUEUES) {
    const job = await queue.getJob(taskId);
    if (job) return job;
  }
  return null;
}

export async function closeQueues(): Promise<void> {
  await Promise.all(ALL_QUEUES.map((q) => q.close()));
}
