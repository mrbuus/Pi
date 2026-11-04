import {
  INITIAL_EASE,
  isReviewDue,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  nextProblemReview,
  ubDayStartPlus,
  wrongEventSchedule,
} from './problem-review-scheduling';

// УБ 2026-11-04 10:00 = UTC 02:00
const NOW = new Date('2026-11-04T02:00:00.000Z');
const ubMidnight = (day: string) => new Date(`${day}T00:00:00.000+08:00`);

describe('problem review scheduling', () => {
  it('УБ-ын шөнө дундаар тоолно (UTC шөнийн 16:00-аас хойш дараагийн өдөр)', () => {
    expect(ubDayStartPlus(NOW, 1)).toEqual(ubMidnight('2026-11-05'));
    // UTC 2026-11-04 17:00 = УБ 11-05 01:00 → маргааш нь 11-06
    expect(ubDayStartPlus(new Date('2026-11-04T17:00:00Z'), 1)).toEqual(ubMidnight('2026-11-06'));
    expect(() => ubDayStartPlus(new Date('x'), 1)).toThrow(RangeError);
  });

  it('анх буруу: маргааш, lapses 0, анхны ease', () => {
    expect(wrongEventSchedule(null, NOW)).toEqual({
      intervalDays: 1,
      ease: INITIAL_EASE,
      reps: 0,
      lapses: 0,
      dueAt: ubMidnight('2026-11-05'),
      lastResult: 'WRONG',
    });
  });

  it('давтлагаас гадуур дахин буруу: тэглэнэ, lapses + 1, ease хадгална', () => {
    expect(wrongEventSchedule({ intervalDays: 18, ease: 2.1, reps: 3, lapses: 1 }, NOW)).toMatchObject({
      intervalDays: 1,
      ease: 2.1,
      reps: 0,
      lapses: 2,
      dueAt: ubMidnight('2026-11-05'),
    });
  });

  it('зөв: 3 → 7 → интервал × ease хоног, дээд тал 180', () => {
    let state = { intervalDays: 1, ease: INITIAL_EASE, reps: 0, lapses: 0 };
    const first = nextProblemReview(state, true, NOW);
    expect(first).toMatchObject({ intervalDays: 3, reps: 1, lastResult: 'CORRECT', dueAt: ubMidnight('2026-11-07') });
    state = first;
    const second = nextProblemReview(state, true, NOW);
    expect(second).toMatchObject({ intervalDays: 7, reps: 2 });
    const third = nextProblemReview(second, true, NOW);
    expect(third).toMatchObject({ intervalDays: 18, reps: 3 });
    const capped = nextProblemReview({ intervalDays: 150, ease: 2.5, reps: 6, lapses: 0 }, true, NOW);
    expect(capped.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it('зөв: интервал хэзээ ч богиносохгүй (бага ease-тэй ч)', () => {
    const next = nextProblemReview({ intervalDays: 10, ease: MIN_EASE, reps: 2, lapses: 4 }, true, NOW);
    expect(next.intervalDays).toBeGreaterThan(10);
  });

  it('давтлагаар буруу: 1 хоног, reps 0, lapses + 1, ease −0.2 (доод хязгаар 1.3)', () => {
    expect(nextProblemReview({ intervalDays: 18, ease: 2.5, reps: 3, lapses: 0 }, false, NOW)).toEqual({
      intervalDays: 1,
      ease: 2.3,
      reps: 0,
      lapses: 1,
      dueAt: ubMidnight('2026-11-05'),
      lastResult: 'WRONG',
    });
    expect(nextProblemReview({ intervalDays: 1, ease: 1.35, reps: 0, lapses: 5 }, false, NOW).ease).toBe(MIN_EASE);
  });

  it('хугацаа болсон эсэх', () => {
    expect(isReviewDue(ubMidnight('2026-11-04'), NOW)).toBe(true);
    expect(isReviewDue(ubMidnight('2026-11-05'), NOW)).toBe(false);
  });
});
