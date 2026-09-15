import { Request, Response, NextFunction } from 'express';
import { ArtistService } from '@services/artist.service';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { SUCCESS_MESSAGES } from '@constants/messages';
import { AuthenticatedRequest, OptionalAuthRequest } from '@/types/express';

export class ArtistController {
  public static async getArtist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const artist = await ArtistService.getArtist(req.params.id, optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Artist details retrieved successfully.',
        data: artist,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getArtistTopTracks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const tracks = await ArtistService.getArtistTopTracks(req.params.id, optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Artist top tracks retrieved successfully.',
        data: tracks,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getArtistAlbums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const albums = await ArtistService.getArtistAlbums(req.params.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Artist albums retrieved successfully.',
        data: albums,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRelatedArtists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const artists = await ArtistService.getRelatedArtists(req.params.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Related artists retrieved successfully.',
        data: artists,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async followArtist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await ArtistService.followArtist(authReq.user.id, req.params.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.ARTIST_FOLLOWED,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommendedArtists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferredArtistsStr = req.query.artists as string;
      const preferredArtists = preferredArtistsStr ? preferredArtistsStr.split(',') : [];
      const recommendations = await ArtistService.getRecommendedArtists(preferredArtists);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recommended artists retrieved successfully.',
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async unfollowArtist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await ArtistService.unfollowArtist(authReq.user.id, req.params.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.ARTIST_UNFOLLOWED,
      });
    } catch (error) {
      next(error);
    }
  }
}

