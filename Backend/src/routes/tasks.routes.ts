import { Router } from 'express';
import { TaskController } from '@controllers/task.controller';
import { authenticate } from '@middlewares/auth';
import { validate } from '@middlewares/validate';
import { warmMusicMetadataCacheSchema } from '@validators/task.validator';

const router = Router();

/**
 * @swagger
 * /tasks/music/warm-cache:
 *   post:
 *     summary: Enqueue a background job that pre-warms the track metadata cache for a batch of tracks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackIds]
 *             properties:
 *               trackIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       202:
 *         description: Task queued
 */
router.post('/music/warm-cache', authenticate, validate(warmMusicMetadataCacheSchema), TaskController.warmMusicMetadataCache);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get the status/result of a background task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task status
 *       404:
 *         description: No task found with that id
 */
router.get('/:id', authenticate, TaskController.getStatus);

export default router;
