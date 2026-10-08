import { Router } from 'express';
import { MusicController } from '@controllers/music.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/auth';
import { lyricsLimiter } from '@middlewares/rateLimiter';

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
 * /music/top-hits:
 *   get:
 *     summary: Current chart playlists ("Today's biggest hits") in the user's preferred language
 *     tags: [Music]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/top-hits', optionalAuthenticate, MusicController.getTopHits);

/**
 * @swagger
 * /music/autoplay:
 *   get:
 *     summary: Songs to continue the queue — never ones the user already played or skipped
 *     tags: [Music]
 *     parameters:
 *       - name: seeds
 *         in: query
 *         description: Comma-separated ids of the latest played songs (up to 3), newest first
 *         schema:
 *           type: string
 *       - name: exclude
 *         in: query
 *         description: Comma-separated ids the client already has (session plays, current queue)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/autoplay', optionalAuthenticate, MusicController.getAutoplay);

/**
 * @swagger
 * /music/shared-link:
 *   get:
 *     summary: "A link shared to Musify from another app: { kind: 'song', song, track } (track null when not in the catalog) or { kind: 'playlist' } (import it via /playlists/import/link)"
 *     tags: [Music]
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/shared-link', optionalAuthenticate, MusicController.resolveSharedLink);

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
 * /music/tracks/{trackId}/lyrics:
 *   get:
 *     summary: "Lyrics for a track: { synced, instrumental, lines: [{ time, text }] }. time is seconds (null when not synced); lines is empty when none exist."
 *     tags: [Music]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/tracks/:trackId/lyrics', MusicController.getLyrics);

/**
 * @swagger
 * /music/tracks/{trackId}/lyrics/translation:
 *   get:
 *     summary: "Each lyric line in Latin letters and in English: { lines: [{ latin, meaning }] }, aligned with the lyrics' lines. Made once per song and kept."
 *     tags: [Music]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       503:
 *         description: The translator (Gemini) is busy; try again in a minute
 */
router.get('/tracks/:trackId/lyrics/translation', authenticate, lyricsLimiter, MusicController.getLyricsTranslation);

/**
 * @swagger
 * /music/lyrics-search:
 *   get:
 *     summary: Songs a remembered line of lyrics is likely from (q, at least 3 words)
 *     tags: [Music]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/lyrics-search', authenticate, lyricsLimiter, MusicController.findByLyrics);

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

