/**
 * Item-based collaborative filtering over a sparse implicit rating matrix.
 *
 * We don't keep our own track catalog (tracks live in the external Saavn
 * API), so there's no fixed item universe to pre-factorize. Item-based CF
 * with cosine similarity works well for that: similarity between two tracks
 * is computed on demand from whichever users happen to have rated both, and
 * the "catalog" is simply every track that shows up in somebody's ratings.
 *
 * This is deliberately not matrix factorization (SVD/ALS) — at the scale a
 * single Postgres-backed app like this runs at, an O(raters) cosine
 * similarity per item pair is simple, dependency-free, and fast enough to
 * run from a cron job.
 * ponytail: full item-item matrix is recomputed per run with no incremental
 * update; if the catalog/user base grows past a few thousand active raters,
 * switch to precomputing + persisting item similarity instead of on-demand.
 */

export type RatingMatrix = Map<string, Map<string, number>>; // userId -> trackId -> rating [-1, 1]
export type ItemRaters = Map<string, Map<string, number>>; // trackId -> userId -> rating

export interface ScoredCandidate {
  trackId: string;
  score: number; // roughly [-1, 1]
  confidence: number; // 0..1, how much rated-neighbor overlap backed this score
}

/** Invert a user->track rating matrix into a track->user index for similarity lookups. */
export function buildItemRaters(matrix: RatingMatrix): ItemRaters {
  const itemRaters: ItemRaters = new Map();
  for (const [userId, trackRatings] of matrix) {
    for (const [trackId, rating] of trackRatings) {
      if (!itemRaters.has(trackId)) itemRaters.set(trackId, new Map());
      itemRaters.get(trackId)!.set(userId, rating);
    }
  }
  return itemRaters;
}

/** Cosine similarity between two tracks' rating vectors, restricted to users who rated both. */
export function itemSimilarity(ratersA: Map<string, number>, ratersB: Map<string, number>): number {
  const [smaller, larger] = ratersA.size <= ratersB.size ? [ratersA, ratersB] : [ratersB, ratersA];

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [userId, ratingSmall] of smaller) {
    normA += ratingSmall * ratingSmall;
    const ratingLarge = larger.get(userId);
    if (ratingLarge !== undefined) {
      dot += ratingSmall * ratingLarge;
    }
  }
  for (const rating of larger.values()) {
    normB += rating * rating;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Score one candidate track for a user via the item-based adjusted weighted
 * sum: how similar is it to tracks this user has already rated, weighted by
 * how much they liked/disliked those tracks.
 */
export function scoreCandidateForUser(
  userRatings: Map<string, number>,
  candidateTrackId: string,
  itemRaters: ItemRaters
): ScoredCandidate {
  const candidateRaters = itemRaters.get(candidateTrackId);
  if (!candidateRaters || userRatings.size === 0) {
    return { trackId: candidateTrackId, score: 0, confidence: 0 };
  }

  let weightedSum = 0;
  let similarityWeight = 0;
  let neighborsUsed = 0;

  for (const [ratedTrackId, rating] of userRatings) {
    if (ratedTrackId === candidateTrackId) continue;
    const ratedTrackRaters = itemRaters.get(ratedTrackId);
    if (!ratedTrackRaters) continue;

    const sim = itemSimilarity(candidateRaters, ratedTrackRaters);
    if (sim === 0) continue;

    weightedSum += sim * rating;
    similarityWeight += Math.abs(sim);
    neighborsUsed += 1;
  }

  if (similarityWeight === 0) {
    return { trackId: candidateTrackId, score: 0, confidence: 0 };
  }

  const score = weightedSum / similarityWeight;
  const confidence = Math.min(1, neighborsUsed / 5); // 5+ corroborating neighbors = full confidence
  return { trackId: candidateTrackId, score, confidence };
}

/** Score every candidate track for a user and return them sorted best-first. */
export function recommendForUser(
  matrix: RatingMatrix,
  itemRaters: ItemRaters,
  userId: string,
  candidateTrackIds: Iterable<string>
): ScoredCandidate[] {
  const userRatings = matrix.get(userId) ?? new Map<string, number>();
  const results: ScoredCandidate[] = [];

  for (const trackId of candidateTrackIds) {
    if (userRatings.has(trackId)) continue; // don't recommend what they've already rated
    results.push(scoreCandidateForUser(userRatings, trackId, itemRaters));
  }

  return results.sort((a, b) => b.score - a.score);
}
