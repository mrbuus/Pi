import { correctAnswerView, mergeActivity, myAnswerView, type HomeworkProblemRow } from './homework-logic';
import { plannedAvailable, resolvePlanned } from './planned-tests';

const start = new Date('2026-11-02T10:00:00Z');
const cur = { activeSec: 10, awaySec: 2, leaveCount: 1, openCount: 3 };

describe('mergeActivity', () => {
  it('зөвхөн өснө, openCount-ыг клиент өөрчлөхгүй', () => {
    const now = new Date(start.getTime() + 600_000);
    expect(mergeActivity(cur, { activeSec: 100, awaySec: 50, leaveCount: 4, openCount: 99 }, start, now)).toEqual({
      activeSec: 100,
      awaySec: 50,
      leaveCount: 4,
      openCount: 3,
    });
    expect(mergeActivity(cur, { activeSec: 1, awaySec: 0, leaveCount: 0 }, start, now)).toEqual(cur);
  });

  it('бодит хугацаанаас хэтэрсэн, буруу, сөрөг утгыг үл тооно', () => {
    const now = new Date(start.getTime() + 30_000);
    expect(mergeActivity(cur, { activeSec: 99999, awaySec: 99999, leaveCount: 1e9 }, start, now)).toEqual({
      activeSec: 30,
      awaySec: 30,
      leaveCount: 5000,
      openCount: 3,
    });
    expect(mergeActivity(cur, { activeSec: -1, awaySec: NaN, leaveCount: 'a' }, start, now)).toEqual(cur);
    expect(mergeActivity(cur, null, start, now)).toEqual(cur);
    expect(mergeActivity(cur, [1, 2], start, now)).toEqual(cur);
  });
});

const row = (over: Record<string, unknown>): HomeworkProblemRow =>
  ({
    problemId: 'p',
    order: 1,
    problem: { id: 'p', format: 'CHOICE', statementText: 'x', imageKey: null, choices: ['1', '2', '3'], correctAnswer: 'B', choiceOptions: [], ...over },
  }) as unknown as HomeworkProblemRow;

describe('correctAnswerView / myAnswerView', () => {
  it('хуучин загвар: үсэг', () => {
    expect(correctAnswerView(row({}))).toBe('B');
  });
  it('шинэ загвар: isCorrect-тэй сонголтын байрлал → үсэг', () => {
    expect(
      correctAnswerView(
        row({
          correctAnswer: 'ignored',
          choiceOptions: [
            { order: 1, text: 'a', isCorrect: false },
            { order: 3, text: 'c', isCorrect: true },
            { order: 2, text: 'b', isCorrect: false },
          ],
        }),
      ),
    ).toBe('C');
  });
  it('нөхөх бодлого: нүд бүрийн утга; түлхүүргүй бодлого null', () => {
    expect(correctAnswerView(row({ format: 'FILL_NUMBER', choices: null, correctAnswer: { a: '3', b: 5 } }))).toEqual({ a: '3', b: '5' });
    expect(correctAnswerView(row({ correctAnswer: { reason: 'ANSWER_KEY_MISSING' } }))).toBeNull();
  });
  it('сурагчийн хариу: хоосон null, тоо/мөр/нүд', () => {
    expect(myAnswerView(undefined)).toBeNull();
    expect(myAnswerView(' ')).toBeNull();
    expect(myAnswerView('c ')).toBe('c');
    expect(myAnswerView(35)).toBe('35');
    expect(myAnswerView({ a: '3', b: '' })).toEqual({ a: '3', b: '' });
  });
});

describe('planned-tests', () => {
  it('plannedAvailable: өнгөрсөн өдөр, өнөөдөр дуусаагүй/дууссан', () => {
    expect(plannedAvailable('2026-11-01', 1000, '2026-11-02', 0)).toBe(true);
    expect(plannedAvailable('2026-11-02', 1000, '2026-11-02', 999)).toBe(false);
    expect(plannedAvailable('2026-11-02', 1000, '2026-11-02', 1000)).toBe(true);
    expect(plannedAvailable('2026-11-03', 1000, '2026-11-02', 2000)).toBe(false);
  });

  it('resolvePlanned: цуцалсан алгасна, зөөсөн нь шинэ өдөр, нээгдээгүй нь testId=null, reserved бүгд', () => {
    const topics = [
      { scheduleId: 's1', classroomId: 'c1', date: '2026-10-30', endMinute: 600, testIds: ['T1'] },
      { scheduleId: 's1', classroomId: 'c1', date: '2026-10-31', endMinute: 600, testIds: ['T2'] },
      { scheduleId: 's2', classroomId: 'c1', date: '2026-11-01', endMinute: 600, testIds: ['T3'] },
      { scheduleId: 's2', classroomId: 'c1', date: '2026-11-05', endMinute: 600, testIds: ['T4', 'T5'] },
      { scheduleId: 's3', classroomId: 'c2', date: '2026-10-30', endMinute: 600, testIds: [] },
    ];
    const ex = [
      { scheduleId: 's1', date: '2026-10-31', kind: 'CANCELLED' as const, newDate: null },
      { scheduleId: 's2', date: '2026-11-01', kind: 'MOVED' as const, newDate: '2026-11-02' },
    ];
    const r = resolvePlanned(topics, ex, '2026-11-02', 700);
    expect(r.sessions).toEqual([
      { classroomId: 'c1', date: '2026-10-30', testId: 'T1' },
      { classroomId: 'c1', date: '2026-11-02', testId: 'T3' }, // зөөгдсөн, өнөөдөр 11:40 > 10:00 дууссан
      { classroomId: 'c1', date: '2026-11-05', testId: null },
    ]);
    expect(r.reserved.map((x) => `${x.testId}@${x.date}`).sort()).toEqual([
      'T1@2026-10-30',
      'T3@2026-11-02',
      'T4@2026-11-05',
      'T5@2026-11-05',
    ]);
  });
});
