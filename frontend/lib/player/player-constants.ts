export const DEFAULT_VOLUME = 0.8;
export const SEEK_STEP = 5; // seconds
export const VOLUME_STEP = 0.05;
export const PREVIOUS_TRACK_THRESHOLD = 3; // seconds
export const SKIP_LOG_THRESHOLD = 3; // seconds of listening before a skip is worth logging
export const AUTO_QUEUE_REFILL_THRESHOLD = 3; // top up the queue once this few tracks remain after the current one
export const AUTO_QUEUE_RETRY_MS = 30_000; // wait after a top-up that came back empty before asking again
export const MAX_SKIPPED_FAILURES = 5; // unplayable tracks skipped in a row before giving up (offline?)
