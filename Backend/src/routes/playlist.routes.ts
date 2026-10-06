import { Router } from 'express';
import { PlaylistController } from '@controllers/playlist.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/auth';
import { importLimiter } from '@middlewares/rateLimiter';

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
 * /playlists/import/link:
 *   post:
 *     summary: Import a public playlist link (Spotify, YouTube, YouTube Music, Apple Music, JioSaavn, Deezer, Gaana), matching its songs on JioSaavn. /playlists/import/spotify is the old name.
 *     description: With playlistId, the songs are added to that playlist of the user's instead (200).
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
 *               playlistId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created, with matched and unmatched songs
 */
router.post(['/import/link', '/import/spotify'], authenticate, importLimiter, PlaylistController.importFromSpotify);

/**
 * @swagger
 * /playlists/import/screenshot:
 *   post:
 *     summary: Read the song list off 1-4 playlist screenshots, in order, with one Gemini call
 *     description: Also accepts a single image as { mimeType, data }.
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 4
 *                 items:
 *                   type: object
 *                   required: [mimeType, data]
 *                   properties:
 *                     mimeType:
 *                       type: string
 *                       enum: [image/jpeg, image/png, image/webp]
 *                     data:
 *                       type: string
 *                       description: Base64 image
 *     responses:
 *       200:
 *         description: Songs found, as { title, artist }
 *       501:
 *         description: GEMINI_API_KEY is not configured
 *       503:
 *         description: The reader is busy (Gemini quota); retry after a short wait
 */
router.post('/import/screenshot', authenticate, importLimiter, PlaylistController.readScreenshot);

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
router.post('/:id/import/songs', authenticate, importLimiter, PlaylistController.importSongs);

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
 * /playlists/{id}:
 *   put:
 *     summary: Rename / edit your playlist (title, description, coverUrl, isPublic — all optional)
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 * /playlists/{id}/tracks/order:
 *   put:
 *     summary: Save a new track order. Body `{ trackIds }` must list exactly the playlist's tracks (409 otherwise).
 *     tags: [Playlists]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.put('/:id', authenticate, PlaylistController.updatePlaylist);
router.put('/:id/tracks/order', authenticate, PlaylistController.reorderTracks);

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

