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
 * /playlists/import/spotify:
 *   post:
 *     summary: Import a public Spotify playlist, matching its songs on JioSaavn
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
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created, with matched and unmatched songs
 */
router.post('/import/spotify', authenticate, PlaylistController.importFromSpotify);

/**
 * @swagger
 * /playlists/import/screenshot:
 *   post:
 *     summary: Read the song list off one playlist screenshot (Gemini)
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mimeType, data]
 *             properties:
 *               mimeType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp]
 *               data:
 *                 type: string
 *                 description: Base64 image
 *     responses:
 *       200:
 *         description: Songs found, as { title, artist }
 *       503:
 *         description: GEMINI_API_KEY is not configured
 */
router.post('/import/screenshot', authenticate, PlaylistController.readScreenshot);

/**
 * @swagger
 * /playlists/{id}/import/songs:
 *   post:
 *     summary: Match up to 25 songs on JioSaavn and append them to your playlist
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               spotifyIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               songs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     artist:
 *                       type: string
 *     responses:
 *       200:
 *         description: Added count, matched and unmatched songs
 */
router.post('/:id/import/songs', authenticate, PlaylistController.importSongs);

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

