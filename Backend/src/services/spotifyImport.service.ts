import { prisma } from '@config/database';
import { env } from '@config/env';
import { SaavnService } from './saavn.service';
import { PlaylistService } from './playlist.service';
import { ApiError } from '@utils/ApiError';
import { uniqueSlug } from '@utils/slugify';
import { logger } from '@utils/logger';
import { callGeminiJson } from '@utils/gemini';
import { HTTP_STATUS } from '@constants/httpCodes';
import { LinkTrack, readPlaylistLink } from './playlistLinks';
import { ERROR_MESSAGES } from '@constants/messages';

/** A song to find on JioSaavn. Screenshots carry no duration. */
export interface SourceTrack {
  title: string;
  artist: string;
  durationSec?: number;
}

const SEARCH_DELAY_MS = 150;
const CONCURRENCY = 4;
/** What Spotify's playlist embed lists at most; a full page means there may be more. */
const EMBED_TRACK_LIMIT = 100;

/**
 * Drops tags JioSaavn titles don't carry: "(feat. X)", "- Remastered 2011", "[Bonus Track]",
 * "(Deluxe Edition)", and a film song's ' - From "Movie"' (which JioSaavn, if at all, keeps in brackets).
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([][^)\]]*\b(feat\.?|ft\.?|with|remaster(ed)?|bonus track|deluxe)\b[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+[^-]*\bremaster(ed)?\b.*$/i, '')
    // Even cut off: 'Naanga Naalu Peru - From "Kar…'.
    .replace(/(\s+-\s+|\s*\()from\b.*$/i, '')
    .trim();
}

/** Every Spotify track id in pasted text (Spotify's "Copy" puts one link per song). */
export function parseSpotifyTrackIds(text: string): string[] {
  return [...new Set([...text.matchAll(/track[/:]([A-Za-z0-9]{22})/g)].map((m) => m[1]))];
}

/**
 * Runs fn over items with a few workers, each pausing between calls, so a
 * big import doesn't hammer Spotify or JioSaavn. Results keep input order;
 * a failed call leaves null.
 */
async function pooled<T, R>(items: T[], fn: (item: T) => Promise<R | null>): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        logger.warn('Playlist import: lookup failed', err);
      }
      await new Promise((r) => setTimeout(r, SEARCH_DELAY_MS));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

/**
 * Reads the data Spotify's public embed page ships as server-rendered JSON —
 * no API keys or login. Callers pass only a validated id, so this can't be
 * pointed at any other host. Null when Spotify has no such item.
 */
