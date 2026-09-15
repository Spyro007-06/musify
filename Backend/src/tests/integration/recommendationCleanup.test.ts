jest.mock('@services/saavn.service', () => ({
  SaavnService: {
    getInstance: jest.fn(() => ({
      getTracks: jest.fn().mockResolvedValue([]),
    })),
  },
}));

import { recomputeAllUserScores } from '@services/recommendation/engine';
import { prismaMock } from '../setup/prismaMock';

describe('recomputeAllUserScores — stale data cleanup', () => {
  const now = new Date();

  beforeEach(() => {
    // A single active user with one liked track — enough to produce a
    // non-empty rating matrix without needing real listening history rows.
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.skippedSongs.findMany.mockResolvedValue([]);
    prismaMock.likedTrack.findMany.mockResolvedValue([
      { id: 'l1', userId: 'active-user', spotifyTrackId: 'track-1', createdAt: now } as any,
    ]);
    prismaMock.dislikedSong.findMany.mockResolvedValue([]);
    prismaMock.genreAffinity.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.recommendationCache.deleteMany.mockResolvedValue({ count: 3 } as any);
  });

  it('deletes RecommendationScores rows for users no longer in the active rating matrix', async () => {
    // "churned-user" has old precomputed scores but no current signals at all —
    // simulates a user whose activity aged out of the recompute window.
    prismaMock.recommendationScores.findMany.mockResolvedValue([
      { userId: 'churned-user' } as any,
    ]);
    prismaMock.recommendationScores.deleteMany.mockResolvedValue({ count: 42 } as any);

    const summary = await recomputeAllUserScores();

    expect(prismaMock.recommendationScores.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { notIn: ['active-user'] } },
      })
    );
    expect(prismaMock.recommendationScores.deleteMany).toHaveBeenCalledWith({
      where: { userId: { in: ['churned-user'] } },
    });
    expect(summary.staleScoreUsersCleaned).toBe(1);
  });

  it('deletes expired RecommendationCache rows regardless of user activity', async () => {
    prismaMock.recommendationScores.findMany.mockResolvedValue([]);

    const summary = await recomputeAllUserScores();

    expect(prismaMock.recommendationCache.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
    expect(summary.expiredCacheRowsCleaned).toBe(3);
  });

  it('does not issue a delete when there are no stale score owners', async () => {
    prismaMock.recommendationScores.findMany.mockResolvedValue([]);
    prismaMock.recommendationScores.deleteMany.mockClear();

    await recomputeAllUserScores();

    // The per-user recompute loop itself calls deleteMany (scoped to its own
    // userId, inside the $transaction mock) — the cleanup-specific call with
    // an `in` filter should never fire when there's nothing stale to remove.
    const cleanupCalls = prismaMock.recommendationScores.deleteMany.mock.calls.filter(
      ([args]) => args && 'where' in args && (args.where as any)?.userId?.in
    );
    expect(cleanupCalls).toHaveLength(0);
  });
});
