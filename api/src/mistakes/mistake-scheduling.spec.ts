import { nextMistakeRetryState } from './mistake-scheduling';

describe('nextMistakeRetryState', () => {
  const day1 = new Date('2026-09-01T02:00:00Z'); // 10:00 in Ulaanbaatar
  const day1Later = new Date('2026-09-01T09:00:00Z');
  const day2 = new Date('2026-09-02T02:00:00Z');

  it('does not count two correct attempts on one Ulaanbaatar day as mastery', () => {
    const first = nextMistakeRetryState({ status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastCorrectAt: null }, true, day1);
    const second = nextMistakeRetryState(first, true, day1Later);
    expect(first).toMatchObject({ status: 'RETRYING', consecutiveCorrect: 1, nextRetryAt: new Date('2026-09-02T00:00:00Z') });
    expect(second).toMatchObject({ status: 'RETRYING', consecutiveCorrect: 1, retryCount: 2 });
  });

  it('masters after correct attempts on distinct days and resets progress after a wrong answer', () => {
    const first = nextMistakeRetryState({ status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastCorrectAt: null }, true, day1);
    const mastered = nextMistakeRetryState(first, true, day2);
    expect(mastered).toMatchObject({ status: 'MASTERED', consecutiveCorrect: 2, nextRetryAt: null });
    const wrong = nextMistakeRetryState(mastered, false, new Date('2026-09-03T02:00:00Z'));
    expect(wrong).toMatchObject({ status: 'RETRYING', consecutiveCorrect: 0, nextRetryAt: new Date('2026-09-10T00:00:00Z') });
  });

  it('uses 1, 3, then 7 day spacing for repeated wrong attempts', () => {
    const first = nextMistakeRetryState({ status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastCorrectAt: null }, false, day1);
    const second = nextMistakeRetryState(first, false, day2);
    const third = nextMistakeRetryState(second, false, new Date('2026-09-03T02:00:00Z'));
    expect(first.nextRetryAt).toEqual(new Date('2026-09-02T00:00:00Z'));
    expect(second.nextRetryAt).toEqual(new Date('2026-09-05T00:00:00Z'));
    expect(third.nextRetryAt).toEqual(new Date('2026-09-10T00:00:00Z'));
  });
});
