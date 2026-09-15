import { Router } from 'express';
import { ArtistController } from '@controllers/artist.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /artists/{id}:
 *   get:
 *     summary: Get artist details
 *     tags: [Artists]
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
router.get('/recommendations', ArtistController.getRecommendedArtists);
router.get('/:id', optionalAuthenticate, ArtistController.getArtist);

/**
 * @swagger
 * /artists/{id}/top-tracks:
 *   get:
 *     summary: Get artist's top tracks
 *     tags: [Artists]
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
router.get('/:id/top-tracks', optionalAuthenticate, ArtistController.getArtistTopTracks);

/**
 * @swagger
 * /artists/{id}/albums:
 *   get:
 *     summary: Get artist's albums
 *     tags: [Artists]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:id/albums', ArtistController.getArtistAlbums);

/**
 * @swagger
 * /artists/{id}/related:
 *   get:
 *     summary: Get related artists
 *     tags: [Artists]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:id/related', ArtistController.getRelatedArtists);

/**
 * @swagger
 * /artists/{id}/follow:
 *   post:
 *     summary: Follow an artist
 *     tags: [Artists]
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
 *     summary: Unfollow an artist
 *     tags: [Artists]
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
router.post('/:id/follow', authenticate, ArtistController.followArtist);
router.delete('/:id/follow', authenticate, ArtistController.unfollowArtist);

export default router;

