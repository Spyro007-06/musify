import { SaavnService } from './saavn.service';
import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';

export class MusicService {
  private static saavn = SaavnService.getInstance();

  /**
   * Helper to attach isLiked = true/false to a list of tracks
   */
  public static async populateLikes(tracks: any[], userId?: string): Promise<any[]> {
    if (!userId || tracks.length === 0) {
      return tracks.map(t => ({ ...t, isLiked: false }));
    }

    const trackIds = tracks.map(t => t.id);
    const liked = await prisma.likedTrack.findMany({
      where: {
        userId,
        spotifyTrackId: { in: trackIds },
      },
      select: { spotifyTrackId: true },
    });

    const likedIdsSet = new Set(liked.map(l => l.spotifyTrackId));
    return tracks.map(t => ({
      ...t,
      isLiked: likedIdsSet.has(t.id),
    }));
  }

  public static async getTrending(userId?: string, languages?: string[], artists?: string[]): Promise<any[]> {
    const tracks = await this.saavn.getTrendingTracks(languages, artists);
    return this.populateLikes(tracks, userId);
  }

  public static async getNewReleases(languages?: string[], artists?: string[]): Promise<any[]> {
    return this.saavn.getNewReleases(languages, artists);
  }

  public static async getRecommended(userId?: string): Promise<any[]> {
    if (userId) {
      try {
        // 1. Get user's liked tracks, history, and followed artists in parallel
        const [likes, history, followed] = await Promise.all([
          prisma.likedTrack.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          prisma.listeningHistory.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 10,
          }),
          prisma.artistAffinity.findMany({
            where: { userId, isFollowed: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        ]);

        const trackIds = Array.from(new Set([
          ...likes.map(l => l.spotifyTrackId),
          ...history.map((h: any) => h.spotifyTrackId),
        ]));

        if (trackIds.length > 0) {
          // Fetch details for these tracks to extract artists and languages
          const userTracks = await this.saavn.getTracks(trackIds);
          
          // Collect artist names and languages
          const artists = new Set<string>();
          const languages = new Set<string>();

          userTracks.forEach(t => {
            if (t && t.artists) {
              t.artists.forEach((a: any) => artists.add(a.name));
            }
            if (t && t.genre) {
              languages.add(t.genre);
            }
          });

          // Fetch followed artists details
          if (followed.length > 0) {
            const followedArtists = await Promise.all(
              followed.map((f: any) => this.saavn.getArtist(f.spotifyArtistId))
            );
            followedArtists.forEach((a: any) => {
              if (a) artists.add(a.name);
            });
          }

          // Query recommendations based on these listening history signals!
          if (artists.size > 0 || languages.size > 0) {
            const tracks = await this.saavn.getRecommendations(
              Array.from(languages),
              Array.from(artists),
              20
            );
            if (tracks && tracks.length > 0) {
              return this.populateLikes(tracks, userId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to compile listening-based recommendations:', err);
      }
    }

    const tracks = await this.saavn.getRecommendedTracks();
    return this.populateLikes(tracks, userId);
  }

  public static async getRecommendations(
    languages: string[],
    artists: string[],
    userId?: string,
    limit = 20
  ): Promise<any[]> {
    const tracks = await this.saavn.getRecommendations(languages, artists, limit);
    return this.populateLikes(tracks, userId);
  }

  public static async getTrack(id: string, userId?: string): Promise<any> {
    const track = await this.saavn.getTrack(id);
    if (!track) {
      throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_FOUND);
    }
    const populated = await this.populateLikes([track], userId);
    return populated[0];
  }

  public static async getAlbum(id: string, userId?: string): Promise<any> {
    const album = await this.saavn.getAlbum(id);
    if (!album) {
      throw ApiError.notFound(ERROR_MESSAGES.ALBUM_NOT_FOUND);
    }
    if (album.tracks && album.tracks.length > 0) {
      album.tracks = await this.populateLikes(album.tracks, userId);
    }
    return album;
  }

  public static async getAlbums(page: number): Promise<{ data: any[]; meta: any }> {
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const releases = await this.saavn.getNewReleases();
    const paginated = releases.slice(offset, offset + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total: releases.length,
        totalPages: Math.ceil(releases.length / limit),
        hasNextPage: offset + limit < releases.length,
        hasPrevPage: page > 1,
      },
    };
  }

  public static async likeTrack(userId: string, trackId: string): Promise<void> {
    const track = await this.saavn.getTrack(trackId);
    if (!track) {
      throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_FOUND);
    }

    const existingLike = await prisma.likedTrack.findUnique({
      where: {
        userId_spotifyTrackId: { userId, spotifyTrackId: trackId },
      },
    });

    if (existingLike) {
      return; // Already liked
    }

    await prisma.likedTrack.create({
      data: {
        userId,
        spotifyTrackId: trackId,
      },
    });
  }

  public static async unlikeTrack(userId: string, trackId: string): Promise<void> {
    const existingLike = await prisma.likedTrack.findUnique({
      where: {
        userId_spotifyTrackId: { userId, spotifyTrackId: trackId },
      },
    });

    if (!existingLike) {
      throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_LIKED);
    }

    await prisma.likedTrack.delete({
      where: { id: existingLike.id },
    });
  }

  public static async getLikedSongs(userId: string, page: number = 1, limit: number = 50): Promise<any[]> {
    const skip = (page - 1) * limit;
    const likes = await prisma.likedTrack.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    if (likes.length === 0) return [];
    
    const trackIds = likes.map(l => l.spotifyTrackId);
    const tracks = await this.saavn.getTracks(trackIds);
    return tracks.map(t => ({ ...t, isLiked: true }));
  }

  public static async getRecentlyPlayed(userId: string, page: number = 1, limit: number = 20): Promise<any[]> {
    const skip = (page - 1) * limit;
    const history = await prisma.listeningHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    });

    if (history.length === 0) return [];

    const historyIds = history.map((h: any) => h.spotifyTrackId);
    const uniqueIds = Array.from(new Set(historyIds));
    const tracks = await this.saavn.getTracks(uniqueIds);

    const populated = history.map(h => {
      const track = tracks.find(t => t.id === h.spotifyTrackId);
      return track ? { ...track } : null;
    }).filter(Boolean);

    return this.populateLikes(populated, userId);
  }

  public static async getCategories(): Promise<any[]> {
    return this.saavn.getCategories();
  }

  public static async getMoodPlaylists(mood: string): Promise<any[]> {
    return this.saavn.getMoodPlaylists(mood);
  }

  public static async getStreamUrl(trackId: string, userId?: string): Promise<string> {
    // Uses a dedicated breaker (SAAVN_BREAKER.STREAM) — a playback outage is
    // isolated from a "view track details" outage even though today both
    // hit the same underlying JioSaavn call.
    const track = await this.saavn.getTrackForStream(trackId);
    if (!track) {
      throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_FOUND);
    }

    // Add to play history in Supabase
    if (userId) {
      await prisma.listeningHistory.create({
        data: {
          userId,
          spotifyTrackId: trackId,
        },
      });
    }

    return track.audioUrl || '';
  }
}
