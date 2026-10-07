import { SaavnService } from './saavn.service';
import { unescapeHtml } from '@utils/unescapeHtml';
import { cleanTitle } from './spotifyImport.service';
import { JIOSAAVN_API } from '@utils/saavnProxy';
import { withCache } from '@utils/cache';
import { logger } from '@utils/logger';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { HTTP_STATUS } from '@constants/httpCodes';
import { env } from '@config/env';
import { callGeminiJson } from '@utils/gemini';

/** `time` is seconds into the song; null when the lyrics aren't time-synced. */
export interface LyricLine {
  time: number | null;
  text: string;
}

export interface Lyrics {
  synced: boolean;
  instrumental: boolean;
  lines: LyricLine[];
}

interface LrclibRecord {
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const LRCLIB_API = 'https://lrclib.net/api';
// LRCLIB asks clients to identify themselves.
const LRCLIB_HEADERS = { 'User-Agent': 'Musify (https://github.com/Spyro007-06/musify)' };
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TIMEOUT_MS = 8000;
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // lyrics don't change
/** A song's translation is made once and kept: one Gemini call per song, not per listener. */
const TRANSLATION_TTL_SECONDS = 180 * 24 * 60 * 60;
const FIND_TTL_SECONDS = 30 * 24 * 60 * 60;

/** One lyric line in Latin letters and in plain English. */
export interface TranslatedLine {
  latin: string;
  meaning: string;
}

/** "[01:02.34] words" → { time: 62.34, text: 'words' }; unstamped lines are dropped. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (m) lines.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return lines;
}

const plainLines = (text: string): LyricLine[] =>
  text.trim().split(/\r?\n/).map((line) => ({ time: null, text: line.trim() }));

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch (err) {
    logger.warn(`Lyrics lookup failed for ${url.split('?')[0]}:`, err);
    return null;
  }
}

const letters = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Searches by title, keeping only records within 3s of our duration and
 * credited to one of our artists (the catalog often lists the composer first,
 * so an exact title + first-artist lookup misses). Synced lyrics preferred.
 */
async function fromLrclib(title: string, artists: string[], duration: number): Promise<LrclibRecord | null> {
  const wanted = artists.map(letters).filter(Boolean);
  const searches: Record<string, string>[] = [{ track_name: title }, { q: `${title} ${artists.join(' ')}`.trim() }];
  for (const params of searches) {
    const results = await getJson<LrclibRecord[]>(`${LRCLIB_API}/search?${new URLSearchParams(params)}`, LRCLIB_HEADERS);
    const close = (results ?? []).filter(
      (r) =>
        Math.abs((r.duration ?? 0) - duration) <= 3 &&
        (wanted.length === 0 || wanted.some((a) => letters(r.artistName ?? '').includes(a)))
    );
    const best = close.find((r) => r.syncedLyrics) ?? close.find((r) => r.plainLyrics) ?? close[0];
    if (best) return best;
  }
  return null;
}

/** The catalog's own (plain, untimed) lyrics, routed through the relay like every other catalog call. */
async function fromCatalog(trackId: string): Promise<string | null> {
  const params = new URLSearchParams({
    __call: 'lyrics.getLyrics',
    ctx: 'web6dot0',
    api_version: '4',
    _format: 'json',
    _marker: '0',
    lyrics_id: trackId,
  });
  const json = await getJson<{ lyrics?: string }>(`${JIOSAAVN_API}?${params}`, { 'User-Agent': BROWSER_UA });
  const lyrics = typeof json?.lyrics === 'string' ? json.lyrics : '';
  return lyrics ? unescapeHtml(lyrics.replace(/<br\s*\/?>/gi, '\n')) : null;
}

/** Short hash of the lyrics: a translation belongs to the exact lines it was made from. */
function hashLines(lines: LyricLine[]): string {
  let h = 5381;
  for (const ch of lines.map((l) => l.text).join('\n')) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

/** A Gemini JSON reply, or the error the client should see (503 = busy, try again soon). */
async function askGemini(prompt: string, schema: unknown, what: string): Promise<any> {
  if (!env.GEMINI_API_KEY) throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, `${what} is not set up yet (GEMINI_API_KEY is missing).`);
  const result = await callGeminiJson([{ text: prompt }], schema);
  if (!('text' in result)) {
    throw result.busy
      ? new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'The lyrics helper is busy right now. Try again in a minute.')
      : new ApiError(HTTP_STATUS.BAD_GATEWAY, `${what} isn't available right now. Please try again.`);
  }
  try {
    return JSON.parse(result.text);
  } catch {
    throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `${what} isn't available right now. Please try again.`);
  }
}

const TRANSLATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    lines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { n: { type: 'INTEGER' }, latin: { type: 'STRING' }, meaning: { type: 'STRING' } },
        required: ['n', 'latin', 'meaning'],
      },
    },
  },
  required: ['lines'],
};

/**
 * Every line in Latin letters and in plain English, in one Gemini call.
 * Lines go out numbered and come back matched by number, so a skipped or
 * merged line can't shift every meaning below it onto the wrong line.
 */
