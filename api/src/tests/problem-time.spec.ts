import { spentSeconds } from './problem-time';
import { itemTimesOf } from '../exams/exam-results.service';

describe('бодлогод зарцуулсан хугацаа', () => {
  it('spentSeconds: зөвхөн 0..24ц тоо, бүхэлчилнэ', () => {
    expect(spentSeconds(80.4)).toBe(80);
    expect(spentSeconds(0)).toBe(0);
    expect(spentSeconds(-1)).toBeNull();
    expect(spentSeconds(24 * 3600 + 1)).toBeNull();
    expect(spentSeconds('80')).toBeNull();
    expect(spentSeconds(undefined)).toBeNull();
  });

  it('itemTimesOf: дугаар + секунд, хугацаагүйг алгасна, сессгүй бол хоосон', () => {
    const exam = { test: { problems: [{ problemId: 'p1', order: 1 }, { problemId: 'p2', order: 2 }, { problemId: 'p3', order: 3 }] } };
    const data = { session: { submittedAt: null, answers: {}, choiceOrder: {}, times: { p1: 30, p3: 95.6 } } };
    expect(itemTimesOf(exam as never, data)).toEqual([
      { n: 1, timeSpentSec: 30 },
      { n: 3, timeSpentSec: 96 },
    ]);
    expect(itemTimesOf(exam as never, { session: null })).toEqual([]);
  });
});
