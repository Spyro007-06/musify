import { SaavnService } from './saavn.service';
import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { logger } from '@utils/logger';

export class MusicService {
  private static saavn = SaavnService.getInstance();

  /**
   * Helper to attach isLiked = true/false to a list of tracks.
   * The core data (tracks/recommendations/etc.) has already been fetched
   * successfully by the time this runs — a transient DB failure here should
   * degrade to isLiked: false, not fail the whole response.
   */
  public static async populateLikes(tracks: any[], userId?: string): Promise<any[]> {
    if (!userId || tracks.length === 0) {
      return tracks.map(t => ({ ...t, isLiked: false }));
    }

    try {
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
    } catch (error) {
      logger.error('Failed to annotate isLiked — degrading to isLiked: false:', error);
      return tracks.map(t => ({ ...t, isLiked: false }));
    }
  }

  /**
   * Explicit languages (a query param, or a Browse/Home genre-tile click)
   * win when given; otherwise falls back to the user's saved "Favourite
   * Languages" preference (Settings → Music Preferences) — the single
   * source of truth for "only show me content in this language" across
   * the whole app, not just the one section that happens to pass it.
   */
  public static async getPreferredLanguages(userId?: string, explicit?: string[]): Promise<string[]> {
    if (explicit && explicit.length > 0) return explicit;
    if (!userId) return [];
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { favouriteLanguages: true },
    });
    return prefs?.favouriteLanguages || [];
  }

  public static async getTrending(userId?: string, languages?: string[], artists?: string[]): Promise<any[]> {
    const preferredLanguages = await this.getPreferredLanguages(userId, languages);

    // A language preference is authoritative — skip the genre bias branch
    // (which doesn't language-filter) and let getTrendingTracks's own
    // strict language filter decide below.
    if (userId && preferredLanguages.length === 0 && (!artists || artists.length === 0)) {
      try {
        const genreRows = await prisma.genreAffinity.findMany({
          where: { userId },
          orderBy: { score: 'desc' },
        });
        if (genreRows.length > 0) {
          const genreTracks = await this.saavn.getRecommendationsByGenres(
            genreRows.map((g: any) => g.genre),
            24
          );
          if (genreTracks.length > 0) {
            return this.populateLikes(genreTracks, userId);
          }
        }
      } catch (error) {
        logger.error('Failed to bias trending by genre preference — falling back to unbiased trending:', error);
      }
    }

    const tracks = await this.saavn.getTrendingTracks(preferredLanguages, artists);
    return this.populateLikes(tracks, userId);
  }

  public static async getNewReleases(userId?: string, languages?: string[], artists?: string[]): Promise<any[]> {
    const preferredLanguages = await this.getPreferredLanguages(userId, languages);
    return this.saavn.getNewReleases(preferredLanguages, artists);
  }

  /**
   * `personalized: false` means the tracks are the same generic trending
   * fallback a logged-out visitor would see — no genre preference, likes,
   * history, or followed artists were found to base anything on. The
   * frontend uses this to avoid claiming a personalization it hasn't
   * actually done yet (e.g. "inspired by your listening history" for a
   * user who has none).
   */
  public static async getRecommended(userId?: string): Promise<{ tracks: any[]; personalized: boolean }> {
    const preferredLanguages = await this.getPreferredLanguages(userId);

    // A saved language preference is authoritative for "Made For You" too —
    // skip the genre/history-bias branches below (neither language-filters)
    // and go straight to a strictly language-filtered set.
    if (userId && preferredLanguages.length === 0) {
      try {
        // Explicit favourite genres (set in Settings) are the strongest signal a
        // user can give — stronger than passive likes/history, which a brand-new
        // or preference-only user won't have yet. Check this first so saving a
        // genre preference visibly changes "Made For You" right away.
        const genreRows = await prisma.genreAffinity.findMany({
          where: { userId },
          orderBy: { score: 'desc' },
        });
        if (genreRows.length > 0) {
          const genreTracks = await this.saavn.getRecommendationsByGenres(
            genreRows.map((g: any) => g.genre),
            20
          );
          if (genreTracks.length > 0) {
            return { tracks: await this.populateLikes(genreTracks, userId), personalized: true };
          }
        }

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
              return { tracks: await this.populateLikes(tracks, userId), personalized: true };
            }
          }
        }
      } catch (err) {
        console.error('Failed to compile listening-based recommendations:', err);
      }
    }

    const tracks = preferredLanguages.length > 0
      ? await this.saavn.getTrendingTracks(preferredLanguages)
      : await this.saavn.getRecommendedTracks();
    return { tracks: await this.populateLikes(tracks, userId), personalized: preferredLanguages.length > 0 };
  }

  public static async getRecommendations(
    languages: string[],
    artists: string[],
    userId?: string,
    limit = 20
  ): Promise<any[]> {
    const preferredLanguages = await this.getPreferredLanguages(userId, languages);
    const tracks = await this.saavn.getRecommendations(preferredLanguages, artists, limit);
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
    // JioSaavn occasionally resolves a valid-looking id to a blank/malformed
    // catalog entry (empty title/artist, an unrelated placeholder track)
    // instead of a genuine 404 — treat that the same as not-found rather
    // than handing the frontend a "successful" response with garbage data.
    if (!album || (!album.id && !album.title && !album.artist?.name)) {
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
      return; // already not liked — idempotent no-op
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

  public static async getMoodPlaylists(mood: string, userId?: string): Promise<any[]> {
    if (userId) {
      try {
        const [topGenre, preferredLanguages] = await Promise.all([
          prisma.genreAffinity.findFirst({ where: { userId }, orderBy: { score: 'desc' } }),
          this.getPreferredLanguages(userId),
        ]);
        // Playlist search results don't carry per-track language metadata to
        // strictly filter against, so a language preference biases the query
        // (like genre already does) rather than hard-filtering the results.
        const biasTerms = [preferredLanguages[0], topGenre?.genre].filter(Boolean) as string[];
        if (biasTerms.length > 0) {
          const biased = await this.saavn.getMoodPlaylists(`${biasTerms.join(' ')} ${mood}`);
          if (biased.length > 0) return biased;
        }
      } catch (error) {
        logger.error('Failed to bias mood playlists by preference — falling back to unbiased mood search:', error);
      }
    }
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
