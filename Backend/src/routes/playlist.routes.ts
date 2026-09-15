import { Router } from 'express';
import { PlaylistController } from '@controllers/playlist.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /playlists:
 *   get:
 *     summary: Get user's playlists
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create a playlist
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               coverUrl:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', authenticate, PlaylistController.getPlaylists);
router.post('/', authenticate, PlaylistController.createPlaylist);

/**
 * @swagger
 * /playlists/{id}:
 *   get:
 *     summary: Get playlist details
 *     tags: [Playlists]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     summary: Delete a playlist
 *     tags: [Playlists]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:id', optionalAuthenticate, PlaylistController.getPlaylist);
router.delete('/:id', authenticate, PlaylistController.deletePlaylist);

/**
 * @swagger
 * /playlists/{playlistId}/tracks:
 *   post:
 *     summary: Add a track to playlist
 *     tags: [Playlists]
 *     parameters:
 *       - name: playlistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackId
 *             properties:
 *               trackId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/:playlistId/tracks', authenticate, PlaylistController.addTrackToPlaylist);

/**
 * @swagger
 * /playlists/{playlistId}/tracks/{trackId}:
 *   delete:
 *     summary: Remove a track from playlist
 *     tags: [Playlists]
 *     parameters:
 *       - name: playlistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.delete('/:playlistId/tracks/:trackId', authenticate, PlaylistController.removeTrackFromPlaylist);

export default router;

