import { Router } from 'express';
import { RecommendationController } from '@controllers/recommendation.controller';
import { UserController } from '@controllers/user.controller';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);

router.post('/preferences', authenticate, RecommendationController.updateUserPreferences);
router.get('/preferences', authenticate, RecommendationController.getUserPreferences);
router.post('/history', authenticate, RecommendationController.logPlayHistory);
router.post('/likes', authenticate, RecommendationController.logLike);
router.post('/dislikes', authenticate, RecommendationController.logDislike);
router.post('/skip', authenticate, RecommendationController.logSkip);

export default router;
