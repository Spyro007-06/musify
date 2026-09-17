import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@config/database';
import { env } from '@config/env';
import { SaavnService } from './saavn.service';
import { ArtistService } from './artist.service';
import { RecommendationService } from './recommendation.service';
import { resilientCall } from '@utils/resilience';
import { ClaudeUpstreamError } from '@utils/ClaudeUpstreamError';
import slugify from 'slugify';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_BREAKER = 'claude-lyrics-analysis';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ClaudeUpstreamError('ANTHROPIC_API_KEY is not configured — lyrics analysis is unavailable.');
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export interface LyricsAnalysis {
  mood: string;
  meaning: string;
  trivia: string;
}

function parseLyricsAnalysis(raw: string): LyricsAnalysis {
  let parsed: unknown;
  try {
    // Claude sometimes wraps JSON in a code fence despite instructions not to.
    const jsonText = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new ClaudeUpstreamError('Claude returned a non-JSON or malformed response.', err);
  }

  const candidate = parsed as Partial<LyricsAnalysis> | null;
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    typeof candidate.mood !== 'string' ||
    typeof candidate.meaning !== 'string' ||
    typeof candidate.trivia !== 'string'
  ) {
    throw new ClaudeUpstreamError('Claude response was missing the expected mood/meaning/trivia fields.');
  }

  return { mood: candidate.mood, meaning: candidate.meaning, trivia: candidate.trivia };
}

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
const AI_RECOMMENDATIONS_LIMIT = 20;

export class AIService {
  /**
   * Delegates to RecommendationService's real item-based CF + content-based
   * scoring engine (the same one powering /recommendations/songs) rather
   * than running a second, separate recommendation system here — that
   * would be pure duplication of already-tested, cron-refreshed logic.
   * The only thing this method adds is shaping the response into the
   * lightweight {spotifyTrackId, score, reason} contract this endpoint's
   * callers expect (frontend resolves each id to a full track), and an
   * optional mood-based genre bias (reusing the existing MOOD_KEYWORDS
   * map already defined above, not a new taxonomy).
   */
  static async getRecommendations(userId: string, mood?: string) {
    try {
      const normalizedMood = mood?.toLowerCase().trim();
      const moodMatch = normalizedMood
        ? (Object.keys(MOOD_KEYWORDS) as (keyof typeof MOOD_KEYWORDS)[]).find(
            (m) => m === normalizedMood || MOOD_KEYWORDS[m].includes(normalizedMood)
          )
        : undefined;
      const genreKeywords = moodMatch ? MOOD_KEYWORDS[moodMatch] : undefined;

      return await RecommendationService.getRecommendedSongsWithScores(
        userId,
        AI_RECOMMENDATIONS_LIMIT,
        genreKeywords
      );
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate AI recommendations');
    }
  }

  /**
   * Analyzes lyrics to provide semantic meaning and mood via a real Claude
   * call. `lyrics` is real text supplied directly by the caller (the
   * frontend's lyrics-analyzer UI has the user paste/provide it) — this
   * method never fetches or fabricates lyrics content itself, and never
   * falls back to a mocked result on failure; a genuine upstream failure
   * surfaces as ClaudeUpstreamError (mapped to 503 by errorHandler), same
   * discipline as SaavnUpstreamError for the catalog dependency.
   */
  static async analyzeLyrics(_trackId: string, lyrics: string): Promise<LyricsAnalysis> {
    const client = getAnthropicClient();

    const response = await resilientCall(CLAUDE_BREAKER, () =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Analyze the following song lyrics and respond with ONLY a JSON object (no markdown formatting, no code fences, no text before or after) with exactly these three string fields:
- "mood": a short (2-5 word) description of the song's overall mood/tone
- "meaning": a 1-3 sentence interpretation of what the lyrics are about
- "trivia": one interesting observation about the lyrics' style, structure, wordplay, or themes. Base this only on the text itself — do not invent specific factual claims about the real artist, album, or release history, since you were not given that information.

Lyrics:
"""
${lyrics}
"""`,
          },
        ],
      })
    ).catch((error: unknown) => {
      throw new ClaudeUpstreamError('Claude lyrics analysis request failed.', error);
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ClaudeUpstreamError('Claude response contained no text content.');
    }

    return parseLyricsAnalysis(textBlock.text);
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
