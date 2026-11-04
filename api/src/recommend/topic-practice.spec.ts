import { RecommendService } from './recommend.service';
import { parseChapterIds } from './recommend.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MistakeCollector } from '../mistakes/mistake-collector.service';
import { Role } from '../generated/prisma/enums';

function fixture() {
  return {
    attempt: { findMany: jest.fn().mockResolvedValue([]) },
    enrollment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    learningEvent: { findMany: jest.fn().mockResolvedValue([]) },
    studentProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    userPass: { findMany: jest.fn().mockResolvedValue([]) },
    purchase: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    chapter: {
      findMany: jest.fn().mockResolvedValue([{ id: 'focus', bookId: null, freePreview: true, order: 4, grade: null }]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    problem: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1', chapterId: 'focus', attemptCount: 10, correctRate: 0.5 }]),
    },
    classTestSession: { findFirst: jest.fn().mockResolvedValue(null) },
    book: { findUnique: jest.fn().mockResolvedValue({ subject: 'MATH' }) },
  };
}
const make = (db: ReturnType<typeof fixture>) =>
  new RecommendService(db as unknown as PrismaService, {} as MistakeCollector);

describe('Сэдвээр дасгал (chapterId шүүлтүүр)', () => {
  it('зөвхөн сонгосон, эрхтэй бүлгээс; эрхийн шүүлтүүр хэвээр', async () => {
    const db = fixture();
    const r = await make(db).getNextProblems('pupil', 5, Role.STUDENT, ['focus']);
    expect(r.map((x) => x.problemId)).toEqual(['p1']);
    const where = db.chapter.findMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ in: ['focus'] });
    expect(where.AND[0]).toHaveProperty('OR');
    expect(db.chapter.findMany).toHaveBeenCalledTimes(1);
    const chapterQueries = db.problem.findMany.mock.calls.filter((c) => c[0].where.chapterId);
    expect(chapterQueries.map((c) => c[0].where.chapterId)).toEqual(['focus']);
  });

  it('эрхгүй/байхгүй бүлэг → хоосон', async () => {
    const db = fixture();
    db.chapter.findMany.mockResolvedValue([]);
    await expect(make(db).getNextProblems('pupil', 5, Role.STUDENT, ['locked'])).resolves.toEqual([]);
    expect(db.problem.findMany.mock.calls.filter((c) => c[0].where.chapterId)).toEqual([]);
  });

  it('бүх бодлогыг бодсон бол бодсоноос нь давтуулна', async () => {
    const db = fixture();
    db.attempt.findMany.mockResolvedValue([
      {
        problemId: 'p1',
        problem: { chapterId: 'focus' },
        autoCorrect: false,
        selfState: null,
        source: 'ONLINE_TEST',
        createdAt: new Date('2026-10-01'),
      },
    ]);
    db.problem.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 'p1', chapterId: 'focus', attemptCount: 10, correctRate: 0.5 },
    ]);
    const r = await make(db).getNextProblems('pupil', 5, Role.STUDENT, ['focus']);
    expect(r.map((x) => x.problemId)).toEqual(['p1']);
  });

  it('буруу ID 400', async () => {
    const service = make(fixture());
    await expect(service.getNextProblems('p', 5, Role.STUDENT, ['bad id'])).rejects.toMatchObject({ status: 400 });
    await expect(service.getNextProblems('p', 5, Role.STUDENT, [])).rejects.toMatchObject({ status: 400 });
    await expect(
      service.getNextProblems('p', 5, Role.STUDENT, Array.from({ length: 13 }, (_, i) => `c${i}`)),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('query: таслалтай эсвэл давтагдсан', () => {
    expect(parseChapterIds(undefined)).toBeUndefined();
    expect(parseChapterIds('')).toBeUndefined();
    expect(parseChapterIds('a, b')).toEqual(['a', 'b']);
    expect(parseChapterIds(['a', 'b,c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('Хичээлийн сэдэв → бүлэг (chapter-match)', () => {
  it('эрхгүй бүлгийг буцаахгүй; таарахгүй бол null', async () => {
    const db = fixture();
    db.chapter.findMany
      .mockResolvedValueOnce([
        { id: 'r1', title: 'Рациональ тэгшитгэл · Тест 1', order: 1, grade: null },
        { id: 'r2', title: 'Рациональ тэгшитгэл · Тест 2', order: 2, grade: null },
      ])
      .mockResolvedValueOnce([
        { id: 'r1', bookId: null, freePreview: true },
        { id: 'r2', bookId: 'paid-book', freePreview: false },
      ]);
    const res = await make(db).matchLessonTopic('pupil', 'Рациональ тэгшитгэл');
    expect(res).toEqual({ chapterId: 'r1', chapterIds: ['r1'], title: 'Рациональ тэгшитгэл' });

    const none = fixture();
    none.chapter.findMany.mockResolvedValueOnce([{ id: 'u', title: 'Уламжлалын хэрэглээ', order: 1, grade: null }]);
    await expect(make(none).matchLessonTopic('pupil', 'Интеграл')).resolves.toEqual({
      chapterId: null,
      chapterIds: [],
      title: null,
    });
  });

  it('хоосон/урт сэдэв 400, ажилтан 403', async () => {
    const service = make(fixture());
    await expect(service.matchLessonTopic('p', '  ')).rejects.toMatchObject({ status: 400 });
    await expect(service.matchLessonTopic('p', 'x'.repeat(161))).rejects.toMatchObject({ status: 400 });
    await expect(service.matchLessonTopic('p', 'Интеграл', Role.TEACHER)).rejects.toMatchObject({ status: 403 });
  });
});
