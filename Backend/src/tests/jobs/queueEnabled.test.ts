/**
 * jobs/queue.ts behavior when REDIS_URL is set — `bullmq`'s Queue class is
 * itself mocked, so this still never touches a live Redis connection. See
 * queueDisabled.test.ts for why this is a separate file rather than one
 * file toggling the mock per test.
 */
const addMock = jest.fn().mockResolvedValue({ id: 'job-123' });
const getJobMock = jest.fn().mockResolvedValue(null);
const upsertJobSchedulerMock = jest.fn().mockResolvedValue(undefined);
const removeJobSchedulerMock = jest.fn().mockResolvedValue(undefined);

jest.mock('@config/queue', () => ({
  queueEnabled: true,
  queueConnection: {},
}));
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: addMock,
    getJob: getJobMock,
    close: jest.fn(),
    upsertJobScheduler: upsertJobSchedulerMock,
    removeJobScheduler: removeJobSchedulerMock,
  })),
}));

import {
  enqueueProcessMusicMetadata,
  enqueueGenerateUserRecommendations,
  scheduleMaintenanceJobs,
  findJobById,
  JOB_NAMES,
} from '@jobs/queue';

beforeEach(() => {
  addMock.mockClear();
  getJobMock.mockClear().mockResolvedValue(null);
  upsertJobSchedulerMock.mockClear();
});

describe('jobs/queue — enabled', () => {
  it('enqueueProcessMusicMetadata adds a job to the music queue and returns a queue-qualified id', async () => {
    const result = await enqueueProcessMusicMetadata(['t1', 't2']);

    expect(addMock).toHaveBeenCalledWith(JOB_NAMES.PROCESS_MUSIC_METADATA, { trackIds: ['t1', 't2'] });
    // Prefixed with the queue name — a bare BullMQ job id is only unique
    // within its own queue, so the status endpoint needs this to find the
    // right job instead of a same-numbered one on a different queue.
    expect(result).toEqual({ taskId: 'music:job-123', status: 'queued' });
  });

  it('enqueueGenerateUserRecommendations adds a job to the recommendations queue', async () => {
    const result = await enqueueGenerateUserRecommendations('user-1');

    expect(addMock).toHaveBeenCalledWith(JOB_NAMES.GENERATE_USER_RECOMMENDATIONS, { userId: 'user-1' });
    expect(result).toEqual({ taskId: 'recommendations:job-123', status: 'queued' });
  });

  it('scheduleMaintenanceJobs upserts a repeatable job scheduler with a stable id (idempotent registration)', async () => {
    await scheduleMaintenanceJobs();
    await scheduleMaintenanceJobs();

    expect(upsertJobSchedulerMock).toHaveBeenCalledTimes(2);
    const [firstCallId] = upsertJobSchedulerMock.mock.calls[0];
    const [secondCallId] = upsertJobSchedulerMock.mock.calls[1];
    expect(firstCallId).toBe(secondCallId); // same scheduler id both times -> no duplicate schedule
  });

  it('findJobById searches each queue in turn until it finds the job', async () => {
    getJobMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'job-123' });

    const job = await findJobById('job-123');

    expect(job).toEqual({ id: 'job-123' });
    expect(getJobMock).toHaveBeenCalledTimes(3);
  });
});
