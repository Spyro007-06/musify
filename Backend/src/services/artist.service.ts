import { SaavnService } from './saavn.service';
import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';

export class ArtistService {
  private static saavn = SaavnService.getInstance();

  public static async getArtist(id: string, userId?: string): Promise<any> {
    const artist = await this.saavn.getArtist(id);
    if (!artist) {
      throw ApiError.notFound(ERROR_MESSAGES.ARTIST_NOT_FOUND);
    }

    let isFollowing = false;
    if (userId) {
      const follow = await prisma.artistAffinity.findUnique({
        where: {
          userId_spotifyArtistId: { userId, spotifyArtistId: id },
        },
      });
      isFollowing = !!follow && follow.isFollowed;
    }

    return {
      ...artist,
      isFollowing,
    };
  }

  public static async getArtistTopTracks(id: string, userId?: string): Promise<any[]> {
    const tracks = await this.saavn.getArtistTopTracks(id);
    
    if (userId && tracks.length > 0) {
      const trackIds = tracks.map(t => t.id);
      const likes = await prisma.likedTrack.findMany({
        where: {
          userId,
          spotifyTrackId: { in: trackIds },
        },
        select: { spotifyTrackId: true },
      });
      const likedIdsSet = new Set(likes.map(l => l.spotifyTrackId));
      return tracks.map(t => ({
        ...t,
        isLiked: likedIdsSet.has(t.id),
      }));
    }

    return tracks.map(t => ({ ...t, isLiked: false }));
  }

  public static async getArtistAlbums(id: string): Promise<any[]> {
    return this.saavn.getArtistAlbums(id);
  }

  public static async getRelatedArtists(id: string): Promise<any[]> {
    return this.saavn.getRelatedArtists(id);
  }

  public static async followArtist(userId: string, artistId: string): Promise<void> {
    const artist = await this.saavn.getArtist(artistId);
    if (!artist) {
      throw ApiError.notFound(ERROR_MESSAGES.ARTIST_NOT_FOUND);
    }

    const existingFollow = await prisma.artistAffinity.findUnique({
      where: {
        userId_spotifyArtistId: { userId, spotifyArtistId: artistId },
      },
    });

    if (existingFollow && existingFollow.isFollowed) {
      return;
    }

    await prisma.artistAffinity.upsert({
      where: {
        userId_spotifyArtistId: { userId, spotifyArtistId: artistId },
      },
      update: {
        isFollowed: true,
      },
      create: {
        userId,
        spotifyArtistId: artistId,
        isFollowed: true,
      }
    });
  }

  public static async getRecommendedArtists(preferredArtists: string[]): Promise<any[]> {
    if (preferredArtists.length > 0) {
      try {
        const recommendations: any[] = [];
        const seenIds = new Set<string>();
        // Ids of the artists we searched FROM — a "related artists" lookup can
        // legitimately include the queried artist itself; exclude those from
        // the output (same fix as RecommendationService.getRecommendedArtists).
        const seedIds = new Set<string>();

        const searchPromises = preferredArtists.slice(0, 3).map(async (artistName) => {
          try {
            const searchRes = await this.saavn.search(artistName);
            if (searchRes.artists && searchRes.artists.length > 0) {
              const mainArtist = searchRes.artists[0];
              seedIds.add(mainArtist.id);
              const related = await this.saavn.getRelatedArtists(mainArtist.id);
              return related;
            }
          } catch (e) {
            console.error(`Failed to get recommendations for artist ${artistName}:`, e);
          }
          return [];
        });

        const results = await Promise.all(searchPromises);
        results.forEach((relatedList) => {
          if (relatedList) {
            relatedList.forEach((artist) => {
              if (artist && !seenIds.has(artist.id) && !seedIds.has(artist.id)) {
                seenIds.add(artist.id);
                recommendations.push(artist);
              }
            });
          }
        });

        if (recommendations.length > 0) {
          return recommendations.slice(0, 10);
        }
      } catch (err) {
        console.error('Failed to resolve recommended artists via similar search:', err);
      }
    }

    if (preferredArtists.length > 0) {
      try {
        const searchPromises = preferredArtists.map(async (artistName) => {
          const searchRes = await this.saavn.search(artistName);
          if (searchRes.artists && searchRes.artists.length > 0) {
            return searchRes.artists[0];
          }
          return null;
        });
        const results = (await Promise.all(searchPromises)).filter(Boolean);
        if (results.length > 0) {
          return results;
        }
      } catch (err) {
        console.error('Failed to search preferred artists:', err);
      }
    }

    try {
      const defaultArtists = ['Anirudh Ravichander', 'A.R. Rahman', 'Sid Sriram', 'Shreya Ghoshal', 'Taylor Swift', 'Justin Bieber'];
      const searchPromises = defaultArtists.map(async (name) => {
        const searchRes = await this.saavn.search(name);
        return searchRes.artists?.[0] || null;
      });
      const results = (await Promise.all(searchPromises)).filter(Boolean);
      return results;
    } catch (err) {
      console.error('Failed to fetch default recommended artists:', err);
    }
    return [];
  }

  public static async unfollowArtist(userId: string, artistId: string): Promise<void> {
    const existingFollow = await prisma.artistAffinity.findUnique({
      where: {
        userId_spotifyArtistId: { userId, spotifyArtistId: artistId },
      },
    });

    if (!existingFollow || !existingFollow.isFollowed) {
      throw ApiError.notFound(ERROR_MESSAGES.NOT_FOLLOWING);
    }

    await prisma.artistAffinity.update({
      where: { id: existingFollow.id },
      data: { isFollowed: false }
    });
  }
}
