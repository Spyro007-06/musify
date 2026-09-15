/**
 * Turns raw playback/skip/like events into a single normalized implicit
 * rating per (user, track), in the range [-1, 1].
 *
 * This is the input the collaborative-filtering and content-based scorers
 * both consume — everything downstream works off this one number instead of
 * raw event counts.
 */

export interface PlayEventInput {
  completedSong: boolean;
  listenPercentage: number | null;
  numberOfReplays: number;
}

export interface SkipEventInput {
  /** Seconds into the track when the user skipped. */
  skipTime: number;
  /** Total track duration in seconds, if known. */
  durationSeconds?: number;
}

const DEFAULT_ASSUMED_DURATION_SECONDS = 210; // ~3.5 min, used only when duration is unknown

/**
 * Score a single "play" event (an entry in ListeningHistory).
 * - full completion + at least one replay: strongest positive
 * - full completion: strong positive
 * - partial listen past the halfway point: mild positive, scaled by how far they got
 * - partial listen that dropped off early: negative, the earlier the drop the stronger
 */
export function scorePlayEvent(event: PlayEventInput): number {
  const pct = clampUnit((event.listenPercentage ?? (event.completedSong ? 100 : 0)) / 100);

  if (event.completedSong && event.numberOfReplays > 0) return 1.0;
  if (event.completedSong) return 0.8;
  if (pct >= 0.5) return 0.3 + pct * 0.3; // 0.45 .. 0.6
  return -0.2 - (1 - pct) * 0.6; // pct=0 -> -0.8, pct=0.5 -> -0.5
}

/**
 * Score a deliberate skip event (an entry in SkippedSongs). Skipping in the
 * first few seconds is a much stronger "not for me" signal than skipping
 * near the end of the track.
 */
export function scoreSkipEvent(event: SkipEventInput): number {
  const duration = event.durationSeconds && event.durationSeconds > 0
    ? event.durationSeconds
    : DEFAULT_ASSUMED_DURATION_SECONDS;
  const pct = clampUnit(event.skipTime / duration);
  return -0.9 + pct * 0.6; // pct=0 -> -0.9, pct=1 -> -0.3
}

/**
 * Aggregate every raw event score for one (user, track) pair into a single
 * rating. Simple mean — recency weighting isn't worth the complexity at this
 * scale, and the cron job already only looks at a bounded recent window.
 */
export function aggregateEventScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return clampSigned(sum / scores.length);
}

/**
 * Explicit like/dislike always wins over whatever the implicit signal says —
 * a user who hits "like" on a song they've never finished still means it.
 */
export function applyExplicitOverride(
  implicitScore: number,
  options: { liked: boolean; disliked: boolean }
): number {
  if (options.liked) return 1.0;
  if (options.disliked) return -1.0;
  return implicitScore;
}

function clampUnit(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampSigned(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
