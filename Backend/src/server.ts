import http from 'http';
import app from './app';
import { env } from '@config/env';
import { connectDatabase, disconnectDatabase } from '@config/database';
import { logger } from '@utils/logger';
import { startRecommendationCron, stopRecommendationCron } from '@jobs/recommendationCron';

const port = env.PORT;
const server = http.createServer(app);

const startServer = async () => {
  try {
    // 1. Connect Prisma → Supabase PostgreSQL
    await connectDatabase();

    // 2. Start Express server
    server.listen(port, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
      logger.info(`📖 Swagger docs: ${env.APP_URL}/api/docs`);
    });

    // 3. Start the periodic recommendation recompute job (not in tests)
    if (env.NODE_ENV !== 'test') {
      startRecommendationCron();
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
  logger.info(`⚠️ Received ${signal}. Shutting down gracefully...`);

  stopRecommendationCron();

  server.close(async () => {
    logger.info('HTTP server closed.');

    await disconnectDatabase();

    logger.info('Graceful shutdown completed.');
    process.exit(0);
  });

  // Force close after 10s if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
