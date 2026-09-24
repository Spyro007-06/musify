import '../setup/saavnMock';
import type { Job } from 'bullmq';
import { processMusicMetadata } from '@jobs/processors/music.processor';
import { saavnMock } from '../setup/saavnMock';
import { PermanentJobError } from '@jobs/errors';
import { SaavnUpstreamError } from '@utils/SaavnUpstreamError';

const makeJob = (trackIds: unknown): Job<any> =>
  ({ id: 'job-1', data: { trackIds } }) as unknown as Job<any>;

describe('processMusicMetadata', () => {
  it('resolves and reports the count of tracks the cache-aside lookup returned', async () => {
    saavnMock.getTracksCached.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

    const result = await processMusicMetadata(makeJob(['t1', 't2', 't3']));

    expect(saavnMock.getTracksCached).toHaveBeenCalledWith(['t1', 't2', 't3']);
    expect(result).toEqual({ requested: 3, resolved: 2 });
  });

  it('rejects an empty trackIds array as a permanent (non-retryable) error, without calling Saavn', async () => {
    await expect(processMusicMetadata(makeJob([]))).rejects.toBeInstanceOf(PermanentJobError);
    expect(saavnMock.getTracksCached).not.toHaveBeenCalled();
  });

  it('rejects a non-array trackIds as a permanent error', async () => {
    await expect(processMusicMetadata(makeJob('not-an-array'))).rejects.toBeInstanceOf(PermanentJobError);
  });

  it('rejects a batch over the per-job cap as a permanent error', async () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => `t${i}`);
    await expect(processMusicMetadata(makeJob(tooMany))).rejects.toBeInstanceOf(PermanentJobError);
    expect(saavnMock.getTracksCached).not.toHaveBeenCalled();
  });

  it('propagates a Saavn upstream failure so BullMQ retries it (not a PermanentJobError)', async () => {
    const upstreamError = new SaavnUpstreamError('JioSaavn is currently unavailable.');
    saavnMock.getTracksCached.mockRejectedValue(upstreamError);

    await expect(processMusicMetadata(makeJob(['t1']))).rejects.toBe(upstreamError);
  });

  it('is idempotent: running the same batch twice just re-warms the same keys, no accumulation to assert against', async () => {
    saavnMock.getTracksCached.mockResolvedValue([{ id: 't1' }]);

    const first = await processMusicMetadata(makeJob(['t1']));
    const second = await processMusicMetadata(makeJob(['t1']));

    expect(first).toEqual(second);
  });
});
