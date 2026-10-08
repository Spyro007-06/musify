import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@config/database';
import { env } from '@config/env';
import { HTTP_STATUS } from '@constants/httpCodes';
import { runReleaseAlerts } from '@services/releaseAlerts.service';
import { ApiError } from '@utils/ApiError';
import { sendSuccess } from '@utils/ApiResponse';
import { AuthenticatedRequest } from '@/types/express';

export class NotificationController {
  /** GET /notifications/public-key — the app subscribes the device with it. */
  public static publicKey(req: Request, res: Response, next: NextFunction): void {
    if (!env.VAPID_PUBLIC_KEY) {
      next(new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Release alerts are not set up yet.'));
      return;
    }
    sendSuccess({ res, message: 'Web Push key', data: { publicKey: env.VAPID_PUBLIC_KEY } });
  }

  /** POST /notifications/subscriptions — alerts on for this device (now for whoever is signed in on it). */
  public static async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { endpoint, keys } = req.body;
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId },
        update: { p256dh: keys.p256dh, auth: keys.auth, userId },
      });
      sendSuccess({ res, statusCode: HTTP_STATUS.CREATED, message: 'New-release alerts are on for this device.' });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /notifications/subscriptions — alerts off for this device. */
  public static async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint, userId } });
      sendSuccess({ res, message: 'New-release alerts are off for this device.' });
    } catch (error) {
      next(error);
    }
  }

  /** POST /internal/release-alerts — the scheduled GitHub Action, with the shared x-cron-secret. */
  public static async runReleaseAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const given = Buffer.from(String(req.headers['x-cron-secret'] ?? ''));
      const secret = Buffer.from(env.CRON_SECRET ?? '');
      if (!env.CRON_SECRET || given.length !== secret.length || !timingSafeEqual(given, secret)) {
        throw ApiError.unauthorized('Missing or wrong cron secret.');
      }
      sendSuccess({ res, message: 'Release check done', data: await runReleaseAlerts() });
    } catch (error) {
      next(error);
    }
  }
}
