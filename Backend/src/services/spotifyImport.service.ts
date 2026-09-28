import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { ApiError } from '@utils/ApiError';
import { uniqueSlug } from '@utils/slugify';
import { logger } from '@utils/logger';

interface SpotifyTrack {
  title: string;
  artist: string;
  durationSec: number;
}

const SEARCH_DELAY_MS = 150;
const CONCURRENCY = 4;

/** Drops tags JioSaavn titles don't carry: "(feat. X)", "- Remastered 2011", "[Bonus Track]", "(Deluxe Edition)". */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([][^)\]]*\b(feat\.?|ft\.?|with|remaster(ed)?|bonus track|deluxe)\b[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+[^-]*\bremaster(ed)?\b.*$/i, '')
    .trim();
}

/**
 * Reads a public playlist from Spotify's embed page, which ships its data as
 * server-rendered JSON — no API keys or login. Only the playlist id is taken
 * from the user's input, so this can't be pointed at any other host.
 * ponytail: the embed lists at most 100 tracks; beyond that needs the Web API.
 */
async function fetchSpotifyPlaylist(url: string) {
  const id = url.match(/playlist[/:]([A-Za-z0-9]{22})/)?.[1];
  if (!id) throw ApiError.badRequest('That is not a Spotify playlist link.');

  const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) throw ApiError.notFound('Spotify playlist not found. Is it public?');
  if (!res.ok) throw ApiError.internal(`Spotify returned ${res.status}.`);

  const json = (await res.text()).match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
  const entity = json ? JSON.parse(json).props?.pageProps?.state?.data?.entity : null;
  if (!entity?.trackList) throw ApiError.internal('Could not read that Spotify playlist.');

  return {
    title: String(entity.name || entity.title || 'Imported playlist').slice(0, 100),
    coverUrl: entity.coverArt?.sources?.[0]?.url || null,
    tracks: entity.trackList.map((t: any): SpotifyTrack => ({
      title: t.title,
      artist: String(t.subtitle || '').split(',')[0].trim(),
      durationSec: Math.round((t.duration || 0) / 1000),
    })),
  };
}

export class SpotifyImportService {
  private static saavn = SaavnService.getInstance();

  public static async importPlaylist(userId: string, url: string) {
    const source = await fetchSpotifyPlaylist(url);

    // A few workers, each pausing between searches, so a 100-track import
    // doesn't hammer JioSaavn. Results keep the Spotify order.
    const results: (any | null)[] = new Array(source.tracks.length).fill(null);
    let next = 0;
    const worker = async () => {
      while (next < source.tracks.length) {
        const i = next++;
        const t = source.tracks[i];
        try {
          results[i] = await this.saavn.findSongByDuration(`${cleanTitle(t.title)} ${t.artist}`, t.durationSec, t.artist);
        } catch (err) {
          logger.warn(`Spotify import: search failed for "${t.title}"`, err);
        }
        await new Promise((r) => setTimeout(r, SEARCH_DELAY_MS));
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const matched: { title: string; artist: string; trackId: string }[] = [];
    const unmatched: { title: string; artist: string }[] = [];
    source.tracks.forEach((t: SpotifyTrack, i: number) => {
      if (results[i]) matched.push({ title: t.title, artist: t.artist, trackId: results[i].id });
      else unmatched.push({ title: t.title, artist: t.artist });
    });

    // Two Spotify tracks can resolve to the same JioSaavn song; the table allows it once.
    const trackIds = [...new Set(matched.map((m) => m.trackId))];
    if (trackIds.length === 0) throw ApiError.unprocessable('None of those songs could be found on JioSaavn.');
    // Staggered addedAt keeps the Spotify order (playlists are read ordered by it).
    const base = Date.now();
    const playlist = await prisma.playlist.create({
      data: {
        title: source.title,
        slug: uniqueSlug(source.title),
        description: 'Imported from Spotify.',
        coverUrl: source.coverUrl,
        ownerId: userId,
        tracks: { create: trackIds.map((id, i) => ({ spotifyTrackId: id, addedAt: new Date(base + i) })) },
      },
    });

    return {
      playlist: { id: playlist.id, title: playlist.title, cover: playlist.coverUrl, tracksCount: trackIds.length },
      total: source.tracks.length,
      matched,
      unmatched,
    };
  }
}
