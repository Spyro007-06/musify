/**
 * src/jobs/worker.ts job-name routing (task discovery) when the queue is
 * enabled. `bullmq`'s Worker is mocked to capture each queue's processor
 * function so it can be invoked directly against a fake Job, without a
 * live Redis connection. See workerDisabled.test.ts for the no-REDIS_URL
 * case (kept separate for the same static-mock reason noted there).
 */
const capturedProcessors: Record<string, (job: any) => Promise<unknown>> = {};

jest.mock('@config/queue', () => ({ queueEnabled: true, queueConnection: {} }));
jest.mock('bullmq', () => ({
  // worker.ts's sibling import of @jobs/queue constructs a Queue per queue
  // name at module load — needs a harmless mock too even though this file
  // only exercises Worker routing.
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    getJob: jest.fn(),
    close: jest.fn(),
    upsertJobScheduler: jest.fn(),
    removeJobScheduler: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation((name: string, processor: (job: any) => Promise<unknown>) => {
    capturedProcessors[name] = processor;
    return { name, on: jest.fn(), close: jest.fn() };
  }),
  UnrecoverableError: jest.requireActual('bullmq').UnrecoverableError,
}));
jest.mock('@jobs/processors/music.processor', () => ({ processMusicMetadata: jest.fn() }));
jest.mock('@jobs/processors/recommendations.processor', () => ({ generateUserRecommendations: jest.fn() }));
jest.mock('@jobs/processors/maintenance.processor', () => ({ cleanupExpiredData: jest.fn() }));

import { startWorkers } from '@jobs/worker';
import { JOB_NAMES } from '@jobs/queue';
import { PermanentJobError } from '@jobs/errors';
import { processMusicMetadata } from '@jobs/processors/music.processor';
import { generateUserRecommendations } from '@jobs/processors/recommendations.processor';
import { cleanupExpiredData } from '@jobs/processors/maintenance.processor';

const processMusicMetadataMock = processMusicMetadata as jest.Mock;
const generateUserRecommendationsMock = generateUserRecommendations as jest.Mock;
const cleanupExpiredDataMock = cleanupExpiredData as jest.Mock;

beforeAll(() => {
  processMusicMetadataMock.mockResolvedValue({ requested: 1, resolved: 1 });
  generateUserRecommendationsMock.mockResolvedValue({ userId: 'u1', scoresGenerated: 1 });
  cleanupExpiredDataMock.mockResolvedValue({ expiredCacheRowsDeleted: 0 });
  startWorkers();
});

describe('jobs/worker — enabled: job-name routing per queue', () => {
  // Each `it` below implicitly proves its queue's Worker was constructed
  // (capturedProcessors.<name> can only be populated by the mocked Worker
  // constructor running for that name) — a separate call-count assertion
  // isn't reliable here since jest.config's clearMocks wipes call history
  // from beforeAll before the very first test runs.
  it('routes a processMusicMetadata job on the music queue to the music processor', async () => {
    const job = { id: 'j1', name: JOB_NAMES.PROCESS_MUSIC_METADATA, data: { trackIds: ['t1'] } };
    await expect(capturedProcessors.music(job)).resolves.toEqual({ requested: 1, resolved: 1 });
    expect(processMusicMetadataMock).toHaveBeenCalledWith(job);
  });

  it('rejects an unrecognized job name on the music queue as a permanent error', async () => {
    const job = { id: 'j1', name: 'not-a-real-job', data: {} };
    await expect(capturedProcessors.music(job)).rejects.toBeInstanceOf(PermanentJobError);
  });

  it('routes a generateUserRecommendations job on the recommendations queue to its processor', async () => {
    const job = { id: 'j2', name: JOB_NAMES.GENERATE_USER_RECOMMENDATIONS, data: { userId: 'u1' } };
    await expect(capturedProcessors.recommendations(job)).resolves.toEqual({ userId: 'u1', scoresGenerated: 1 });
    expect(generateUserRecommendationsMock).toHaveBeenCalledWith(job);
  });

  it('routes a cleanupExpiredData job on the maintenance queue to its processor', async () => {
    const job = { id: 'j3', name: JOB_NAMES.CLEANUP_EXPIRED_DATA, data: {} };
    await expect(capturedProcessors.maintenance(job)).resolves.toEqual({ expiredCacheRowsDeleted: 0 });
    expect(cleanupExpiredDataMock).toHaveBeenCalledWith(job);
  });
});
