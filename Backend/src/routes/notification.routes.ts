import { Router } from 'express';
import { NotificationController } from '@controllers/notification.controller';
import { authenticate } from '@middlewares/auth';
import { validate } from '@middlewares/validate';
import { pushEndpointSchema, pushSubscriptionSchema } from '@validators/notification.validator';

const router = Router();

/**
 * @swagger
 * /notifications/public-key:
 *   get:
 *     summary: The Web Push key a device subscribes with, for new-release alerts
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: "{ publicKey }"
 *       501:
 *         description: Alerts aren't set up on this server
 */
router.get('/public-key', NotificationController.publicKey);

/**
 * @swagger
 * /notifications/subscriptions:
 *   post:
 *     summary: Turn on new-release alerts for this device (body is the browser's PushSubscription JSON)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Alerts on
 *   delete:
 *     summary: Turn off new-release alerts for this device (body { endpoint })
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerts off
 */
router.post('/subscriptions', authenticate, validate(pushSubscriptionSchema), NotificationController.subscribe);
router.delete('/subscriptions', authenticate, validate(pushEndpointSchema), NotificationController.unsubscribe);

export default router;
