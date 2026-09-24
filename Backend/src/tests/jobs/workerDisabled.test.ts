/**
 * src/jobs/worker.ts when REDIS_URL isn't set. Split from
 * workerRouting.test.ts (rather than one file toggling mocks per test) so
 * every mock here is a plain static `jest.mock`, avoiding the stale-module-
 * reference trap of `jest.resetModules()` + dynamic `require()` mixed with
 * statically-imported mocks.
 */
jest.mock('@config/queue', () => ({ queueEnabled: false, queueConnection: null }));
jest.mock('bullmq', () => ({
  Worker: jest.fn(),
  UnrecoverableError: jest.requireActual('bullmq').UnrecoverableError,
}));

import { Worker } from 'bullmq';
import { startWorkers, stopWorkers } from '@jobs/worker';

describe('jobs/worker — disabled (no REDIS_URL)', () => {
  it('does not construct any Worker, and stopWorkers is still safe to call', async () => {
    startWorkers();

    expect(Worker).not.toHaveBeenCalled();
    await expect(stopWorkers()).resolves.toBeUndefined();
  });
});