async function readSpotifyEmbed(path: string): Promise<any | null> {
  const res = await fetch(`https://open.spotify.com/embed/${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw ApiError.internal(`Spotify returned ${res.status}.`);
  const json = (await res.text()).match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
  return (json && JSON.parse(json).props?.pageProps?.state?.data?.entity) || null;
}

/**
 * ponytail: the playlist embed lists at most 100 tracks. The rest come in
 * through importSongs (pasted track links, or screenshots) — Spotify's Web
 * API only returns tracks of playlists the signed-in user owns since 2026.
 */
async function fetchSpotifyPlaylist(url: string) {
  const id = url.match(/playlist[/:]([A-Za-z0-9]{22})/)?.[1];
  if (!id) throw ApiError.badRequest('That is not a Spotify playlist link.');

  const entity = await readSpotifyEmbed(`playlist/${id}`);
  if (!entity) throw ApiError.notFound('Spotify playlist not found. Is it public?');
  if (!entity.trackList) throw ApiError.internal('Could not read that Spotify playlist.');

  return {
    title: String(entity.name || entity.title || 'Imported playlist').slice(0, 100),
    coverUrl: entity.coverArt?.sources?.[0]?.url || null,
    tracks: entity.trackList.map((t: any): SourceTrack & { spotifyId: string } => ({
      spotifyId: String(t.uri || '').split(':').pop() || '',
      title: t.title,
      artist: String(t.subtitle || '').split(',')[0].trim(),
      durationSec: Math.round((t.duration || 0) / 1000),
    })),
  };
}

/** Any supported app's playlist link: Spotify's read here, the rest by playlistLinks. */
async function fetchLinkedPlaylist(url: string) {
  const trimmed = url.trim();
  let parsed: URL | null = null;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Not a URL: maybe a spotify:playlist: URI.
  }
  if (trimmed.startsWith('spotify:') || (parsed && /(^|\.)spotify\.com$/i.test(parsed.hostname))) {
    return { source: 'Spotify', missing: 0, ...(await fetchSpotifyPlaylist(trimmed)) };
  }
  if (!parsed) throw ApiError.badRequest('Paste a playlist link, like https://music.youtube.com/playlist?list=…');
  return readPlaylistLink(parsed);
}

async function fetchSpotifyTrack(id: string): Promise<SourceTrack | null> {
  const e = await readSpotifyEmbed(`track/${id}`);
  if (!e?.title) return null;
  return {
    title: e.title,
    artist: e.artists?.[0]?.name || '',
    durationSec: Math.round((e.duration || 0) / 1000),
  };
}

const SCREENSHOT_PROMPT =
  'These are screenshots of a music playlist or song list, from any app, in order (they may overlap). ' +
  'List every song visible in them, top to bottom, with its title and main artist exactly as shown. Skip anything that is not a song ' +
  'row of the list itself: headers, buttons, ads, the now-playing bar, rows cut off at the top or bottom ' +
  'edge, and suggestions shown below the list (such as "Recommended Songs" or "You might also like"). ' +
  'If a row shows no artist, use an empty string. Write titles and artists in Latin letters, transliterating ' +
  'any other script, the way JioSaavn spells them.';

export class SpotifyImportService {
  private static saavn = SaavnService.getInstance();

  /** Finds each song on JioSaavn; null where there's no confident match. */
  public static matchOnSaavn(tracks: LinkTrack[]) {
    return pooled(tracks, async (t) => {
      if (t.saavnId) return { id: t.saavnId }; // a JioSaavn link: already in our catalog
      const title = cleanTitle(t.title);
      return this.saavn.findSongByDuration(
        `${title.replace(/…$/, '')} ${t.artist}`.trim(),
        t.durationSec ?? 0,
        t.looseArtist ? undefined : t.artist,
        title
      );
    });
  }

  private static splitMatches(tracks: SourceTrack[], results: (any | null)[]) {
    const matched: { title: string; artist: string; trackId: string }[] = [];
    const unmatched: { title: string; artist: string }[] = [];
    tracks.forEach((t, i) => {
      if (results[i]) matched.push({ title: t.title, artist: t.artist, trackId: results[i].id });
      else unmatched.push({ title: t.title, artist: t.artist });
    });
    return { matched, unmatched };
  }

  /** The user's own playlist, or a 404/403 — checked before any slow lookups. */
  private static async ownPlaylist(userId: string, playlistId: string) {
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
    if (playlist.ownerId !== userId) throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    return playlist;
  }

  /** Appends after the playlist's last song; ones already in it are skipped. Returns how many were added. */
  private static async appendTracks(playlistId: string, trackIds: string[]): Promise<number> {
    const start = await PlaylistService.nextPosition(playlistId);
    const { count } = await prisma.playlistTrack.createMany({
      data: trackIds.map((trackId, i) => ({ playlistId, trackId, position: start + i })),
      skipDuplicates: true,
    });
    return count;
  }

  /** A new playlist from a playlist link (any supported app) — or, with intoPlaylistId, its songs added to one of the user's own. */
  public static async importPlaylist(userId: string, url: string, intoPlaylistId?: string) {
    const target = intoPlaylistId ? await this.ownPlaylist(userId, intoPlaylistId) : null;
    const source = await fetchLinkedPlaylist(url);
    const { matched, unmatched } = this.splitMatches(source.tracks, await this.matchOnSaavn(source.tracks));

    // Two Spotify tracks can resolve to the same JioSaavn song; the table allows it once.
    const trackIds = [...new Set(matched.map((m) => m.trackId))];
    if (trackIds.length === 0) throw ApiError.unprocessable('None of those songs could be found in our catalog.');
    const playlist =
      target ??
      (await prisma.playlist.create({
        data: {
          title: source.title,
          slug: uniqueSlug(source.title),
          description: `Imported from ${source.source}.`,
          coverUrl: source.coverUrl,
          ownerId: userId,
          tracks: { create: trackIds.map((id, i) => ({ trackId: id, position: i })) },
        },
      }));
    const added = target ? await this.appendTracks(target.id, trackIds) : trackIds.length;

    return {
      playlist: { id: playlist.id, title: playlist.title, cover: playlist.coverUrl, tracksCount: trackIds.length },
      added,
      total: source.tracks.length,
      matched,
      unmatched,
      // Lets the client skip these when the user pastes the full track list.
      spotifyIds: source.tracks.map((t: { spotifyId?: string }) => t.spotifyId).filter(Boolean),
      // Spotify's embed stops at 100: the rest can be pasted as track links.
      mayHaveMore: source.source === 'Spotify' && source.tracks.length >= EMBED_TRACK_LIMIT,
      source: source.source,
      /** Other apps: songs the link didn't give (more than 100, or unavailable); screenshots can add them. */
      missing: source.missing,
    };
  }

  /**
   * Appends one batch of songs to the user's playlist: Spotify track ids
   * (looked up on their public pages) and/or plain title + artist pairs
   * (from screenshots). Kept to small batches so each request stays short;
   * the client sends the next batch when this one returns.
   */
  public static async importSongs(userId: string, playlistId: string, spotifyIds: string[], songs: SourceTrack[]) {
    await this.ownPlaylist(userId, playlistId);

    const fromSpotify = await pooled(spotifyIds, fetchSpotifyTrack);
    const lost = spotifyIds.filter((_, i) => !fromSpotify[i]).map((id) => ({ title: `Spotify track ${id}`, artist: '' }));
    const tracks = [...fromSpotify.filter((t): t is SourceTrack => t !== null), ...songs];
    const { matched, unmatched } = this.splitMatches(tracks, await this.matchOnSaavn(tracks));

    // Ones already in the playlist (e.g. from the first 100) are skipped.
    const added = await this.appendTracks(playlistId, [...new Set(matched.map((m) => m.trackId))]);

    return { added, matched, unmatched: [...lost, ...unmatched] };
  }

  /** Reads the song list off a few screenshots (in order) with one Gemini call. */
  public static async readScreenshots(images: { mimeType: string; data: string }[]): Promise<SourceTrack[]> {
    if (!env.GEMINI_API_KEY) {
      // 501, not 503: 503 means "busy, retry soon" to the client.
      throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Screenshot import is not set up yet (GEMINI_API_KEY is missing).');
    }

    const parts = [{ text: SCREENSHOT_PROMPT }, ...images.map((i) => ({ inline_data: { mime_type: i.mimeType, data: i.data } }))];
    const result = await callGeminiJson(parts, {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, artist: { type: 'STRING' } },
        required: ['title', 'artist'],
      },
    });
    // Every model rate-limited or overloaded: almost always the free tier's
    // per-minute quota (429). 503 tells the client to wait and retry.
    if (!('text' in result) && result.busy) {
      throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'The screenshot reader is busy right now. Please try again in a minute.');
    }
    if (!('text' in result)) throw new ApiError(HTTP_STATUS.BAD_GATEWAY, 'Could not read that screenshot right now. Please try again.');
    return parseScreenshotSongs(result.text);
  }
}

/**
 * Gemini's JSON reply → clean song rows (drops blanks, trims, caps lengths).
 * JioSaavn's search finds nothing for a half word, and apps cut long text
 * off mid-word, so: keeps only the first artist ("A, B, Har…"), and drops
 * the cut-off word of a title, keeping "…" to say it goes on ("Verappa
 * (Urumum Venga) - Fe…" → "Verappa (Urumum Venga)…", see findSongByDuration).
 * Also drops Spotify's "Video •" before a music video's artist.
 */
export function parseScreenshotSongs(text: unknown): SourceTrack[] {
  let rows: unknown;
  try {
    rows = JSON.parse(String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
  } catch {
    throw new ApiError(HTTP_STATUS.BAD_GATEWAY, 'Could not read that screenshot. Try a clearer one.');
  }
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: any) => {
      const title = String(r?.title ?? '').trim();
      const uncut = title.replace(/[\s([\-–:,]*\S*(\.{3}|…)$/, '…');
      return {
        title: (uncut === '…' ? title : uncut).slice(0, 200),
        artist: String(r?.artist ?? '')
          .replace(/^\s*video\s*[•·\-–]\s*/i, '')
          .split(',')[0]
          .replace(/(\.{3}|…)$/, '')
          .trim()
          .slice(0, 200),
      };
    })
    .filter((r) => r.title);
}
