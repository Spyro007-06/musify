import { Request, Response, NextFunction } from 'express';
import { SearchService } from '@services/search.service';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { OptionalAuthRequest } from '@/types/express';

export class SearchController {
  public static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const query = String(req.query.q || '');
      const result = await SearchService.search(query, optReq.user?.id);
      
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Search results retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = String(req.query.q || '');
      const result = await SearchService.getSuggestions(query);
      
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Suggestions retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

