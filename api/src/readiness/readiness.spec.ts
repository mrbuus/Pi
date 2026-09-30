import { calculateReadiness, ReadinessAttempt, ulaanbaatarDateOnly } from './readiness';
import { readinessTopicCode } from './readiness-weights';

describe('calculateReadiness', () => {
  const now = new Date('2026-09-27T00:00:00Z');

  it('uses the specified beta prior and returns weighted bounded index and interval', () => {
    const result = calculateReadiness([{ topic: 'TOO', at: now, correct: true }], now);
    expect(result.topics.find((topic) => topic.topic === 'TOO')?.mastery).toBe(60); // (1 + 2) / (1 + 4)
    expect(result.index).toBeGreaterThan(50);
    expect(result.index).toBe(60);
    expect(result.low).toBeLessThan(result.index);
    expect(result.high).toBeGreaterThan(result.index);
    expect(result.dataPoints).toBe(1);
  });

  it('discounts old evidence and ignores unknown outcomes and unmapped topics', () => {
    const input: ReadinessAttempt[] = [
      { topic: 'TOO', at: new Date('2026-08-01T12:00:00Z'), correct: false },
      { topic: 'TOO', at: now, correct: true },
      { topic: 'OTHER', at: now, correct: false },
      { topic: 'ALG', at: now, correct: null },
    ];
    const result = calculateReadiness(input, now);
    expect(result.topics.find((topic) => topic.topic === 'TOO')?.mastery).toBeGreaterThan(50);
    expect(result.dataPoints).toBe(2);
  });

  it('returns eight chronological weekly snapshots and three next steps at most', () => {
    const result = calculateReadiness([
      { topic: 'TRIG', at: now, correct: false },
      { topic: 'DERIV', at: now, correct: true },
    ], now);
    expect(result.weeklyHistory).toHaveLength(8);
    expect(result.weeklyHistory[0].week < result.weeklyHistory[7].week).toBe(true);
    expect(result.nextBestTopics[0].topic).toBe('TRIG');
  });

  it('keeps unmeasured topics separate and exposes full uncertainty with no evidence', () => {
    const result = calculateReadiness([], now);
    expect(result).toMatchObject({ index: 0, low: 0, high: 100, dataPoints: 0, effectiveDataPoints: 0, coverage: 0 });
    expect(result.topics.every((topic) => !topic.measured && topic.mastery === null)).toBe(true);
  });

  it('maps canonical codes and existing Mongolian taxonomy labels without inventing new topics', () => {
    expect(readinessTopicCode('trig')).toBe('TRIG');
    expect(readinessTopicCode('Тригонометр')).toBe('TRIG');
    expect(readinessTopicCode('unknown label')).toBeNull();
  });

  it('counts a multi-topic attempt once globally and keeps unseen topics explicitly unmeasured', () => {
    const result = calculateReadiness([
      { id: 'attempt-1', topic: 'TRIG', at: now, correct: false },
      { id: 'attempt-1', topic: 'FUNC', at: now, correct: false },
    ], now);
    expect(result.dataPoints).toBe(1);
    expect(result.topics.find((topic) => topic.topic === 'DERIV')).toMatchObject({ mastery: null, measured: false, attempts: 0 });
    expect(result.nextBestTopics).toHaveLength(3);
  });

  it('does not make repeated attempts on one problem look like independent evidence', () => {
    const repeated = Array.from({ length: 30 }, (_, i) => ({ id: `retry-${i}`, problemId: 'same-problem', topic: 'TRIG', at: now, correct: i % 2 === 0 }));
    const independent = repeated.map((item, i) => ({ ...item, id: `unique-${i}`, problemId: `problem-${i}` }));
    const repeatedResult = calculateReadiness(repeated, now);
    const independentResult = calculateReadiness(independent, now);
    expect(repeatedResult.effectiveDataPoints).toBe(1);
    expect(independentResult.effectiveDataPoints).toBe(30);
    expect(repeatedResult.low).toBeLessThanOrEqual(independentResult.low);
    expect(repeatedResult.high).toBeGreaterThanOrEqual(independentResult.high);
  });

  it('does not label a single problem repeated across periods as a topic trend', () => {
    const result = calculateReadiness([
      { id: 'old-retry', problemId: 'same-problem', topic: 'TRIG', at: new Date(now.getTime() - 40 * 86_400_000), correct: false },
      { id: 'new-retry', problemId: 'same-problem', topic: 'TRIG', at: now, correct: true },
    ], now);
    expect(result.topics.find((topic) => topic.topic === 'TRIG')?.trend).toBe('FLAT');
  });

  it('widens the range for older evidence and low syllabus coverage', () => {
    const recent = Array.from({ length: 20 }, (_, i) => ({ id: `new-${i}`, problemId: `new-problem-${i}`, topic: 'DERIV', at: now, correct: true }));
    const old = recent.map((item) => ({ ...item, at: new Date(now.getTime() - 50 * 86_400_000) }));
    const broader = recent.map((item, i) => ({ ...item, topic: ['DERIV', 'PLANE', 'TRIG'][i % 3] }));
    const recentResult = calculateReadiness(recent, now);
    const oldResult = calculateReadiness(old, now);
    const broaderResult = calculateReadiness(broader, now);
    expect(oldResult.effectiveDataPoints).toBeLessThan(recentResult.effectiveDataPoints);
    expect(oldResult.high - oldResult.low).toBeGreaterThan(recentResult.high - recentResult.low);
    expect(recentResult.coverage).toBeLessThan(100);
    expect(broaderResult.coverage).toBeGreaterThan(recentResult.coverage);
    expect(broaderResult.high - broaderResult.low).toBeLessThan(recentResult.high - recentResult.low);
  });

  it('calculates early history from its own 60-day window rather than only the current window', () => {
    const oldDate = new Date(now.getTime() - 108 * 86_400_000);
    const data = [{ id: 'old', problemId: 'old-problem', topic: 'TRIG', at: oldDate, correct: true }];
    const result = calculateReadiness(data, now);
    expect(result.weeklyHistory[0].index).toBeGreaterThan(0);
    expect(result.weeklyHistory[7].index).toBe(0);
  });

  it('normalizes date-only Attempt values to the Ulaanbaatar day, including after 16:00 UTC', () => {
    const instant = new Date('2026-09-27T17:00:00.000Z');
    const nextDayAttempt = new Date('2026-09-28T00:00:00.000Z');
    expect(ulaanbaatarDateOnly(instant)).toEqual(nextDayAttempt);
    const result = calculateReadiness([{ id: 'ub-today', problemId: 'problem-ub', topic: 'TOO', at: nextDayAttempt, correct: true }], instant);
    expect(result.dataPoints).toBe(1);
    expect(result.weeklyHistory.at(-1)?.week).toBe('2026-09-28');
  });
});
