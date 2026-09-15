import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/recommendations', AIController.getRecommendations);
router.post('/lyrics/analyze', AIController.analyzeLyrics);
router.post('/playlist/generate', AIController.generatePlaylist);

export default router;
