import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { ClassSessionsController } from './class-sessions.controller';
import { ClassSessionsService } from './class-sessions.service';
import {
  buildRoadmap,
  excludedNumbersOf,
  topicNameOf,
  type RoadmapChapterIn,
  type RoadmapTestIn,
} from './roadmap.logic';

const BOOKS = [
  { id: 'b200', code: '200V3', title: '200x200' },
  { id: 'b100', code: '100V3', title: '100x100' },
];
// 100V3: Тоо тоолол 1..3; 200V3: Урвуу функц 1..3 — бүлэг бүр A/B
const CH: RoadmapChapterIn[] = [
  { id: 'c103', bookId: 'b100', order: 103, title: 'Тоо тоолол · Тест 3' },
  { id: 'c101', bookId: 'b100', order: 101, title: 'Тоо тоолол · Тест 1' },
  { id: 'c102', bookId: 'b100', order: 102, title: 'Тоо тоолол · Тест 2' },
  { id: 'c501', bookId: 'b200', order: 501, title: 'Урвуу функц · Тест 1' },
  { id: 'c502', bookId: 'b200', order: 502, title: 'Урвуу функц · Тест 2' },
  { id: 'c503', bookId: 'b200', order: 503, title: 'Урвуу функц · Тест 3' },
];
const name = (c: RoadmapChapterIn) => `${topicNameOf(c.title)} ${c.title.split(' ').pop()}`;
const TESTS: RoadmapTestIn[] = CH.flatMap((c) =>
  ['B', 'A'].map((v) => ({
    id: `${c.id}${v}`,
    chapterId: c.id,
    title: name(c),
    variantLabel: v,
    problemIds: [1, 2, 3, 4].map((n) => `${c.id}${v}p${n}`),
  })),
);
const base = { books: BOOKS, chapters: CH, tests: TESTS, removedTestIds: [] as string[] };
const flat = (r: ReturnType<typeof buildRoadmap>) =>
  r.books.flatMap((b) => b.topics.flatMap((t) => t.chapters.map((c) => [c.chapterId, c.tests[0].status, c.tests[0].variant])));

describe('Замын зураг (roadmap.logic)', () => {
  it('номын дараалал: 100V3 → 200V3, бүлгийн order-оор; сэдвээр бүлэглэнэ; A хувилбар эхэнд', () => {
    const r = buildRoadmap({ ...base, sessions: [] });
    expect(r.books.map((b) => b.code)).toEqual(['100V3', '200V3']);
    expect(r.books[0].topics.map((t) => t.name)).toEqual(['Тоо тоолол']);
    expect(flat(r).map((x) => x[0])).toEqual(['c101', 'c102', 'c103', 'c501', 'c502', 'c503']);
    expect(flat(r).every((x) => x[2] === 'A')).toBe(true);
    // Юу ч хийгээгүй бол эхнээс нь санал болгоно (A хувилбар)
    expect(r.next.slice(0, 2)).toEqual(['c101A', 'c102A']);
    expect(r.books[0].topics[0].chapters[0].tests[0]).toMatchObject({
      short: 'Тоо тоолол 1',
      problemCount: 4,
      status: 'TODO',
    });
  });

  it('хамгийн хол хийсэн тестийн дараахаас санал болгоно; дуусвал 200V3 үргэлжилнэ', () => {
    const r = buildRoadmap({
      ...base,
      sessions: [{ testId: 'c103A', date: '2026-10-10', excludedProblemIds: [] }],
    });
    expect(r.next[0]).toBe('c501A');
    const r2 = buildRoadmap({
      ...base,
      sessions: [{ testId: 'c501A', date: '2026-10-12', excludedProblemIds: [] }],
    });
    expect(r2.next).toEqual(['c502A', 'c503A']);
  });

  it('хийсэн: DONE (хувилбар бүрд), хассан дугаар; өмнөх хийгээгүй нь SKIPPED (номын дотор)', () => {
    const r = buildRoadmap({
      ...base,
      sessions: [
        { testId: 'c102A', date: '2026-10-05', excludedProblemIds: ['c102Ap3', 'c102Ap1'] },
        { testId: 'c501A', date: '2026-10-08', excludedProblemIds: [] },
      ],
    });
    const map = Object.fromEntries(flat(r).map((x) => [x[0], x[1]]));
    expect(map).toEqual({
      c101: 'SKIPPED',
      c102: 'DONE',
      c103: 'TODO', // 100V3-ийн хамгийн хол хийсний ДАРАА — үлдсэн биш
      c501: 'DONE',
      c502: 'TODO',
      c503: 'TODO',
    });
    const c102 = r.books[0].topics[0].chapters[1].tests;
    expect(c102[0]).toMatchObject({ variant: 'A', doneOn: '2026-10-05', excludedNumbers: [1, 3] });
    expect(c102[1]).toMatchObject({ variant: 'B', status: 'DONE' });
    expect(c102[1].excludedNumbers).toBeUndefined();
    expect(r.next).toEqual(['c502A', 'c503A']);
  });

  it('ангиас хассан тест REMOVED, санал болгохгүй; хийсэн нь хассанаас давамгайлна', () => {
    const r = buildRoadmap({
      ...base,
      sessions: [{ testId: 'c101A', date: '2026-10-01', excludedProblemIds: [] }],
      removedTestIds: ['c102A', 'c101B'],
    });
    const map = Object.fromEntries(flat(r).map((x) => [x[0], x[1]]));
    expect(map.c102).toBe('REMOVED');
    expect(map.c101).toBe('DONE');
    expect(r.next[0]).toBe('c103A');
    expect(r.next).not.toContain('c102A');
  });

  it('өмнөх хичээлд төлөвлөсөн (батлаагүй) тестийн дараахаас санал болгоно', () => {
    const r = buildRoadmap({
      ...base,
      sessions: [{ testId: 'c501A', date: '2026-10-12', excludedProblemIds: [] }],
      plans: [{ testIds: ['c502A'], date: '2026-10-14' }],
    });
    expect(r.next).toEqual(['c503A']);
    const t = r.books[1].topics[0].chapters[1].tests[0];
    expect(t).toMatchObject({ status: 'TODO', plannedOn: '2026-10-14' });
  });

  it('excludedNumbersOf — TestProblem.order дээрх байр (1-ээс)', () => {
    expect(excludedNumbersOf(['a', 'b', 'c'], ['c', 'a'])).toEqual([1, 3]);
    expect(excludedNumbersOf(['a'], [])).toEqual([]);
  });
});

