import { Request, Response, NextFunction } from 'express';
import { UserService } from '@services/user.service';
import { MoodService } from '@services/mood.service';
import { StatsService } from '@services/stats.service';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { AuthenticatedRequest } from '@/types/express';

export class UserController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const profile = await UserService.getUserProfile(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'User profile retrieved successfully.',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { displayName, avatarUrl, bio } = req.body;
      const updatedProfile = await UserService.updateUserProfile(authReq.user.id, {
        displayName,
        avatarUrl,
        bio,
      });
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'User profile updated successfully.',
        data: updatedProfile,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const stats = await StatsService.getMonthlyStats(authReq.user.id, req.query.month as string | undefined);
      sendSuccess({ res, statusCode: HTTP_STATUS.OK, message: 'Listening stats retrieved successfully.', data: stats });
    } catch (error) {
      next(error);
    }
  }

  public static async getMood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const mood = await MoodService.getActiveMood(authReq.user.id);
      sendSuccess({ res, statusCode: HTTP_STATUS.OK, message: 'Mood retrieved successfully.', data: { mood } });
    } catch (error) {
      next(error);
    }
  }

  public static async checkInMood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await MoodService.checkIn(authReq.user.id, req.body.mood);
      sendSuccess({ res, statusCode: HTTP_STATUS.OK, message: 'Mood saved.', data: { mood: req.body.mood } });
    } catch (error) {
      next(error);
    }
  }

  public static async clearMood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await MoodService.clear(authReq.user.id);
      sendSuccess({ res, statusCode: HTTP_STATUS.OK, message: 'Mood cleared.', data: { mood: null } });
    } catch (error) {
      next(error);
    }
  }
}
