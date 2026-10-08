import {
  historyWindow,
  parentLearningMeta,
  historyPage,
  enrollmentDayScopes,
} from './parent-history';
describe('parent annual history contract', () => {
  it('bounds calendar year, page and exclusive next-year end', () => {
    const w = historyWindow('2024', '2', new Date('2026-10-07T00:00:00Z'));
    expect(w.start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(w.end.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(w.skip).toBe(50);
    for (const year of ['1999', '2028', '2026junk', '-1', 'Infinity', '2026.1'])
      expect(() =>
        historyWindow(year, undefined, new Date('2026-01-01')),
      ).toThrow();
    for (const page of ['0', '-1', '1001', '2junk', '1.5'])
      expect(() =>
        historyWindow('2026', page, new Date('2026-01-01')),
      ).toThrow();
  });
  it('only known learning evidence fields reach parent', () => {
    expect(parentLearningMeta({ kind: 'first', note: 'private' })).toBeNull();
    expect(
      parentLearningMeta({
        lab: 'v1',
        kind: 'first',
        answer: '2',
        correct: true,
        mode: 'probe',
        flags: ['help', 'private'],
        staffNote: 'private',
        timing: { buttons: 100 },
        internalCode: 'secret',
      }),
    ).toEqual({
      kind: 'first',
      answer: '2',
      correct: true,
      mode: 'probe',
      flags: ['help'],
    });
  });
  it('bounded history details report whether another page exists', () => {
    expect(historyPage(Array.from({ length: 51 }, (_, i) => i))).toEqual({
      rows: Array.from({ length: 50 }, (_, i) => i),
      hasMore: true,
    });
  });
  it('class dismissal history follows pupil historical enrollment calendar days only', () => {
    const start = new Date('2026-01-01'),
      end = new Date('2027-01-01');
    const scopes = enrollmentDayScopes(
      [
        {
          classroomId: 'old',
          joinedAt: new Date('2025-12-20T16:00Z'),
          leftAt: new Date('2026-05-01T02:00Z'),
        },
        {
          classroomId: 'new',
          joinedAt: new Date('2026-05-01T02:00Z'),
          leftAt: null,
        },
        {
          classroomId: 'future',
          joinedAt: new Date('2027-01-01T00:00Z'),
          leftAt: null,
        },
      ],
      start,
      end,
    );
    expect(scopes).toEqual([
      { classroomId: 'old', date: { gte: start, lt: new Date('2026-05-01') } },
      { classroomId: 'new', date: { gte: new Date('2026-05-01'), lt: end } },
    ]);
  });
});
