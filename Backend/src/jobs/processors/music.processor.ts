import { Job } from 'bullmq';
import { SaavnService } from '@services/saavn.service';
import { PermanentJobError } from '@jobs/errors';
import { logger } from '@utils/logger';
import { SaavnUpstreamError } from '@utils/SaavnUpstreamError';

export interface ProcessMusicMetadataData {
  trackIds: string[];
}

export interface ProcessMusicMetadataResult {
  requested: number;
  resolved: number;
}

const MAX_TRACK_IDS_PER_JOB = 200;

/**
 * Resolves and cache-warms metadata for a batch of tracks (spotifyTrackIds)
 * via the existing JioSaavn integration. MUSIFY never persists track
 * metadata to Postgres — tracks are always identified by spotifyTrackId and
 * resolved live from Saavn (see services/recommendation/engine.ts's own
 * fetchTrackMetadata) — so "processing" here means populating the Redis
 * cache-aside layer (SaavnService.getTracksCached) rather than writing rows,
 * which is the same shape of gain a real metadata-processing task would
 * give for something like a freshly created/imported playlist: the first
 * open right after doesn't pay Saavn's live-lookup latency per track.
 *
 * Idempotent: re-running with the same trackIds just re-warms the same
 * cache keys (a plain overwrite, not an accumulation) — safe to retry.
 */
export async function processMusicMetadata(job: Job<ProcessMusicMetadataData>): Promise<ProcessMusicMetadataResult> {
  const { trackIds } = job.data;

  if (!Array.isArray(trackIds) || trackIds.length === 0) {
    throw new PermanentJobError('processMusicMetadata requires a non-empty trackIds array.');
  }
  if (trackIds.length > MAX_TRACK_IDS_PER_JOB) {
    throw new PermanentJobError(`processMusicMetadata accepts at most ${MAX_TRACK_IDS_PER_JOB} trackIds per job, got ${trackIds.length}.`);
  }

  logger.info(`[job:processMusicMetadata] started — ${trackIds.length} track(s), jobId=${job.id}`);

  try {
    const saavn = SaavnService.getInstance();
    const resolved = await saavn.getTracksCached(trackIds);

    logger.info(`[job:processMusicMetadata] completed — resolved ${resolved.length}/${trackIds.length} track(s), jobId=${job.id}`);

    return { requested: trackIds.length, resolved: resolved.length };
  } catch (err) {
    if (err instanceof SaavnUpstreamError) {
      // Upstream outage — transient, let BullMQ retry with backoff.
      logger.warn(`[job:processMusicMetadata] Saavn upstream error, will retry — jobId=${job.id}`, err);
      throw err;
    }
    logger.error(`[job:processMusicMetadata] unexpected failure — jobId=${job.id}`, err);
    throw err;
  }
}
