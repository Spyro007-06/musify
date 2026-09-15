import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import slugify from 'slugify';

export class AIService {
  /**
   * Generates dynamic recommendations based on user history and mood.
   */
  static async getRecommendations(_userId: string, _mood?: string) {
    try {
      // TODO: Fetch user history and call AI Model (e.g., Gemini / OpenAI) once implemented.
      // Mocking AI response for now
      const mockRecommendedTracks = [
        { spotifyTrackId: 'mock-1', score: 0.95, reason: 'Matches your vibe' },
        { spotifyTrackId: 'mock-2', score: 0.88, reason: 'Similar to recent plays' }
      ];

      return mockRecommendedTracks;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate AI recommendations');
    }
  }

  /**
   * Analyzes lyrics to provide semantic meaning and mood.
   */
  static async analyzeLyrics(_trackId: string, _lyrics: string) {
    try {
      // TODO: Call AI Model to summarize lyrics and determine mood
      return {
        mood: 'Upbeat / Motivational',
        meaning: 'This song is about overcoming challenges and finding inner strength.',
        trivia: 'The artist wrote this during their 2023 world tour.'
      };
    } catch (error) {
      console.error('Error analyzing lyrics:', error);
      throw new Error('Failed to analyze lyrics');
    }
  }

  /**
   * Semantic Vibe Engine: Generates a Playlist from a natural language prompt.
   */
  static async generatePlaylistFromPrompt(userId: string, prompt: string, playlistName?: string) {
    try {
      const saavn = SaavnService.getInstance();
      const lowerPrompt = prompt.toLowerCase();
      
      // 1. Semantic Heuristic Parser
      let searchQueries: string[] = [];
      let coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
      
      if (lowerPrompt.includes('workout') || lowerPrompt.includes('gym') || lowerPrompt.includes('pump')) {
        searchQueries = ['workout edm', 'gym motivation', 'high energy dance'];
        coverUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80';
      } else if (lowerPrompt.includes('coding') || lowerPrompt.includes('focus') || lowerPrompt.includes('study')) {
        searchQueries = ['lofi chill', 'coding beats', 'ambient focus'];
        coverUrl = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80';
      } else if (lowerPrompt.includes('rainy') || lowerPrompt.includes('evening') || lowerPrompt.includes('chill')) {
        searchQueries = ['acoustic relaxing', 'rainy day acoustic', 'chill evening'];
        coverUrl = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&q=80';
      } else if (lowerPrompt.includes('party') || lowerPrompt.includes('dance') || lowerPrompt.includes('club')) {
        searchQueries = ['party hits', 'club dance', 'pop party'];
        coverUrl = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80';
      } else if (lowerPrompt.includes('travel') || lowerPrompt.includes('road trip') || lowerPrompt.includes('drive')) {
        searchQueries = ['road trip classic', 'travel pop', 'driving songs'];
        coverUrl = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80';
      } else {
        // Fallback to raw prompt as query
        searchQueries = [prompt];
      }

      // 2. Fetch tracks using SaavnService
      // We'll use getRecommendationsByGenres which acts as a wrapper around searchSongs
      let tracks: any[] = [];
      const fetchPromises = searchQueries.map(q => saavn.getRecommendationsByGenres([q], 10));
      const results = await Promise.all(fetchPromises);
      
      results.forEach(res => {
        if (res && Array.isArray(res)) {
          tracks = [...tracks, ...res];
        }
      });

      // Deduplicate tracks by id
      const uniqueTracks = Array.from(new Map(tracks.map(t => [t.id, t])).values());
      
      // Limit to 30 tracks
      const finalTracks = uniqueTracks.slice(0, 30);

      if (finalTracks.length === 0) {
        return {
          playlistId: null,
          title: null,
          trackCount: 0,
          tracks: [],
          message: 'No tracks matched this prompt — try adjusting it.',
        };
      }

      // 3. Persist to Prisma
      const finalName = playlistName || `AI: ${prompt.charAt(0).toUpperCase() + prompt.slice(1)}`;
      
      const newPlaylist = await prisma.playlist.create({
        data: {
          title: finalName,
          slug: slugify(finalName, { lower: true, strict: true }) + '-' + Date.now(),
          description: `An intelligently generated playlist based on: "${prompt}"`,
          coverUrl,
          ownerId: userId,
          isPublic: false,
          tracks: {
            create: finalTracks.map((t) => ({
              spotifyTrackId: t.id, // Using the standard track ID format
            }))
          }
        },
        include: {
          tracks: true
        }
      });

      return {
        playlistId: newPlaylist.id,
        title: newPlaylist.title,
        trackCount: newPlaylist.tracks.length
      };
    } catch (error) {
      console.error('Error generating AI playlist:', error);
      throw new Error('Failed to generate AI playlist');
    }
  }
}