describe('Замын зургийн маршрутын эрх', () => {
  const roles = (name: keyof ClassSessionsController) =>
    Reflect.getMetadata(ROLES_KEY, ClassSessionsController.prototype[name]);
  it('roadmap — ажилтан; тест хасах — Багш+, Админ л', () => {
    expect([...roles('roadmap')].sort()).toEqual(
      [Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS].sort(),
    );
    expect([...roles('setTestStatus')].sort()).toEqual(
      [Role.ADMIN, Role.TEACHER_PLUS].sort(),
    );
  });

  it('REMOVED — тухайн тест; буцаахад бүлгийн бүх хувилбараас арилгана; аудит', async () => {
    const prisma: any = {
      classroom: { findUnique: jest.fn(async () => ({ id: 'c', archived: false })) },
      test: {
        findFirst: jest.fn(async () => ({ id: 'tA', chapterId: 'ch' })),
        findMany: jest.fn(async () => [{ id: 'tA' }, { id: 'tB' }]),
      },
      classTestStatus: {
        findMany: jest.fn(async () => []),
        upsert: jest.fn(async () => ({})),
        deleteMany: jest.fn(async () => ({})),
      },
      auditLog: { create: jest.fn(async () => ({})) },
    };
    const svc = new ClassSessionsService(prisma);
    await svc.setTestStatus('c', 'tA', 'REMOVED', 'tp', Role.TEACHER_PLUS);
    expect(prisma.classTestStatus.upsert.mock.calls[0][0]).toMatchObject({
      where: { classroomId_testId: { classroomId: 'c', testId: 'tA' } },
      create: { status: 'REMOVED', updatedById: 'tp' },
    });
    await svc.setTestStatus('c', 'tA', null, 'tp', Role.TEACHER_PLUS);
    expect(prisma.classTestStatus.deleteMany.mock.calls[0][0].where).toEqual({
      classroomId: 'c',
      testId: { in: ['tA', 'tB'] },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
    prisma.test.findFirst.mockResolvedValueOnce(null);
    await expect(svc.setTestStatus('c', 'x', 'REMOVED', 'tp', Role.TEACHER_PLUS)).rejects.toThrow('Тест');
  });
});
