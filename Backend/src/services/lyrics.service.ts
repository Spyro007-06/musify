import { SaavnService } from './saavn.service';
import { unescapeHtml } from '@utils/unescapeHtml';
import { cleanTitle } from './spotifyImport.service';
import { JIOSAAVN_API } from '@utils/saavnProxy';
import { withCache } from '@utils/cache';
import { logger } from '@utils/logger';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';

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
}
