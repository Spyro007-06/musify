import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { MusicService } from './music.service';
import { withCache } from '@utils/cache';
import { logger } from '@utils/logger';

const TOP_N = 5;

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

/** UTC [start, end) of a "YYYY-MM" month. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);

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
  public static async getMonthlyStats(userId: string, month = currentMonth()): Promise<ListeningStats> {
    const isPast = month < currentMonth();
    // A finished month never changes; the current one is cached briefly.
    const stats = await withCache(`stats:v1:${userId}:${month}`, isPast ? 30 * 24 * 3600 : 10 * 60, () =>
      this.compute(userId, month)
    );
    // Like state changes independently of the month, so it's applied after the cache.
    const liked = await MusicService.populateLikes(stats.topTracks.map((t) => t.track), userId);
    return { ...stats, topTracks: stats.topTracks.map((t, i) => ({ ...t, track: liked[i] })) };
  }

  private static async compute(userId: string, month: string): Promise<ListeningStats> {
    const { start, end } = monthRange(month);
    const timestamp = { gte: start, lt: end };

    const [plays, skips] = await Promise.all([
      prisma.listeningHistory.findMany({
        where: { userId, timestamp, completedSong: true },
        select: { trackId: true, artistId: true, genre: true, sessionDuration: true },
      }),
      prisma.skippedSongs.findMany({ where: { userId, timestamp }, select: { skipTime: true } }),
    ]);

    const seconds =
      plays.reduce((sum, p) => sum + (p.sessionDuration ?? 0), 0) + skips.reduce((sum, s) => sum + s.skipTime, 0);
    const trackRank = rank(plays.map((p) => p.trackId));
    const artistRank = rank(plays.map((p) => p.artistId));
    const languageRank = rank(plays.map((p) => p.genre?.toLowerCase() ?? null));

    const saavn = SaavnService.getInstance();
    const topTrackIds = trackRank.slice(0, TOP_N);
    const [tracks, artists] = await Promise.all([
      topTrackIds.length > 0 ? saavn.getTracks(topTrackIds.map((t) => t.id)) : Promise.resolve([]),
      Promise.all(
        artistRank.slice(0, TOP_N).map(async ({ id, plays: count }) => {
          try {
            const artist = await saavn.getArtist(id);
            return artist ? { id, name: artist.name as string, image: (artist.image as string) ?? null, plays: count } : null;
          } catch (err) {
            logger.warn(`Stats: couldn't load artist ${id}:`, err);
            return null;
          }
        })
      ),
    ]);

    const byId = new Map(tracks.map((t: any) => [t.id, t]));

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
