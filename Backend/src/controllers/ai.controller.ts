import { Request, Response, NextFunction } from 'express';
import { AIService } from '@services/ai.service';
import { ApiError } from '@utils/ApiError';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import type { AuthenticatedRequest } from '@/types/express';

export class AIController {
  static async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const mood = req.query.mood as string | undefined;
      const recommendations = await AIService.getRecommendations(authReq.user.id, mood);

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'AI recommendations retrieved successfully.',
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async generatePlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { prompt, playlistName } = req.body;
      if (!prompt) {
        throw ApiError.badRequest('prompt is required');
      }

      const playlistData = await AIService.generatePlaylistFromPrompt(authReq.user.id, prompt, playlistName);

      if (playlistData.playlistId === null) {
        sendSuccess({
          res,
          statusCode: HTTP_STATUS.OK,
          message: playlistData.message!,
          data: playlistData,
        });
        return;
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.CREATED,
        message: 'AI playlist generated successfully.',
        data: playlistData,
      });
    } catch (error) {
      next(error);
    }
  }
}
