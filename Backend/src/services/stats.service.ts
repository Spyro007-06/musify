import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { MusicService } from './music.service';
import { withCache } from '@utils/cache';
import { logger } from '@utils/logger';

const TOP_N = 5;
/** The same song "finished" twice within this long, with the same listening time, is one play reported twice (two open tabs, say). */
const DUPLICATE_MS = 30_000;
const CATALOG_BATCH = 100;

export interface ListeningStats {
  month: string; // YYYY-MM
  minutesListened: number;
  plays: number;
  skips: number;
  uniqueTracks: number;
  uniqueArtists: number;
  topTracks: { track: any; plays: number }[];
  topArtists: { id: string; name: string; image: string | null; plays: number }[];
  topLanguages: { name: string; plays: number }[];
}

/**
 * [start, end) of a "YYYY-MM" month in the listener's time zone, given as
 * minutes east of UTC (India: 330). In UTC, a play at 1 a.m. IST on the 1st
 * would count toward the month before.
 */
export function monthRange(month: string, tzOffsetMinutes = 0): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const shift = tzOffsetMinutes * 60_000;
  return { start: new Date(Date.UTC(y, m - 1, 1) - shift), end: new Date(Date.UTC(y, m, 1) - shift) };
}

export const currentMonth = (tzOffsetMinutes = 0) => new Date(Date.now() + tzOffsetMinutes * 60_000).toISOString().slice(0, 7);

/** Drops rows repeating an earlier one: same song, same listening time, within DUPLICATE_MS. Rows in time order. */
export function withoutDuplicates<T extends { trackId: string; timestamp: Date }>(rows: T[], seconds: (row: T) => number): T[] {
  const kept = new Map<string, { at: number; seconds: number }>();
  return rows.filter((row) => {
    const at = row.timestamp.getTime();
    const prev = kept.get(row.trackId);
    if (prev && at - prev.at < DUPLICATE_MS && prev.seconds === seconds(row)) return false;
    kept.set(row.trackId, { at, seconds: seconds(row) });
    return true;
  });
}

/** Ids ranked by how often they appear, ties broken by first appearance. */
function rank(ids: (string | null)[]): { id: string; plays: number }[] {
  const counts = new Map<string, number>();
  for (const id of ids) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, plays]) => ({ id, plays })).sort((a, b) => b.plays - a.plays);
}

export class StatsService {
  /**
   * A month of listening: completed plays (history rows with completedSong)
   * plus time spent before skipping. Skips also leave a history row, but
   * without a duration or artist, so they're counted from SkippedSongs.
   */
  public static async getMonthlyStats(userId: string, month?: string, tzOffsetMinutes = 0): Promise<ListeningStats> {
    const thisMonth = currentMonth(tzOffsetMinutes);
    month ??= thisMonth;
    // A finished month never changes; the current one is cached briefly.
    const stats = await withCache(
      `stats:v2:${userId}:${month}:${tzOffsetMinutes}`,
      month < thisMonth ? 30 * 24 * 3600 : 10 * 60,
      () => this.compute(userId, month, tzOffsetMinutes)
    );
    // Like state changes independently of the month, so it's applied after the cache.
    const liked = await MusicService.populateLikes(stats.topTracks.map((t) => t.track), userId);
    return { ...stats, topTracks: stats.topTracks.map((t, i) => ({ ...t, track: liked[i] })) };
  }

  private static async compute(userId: string, month: string, tzOffsetMinutes: number): Promise<ListeningStats> {
    const { start, end } = monthRange(month, tzOffsetMinutes);
    const timestamp = { gte: start, lt: end };

    const [playRows, skipRows] = await Promise.all([
      prisma.listeningHistory.findMany({
        where: { userId, timestamp, completedSong: true },
        select: { trackId: true, artistId: true, genre: true, sessionDuration: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.skippedSongs.findMany({
        where: { userId, timestamp },
        select: { trackId: true, skipTime: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      }),
    ]);
    const plays = withoutDuplicates(playRows, (p) => p.sessionDuration ?? 0);
    const skips = withoutDuplicates(skipRows, (s) => s.skipTime);

    const seconds =
      plays.reduce((sum, p) => sum + (p.sessionDuration ?? 0), 0) + skips.reduce((sum, s) => sum + s.skipTime, 0);
    const trackRank = rank(plays.map((p) => p.trackId));
    const languageRank = rank(plays.map((p) => p.genre?.toLowerCase() ?? null));

    // Every song played this month, for who sings it (see mapTrack's
    // performers): history rows only keep the first-listed artist, often
    // the composer or lyricist. Cached, in batches.
    const saavn = SaavnService.getInstance();
    const ids = trackRank.map((t) => t.id);
    const batches = await Promise.all(
      Array.from({ length: Math.ceil(ids.length / CATALOG_BATCH) }, (_, i) =>
        saavn.getTracksCached(ids.slice(i * CATALOG_BATCH, (i + 1) * CATALOG_BATCH))
      )
    );
    const byId = new Map<string, any>(batches.flat().map((t: any) => [t.id, t]));
    const artistRank = rank(
      plays.flatMap((p) => {
        const credited: { id: string }[] | undefined = byId.get(p.trackId)?.performers ?? byId.get(p.trackId)?.artists;
        return credited?.length ? credited.map((a) => a.id) : [p.artistId];
      }).filter((id) => id !== 'unknown-artist')
    );

    const topTrackIds = trackRank.slice(0, TOP_N);
    const artists = await Promise.all(
      artistRank.slice(0, TOP_N).map(async ({ id, plays: count }) => {
        try {
          const artist = await saavn.getArtist(id);
          return artist ? { id, name: artist.name as string, image: (artist.image as string) ?? null, plays: count } : null;
        } catch (err) {
          logger.warn(`Stats: couldn't load artist ${id}:`, err);
          return null;
        }
      })
    );

    return {
      month,
      minutesListened: Math.round(seconds / 60),
      plays: plays.length,
      skips: skips.length,
      uniqueTracks: trackRank.length,
      uniqueArtists: artistRank.length,
      topTracks: topTrackIds.filter((t) => byId.has(t.id)).map((t) => ({ track: byId.get(t.id), plays: t.plays })),
      topArtists: artists.filter((a): a is NonNullable<typeof a> => a !== null),
      topLanguages: languageRank.slice(0, TOP_N).map((l) => ({ name: l.id, plays: l.plays })),
    };
  }
}
