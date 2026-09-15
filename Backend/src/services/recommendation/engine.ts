import { prisma } from '@config/database';
import { SaavnService } from '@services/saavn.service';
import { logger } from '@utils/logger';
import {
  aggregateEventScores,
  applyExplicitOverride,
  scorePlayEvent,
  scoreSkipEvent,
} from './implicitFeedback';
import {
  buildItemRaters,
  recommendForUser,
  type ItemRaters,
  type RatingMatrix,
} from './collaborativeFiltering';
import { collaborativeWeight, contentBasedScore, type AffinityMaps } from './contentBased';

const CANDIDATE_POOL_SIZE = 500; // ponytail: fixed global candidate cap; paginate/shard by popularity if this becomes a bottleneck
const TRACK_FETCH_CHUNK_SIZE = 50;
const TOP_N_PER_USER = 60;
const CONCURRENCY = 5;

const pairKey = (userId: string, trackId: string): string => `${userId}::${trackId}`;

interface RawSignals {
  listening: { userId: string; spotifyTrackId: string; completedSong: boolean; listenPercentage: number | null; numberOfReplays: number }[];
  skips: { userId: string; spotifyTrackId: string; skipTime: number }[];
  likes: { userId: string; spotifyTrackId: string }[];
  dislikes: { userId: string; spotifyTrackId: string }[];
}

async function fetchRawSignals(): Promise<RawSignals> {
  const [listening, skips, likes, dislikes] = await Promise.all([
    prisma.listeningHistory.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20000,
      select: { userId: true, spotifyTrackId: true, completedSong: true, listenPercentage: true, numberOfReplays: true },
    }),
    prisma.skippedSongs.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20000,
      select: { userId: true, spotifyTrackId: true, skipTime: true },
    }),
    prisma.likedTrack.findMany({ select: { userId: true, spotifyTrackId: true } }),
    prisma.dislikedSong.findMany({ select: { userId: true, spotifyTrackId: true } }),
  ]);
  return { listening, skips, likes, dislikes };
}

/** Build the global (userId -> trackId -> rating) matrix from raw event tables. */
export function buildRatingMatrix(signals: RawSignals): RatingMatrix {
  const eventScoresByPair = new Map<string, number[]>();

  for (const ev of signals.listening) {
    const key = pairKey(ev.userId, ev.spotifyTrackId);
    const list = eventScoresByPair.get(key) ?? [];
    list.push(scorePlayEvent(ev));
    eventScoresByPair.set(key, list);
  }
  for (const ev of signals.skips) {
    const key = pairKey(ev.userId, ev.spotifyTrackId);
    const list = eventScoresByPair.get(key) ?? [];
    list.push(scoreSkipEvent({ skipTime: ev.skipTime }));
    eventScoresByPair.set(key, list);
  }

  const likedSet = new Set(signals.likes.map((l) => pairKey(l.userId, l.spotifyTrackId)));
  const dislikedSet = new Set(signals.dislikes.map((d) => pairKey(d.userId, d.spotifyTrackId)));

  const allKeys = new Set<string>([...eventScoresByPair.keys(), ...likedSet, ...dislikedSet]);
  const matrix: RatingMatrix = new Map();

  for (const key of allKeys) {
    const sep = key.indexOf('::');
    const userId = key.slice(0, sep);
    const trackId = key.slice(sep + 2);

    const implicit = aggregateEventScores(eventScoresByPair.get(key) ?? []);
    const rating = applyExplicitOverride(implicit, {
      liked: likedSet.has(key),
      disliked: dislikedSet.has(key),
    });

    if (!matrix.has(userId)) matrix.set(userId, new Map());
    matrix.get(userId)!.set(trackId, rating);
  }

  return matrix;
}

/** Rank every track that appears in the matrix by how many users rated it, cap to the pool size. */
function selectCandidateUniverse(itemRaters: ItemRaters, poolSize: number): string[] {
  return Array.from(itemRaters.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, poolSize)
    .map(([trackId]) => trackId);
}

async function fetchTrackMetadata(trackIds: string[]): Promise<Map<string, { genre?: string; artists?: { id: string; name: string }[] }>> {
  const saavn = SaavnService.getInstance();
  const metadata = new Map<string, { genre?: string; artists?: { id: string; name: string }[] }>();

  for (let i = 0; i < trackIds.length; i += TRACK_FETCH_CHUNK_SIZE) {
    const chunk = trackIds.slice(i, i + TRACK_FETCH_CHUNK_SIZE);
    const tracks = await saavn.getTracks(chunk);
    tracks.forEach((t) => {
      if (t) metadata.set(t.id, { genre: t.genre, artists: t.artists });
    });
  }

  return metadata;
}

