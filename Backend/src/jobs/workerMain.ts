/**
 * Standalone entry point for the BullMQ worker process — run separately
 * from the API server (`npm run worker:dev` / `npm run worker:start`),
 * never imported by it. Workers are a distinct process for the same reason
 * Celery's are: they must not share the API's request-scoped state, and
 * they need to scale (concurrency, instance count) independently of HTTP
 * traffic. Each process gets its own Prisma client instance (module state
 * doesn't cross processes) — connected and disconnected on this process's
 * own lifecycle below, never borrowed from a request.
 */
import { connectDatabase, disconnectDatabase } from '@config/database';
import { logger } from '@utils/logger';
import { startWorkers, stopWorkers } from '@jobs/worker';
import { closeQueues } from '@jobs/queue';

async function main(): Promise<void> {
  await connectDatabase();
  startWorkers();
  logger.info('🚀 Worker process ready.');
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`⚠️ Worker received ${signal}. Shutting down gracefully...`);
  try {
    await stopWorkers();
    await closeQueues();
    await disconnectDatabase();
    logger.info('Worker graceful shutdown completed.');
    process.exit(0);
  } catch (err) {
    logger.error('Worker failed to shut down gracefully:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Worker uncaught exception:', error);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Worker unhandled promise rejection:', reason);
});

main().catch((err) => {
  logger.error('Worker process failed to start:', err);
  process.exit(1);
});
