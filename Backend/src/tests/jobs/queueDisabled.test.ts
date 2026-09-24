/**
 * jobs/queue.ts behavior when REDIS_URL isn't set — no live Redis involved.
 * Split from queueEnabled.test.ts (rather than toggling the mock per-test in
 * one file) so each file's `@config/queue` mock can be a plain static
 * `jest.mock`, matching this project's existing test style instead of
 * `jest.resetModules()` + dynamic `require()`.
 */
jest.mock('@config/queue', () => ({
  queueEnabled: false,
  queueConnection: null,
}));

import {
  musicQueue,
  recommendationQueue,
  maintenanceQueue,
  enqueueProcessMusicMetadata,
  enqueueGenerateUserRecommendations,
  scheduleMaintenanceJobs,
  findJobById,
} from '@jobs/queue';

describe('jobs/queue — disabled (no REDIS_URL)', () => {
  it('does not construct any Queue instance', () => {
    expect(musicQueue).toBeNull();
    expect(recommendationQueue).toBeNull();
    expect(maintenanceQueue).toBeNull();
  });

  it('enqueueProcessMusicMetadata returns null instead of throwing', async () => {
    await expect(enqueueProcessMusicMetadata(['t1'])).resolves.toBeNull();
  });

  it('enqueueGenerateUserRecommendations returns null instead of throwing', async () => {
    await expect(enqueueGenerateUserRecommendations('user-1')).resolves.toBeNull();
  });

  it('scheduleMaintenanceJobs is a no-op', async () => {
    await expect(scheduleMaintenanceJobs()).resolves.toBeUndefined();
  });

  it('findJobById returns null (nothing to search)', async () => {
    await expect(findJobById('anything')).resolves.toBeNull();
  });
});
