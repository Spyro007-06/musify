import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { MusicService } from '@services/music.service';
import { sendSuccess, sendPaginated } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { SUCCESS_MESSAGES } from '@constants/messages';
import { ApiError } from '@utils/ApiError';
import { AuthenticatedRequest, OptionalAuthRequest } from '@/types/express';

export class MusicController {
  public static async getTrending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const languagesRaw = typeof req.query.languages === 'string' ? req.query.languages : '';
      const artistsRaw = typeof req.query.artists === 'string' ? req.query.artists : '';
      
      const languages = languagesRaw.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean);
      const artists = artistsRaw.split(',').map((a) => a.trim()).filter(Boolean);

      const tracks = await MusicService.getTrending(optReq.user?.id, languages, artists);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Trending tracks retrieved successfully.',
        data: tracks,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getNewReleases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const languagesRaw = typeof req.query.languages === 'string' ? req.query.languages : '';
      const artistsRaw = typeof req.query.artists === 'string' ? req.query.artists : '';

      const languages = languagesRaw.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean);
      const artists = artistsRaw.split(',').map((a) => a.trim()).filter(Boolean);

      const albums = await MusicService.getNewReleases(optReq.user?.id, languages, artists);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'New releases retrieved successfully.',
        data: albums,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommended(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const result = await MusicService.getRecommended(optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recommended tracks retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const track = await MusicService.getTrack(req.params.id, optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Track retrieved successfully.',
        data: track,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAlbum(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const album = await MusicService.getAlbum(req.params.id, optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Album retrieved successfully.',
        data: album,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAlbums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
      const result = await MusicService.getAlbums(page);
      
      sendPaginated({
        res,
        message: 'Albums retrieved successfully.',
        data: result.data,
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async likeTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await MusicService.likeTrack(authReq.user.id, req.params.trackId);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.TRACK_LIKED,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async unlikeTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await MusicService.unlikeTrack(authReq.user.id, req.params.trackId);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.TRACK_UNLIKED,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getLikedSongs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '50'), 10);
      const tracks = await MusicService.getLikedSongs(authReq.user.id, page, limit);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Liked tracks retrieved successfully.',
        data: tracks,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRecentlyPlayed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '20'), 10);
      const tracks = await MusicService.getRecentlyPlayed(authReq.user.id, page, limit);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recently played tracks retrieved successfully.',
        data: tracks,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await MusicService.getCategories();
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Categories retrieved successfully.',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getMoodPlaylists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const playlists = await MusicService.getMoodPlaylists(req.params.mood, optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Mood playlists retrieved successfully.',
        data: playlists,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getStreamUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      // The player prefetches the next queued track's stream URL while the
      // current one is still playing so skipping feels instant — that must
      // not log a play in history for a track the user hasn't heard yet.
      const isPrefetch = req.query.prefetch === 'true';
      const url = await MusicService.getStreamUrl(req.params.trackId, isPrefetch ? undefined : optReq.user?.id);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Stream URL retrieved successfully.',
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Proxies the track's audio through our server with a Content-Disposition
   * attachment header instead of redirecting to the CDN URL directly — the
   * browser's `download` attribute on an <a> only honors same-origin
   * responses, and a cross-origin redirect would just open/play the file
   * instead of saving it.
   */
  public static async downloadTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const { audioUrl, filename } = await MusicService.getDownloadInfo(req.params.trackId, optReq.user?.id);

      const upstream = await fetch(audioUrl);
      if (!upstream.ok || !upstream.body) {
        throw ApiError.internal('Failed to fetch the audio file from the catalog source.');
      }

      // HTTP header values must be Latin-1; track titles routinely carry
      // curly quotes, accents, or non-Latin scripts that would otherwise
      // make setHeader throw. Fall back to an ASCII-only name and carry the
      // real title via the RFC 5987 filename* parameter for browsers to use.
      const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, "'").trim() || 'track.m4a';
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mp4');
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (error) {
      next(error);
    }
  }

  public static async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const optReq = req as OptionalAuthRequest;
      const languagesRaw = typeof req.query.languages === 'string' ? req.query.languages : '';
      const artistsRaw = typeof req.query.artists === 'string' ? req.query.artists : '';
      
      const languages = languagesRaw
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter(Boolean);

      const artists = artistsRaw
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

      const tracks = await MusicService.getRecommendations(languages, artists, optReq.user?.id, limit);
      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Recommendations retrieved successfully.',
        data: tracks,
      });
    } catch (error) {
      next(error);
    }
  }
}

