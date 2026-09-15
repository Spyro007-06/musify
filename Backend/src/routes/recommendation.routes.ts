import { Router } from 'express';
import { RecommendationController } from '@controllers/recommendation.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/auth';

const router = Router();

router.get('/', optionalAuthenticate, RecommendationController.getDashboardRecommendations);
router.get('/songs', authenticate, RecommendationController.getRecommendedSongs);
router.get('/albums', authenticate, RecommendationController.getRecommendedAlbums);
router.get('/artists', authenticate, RecommendationController.getRecommendedArtists);
router.get('/discover', authenticate, RecommendationController.getDiscoverWeekly);
router.post('/feedback', authenticate, RecommendationController.logFeedback);
router.post('/smart-queue', authenticate, RecommendationController.getSmartQueue);

export default router;
