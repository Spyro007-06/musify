import { Router } from 'express';
import { RecommendationController } from '@controllers/recommendation.controller';
import { UserController } from '@controllers/user.controller';
import { authenticate } from '@middlewares/auth';
import { validate } from '@middlewares/validate';
import { updateProfileSchema } from '@validators/user.validator';
import {
  updatePreferencesSchema,
  logPlayHistorySchema,
  logLikeSchema,
  logDislikeSchema,
  logSkipSchema,
} from '@validators/recommendation.validator';

const router = Router();

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), UserController.updateProfile);

router.post('/preferences', authenticate, validate(updatePreferencesSchema), RecommendationController.updateUserPreferences);
router.get('/preferences', authenticate, RecommendationController.getUserPreferences);
router.post('/history', authenticate, validate(logPlayHistorySchema), RecommendationController.logPlayHistory);
router.post('/likes', authenticate, validate(logLikeSchema), RecommendationController.logLike);
router.post('/dislikes', authenticate, validate(logDislikeSchema), RecommendationController.logDislike);
router.post('/skip', authenticate, validate(logSkipSchema), RecommendationController.logSkip);

export default router;
