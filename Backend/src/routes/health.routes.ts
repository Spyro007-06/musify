import { Router } from 'express';
import { prisma } from '@config/database';
import { HTTP_STATUS } from '@constants/httpCodes';

const router = Router();

// Basic — kept for backward compatibility with anything already polling /api/health.
router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Liveness — is the process itself responsive? No dependency checks; an
// orchestrator uses this to decide whether to restart the container.
router.get('/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Readiness — can this instance actually serve traffic? An orchestrator
// uses this to decide whether to route requests here.
router.get('/ready', async (_req, res) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('DB readiness check timed out')), 3000);
    });
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    res.json({ status: 'ok', checks: { database: 'ok' }, timestamp: new Date() });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'not_ready',
      checks: { database: 'unreachable' },
      timestamp: new Date(),
    });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
