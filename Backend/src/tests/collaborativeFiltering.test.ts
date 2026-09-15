import {
  buildItemRaters,
  itemSimilarity,
  scoreCandidateForUser,
  recommendForUser,
  type RatingMatrix,
} from '@services/recommendation/collaborativeFiltering';

/**
 * Synthetic taste-cluster fixture: userA and userB like the same two tracks
 * (trackX, trackY) and both dislike trackZ. userC only has trackX rated.
 * A good item-based CF should recommend trackY to userC over trackZ, purely
 * from userA/userB's shared behavior — userC never rated trackY directly.
 */
function buildFixtureMatrix(): RatingMatrix {
  const matrix: RatingMatrix = new Map();
  matrix.set('userA', new Map([['trackX', 0.9], ['trackY', 0.8], ['trackZ', -0.7]]));
  matrix.set('userB', new Map([['trackX', 1.0], ['trackY', 0.6], ['trackZ', -0.9]]));
  matrix.set('userC', new Map([['trackX', 0.85]]));
  return matrix;
}

describe('itemSimilarity', () => {
  it('gives tracks rated similarly by the same users a high positive similarity', () => {
    const matrix = buildFixtureMatrix();
    const itemRaters = buildItemRaters(matrix);
    const sim = itemSimilarity(itemRaters.get('trackX')!, itemRaters.get('trackY')!);
    expect(sim).toBeGreaterThan(0.5);
  });

  it('gives oppositely-rated tracks a negative similarity', () => {
    const matrix = buildFixtureMatrix();
    const itemRaters = buildItemRaters(matrix);
    const sim = itemSimilarity(itemRaters.get('trackX')!, itemRaters.get('trackZ')!);
    expect(sim).toBeLessThan(0);
  });

  it('returns 0 for two tracks with no raters in common', () => {
    const matrix: RatingMatrix = new Map([
      ['u1', new Map([['a', 1]])],
      ['u2', new Map([['b', 1]])],
    ]);
    const itemRaters = buildItemRaters(matrix);
    expect(itemSimilarity(itemRaters.get('a')!, itemRaters.get('b')!)).toBe(0);
  });
});

describe('scoreCandidateForUser / recommendForUser — learns from other users, not just restating one user\'s own data', () => {
  it('recommends trackY to userC ahead of trackZ, despite userC never rating trackY', () => {
    const matrix = buildFixtureMatrix();
    const itemRaters = buildItemRaters(matrix);

    const results = recommendForUser(matrix, itemRaters, 'userC', ['trackY', 'trackZ']);
    const trackYResult = results.find((r) => r.trackId === 'trackY')!;
    const trackZResult = results.find((r) => r.trackId === 'trackZ')!;

    expect(trackYResult.score).toBeGreaterThan(trackZResult.score);
    expect(trackYResult.score).toBeGreaterThan(0);
    expect(trackZResult.score).toBeLessThan(0);
  });

  it('never recommends a track the user has already rated', () => {
    const matrix = buildFixtureMatrix();
    const itemRaters = buildItemRaters(matrix);
    const results = recommendForUser(matrix, itemRaters, 'userA', ['trackX', 'trackY', 'trackZ']);
    expect(results.find((r) => r.trackId === 'trackX')).toBeUndefined();
  });

  it('returns a zero-confidence score for a user with no ratings at all', () => {
    const matrix = buildFixtureMatrix();
    const itemRaters = buildItemRaters(matrix);
    const result = scoreCandidateForUser(new Map(), 'trackX', itemRaters);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });
});
