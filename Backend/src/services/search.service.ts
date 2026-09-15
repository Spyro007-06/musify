import { SaavnService } from './saavn.service';
import { MusicService } from './music.service';
import { prisma } from '@config/database';

export class SearchService {
  private static saavn = SaavnService.getInstance();

  public static async search(query: string, userId?: string): Promise<any> {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }

    if (userId) {
      // Fire-and-log: don't let history logging fail the actual search request.
      prisma.searchHistory.create({ data: { userId, query: query.trim() } }).catch((err) => {
        console.error('Failed to log search history:', err);
      });
    }

    // --- Intent Parsing ---

    // 1. Personal Library Intent
    if (lowerQuery.includes('songs i liked') || lowerQuery.includes('my favorite') || lowerQuery.includes('liked songs')) {
      if (userId) {
        let dateFilter = undefined;
        const now = new Date();
        
        if (lowerQuery.includes('last month')) {
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (lowerQuery.includes('last week') || lowerQuery.includes('recently')) {
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const likedTracks = await prisma.likedTrack.findMany({
          where: { 
            userId,
            ...(dateFilter && { createdAt: { gte: dateFilter } })
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        });

        if (likedTracks.length > 0) {
          const trackIds = likedTracks.map(t => t.spotifyTrackId);
          let tracks = await this.saavn.getTracks(trackIds);
          tracks = await MusicService.populateLikes(tracks, userId);
          return { tracks, albums: [], artists: [], playlists: [] };
        }
      }
    }

    // 2. Similarity Intent
    const similarMatch = lowerQuery.match(/(?:songs|music) (?:similar to|like) (.+)/);
    if (similarMatch && similarMatch[1]) {
      const target = similarMatch[1].trim();
      const searchRes = await this.saavn.search(target);
      if (searchRes.tracks && searchRes.tracks.length > 0) {
        const topTrack = searchRes.tracks[0];
        // We'll simulate fetching similar tracks by fetching the artist's top tracks
        let similarTracks = [];
        if (topTrack.artists && topTrack.artists.length > 0) {
          similarTracks = await this.saavn.getArtistTopTracks(topTrack.artists[0].id);
        }
        if (similarTracks.length === 0) {
          // Fallback to thematic search
          const thematic = await this.saavn.search(`${target} soundtrack`);
          similarTracks = thematic.tracks || [];
        }
        
        similarTracks = await MusicService.populateLikes(similarTracks, userId);
        return { tracks: similarTracks, albums: searchRes.albums || [], artists: searchRes.artists || [], playlists: [] };
      }
    }

    // 3. Vibe / Genre Intent
    const vibeMatch = lowerQuery.match(/(.+?) (?:songs|music|tracks)/);
    if (vibeMatch && vibeMatch[1] && !lowerQuery.includes('similar')) {
      const vibe = vibeMatch[1].trim(); // e.g. "happy tamil", "soft piano"
      const vibeRes = await this.saavn.getRecommendationsByGenres([vibe], 20);
      if (vibeRes && vibeRes.length > 0) {
        const populatedTracks = await MusicService.populateLikes(vibeRes, userId);
        return { tracks: populatedTracks, albums: [], artists: [], playlists: [] };
      }
      // If genre recommendation fails, it naturally falls through to standard search below
    }

    // 4. Standard Keyword / Fallback Intent
    const result = await this.saavn.search(query);
    
    if (result.tracks && result.tracks.length > 0) {
      result.tracks = await MusicService.populateLikes(result.tracks, userId);
    }
    
    return result;
  }

  public static async getSuggestions(query: string): Promise<string[]> {
    return this.saavn.getSuggestions(query);
  }
}
