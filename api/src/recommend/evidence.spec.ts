import { measuredEvidence, observedDifficulty } from './evidence';
const row = (
  problemId: string,
  correct: boolean | null,
  selfState: string | null = null,
  source = 'ONLINE_TEST',
  day = 1,
) => ({
  problemId,
  correct,
  selfState,
  source,
  topicId: 'topic',
  at: new Date(`2026-10-${String(day).padStart(2, '0')}T12:00Z`),
});
describe('measured independent recommendation evidence', () => {
  it('unknown, corrected and self-report are never independent failures or clean successes', () => {
    const x = measuredEvidence([
      row('unknown', null),
      row('corrected', true, 'FIXED_AFTER_ERROR'),
      row('self', null, 'SOLVED_CLEAN', 'EVENING_SELF_REPORT'),
      row('measured', false),
    ]);
    expect(x.history.map((h) => h.problemId)).toEqual(['measured']);
    expect(x.topics.get('topic')).toMatchObject({
      independentAttempts: 1,
      independentCorrect: 0,
      unknown: 1,
      corrected: 1,
      selfReported: 1,
    });
  });
  it('repeats and solution/help/guessed exposure cannot inflate independent success', () => {
    const x = measuredEvidence(
      [
        row('first', false),
        row('first', true, null, 'ONLINE_TEST', 2),
        { ...row('help', true), assisted: true },
        row('guessed', true, 'GUESSED'),
        row('exposed', true),
      ],
      [{ problemId: 'exposed', at: new Date('2026-10-01T11:00Z') }],
    );
    expect(x.history).toHaveLength(1);
    expect(x.topics.get('topic')).toMatchObject({
      independentCorrect: 0,
      repeated: 1,
      guessedOrHelped: 3,
    });
  });
  it('later solution viewing does not erase a prior measured original answer', () => {
    expect(
      measuredEvidence(
        [row('first', true)],
        [{ problemId: 'first', at: new Date('2026-10-02T11:00Z') }],
      ).history[0].correct,
    ).toBe(true);
  });
  it('actual zero accuracy is hardest, only null means unknown default', () => {
    expect(observedDifficulty(0)).toBe(1);
    expect(observedDifficulty(null)).toBe(0.5);
    expect(observedDifficulty(1)).toBe(0);
  });
});
