import { Worker, type Job } from 'bullmq';
import { queueConnection, queueEnabled } from '@config/queue';
import { JOB_NAMES } from '@jobs/queue';
import { processMusicMetadata } from '@jobs/processors/music.processor';
import { generateUserRecommendations } from '@jobs/processors/recommendations.processor';
import { cleanupExpiredData } from '@jobs/processors/maintenance.processor';
import { PermanentJobError } from '@jobs/errors';
import { logger } from '@utils/logger';

/**
 * One Worker per queue, each routing by job name to its processor function
 * (task discovery: adding a new job type to a queue means adding one case
 * here, not a new Worker). Concurrency is per-queue since these have very
 * different costs per job (a single Saavn lookup vs. a full recommendation
 * recompute across every user).
 */

let workers: Worker[] = [];

function wrap<D, R>(name: string, handler: (job: Job<D>) => Promise<R>) {
  return async (job: Job<D>): Promise<R> => {
    try {
      return await handler(job);
    } catch (err) {
      if (err instanceof PermanentJobError) {
        logger.error(`[worker:${name}] permanent failure, not retrying — jobId=${job.id}: ${err.message}`);
      }
      throw err;
    }
  };
}

function musicProcessor(job: Job) {
  switch (job.name) {
    case JOB_NAMES.PROCESS_MUSIC_METADATA:
      return processMusicMetadata(job);
    default:
      throw new PermanentJobError(`Unknown job name "${job.name}" on the music queue.`);
  }
}

function recommendationsProcessor(job: Job) {
  switch (job.name) {
    case JOB_NAMES.GENERATE_USER_RECOMMENDATIONS:
      return generateUserRecommendations(job);
    default:
      throw new PermanentJobError(`Unknown job name "${job.name}" on the recommendations queue.`);
  }
}

function maintenanceProcessor(job: Job) {
  switch (job.name) {
    case JOB_NAMES.CLEANUP_EXPIRED_DATA:
      return cleanupExpiredData(job);
    default:
      throw new PermanentJobError(`Unknown job name "${job.name}" on the maintenance queue.`);
  }
}

/** Starts all workers. Call once from the dedicated worker process (src/jobs/workerMain.ts) — never from the API process. */
export function startWorkers(): void {
  if (!queueEnabled) {
    logger.warn('REDIS_URL not set — worker process has nothing to connect to, exiting startup.');
    return;
  }
  if (workers.length > 0) return; // already started

  const connection = queueConnection!;

  workers = [
    new Worker('music', wrap('music', musicProcessor), { connection, concurrency: 5 }),
    new Worker('recommendations', wrap('recommendations', recommendationsProcessor), {
      connection,
      concurrency: 2, // each job recomputes for every user — deliberately low
    }),
    new Worker('maintenance', wrap('maintenance', maintenanceProcessor), { connection, concurrency: 1 }),
  ];

  workers.forEach((worker) => {
    worker.on('completed', (job) => {
      logger.info(`[worker:${worker.name}] job ${job.id} (${job.name}) completed`);
    });
    worker.on('failed', (job, err) => {
      logger.error(`[worker:${worker.name}] job ${job?.id} (${job?.name}) failed: ${err.message}`);
    });
  });

  logger.info(`👷 BullMQ workers started: ${workers.map((w) => w.name).join(', ')}`);
}

/** Gracefully closes every worker (finishes in-flight jobs before disconnecting). */
export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
}
