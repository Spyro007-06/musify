/**
 * Sanity-check for the collaborative-filtering core: hold out a slice of
 * each active user's positively-rated tracks, recompute recommendations as
 * if those ratings didn't exist, and measure how often the held-out tracks
 * come back as recommendations.
 *
 * This deliberately evaluates the CF component in isolation (no content
 * blending) — a system that's only "restating preferences" (pure
 * genre/artist matching) wouldn't be expected to recover a specific held-out
 * *track* from other users' behavior, so a hit-rate meaningfully above
 * chance is evidence the model is actually learning cross-user patterns.
 *
 * Usage: npm run recommendations:evaluate [-- --topK=20 --minRatings=6]
 */
import { prisma } from '@config/database';
import { disconnectDatabase } from '@config/database';
import { buildRatingMatrix } from '@services/recommendation/engine';
import { buildItemRaters, recommendForUser, type ItemRaters, type RatingMatrix } from '@services/recommendation/collaborativeFiltering';

const args = process.argv.slice(2);
const getArg = (name: string, fallback: number): number => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? Number(found.split('=')[1]) : fallback;
};

const TOP_K = getArg('topK', 20);
const MIN_RATINGS = getArg('minRatings', 6);
const HOLDOUT_FRACTION = 0.2;
const POSITIVE_THRESHOLD = 0.3;
const CANDIDATE_POOL_SIZE = 500;

function cloneMatrixWithoutTracks(matrix: RatingMatrix, userId: string, heldOutTrackIds: string[]): RatingMatrix {
  const clone: RatingMatrix = new Map(matrix); // shares inner maps by reference
  const originalUserMap = matrix.get(userId)!;
  const trimmedUserMap = new Map(originalUserMap);
  heldOutTrackIds.forEach((id) => trimmedUserMap.delete(id));
  clone.set(userId, trimmedUserMap);
  return clone;
}

function cloneItemRatersWithoutUser(itemRaters: ItemRaters, userId: string, trackIds: string[]): ItemRaters {
  const clone: ItemRaters = new Map(itemRaters);
  trackIds.forEach((trackId) => {
    const raters = itemRaters.get(trackId);
    if (!raters) return;
    const trimmed = new Map(raters);
    trimmed.delete(userId);
    clone.set(trackId, trimmed);
  });
  return clone;
}

function selectCandidateUniverse(itemRaters: ItemRaters, poolSize: number): string[] {
  return Array.from(itemRaters.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, poolSize)
    .map(([trackId]) => trackId);
}

async function main() {
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

  const fullMatrix = buildRatingMatrix({ listening, skips, likes, dislikes });
  const fullItemRaters = buildItemRaters(fullMatrix);

  let usersEvaluated = 0;
  let totalHits = 0;
  let totalHeldOut = 0;
  let usersWithAtLeastOneHit = 0;

  for (const [userId, ratings] of fullMatrix) {
    const positiveTracks = Array.from(ratings.entries())
      .filter(([, rating]) => rating > POSITIVE_THRESHOLD)
      .map(([trackId]) => trackId)
      .sort(); // deterministic ordering

    if (positiveTracks.length < MIN_RATINGS) continue;

    const holdoutCount = Math.max(1, Math.floor(positiveTracks.length * HOLDOUT_FRACTION));
    const heldOut = positiveTracks.slice(0, holdoutCount);
    const heldOutSet = new Set(heldOut);

    const trainMatrix = cloneMatrixWithoutTracks(fullMatrix, userId, heldOut);
    const trainItemRaters = cloneItemRatersWithoutUser(fullItemRaters, userId, heldOut);

    const candidatePool = new Set(selectCandidateUniverse(trainItemRaters, CANDIDATE_POOL_SIZE));
    heldOut.forEach((id) => candidatePool.add(id)); // guarantee held-out tracks are recommendable

    const recommendations = recommendForUser(trainMatrix, trainItemRaters, userId, candidatePool).slice(0, TOP_K);
    const hits = recommendations.filter((r) => heldOutSet.has(r.trackId)).length;

    usersEvaluated += 1;
    totalHits += hits;
    totalHeldOut += heldOut.length;
    if (hits > 0) usersWithAtLeastOneHit += 1;
  }

  console.log('--- Recommendation evaluation (item-based CF, leave-out test) ---');
  console.log(`Users evaluated (>= ${MIN_RATINGS} positive ratings): ${usersEvaluated}`);
  if (usersEvaluated === 0) {
    console.log('Not enough rating history yet to evaluate. Generate some listening/like activity first.');
    return;
  }
  const precisionAtK = totalHits / (usersEvaluated * TOP_K);
  const recall = totalHits / totalHeldOut;
  const hitRate = usersWithAtLeastOneHit / usersEvaluated;
  console.log(`Precision@${TOP_K}: ${(precisionAtK * 100).toFixed(2)}%`);
  console.log(`Recall (held-out tracks recovered): ${(recall * 100).toFixed(2)}%`);
  console.log(`Hit-rate (users with >=1 held-out track recovered): ${(hitRate * 100).toFixed(2)}%`);
  console.log(`(Chance baseline for hit-rate ~= ${TOP_K} / candidate pool size, typically well under 5%.)`);
}

main()
  .catch((err) => {
    console.error('Evaluation failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