async function fetchAffinityMaps(userIds: string[]): Promise<Map<string, AffinityMaps>> {
  const [genreRows, artistRows] = await Promise.all([
    prisma.genreAffinity.findMany({ where: { userId: { in: userIds } } }),
    prisma.artistAffinity.findMany({ where: { userId: { in: userIds } } }),
  ]);

  const result = new Map<string, AffinityMaps>();
  const ensure = (userId: string): AffinityMaps => {
    if (!result.has(userId)) result.set(userId, { genreAffinity: new Map(), artistAffinity: new Map() });
    return result.get(userId)!;
  };

  genreRows.forEach((g) => ensure(g.userId).genreAffinity.set(g.genre.toLowerCase(), g.score));
  artistRows.forEach((a) => ensure(a.userId).artistAffinity.set(a.spotifyArtistId, a.score));

  return result;
}

async function inChunks<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export interface RecomputeSummary {
  usersProcessed: number;
  candidatePoolSize: number;
}

/**
 * The cron entrypoint: recompute blended CF + content-based scores for every
 * user who has at least one rating, and persist the top N to
 * RecommendationScores. Invalidates each user's dashboard cache so the next
 * request picks up fresh sections.
 */
export async function recomputeAllUserScores(): Promise<RecomputeSummary> {
  const signals = await fetchRawSignals();
  const matrix = buildRatingMatrix(signals);
  const itemRaters = buildItemRaters(matrix);

  const candidateTrackIds = selectCandidateUniverse(itemRaters, CANDIDATE_POOL_SIZE);
  const trackMetadata = await fetchTrackMetadata(candidateTrackIds);

  const userIds = Array.from(matrix.keys());
  const affinityByUser = await fetchAffinityMaps(userIds);

  let usersProcessed = 0;

  await inChunks(userIds, CONCURRENCY, async (userId) => {
    try {
      const userRatings = matrix.get(userId)!;
      const cfResults = recommendForUser(matrix, itemRaters, userId, candidateTrackIds);
      const affinities = affinityByUser.get(userId) ?? { genreAffinity: new Map(), artistAffinity: new Map() };
      const cfWeightBase = collaborativeWeight(userRatings.size);

      const blended = cfResults.map((cf) => {
        const meta = trackMetadata.get(cf.trackId);
        const contentScore = meta ? contentBasedScore(meta, affinities) : 0;
        const cfNormalized = (cf.score + 1) / 2; // [-1,1] -> [0,1]
        const cfWeight = cfWeightBase * cf.confidence;
        const finalScore = cfWeight * cfNormalized + (1 - cfWeight) * contentScore;

        const reason =
          cfWeight > 0.5
            ? 'Listeners with similar taste also liked this'
            : contentScore > 0
              ? 'Matches your favorite genres and artists'
              : 'Popular among Musify listeners';

        return { trackId: cf.trackId, score: finalScore, reason };
      });

      const topN = blended.sort((a, b) => b.score - a.score).slice(0, TOP_N_PER_USER);

      await prisma.$transaction([
        prisma.recommendationScores.deleteMany({ where: { userId } }),
        ...(topN.length > 0
          ? [
              prisma.recommendationScores.createMany({
                data: topN.map((t) => ({ userId, spotifyTrackId: t.trackId, score: t.score, reason: t.reason })),
              }),
            ]
          : []),
        prisma.recommendationCache.deleteMany({ where: { userId } }),
      ]);

      usersProcessed += 1;
    } catch (err) {
      logger.error(`Recommendation recompute failed for user ${userId}:`, err);
    }
  });

  return { usersProcessed, candidatePoolSize: candidateTrackIds.length };
}

export interface PrecomputedScore {
  spotifyTrackId: string;
  score: number;
  reason: string | null;
}

/** Read a user's precomputed top-N scores (request-time — no heavy computation here). */
export async function getPrecomputedScores(userId: string, limit = TOP_N_PER_USER): Promise<PrecomputedScore[]> {
  const rows = await prisma.recommendationScores.findMany({
    where: { userId },
    orderBy: { score: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({ spotifyTrackId: r.spotifyTrackId, score: r.score, reason: r.reason }));
}

export { CANDIDATE_POOL_SIZE, TOP_N_PER_USER };
