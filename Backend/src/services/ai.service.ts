import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { ArtistService } from './artist.service';
import slugify from 'slugify';

// Genre/language keywords already scattered across the catalog: the
// language set matches SaavnService's own switch-cases (getTrendingTracks,
// getNewReleases, getRecommendations), the rest are the genre substrings
// recommendation.service.ts already checks for (pop, dance, jazz, lofi,
// acoustic). Not a new taxonomy — a consolidation of what's already used.
const GENRE_KEYWORDS = [
  'hindi', 'punjabi', 'tamil', 'telugu', 'english', 'spanish', 'korean', 'bollywood',
  'pop', 'rock', 'hip hop', 'hip-hop', 'rap', 'edm', 'electronic', 'dance', 'classical',
  'r&b', 'rnb', 'indie', 'metal', 'country', 'reggae', 'blues', 'folk', 'techno',
  'ambient', 'k-pop', 'kpop', 'jazz', 'lofi', 'lo-fi', 'acoustic', 'synthwave',
];

// /api/music/mood/:mood has no fixed category list of its own (it passes
// the mood straight through to a JioSaavn playlist search), so the closest
// existing mood taxonomy is the energetic/chill genre-keyword split
// recommendation.service.ts already uses for time-of-day matching. Reused
// here rather than inventing a third vocabulary, extended with the
// synonyms the prompt is actually likely to contain.
const MOOD_KEYWORDS: Record<'energetic' | 'chill', string[]> = {
  energetic: ['energetic', 'upbeat', 'hype', 'workout', 'gym', 'pump', 'party', 'dance', 'club'],
  chill: ['chill', 'relax', 'calm', 'mellow', 'lofi', 'lo-fi', 'acoustic', 'rainy', 'study', 'focus', 'coding'],
};

const ARTIST_PATTERNS = [
  /(?:songs?|music|tracks?)\s+like\s+([a-z0-9][a-z0-9\s.&'-]{1,40})/i,
  /similar\s+to\s+([a-z0-9][a-z0-9\s.&'-]{1,40})/i,
  /in\s+the\s+style\s+of\s+([a-z0-9][a-z0-9\s.&'-]{1,40})/i,
  /sounds?\s+like\s+([a-z0-9][a-z0-9\s.&'-]{1,40})/i,
];

export interface ParsedPromptIntent {
  artistCandidate?: string;
  genre?: string;
  mood?: 'energetic' | 'chill';
  era?: { label: string; from: number; to: number };
}

/**
 * Rule-based prompt parser — keyword/regex matching only, no LLM. Returns
 * {} when nothing in the prompt matches anything recognizable; that's a
 * legitimate empty-intent result, not an error.
 */
export function parsePromptIntent(prompt: string): ParsedPromptIntent {
  const lower = prompt.toLowerCase();
  const intent: ParsedPromptIntent = {};

  for (const pattern of ARTIST_PATTERNS) {
    const match = lower.match(pattern);
    if (match?.[1]) {
      intent.artistCandidate = match[1].trim().replace(/[.,!?]+$/, '');
      break;
    }
  }

  const eraMatch = lower.match(/\b(?:(19|20)(\d)0s|(\d)0s)\b/);
  if (eraMatch) {
    let startYear: number;
    if (eraMatch[1]) {
      startYear = Number(`${eraMatch[1]}${eraMatch[2]}0`);
    } else {
      // Two-digit shorthand ("90s", "00s"): 0-2 reads as 20XX, 3-9 as 19XX.
      const digit = Number(eraMatch[3]);
      startYear = digit <= 2 ? 2000 + digit * 10 : 1900 + digit * 10;
    }
    intent.era = { label: eraMatch[0], from: startYear, to: startYear + 9 };
  }

  const genreMatch = GENRE_KEYWORDS.find((g) => lower.includes(g));
  if (genreMatch) intent.genre = genreMatch;

  for (const mood of Object.keys(MOOD_KEYWORDS) as (keyof typeof MOOD_KEYWORDS)[]) {
    if (MOOD_KEYWORDS[mood].some((kw) => lower.includes(kw))) {
      intent.mood = mood;
      break;
    }
  }

  return intent;
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
const MOOD_COVERS: Record<'energetic' | 'chill', string> = {
  energetic: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80',
  chill: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&q=80',
};

const MAX_PLAYLIST_TRACKS = 30;

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
   * Parses the prompt with rule-based keyword/regex matching (no LLM — see
   * parsePromptIntent) and routes the result into the existing catalog and
   * artist infrastructure to assemble a playlist.
   */
  static async generatePlaylistFromPrompt(userId: string, prompt: string, playlistName?: string) {
    try {
      const saavn = SaavnService.getInstance();
      const intent = parsePromptIntent(prompt);

      let tracks: any[] = [];
      let coverUrl = DEFAULT_COVER;

      if (intent.artistCandidate) {
        // "songs like X" — resolve X against the catalog the same way
        // ArtistService.getRecommendedArtists already resolves preferred
        // artist names, then reuse its related-artists/top-tracks logic.
        const searchRes = await saavn.search(intent.artistCandidate);
        const seedArtist = searchRes.artists?.[0];
        if (seedArtist) {
          coverUrl = seedArtist.image || DEFAULT_COVER;
          const [seedTopTracks, relatedArtists] = await Promise.all([
            ArtistService.getArtistTopTracks(seedArtist.id),
            ArtistService.getRelatedArtists(seedArtist.id),
          ]);
          tracks.push(...seedTopTracks);

          const relatedTopTracks = await Promise.all(
            relatedArtists.slice(0, 3).map((a: any) => ArtistService.getArtistTopTracks(a.id).catch(() => []))
          );
          relatedTopTracks.forEach((t) => tracks.push(...t));
        }
      } else if (intent.genre || intent.mood || intent.era) {
        // Genre/mood/era — same search-query infrastructure the old
        // heuristic used (getRecommendationsByGenres wraps searchSongs).
        const queryParts = [intent.genre, intent.mood, intent.era?.label].filter(Boolean) as string[];
        tracks = await saavn.getRecommendationsByGenres(queryParts, MAX_PLAYLIST_TRACKS);

        if (intent.era) {
          const { from, to } = intent.era;
          const eraFiltered = tracks.filter((t) => {
            const year = t.album?.releaseYear;
            return year === undefined || (year >= from && year <= to);
          });
          // Only apply the filter if it didn't wipe out everything — release
          // years are missing on plenty of real catalog entries.
          if (eraFiltered.length > 0) tracks = eraFiltered;
        }

        if (intent.mood) coverUrl = MOOD_COVERS[intent.mood];
      }
      // else: parser found nothing usable — fall through with tracks: [],
      // which resolves to the no-match response below rather than hitting
      // the catalog with a raw-text search.

      // Deduplicate and cap.
      const uniqueTracks = Array.from(new Map(tracks.map((t) => [t.id, t])).values());
      const finalTracks = uniqueTracks.slice(0, MAX_PLAYLIST_TRACKS);

      if (finalTracks.length === 0) {
        return {
          playlistId: null,
          title: null,
          trackCount: 0,
          tracks: [],
          message: "Couldn't find anything matching that — try mentioning a genre, artist, or mood.",
        };
      }

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
