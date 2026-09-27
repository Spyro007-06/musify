import type { Job } from 'bullmq';
import { prismaMock } from '../setup/prismaMock';
import { generateUserRecommendations } from '@jobs/processors/recommendations.processor';
import { PermanentJobError } from '@jobs/errors';

jest.mock('@services/recommendation/engine', () => ({
  recomputeAllUserScores: jest.fn(),
  getPrecomputedScores: jest.fn(),
}));
const engine = jest.requireMock('@services/recommendation/engine') as {
  recomputeAllUserScores: jest.Mock;
  getPrecomputedScores: jest.Mock;
};

const makeJob = (userId: unknown): Job<any> => ({ id: 'job-1', data: { userId } }) as unknown as Job<any>;

const fakeUser = { id: 'user-1', deletedAt: null } as any;

describe('generateUserRecommendations', () => {
  it('reuses the existing recommendation engine and returns the refreshed score count', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    engine.recomputeAllUserScores.mockResolvedValue({
      usersProcessed: 10,
      candidatePoolSize: 500,
      staleScoreUsersCleaned: 0,
      expiredCacheRowsCleaned: 0,
    });
    engine.getPrecomputedScores.mockResolvedValue([
      { spotifyTrackId: 't1', score: 0.9, reason: 'x' },
      { spotifyTrackId: 't2', score: 0.5, reason: 'y' },
    ]);

    const result = await generateUserRecommendations(makeJob('user-1'));

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1', deletedAt: null } });
    expect(engine.recomputeAllUserScores).toHaveBeenCalledTimes(1);
    expect(engine.getPrecomputedScores).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ userId: 'user-1', scoresGenerated: 2 });
  });

  it('fails permanently (no retry) for a userId that does not exist, without running the recompute', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(generateUserRecommendations(makeJob('ghost-user'))).rejects.toBeInstanceOf(PermanentJobError);
    expect(engine.recomputeAllUserScores).not.toHaveBeenCalled();
  });

  it('fails permanently for a missing/invalid userId, without touching the database', async () => {
    await expect(generateUserRecommendations(makeJob(undefined))).rejects.toBeInstanceOf(PermanentJobError);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('lets a transient database error propagate for BullMQ to retry', async () => {
    const dbError = new Error('connection reset');
    prismaMock.user.findUnique.mockRejectedValue(dbError);

    await expect(generateUserRecommendations(makeJob('user-1'))).rejects.toBe(dbError);
  });
});
