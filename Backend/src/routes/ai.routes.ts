import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth';
import { aiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/recommendations', AIController.getRecommendations);
router.post('/playlist/generate', aiLimiter, AIController.generatePlaylist);

export default router;
