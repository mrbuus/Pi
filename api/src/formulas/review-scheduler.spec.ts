import {
  reviewDay,
  reviewStreak,
  scheduleReview,
  type ReviewResult,
} from './review-scheduler';
const now = new Date('2026-09-27T15:59:59.000Z');
const day = 86_400_000;
describe('review scheduler', () => {
  it('makes all six successful intervals reachable before capping', () => {
    let previous: ReturnType<typeof scheduleReview> | null = null;
    for (const [index, days] of [1, 2, 4, 8, 16, 32, 32].entries()) {
      previous = scheduleReview(previous, 'GOOD', now);
      expect(previous.box).toBe(Math.min(index, 5));
      expect(previous.dueAt.getTime() - now.getTime()).toBe(days * day);
      expect(previous.reviewCount).toBe(index + 1);
    }
  });
  for (const box of [0, 1, 2, 3, 4, 5])
    for (const result of ['AGAIN', 'HARD', 'GOOD', 'EASY'] as ReviewResult[]) {
      it(`${result} at stage ${box}`, () => {
        const previous = { box, streak: 3, reviewCount: 9, lapses: 2 };
        const next = scheduleReview(previous, result, now);
        const expectedBox =
          result === 'AGAIN'
            ? 1
            : result === 'HARD'
              ? box
              : Math.min(5, box + (result === 'GOOD' ? 1 : 2));
        const expectedDays =
          result === 'AGAIN'
            ? 1
            : [1, 2, 4, 8, 16, 32][expectedBox] / (result === 'HARD' ? 2 : 1);
        expect(next).toEqual({
          box: expectedBox,
          dueAt: new Date(now.getTime() + expectedDays * day),
          lastResult: result,
          streak: result === 'AGAIN' ? 0 : 4,
          reviewCount: 10,
          lapses: result === 'AGAIN' ? 3 : 2,
        });
      });
    }
  it.each([
    ['HARD', 0, 0.5],
    ['GOOD', 0, 1],
    ['EASY', 1, 2],
    ['AGAIN', 1, 1],
  ] as const)('unseen %s', (result, box, interval) => {
    expect(scheduleReview(null, result, now)).toMatchObject({
      box,
      dueAt: new Date(now.getTime() + interval * day),
    });
    expect(
      scheduleReview(
        { box: 0, streak: 0, reviewCount: 0, lapses: 0 },
        result,
        now,
      ),
    ).toEqual(scheduleReview(null, result, now));
  });
  it('rejects invalid scheduler inputs', () => {
    expect(() => scheduleReview(null, 'GOOD', new Date('invalid'))).toThrow(
      RangeError,
    );
    expect(() => scheduleReview(null, 'WRONG' as ReviewResult, now)).toThrow(
      RangeError,
    );
    for (const box of [-1, 6, 0.5, NaN])
      expect(() =>
        scheduleReview(
          { box, streak: 0, reviewCount: 1, lapses: 0 },
          'GOOD',
          now,
        ),
      ).toThrow(RangeError);
  });
  it('uses UB midnight across month/year/leap-day boundaries', () => {
    expect(reviewDay(new Date('2026-12-31T15:59:59Z')).toISOString()).toBe(
      '2026-12-31T00:00:00.000Z',
    );
    expect(reviewDay(new Date('2026-12-31T16:00:00Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
    expect(reviewDay(new Date('2028-02-28T16:00:00Z')).toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });
  it('counts consecutive completed UB days, permitting today not yet reviewed', () => {
    const dates = ['2026-09-27', '2026-09-26', '2026-09-26', '2026-09-24'].map(
      (s) => new Date(s),
    );
    expect(reviewStreak(dates, now)).toBe(2);
    expect(reviewStreak(dates, new Date('2026-09-27T16:00:00Z'))).toBe(2);
    expect(reviewStreak(dates, new Date('2026-09-28T16:00:00Z'))).toBe(0);
    expect(reviewStreak([], now)).toBe(0);
  });
});
