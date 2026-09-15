import { Router } from 'express';
import { SearchController } from '@controllers/search.controller';
import { optionalAuthenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search for tracks, albums, artists, and playlists
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', optionalAuthenticate, SearchController.search);

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search query autocomplete suggestions
 *     tags: [Search]
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
router.get('/suggestions', SearchController.getSuggestions);

export default router;

