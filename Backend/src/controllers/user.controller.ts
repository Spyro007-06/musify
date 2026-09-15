import { Request, Response, NextFunction } from 'express';
import { UserService } from '@services/user.service';
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
}
