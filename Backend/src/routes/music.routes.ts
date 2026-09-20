import { Router } from 'express';
import { MusicController } from '@controllers/music.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /music/trending:
 *   get:
 *     summary: Get trending tracks
 *     tags: [Music]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/trending', optionalAuthenticate, MusicController.getTrending);

/**
 * @swagger
 * /music/new-releases:
 *   get:
 *     summary: Get new release albums
 *     tags: [Music]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/new-releases', optionalAuthenticate, MusicController.getNewReleases);

/**
 * @swagger
 * /music/recommended:
 *   get:
 *     summary: Get recommended tracks
 *     tags: [Music]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/recommended', optionalAuthenticate, MusicController.getRecommended);

/**
 * @swagger
 * /music/tracks/{id}:
 *   get:
 *     summary: Get track details
 *     tags: [Music]
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
router.get('/tracks/:id', optionalAuthenticate, MusicController.getTrack);

/**
 * @swagger
 * /music/albums/{id}:
 *   get:
 *     summary: Get album details
 *     tags: [Music]
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
router.get('/albums/:id', optionalAuthenticate, MusicController.getAlbum);

/**
 * @swagger
 * /music/albums:
 *   get:
 *     summary: Get paginated albums
 *     tags: [Music]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/albums', MusicController.getAlbums);

/**
 * @swagger
 * /music/tracks/{trackId}/like:
 *   post:
 *     summary: Like a track
 *     tags: [Music]
 *     parameters:
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
 *   delete:
 *     summary: Unlike a track
 *     tags: [Music]
 *     parameters:
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
router.post('/tracks/:trackId/like', authenticate, MusicController.likeTrack);
router.delete('/tracks/:trackId/like', authenticate, MusicController.unlikeTrack);

/**
 * @swagger
 * /music/liked:
 *   get:
 *     summary: Get user's liked tracks
 *     tags: [Music]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/liked', authenticate, MusicController.getLikedSongs);

/**
 * @swagger
 * /music/recently-played:
 *   get:
 *     summary: Get user's recently played tracks
 *     tags: [Music]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/recently-played', authenticate, MusicController.getRecentlyPlayed);

/**
 * @swagger
 * /music/categories:
 *   get:
 *     summary: Get browse categories
 *     tags: [Music]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/categories', MusicController.getCategories);

/**
 * @swagger
 * /music/mood/{mood}:
 *   get:
 *     summary: Get playlists for a mood/category
 *     tags: [Music]
 *     parameters:
 *       - name: mood
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/mood/:mood', optionalAuthenticate, MusicController.getMoodPlaylists);

/**
 * @swagger
 * /music/tracks/{trackId}/stream:
 *   get:
 *     summary: Get track stream URL and log play
 *     tags: [Music]
 *     parameters:
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
router.get('/tracks/:trackId/stream', optionalAuthenticate, MusicController.getStreamUrl);

/**
 * @swagger
 * /music/tracks/{trackId}/download:
 *   get:
 *     summary: Download the track's audio file
 *     tags: [Music]
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The audio file, as an attachment
 */
router.get('/tracks/:trackId/download', optionalAuthenticate, MusicController.downloadTrack);

/**
 * @swagger
 * /music/recommendations:
 *   get:
 *     summary: Get personalized recommendations by genre seeds
 *     tags: [Music]
 *     parameters:
 *       - name: genres
 *         in: query
 *         schema:
 *           type: string
 *         description: Comma-separated genre seeds (e.g. pop,hiphop,electronic)
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/recommendations', optionalAuthenticate, MusicController.getRecommendations);

export default router;

