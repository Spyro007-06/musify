import {
  scorePlayEvent,
  scoreSkipEvent,
  aggregateEventScores,
  applyExplicitOverride,
} from '@services/recommendation/implicitFeedback';

describe('scorePlayEvent', () => {
  it('scores a completed song with a replay as the strongest positive', () => {
    const score = scorePlayEvent({ completedSong: true, listenPercentage: 100, numberOfReplays: 2 });
    expect(score).toBe(1.0);
  });

  it('scores a plain completion lower than a completion + replay', () => {
    const completed = scorePlayEvent({ completedSong: true, listenPercentage: 100, numberOfReplays: 0 });
    const completedWithReplay = scorePlayEvent({ completedSong: true, listenPercentage: 100, numberOfReplays: 1 });
    expect(completed).toBeLessThan(completedWithReplay);
    expect(completed).toBeGreaterThan(0);
  });

  it('scores a late partial listen as mildly positive', () => {
    const score = scorePlayEvent({ completedSong: false, listenPercentage: 80, numberOfReplays: 0 });
    expect(score).toBeGreaterThan(0);
  });

  it('scores an early drop-off as negative, worse the earlier it happens', () => {
    const droppedEarly = scorePlayEvent({ completedSong: false, listenPercentage: 5, numberOfReplays: 0 });
    const droppedLater = scorePlayEvent({ completedSong: false, listenPercentage: 40, numberOfReplays: 0 });
    expect(droppedEarly).toBeLessThan(0);
    expect(droppedEarly).toBeLessThan(droppedLater);
  });
});

describe('scoreSkipEvent', () => {
  it('penalizes an early skip more heavily than a late skip', () => {
    const earlySkip = scoreSkipEvent({ skipTime: 2, durationSeconds: 200 });
    const lateSkip = scoreSkipEvent({ skipTime: 180, durationSeconds: 200 });
    expect(earlySkip).toBeLessThan(lateSkip);
    expect(earlySkip).toBeLessThan(0);
    expect(lateSkip).toBeLessThan(0); // a skip is still a negative signal even late
  });

  it('falls back to an assumed duration when none is provided', () => {
    expect(() => scoreSkipEvent({ skipTime: 5 })).not.toThrow();
  });
});

describe('aggregateEventScores', () => {
  it('returns 0 for no events', () => {
    expect(aggregateEventScores([])).toBe(0);
  });

  it('averages multiple event scores and clamps to [-1, 1]', () => {
    expect(aggregateEventScores([1, 1, 1])).toBeLessThanOrEqual(1);
    expect(aggregateEventScores([-1, -1, -1])).toBeGreaterThanOrEqual(-1);
    expect(aggregateEventScores([1, -1])).toBeCloseTo(0);
  });
});

describe('applyExplicitOverride', () => {
  it('lets an explicit like override a negative implicit score', () => {
    expect(applyExplicitOverride(-0.8, { liked: true, disliked: false })).toBe(1.0);
  });

  it('lets an explicit dislike override a positive implicit score', () => {
    expect(applyExplicitOverride(0.8, { liked: false, disliked: true })).toBe(-1.0);
  });

  it('passes the implicit score through untouched with no explicit signal', () => {
    expect(applyExplicitOverride(0.42, { liked: false, disliked: false })).toBe(0.42);
  });
});
