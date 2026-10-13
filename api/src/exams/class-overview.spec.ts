import {
  attendanceCounts,
  classOverview,
  studentFlags,
  studentInClass,
  type ClassExamInput,
} from './class-overview';

const roster = [
  { id: 's1', firstName: 'Болд', lastName: 'Бат' },
  { id: 's2', firstName: 'Сараа', lastName: 'Дорж' },
  { id: 's3', firstName: 'Тэмүүлэн', lastName: 'Ган' },
];
const items = [
  { key: 'p:a', label: '1', points: 1, problemId: 'a', order: 1 },
  { key: 'p:b', label: '2', points: 2, problemId: 'b', order: 2 },
];
const topicsOf = (pid: string) => [
  {
    key: pid === 'a' ? 'T1' : 'T2',
    name: pid === 'a' ? 'Логарифм' : 'Интеграл',
  },
];
type Row = {
  result: { total: number; max: number } | null;
  absent: boolean;
  statuses: Map<string, 'CORRECT' | 'WRONG' | 'BLANK'> | null;
};
const marks = (
  a: 'CORRECT' | 'WRONG' | 'BLANK',
  b: 'CORRECT' | 'WRONG' | 'BLANK',
) =>
  new Map([
    ['p:a', a],
    ['p:b', b],
  ]);

function exam(
  id: string,
  day: number,
  students: Record<string, Row>,
): ClassExamInput {
  return {
    testId: id,
    title: `Сорил ${id}`,
    type: 'THOUSAND',
    assignedAt: new Date(Date.UTC(2026, 9, day)),
    items,
    topicsOf,
    students: new Map(Object.entries(students)),
  };
}

const e1 = exam('1', 1, {
  s1: {
    result: { total: 3, max: 3 },
    absent: false,
    statuses: marks('CORRECT', 'CORRECT'),
  },
  s2: {
    result: { total: 1, max: 3 },
    absent: false,
    statuses: marks('CORRECT', 'WRONG'),
  },
  s3: { result: null, absent: true, statuses: null },
});
const e2 = exam('2', 5, {
  s1: {
    result: { total: 1, max: 3 },
    absent: false,
    statuses: marks('CORRECT', 'BLANK'),
  },
  s2: {
    result: { total: 0, max: 3 },
    absent: false,
    statuses: marks('WRONG', 'WRONG'),
  },
  s3: { result: null, absent: false, statuses: null },
});

describe('classOverview — ангийн олон шалгалтын нэгтгэл', () => {
  const out = classOverview({
    roster,
    exams: [e2, e1],
    attendance: [
      { studentId: 's3', status: 'ABSENT' },
      { studentId: 's3', status: 'ABSENT' },
      { studentId: 's3', status: 'PRESENT' },
      { studentId: 's1', status: 'LATE' },
    ],
    homework: [{ studentId: 's2', status: 'NOT_DONE' }],
  });

  it('шалгалт: шинэ нь эхэнд, дундаж, ирээгүй, хүлээгдэж буй', () => {
    expect(
      out.exams.map((e) => [e.testId, e.taken, e.absent, e.pending, e.avg]),
    ).toEqual([
      ['2', 2, 0, 1, 17],
      ['1', 2, 1, 0, 67],
    ]);
  });

  it('сурагч: дундаж, явц (хуучнаас шинэ), ирц, анхаарах', () => {
    const s1 = out.students.find((s) => s.id === 's1')!;
    expect(s1).toMatchObject({
      taken: 2,
      avg: 67,
      last: 33,
      trend: [100, 33],
      flags: ['DECLINING'],
    });
    expect(s1.attendance).toMatchObject({ late: 1, rate: 100 });
    const s2 = out.students.find((s) => s.id === 's2')!;
    expect(s2.flags).toEqual(['LOW_SCORE', 'DECLINING']);
    expect(s2.homework.notDone).toBe(1);
    const s3 = out.students.find((s) => s.id === 's3')!;
    expect(s3).toMatchObject({ taken: 0, missed: 1, avg: null });
    expect(s3.flags).toEqual(['ABSENCES']);
    expect(s3.attendance.rate).toBe(33);
    expect(out.summary).toMatchObject({ students: 3, exams: 2, flagged: 3 });
  });

  it('сэдвээр алдсан оноо (сул нь эхэнд), олон хүн алдсан бодлого', () => {
    // Интеграл (2 оноо): 4 оролдлого, 1 зөв → 2/8 = 25%, алдсан 6
    expect(out.topics[0]).toMatchObject({
      name: 'Интеграл',
      earned: 2,
      max: 8,
      percent: 25,
      lost: 6,
    });
    expect(out.topics[1]).toMatchObject({
      name: 'Логарифм',
      earned: 3,
      max: 4,
      lost: 1,
    });
    expect(out.problems[0]).toMatchObject({
      testId: '2',
      label: '2',
      wrong: 2,
      marked: 2,
      percentWrong: 100,
    });
  });
});

describe('studentInClass, туслахууд', () => {
  it('нэг сурагч: шалгалт бүр ангийн дундажтай, буруу тоо', () => {
    const out = studentInClass(
      's2',
      [e1, e2],
      new Map([
        ['1', 67],
        ['2', 17],
      ]),
    );
    expect(
      out.exams.map((e) => [
        e.testId,
        e.status,
        e.percent,
        e.wrong,
        e.classAvg,
      ]),
    ).toEqual([
      ['2', 'DONE', 0, 2, 17],
      ['1', 'DONE', 33, 1, 67],
    ]);
    expect(out.topics.map((t) => t.name)).toEqual(['Интеграл', 'Логарифм']);
    const s3 = studentInClass('s3', [e1, e2], new Map());
    expect(s3.exams.map((e) => e.status)).toEqual(['PENDING', 'ABSENT']);
  });

  it('ирц: хоцорсон ч ирсэнд тооцно; тэмдэглэгээгүй бол null', () => {
    expect(attendanceCounts(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'])).toEqual({
      present: 1,
      late: 1,
      absent: 1,
      excused: 1,
      rate: 50,
    });
    expect(attendanceCounts([]).rate).toBeNull();
  });

  it('анхаарах дүрэм', () => {
    expect(
      studentFlags({ avg: 90, absences: 0, missed: 2, trend: [80, 85] }),
    ).toEqual(['MISSED_EXAMS']);
    expect(
      studentFlags({ avg: 70, absences: 0, missed: 0, trend: [80, 75] }),
    ).toEqual([]);
  });
});
