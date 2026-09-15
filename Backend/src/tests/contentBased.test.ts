import { contentBasedScore, collaborativeWeight, type AffinityMaps } from '@services/recommendation/contentBased';

describe('contentBasedScore', () => {
  const affinities: AffinityMaps = {
    genreAffinity: new Map([['hindi', 15]]),
    artistAffinity: new Map([['artist-1', 10]]),
  };

  it('scores 0 for a track matching nothing', () => {
    const score = contentBasedScore({ genre: 'french', artists: [{ id: 'artist-9', name: 'Nobody' }] }, affinities);
    expect(score).toBe(0);
  });

  it('scores a genre-only match lower than a genre + artist match', () => {
    const genreOnly = contentBasedScore({ genre: 'hindi', artists: [{ id: 'artist-9', name: 'Nobody' }] }, affinities);
    const genreAndArtist = contentBasedScore({ genre: 'hindi', artists: [{ id: 'artist-1', name: 'Known' }] }, affinities);
    expect(genreOnly).toBeGreaterThan(0);
    expect(genreAndArtist).toBeGreaterThan(genreOnly);
  });

  it('matches artist by id, not by name substring', () => {
    // Same artist name string, different id — should not match (this is the bug fixed in Phase 1).
    const wrongId = contentBasedScore({ genre: '', artists: [{ id: 'some-other-id', name: 'Known' }] }, affinities);
    expect(wrongId).toBe(0);
  });

  it('never exceeds 1', () => {
    const bigAffinities: AffinityMaps = {
      genreAffinity: new Map([['hindi', 1000]]),
      artistAffinity: new Map([['artist-1', 1000]]),
    };
    const score = contentBasedScore({ genre: 'hindi', artists: [{ id: 'artist-1', name: 'Known' }] }, bigAffinities);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('collaborativeWeight', () => {
  it('is 0 for a user with no ratings (pure content-based / cold start)', () => {
    expect(collaborativeWeight(0)).toBe(0);
  });

  it('grows toward 1 as rating count increases, capped at 1', () => {
    expect(collaborativeWeight(10, 20)).toBeCloseTo(0.5);
    expect(collaborativeWeight(100, 20)).toBe(1);
  });
});
