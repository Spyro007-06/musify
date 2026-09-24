import { Request, Response, NextFunction } from 'express';
import { env } from '@config/env';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { ApiError } from '@utils/ApiError';
import { findJobById, enqueueProcessMusicMetadata } from '@jobs/queue';

export class TaskController {
  /**
   * GET /api/tasks/:id — status of a previously enqueued background job.
   * Response shape matches the three cases callers need to distinguish:
   *   { taskId, status: 'PENDING' }
   *   { taskId, status: 'SUCCESS', result }
   *   { taskId, status: 'FAILURE', error }
   * `error` is a short message only, never the raw stack — this endpoint is
   * reachable by any authenticated user, not just operators.
   */
  public static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const job = await findJobById(id);

      if (!job) {
        throw ApiError.notFound(`No task found with id "${id}".`);
      }

      const state = await job.getState();

      if (state === 'completed') {
        sendSuccess({
          res,
          statusCode: HTTP_STATUS.OK,
          message: 'Task completed.',
          data: { taskId: job.id, status: 'SUCCESS', result: job.returnvalue },
        });
        return;
      }

      if (state === 'failed') {
        sendSuccess({
          res,
          statusCode: HTTP_STATUS.OK,
          message: 'Task failed.',
          data: {
            taskId: job.id,
            status: 'FAILURE',
            // Full failedReason (e.g. a permanent-input message) is safe to
            // surface — it's this task's own validation/state message, never
            // a raw stack trace — but only in non-production responses is
            // it guaranteed not to leak an unexpected internal error's text.
            error: env.NODE_ENV === 'production' ? 'Task failed.' : job.failedReason,
          },
        });
        return;
      }

      // waiting / active / delayed / paused / waiting-children / unknown
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Task pending.',
        data: { taskId: job.id, status: 'PENDING' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tasks/music/warm-cache — enqueues processMusicMetadata for a
   * batch of trackIds instead of resolving them synchronously in the
   * request. Body validated by warmMusicMetadataCacheSchema (max 200 ids).
   */
  public static async warmMusicMetadataCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trackIds } = req.body as { trackIds: string[] };
      const enqueued = await enqueueProcessMusicMetadata(trackIds);

      if (!enqueued) {
        throw ApiError.internal('Background job queue is not configured (REDIS_URL not set).');
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.ACCEPTED,
        message: 'Metadata warm-up queued.',
        data: enqueued,
      });
    } catch (error) {
      next(error);
    }
  }
}
