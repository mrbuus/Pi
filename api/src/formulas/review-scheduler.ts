export const REVIEW_RESULTS = ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const;
export type ReviewResult = (typeof REVIEW_RESULTS)[number];
export const SUCCESS_INTERVAL_DAYS = [1, 2, 4, 8, 16, 32] as const;
const DAY_MS = 86_400_000;
export interface ReviewState {
  box: number;
  streak: number;
  reviewCount: number;
  lapses: number;
}

/** Unseen is virtual stage -1. Persisted stages 0..5 cover all six intervals.
 * AGAIN is the task's explicit exception: stage 1, exactly one day later.
 * Intervals are elapsed days, independent of the server's local timezone. */
export function scheduleReview(
  previous: ReviewState | null,
  result: ReviewResult,
  now: Date,
) {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError('Invalid review time');
  if (!REVIEW_RESULTS.includes(result)) throw new RangeError('Invalid result');
  if (
    previous &&
    (!Number.isInteger(previous.box) || previous.box < 0 || previous.box > 5)
  )
    throw new RangeError('Invalid review box');
  const unseen = !previous || previous.reviewCount === 0;
  const oldBox = unseen ? -1 : previous.box;
  const box =
    result === 'AGAIN'
      ? 1
      : result === 'HARD'
        ? Math.max(0, oldBox)
        : Math.min(5, oldBox + (result === 'EASY' ? 2 : 1));
  const days =
    result === 'AGAIN'
      ? 1
      : SUCCESS_INTERVAL_DAYS[box] * (result === 'HARD' ? 0.5 : 1);
  return {
    box,
    dueAt: new Date(now.getTime() + days * DAY_MS),
    lastResult: result,
    streak: result === 'AGAIN' ? 0 : (previous?.streak ?? 0) + 1,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    lapses: (previous?.lapses ?? 0) + (result === 'AGAIN' ? 1 : 0),
  };
}

/** A SQL DATE is a calendar label. Shift UTC to UB before taking its date. */
export function reviewDay(now: Date): Date {
  return new Date(
    new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10) +
      'T00:00:00.000Z',
  );
}

export function reviewStreak(days: Date[], now: Date): number {
  const unique = new Set(days.map((day) => day.getTime()));
  let cursor = reviewDay(now).getTime();
  if (!unique.has(cursor)) cursor -= DAY_MS;
  let streak = 0;
  while (unique.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}
