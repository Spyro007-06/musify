import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service';
import type { AuthenticatedRequest } from '@/types/express';

export class AIController {
  static async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const mood = req.query.mood as string | undefined;
      const recommendations = await AIService.getRecommendations(userId, mood);

      res.status(200).json({ success: true, data: recommendations });
    } catch (error) {
      next(error);
    }
  }

  static async analyzeLyrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { trackId, lyrics } = req.body;
      if (!trackId || !lyrics) {
        res.status(400).json({ error: 'trackId and lyrics are required' });
        return;
      }

      const analysis = await AIService.analyzeLyrics(trackId, lyrics);

      res.status(200).json({ success: true, data: analysis });
    } catch (error) {
      next(error);
    }
  }

  static async generatePlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { prompt, playlistName } = req.body;
      if (!prompt) {
        res.status(400).json({ error: 'prompt is required' });
        return;
      }

      const playlistData = await AIService.generatePlaylistFromPrompt(userId, prompt, playlistName);

      res.status(201).json({ success: true, data: playlistData });
    } catch (error) {
      next(error);
    }
  }
}

