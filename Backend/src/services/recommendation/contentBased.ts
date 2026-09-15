/**
 * Content-based scorer used for cold-start users (little/no rating history)
 * and blended in alongside collaborative filtering for everyone else.
 *
 * Matches on genre (a fuzzy string match — Saavn's "genre" field is really a
 * language/style string, so substring matching is intentional and correct
 * here) and on artist (an exact Saavn artist ID match — artist identity is a
 * real id, not a name, see RECOMMENDATIONS.md).
 */

export interface ContentTrack {
  genre?: string;
  artists?: { id: string; name: string }[];
}

/** genre (lowercased) -> affinity score, artistId -> affinity score */
export interface AffinityMaps {
  genreAffinity: Map<string, number>;
  artistAffinity: Map<string, number>;
}

const GENRE_WEIGHT = 0.6;
const ARTIST_WEIGHT = 0.4;

/**
 * Score a candidate track against a user's genre/artist affinities.
 * Returns a value in [0, 1] — content-based matching only ever pushes a
 * track up, it has no basis for pushing one down.
 */
export function contentBasedScore(track: ContentTrack, affinities: AffinityMaps): number {
  let score = 0;

  const genre = (track.genre || '').toLowerCase();
  if (genre) {
    let bestGenreAffinity = 0;
    for (const [affGenre, affScore] of affinities.genreAffinity) {
      if (genre.includes(affGenre) || affGenre.includes(genre)) {
        bestGenreAffinity = Math.max(bestGenreAffinity, affScore);
      }
    }
    if (bestGenreAffinity > 0) score += squash(bestGenreAffinity) * GENRE_WEIGHT;
  }

  const artistIds = (track.artists || []).map((a) => a.id);
  let bestArtistAffinity = 0;
  for (const id of artistIds) {
    const affScore = affinities.artistAffinity.get(id);
    if (affScore && affScore > bestArtistAffinity) bestArtistAffinity = affScore;
  }
  if (bestArtistAffinity > 0) score += squash(bestArtistAffinity) * ARTIST_WEIGHT;

  return Math.max(0, Math.min(1, score));
}

/**
 * How much collaborative filtering should count vs. content-based matching,
 * scaled by how much rating history the user actually has. A brand new user
 * gets pure content-based; by ~20 rated tracks CF fully takes over.
 */
export function collaborativeWeight(userRatingCount: number, fullConfidenceAt = 20): number {
  return Math.max(0, Math.min(1, userRatingCount / fullConfidenceAt));
}

/** Affinity scores accumulate unbounded (+1 to +20 per event) — squash to 0..1. */
function squash(rawAffinityScore: number): number {
  return 1 - Math.exp(-rawAffinityScore / 20);
}