export async function translateLines(song: string, lines: string[]): Promise<TranslatedLine[]> {
  const numbered = lines.map((text, i) => ({ n: i + 1, text })).filter((l) => l.text.trim());
  if (numbered.length === 0) return lines.map(() => ({ latin: '', meaning: '' }));
  const reply = await askGemini(
    `These are the numbered lyric lines of ${song}. For each line give "latin": the line in Latin letters, ` +
      'romanized the way Indian fans type it (unchanged if it already is), and "meaning": what the line means in ' +
      'natural, simple English (a faithful translation of that line, not a summary; unchanged if it is already English). ' +
      'Answer every line with its number "n".\n' +
      JSON.stringify(numbered),
    TRANSLATION_SCHEMA,
    'Lyrics translation'
  );
  const byNumber = new Map<number, TranslatedLine>();
  for (const l of Array.isArray(reply?.lines) ? reply.lines : []) {
    if (Number.isInteger(l?.n)) byNumber.set(l.n, { latin: String(l.latin ?? ''), meaning: String(l.meaning ?? '') });
  }
  return lines.map((_, i) => byNumber.get(i + 1) ?? { latin: '', meaning: '' });
}

const FIND_SCHEMA = {
  type: 'OBJECT',
  properties: {
    songs: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, artist: { type: 'STRING' } }, required: ['title', 'artist'] },
    },
  },
  required: ['songs'],
};

export class LyricsService {
  /** Time-synced lyrics when LRCLIB has them, else plain lyrics from the catalog or LRCLIB. */
  public static async getLyrics(trackId: string): Promise<Lyrics> {
    return withCache(`lyrics:v1:${trackId}`, CACHE_TTL_SECONDS, async () => {
      const track = await SaavnService.getInstance().getTrack(trackId);
      if (!track) throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_FOUND);

      const artists: string[] = (track.artists ?? []).map((a: { name: string }) => a.name);
      const lrclib = await fromLrclib(cleanTitle(track.title), artists, track.duration);
      const synced = lrclib?.syncedLyrics ? parseLrc(lrclib.syncedLyrics) : [];
      if (synced.length > 0) return { synced: true, instrumental: false, lines: synced };

      const plain = (track.hasLyrics !== false && (await fromCatalog(trackId))) || lrclib?.plainLyrics;
      if (plain) return { synced: false, instrumental: false, lines: plainLines(plain) };

      return { synced: false, instrumental: lrclib?.instrumental === true, lines: [] };
    });
  }

  /** The song's lyrics, line by line, in Latin letters and in English (kept, see TRANSLATION_TTL_SECONDS). */
  public static async getTranslation(trackId: string): Promise<{ lines: TranslatedLine[] }> {
    const lyrics = await this.getLyrics(trackId);
    if (lyrics.lines.length === 0) throw ApiError.notFound('This song has no lyrics to translate.');
    return withCache(`lyrics-translation:v1:${trackId}:${hashLines(lyrics.lines)}`, TRANSLATION_TTL_SECONDS, async () => {
      const track = await SaavnService.getInstance().getTrack(trackId);
      const artists = (track?.artists ?? []).map((a: { name: string }) => a.name).join(', ');
      const song = `the ${track?.genre ? `${track.genre} ` : ''}song "${track?.title ?? ''}"${artists ? ` by ${artists}` : ''}`;
      return { lines: await translateLines(song, lyrics.lines.map((l) => l.text)) };
    });
  }

  /**
   * Songs a remembered line is likely from ("tum hi ho ab tum hi ho"): Gemini
   * names up to 3, the catalog finds them. Typos, partial lines and Indian
   * languages typed in Latin letters are fine.
   */
  public static async findByLyrics(line: string): Promise<any[]> {
    const q = line.trim().replace(/\s+/g, ' ').slice(0, 200);
    return withCache(`lyrics-find:v1:${q.toLowerCase()}`, FIND_TTL_SECONDS, async () => {
      const reply = await askGemini(
        `Which songs have these lyrics? They may be misspelled or partial, and a song in Hindi, Tamil, Telugu, Punjabi ` +
          `or another language may be typed in Latin letters: ${JSON.stringify(q)}. List up to 3 likely songs, most likely ` +
          'first, with the title and main singer as commonly known. Return an empty list if you do not recognize them.',
        FIND_SCHEMA,
        'Lyrics search'
      );
      const saavn = SaavnService.getInstance();
      const songs: { title: string; artist: string }[] = (Array.isArray(reply?.songs) ? reply.songs : []).slice(0, 3);
      const found = await Promise.all(
        songs.map((s) => {
          const title = cleanTitle(String(s.title ?? ''));
          // The artist only steers the search: the model may name a composer or a different singer.
          return title ? saavn.findSongByDuration(`${title} ${s.artist ?? ''}`.trim(), 0, undefined, title).catch(() => null) : null;
        })
      );
      const seen = new Set<string>();
      return found.filter((t): t is any => Boolean(t) && !seen.has(t.id) && Boolean(seen.add(t.id)));
    });
  }
}
