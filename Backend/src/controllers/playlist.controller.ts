import { Request, Response, NextFunction } from 'express';
import { PlaylistService } from '@services/playlist.service';
import { createPlaylistSchema, addTrackSchema } from '@validators/playlist.validator';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { SUCCESS_MESSAGES } from '@constants/messages';
import { AuthenticatedRequest, OptionalAuthRequest } from '@/types/express';

export class PlaylistController {
  public static async getPlaylists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const playlists = await PlaylistService.getPlaylists(authReq.user.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Playlists retrieved successfully.',
        data: playlists,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const playlist = await PlaylistService.getPlaylist(req.params.id, optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Playlist retrieved successfully.',
        data: playlist,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const validatedData = createPlaylistSchema.parse(req.body);
      const playlist = await PlaylistService.createPlaylist(authReq.user.id, validatedData);
      
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.CREATED,
        message: SUCCESS_MESSAGES.PLAYLIST_CREATED,
        data: playlist,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addTrackToPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { trackId } = addTrackSchema.parse(req.body);
      await PlaylistService.addTrackToPlaylist(req.params.playlistId, trackId, authReq.user.id);
      
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.TRACK_ADDED_TO_PLAYLIST,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeTrackFromPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await PlaylistService.removeTrackFromPlaylist(req.params.playlistId, req.params.trackId, authReq.user.id);
      
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.TRACK_REMOVED_FROM_PLAYLIST,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deletePlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await PlaylistService.deletePlaylist(req.params.id, authReq.user.id);
      
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.PLAYLIST_DELETED,
      });
    } catch (error) {
      next(error);
    }
  }
}

