import { Request, Response, NextFunction } from 'express';
import { RecommendationService } from '@services/recommendation.service';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { AuthenticatedRequest, OptionalAuthRequest } from '@/types/express';
import { SaavnService } from '@services/saavn.service';

export class RecommendationController {
  private static saavn = SaavnService.getInstance();

  public static async getDashboardRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const userId = optReq.user?.id;
      const saavn = SaavnService.getInstance();

      if (!userId) {
        // Cold start for unauthenticated users: show trending, popular charts, new releases
        const trending = await saavn.getTrendingTracks();
        const releases = await saavn.getNewReleases();
        const categories = await saavn.getCategories();

        sendSuccess({
          res,
          statusCode: HTTP_STATUS.OK,
          message: 'Default recommendations retrieved.',
          data: [
            {
              id: 'trending',
              title: 'Trending Tracks',
              subtitle: 'Popular choices on Musify today',
              type: 'tracks',
              items: trending.slice(0, 10),
            },
            {
              id: 'fresh-releases',
              title: 'New Releases',
              subtitle: 'Brand new albums you might like',
              type: 'albums',
              items: releases.slice(0, 8),
            },
            {
              id: 'categories',
              title: 'Explore Categories',
              subtitle: 'Browse music by mood or style',
              type: 'categories',
              items: categories,
            }
          ],
        });
        return;
      }

      const recommendations = await RecommendationService.getDashboardRecommendations(userId);

      // If user is new and preferences are empty, we can still append onboarding guide or default categories
      if (recommendations.length === 0) {
        const trending = await saavn.getTrendingTracks();
        const releases = await saavn.getNewReleases();
        
        sendSuccess({
          res,
          statusCode: HTTP_STATUS.OK,
          message: 'New user default recommendations.',
          data: [
            {
              id: 'trending',
              title: 'Trending Tracks',
              subtitle: 'Popular choices on Musify today',
              type: 'tracks',
              items: trending.slice(0, 10),
            },
            {
              id: 'fresh-releases',
              title: 'New Releases',
              subtitle: 'Brand new albums you might like',
              type: 'albums',
              items: releases.slice(0, 8),
            }
          ],
        });
        return;
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Personalized recommendations retrieved successfully.',
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommendedSongs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const songs = await RecommendationService.getRecommendedSongs(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recommended songs retrieved successfully.',
        data: songs,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommendedAlbums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const albums = await RecommendationService.getRecommendedAlbums(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recommended albums retrieved successfully.',
        data: albums,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommendedArtists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const artists = await RecommendationService.getRecommendedArtists(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recommended artists retrieved successfully.',
        data: artists,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getDiscoverWeekly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const songs = await RecommendationService.getDiscoverWeekly(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Discover Weekly tracks retrieved successfully.',
        data: songs,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { trackId, action, duration, skipTime } = req.body;
      
      if (action === 'complete') {
        await RecommendationService.logPlayHistory(authReq.user.id, {
          spotifyTrackId: trackId,
          completedSong: true,
          listenPercentage: 100,
        });
      } else if (action === 'skip') {
        await RecommendationService.logSkip(authReq.user.id, trackId, skipTime || 0, duration || 180);
      } else if (action === 'replay') {
        await RecommendationService.logPlayHistory(authReq.user.id, {
          spotifyTrackId: trackId,
          completedSong: true,
          numberOfReplays: 1,
        });
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Feedback logged successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logPlayHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await RecommendationService.logPlayHistory(authReq.user.id, req.body);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Play history logged successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { targetId, type } = req.body; // type: 'song' | 'album' | 'artist'
      await RecommendationService.logLike(authReq.user.id, targetId, type || 'song');
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Like logged successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logDislike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { trackId } = req.body;
      await RecommendationService.logDislike(authReq.user.id, trackId);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Dislike logged successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logSkip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { trackId, skipTime, duration } = req.body;
      await RecommendationService.logSkip(authReq.user.id, trackId, skipTime || 0, duration || 180);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Skip logged successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateUserPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await RecommendationService.updateUserPreferences(authReq.user.id, req.body);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'User preferences updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUserPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const prefs = await RecommendationService.getUserPreferences(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'User preferences retrieved successfully.',
        // Tamil is the display default for a user who hasn't picked a
        // language yet — applied only in this response, not inside the
        // service, since other callers (dashboard/smart-queue/discover
        // weekly) rely on an empty list meaning "no filter, use every
        // other signal available" rather than a real language choice.
        data: {
          ...prefs,
          favouriteLanguages: prefs.favouriteLanguages?.length ? prefs.favouriteLanguages : ['tamil'],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSmartQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { trackId, artistName, genre, mood } = req.body;

      const queue = await RecommendationService.generateSmartQueue(authReq.user.id, {
        trackId,
        artistName,
        genre,
        mood,
      });

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Smart Queue generated successfully.',
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  }
}
