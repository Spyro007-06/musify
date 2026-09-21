import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { ArtistService } from './artist.service';
import { RecommendationService } from './recommendation.service';
import { MusicService } from './music.service';
import slugify from 'slugify';

// Genre/language keywords already scattered across the catalog: the
// language set matches SaavnService's own switch-cases (getTrendingTracks,
// getNewReleases, getRecommendations), the rest are the genre substrings
// recommendation.service.ts already checks for (pop, dance, jazz, lofi,
// acoustic). Not a new taxonomy — a consolidation of what's already used.
const GENRE_KEYWORDS = [
  'hindi', 'punjabi', 'tamil', 'telugu', 'english', 'spanish', 'korean', 'bollywood',
  'pop', 'rock', 'hip hop', 'hip-hop', 'hiphop', 'rap', 'edm', 'electronic', 'dance', 'classical',
  'r&b', 'rnb', 'indie', 'metal', 'country', 'reggae', 'blues', 'folk', 'techno',
  'ambient', 'k-pop', 'kpop', 'jazz', 'lofi', 'lo-fi', 'acoustic', 'synthwave',
];

// Longest-first: e.g. "k-pop"/"kpop" contain "pop" as a literal substring, so
// checking GENRE_KEYWORDS in its declared order would match the generic
// "pop" first and silently downgrade a K-pop request to a plain pop search.
// Matching the longest (most specific) keyword instead fixes that in
// general, not just for this one pair — self-maintaining as the list grows.
const GENRE_KEYWORDS_BY_SPECIFICITY = [...GENRE_KEYWORDS].sort((a, b) => b.length - a.length);

// /api/music/mood/:mood has no fixed category list of its own (it passes
// the mood straight through to a JioSaavn playlist search), so the closest
// existing mood taxonomy is the energetic/chill genre-keyword split
// recommendation.service.ts already uses for time-of-day matching. Reused
// here rather than inventing a third vocabulary, extended with the
// synonyms the prompt is actually likely to contain.
// Order matters: the first bucket whose keyword appears wins (see
// parsePromptIntent below), and "party" is checked before "energetic" on
// purpose — a prompt like "upbeat songs for a wedding party" contains a
// generic energy word ("upbeat") alongside a specific occasion word
// ("party"/"wedding"); the specific one should win so the cover actually
// matches, not a coincidentally-earlier generic synonym.
// Within a bucket, order matters for the *search query* (not just cover
// selection, see parsePromptIntent's moodKeyword): "energetic"/"upbeat"/
// "hype" are generic adjectives that plenty of unrelated tracks (kids'
// background music, ambient loops) happen to have literally in their
// title, so a JioSaavn search for the literal word "energetic" mostly
// surfaces those instead of workout music. "workout"/"gym"/"pump" are
// specific enough to reliably return actual workout tracks, so they're
// listed first and preferred when the prompt contains both.
const MOOD_KEYWORDS: Record<'party' | 'energetic' | 'chill', string[]> = {
  // Split out from "energetic" — a gym-themed cover doesn't fit "party",
  // "wedding", or "dance", which are their own recognizable vibe.
  party: ['party', 'dance', 'club', 'wedding', 'celebration', 'clubbing'],
  energetic: ['workout', 'gym', 'pump', 'energetic', 'upbeat', 'hype'],
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
  mood?: 'energetic' | 'party' | 'chill';
  // The literal keyword from MOOD_KEYWORDS[mood] that matched the prompt —
  // used as the actual search query instead of the bucket label, since
  // e.g. "workout" is a far more specific JioSaavn search term than the
  // generic "energetic" (see MOOD_KEYWORDS' ordering comment).
  moodKeyword?: string;
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

  const genreMatch = GENRE_KEYWORDS_BY_SPECIFICITY.find((g) => lower.includes(g));
  if (genreMatch) intent.genre = genreMatch;

  for (const mood of Object.keys(MOOD_KEYWORDS) as (keyof typeof MOOD_KEYWORDS)[]) {
    const matchedKeyword = MOOD_KEYWORDS[mood].find((kw) => lower.includes(kw));
    if (matchedKeyword) {
      intent.mood = mood;
      intent.moodKeyword = matchedKeyword;
      break;
    }
  }

  return intent;
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
const MOOD_COVERS: Record<'energetic' | 'party' | 'chill', string> = {
  energetic: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80',
  party: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=500&q=80',
  chill: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&q=80',
};

const MAX_PLAYLIST_TRACKS = 30;
const AI_RECOMMENDATIONS_LIMIT = 20;

// Real songs run roughly 1-10 minutes. Anything shorter is likely a jingle/
// intro stub; anything longer (audiobook chapters, hour-long devotional/
// kirtan recordings, DJ mixes) is catalog noise that doesn't belong in a
// "party"/"workout" playlist just because it matched a genre/mood keyword.
const MIN_TRACK_SECONDS = 30;
const MAX_TRACK_SECONDS = 20 * 60;
const isReasonableTrackLength = (t: any) =>
  typeof t.duration !== 'number' || (t.duration >= MIN_TRACK_SECONDS && t.duration <= MAX_TRACK_SECONDS);

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
      }

      // Not "else if": a prompt can name both an artist and a genre/mood
      // ("party songs like Imagine Dragons"), and the artist lookup above
      // can legitimately come back empty (misspelled name, an artist
      // JioSaavn just doesn't have, a name that also happens to match one
      // of the ARTIST_PATTERNS regexes without actually being an artist).
      // Previously that always fell straight through to the "couldn't find
      // anything" response even when the same prompt had a perfectly good
      // genre/mood/era to fall back on — the intent was there, just unused.
      if (tracks.length === 0 && (intent.genre || intent.mood || intent.era)) {
        // Genre/mood/era — same search-query infrastructure the old
        // heuristic used (getRecommendationsByGenres wraps searchSongs).
        const queryParts = [intent.genre, intent.moodKeyword, intent.era?.label].filter(Boolean) as string[];
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

      // Deduplicate, drop duration outliers, cap — and, if the user has a
      // saved language preference, strictly hold the playlist to it too
      // (only when that doesn't wipe out every candidate — a genre/artist
      // match beats an empty playlist over a language mismatch on every
      // single track JioSaavn happened to return).
      const uniqueTracks = Array.from(new Map(tracks.map((t) => [t.id, t])).values());
      const preferredLanguages = await MusicService.getPreferredLanguages(userId);
      let languageScopedTracks = uniqueTracks;
      if (preferredLanguages.length > 0) {
        const lower = preferredLanguages.map((l) => l.toLowerCase());
        const languageMatched = uniqueTracks.filter((t) => {
          const trackLang = (t.genre || '').toLowerCase();
          return !trackLang || lower.some((l) => trackLang.includes(l) || l.includes(trackLang));
        });
        if (languageMatched.length > 0) languageScopedTracks = languageMatched;
      }
      const finalTracks = languageScopedTracks.filter(isReasonableTrackLength).slice(0, MAX_PLAYLIST_TRACKS);

      // A deliberately chosen mood/artist cover (set above) actually
      // represents the playlist's theme — a single matched track's album
      // art doesn't, since it's whatever that one song's cover happens to
      // be (a genre/mood search can easily surface an off-vibe track, e.g.
      // a dark trap single for an "upbeat wedding party" prompt). Only fall
      // back to track artwork when we have no contextual cover at all
      // (a bare genre with no mood, where the alternative is the fully
      // generic default).
      if (coverUrl === DEFAULT_COVER && finalTracks[0]?.artwork) {
        coverUrl = finalTracks[0].artwork;
      }

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
