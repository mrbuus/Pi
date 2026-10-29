import { Subject } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { chapterListAccess } from './chapter-visibility';
import { ContentService } from './content.service';

const emptyScope = { all: false, chapterIds: [], bookIds: [], testIds: [] };
const release = (chapterIds: string[]) => ({
  testIds: new Set<string>(),
  problemIds: new Set<string>(),
  chapterIds: new Set(chapterIds),
});

describe('chapterListAccess (chapterGrant-тай ижил)', () => {
  const ctx = {
    scope: emptyScope,
    ownSubjects: new Set([Subject.MATH]),
    release: release(['rel']),
  };
  const ch = (id: string, extra = {}) => ({
    id,
    bookId: 'b1',
    freePreview: false,
    subject: Subject.MATH,
    ...extra,
  });
  it('freePreview MATH → full', () => {
    expect(chapterListAccess(ch('x', { freePreview: true }), ctx)).toBe('full');
  });
  it('нээгдсэн тесттэй бүлэг → released, бусад → none', () => {
    expect(chapterListAccess(ch('rel'), ctx)).toBe('released');
    expect(chapterListAccess(ch('other'), ctx)).toBe('none');
  });
  it('pass/худалдан авалт → full', () => {
    expect(chapterListAccess(ch('a'), { ...ctx, scope: { ...emptyScope, bookIds: ['b1'] } })).toBe('full');
    expect(chapterListAccess(ch('a'), { ...ctx, scope: { ...emptyScope, chapterIds: ['a'] } })).toBe('full');
    expect(chapterListAccess(ch('a'), { ...ctx, scope: { ...emptyScope, all: true } })).toBe('full');
  });
  it('өөрийн ангид байхгүй хаалттай хичээл → none (freePreview ч хүрэхгүй)', () => {
    const social = ch('rel', { subject: Subject.SOCIAL_STUDIES, freePreview: true });
    expect(chapterListAccess(social, ctx)).toBe('none');
    expect(
      chapterListAccess(social, { ...ctx, ownSubjects: new Set([Subject.SOCIAL_STUDIES]) }),
    ).toBe('full');
  });
});

function mockPrisma(opts: { role: string; classroom: boolean }) {
  const chapters = [
    { id: 'ch1', bookId: 'b1', freePreview: false, book: { subject: 'MATH' }, _count: { problems: 10 } },
    { id: 'ch2', bookId: 'b1', freePreview: false, book: { subject: 'MATH' }, _count: { problems: 10 } },
    { id: 'ch3', bookId: 'b1', freePreview: true, book: { subject: 'MATH' }, _count: { problems: 5 } },
    { id: 'ch4', bookId: 'b1', freePreview: false, book: { subject: 'MATH' }, _count: { problems: 3 } },
  ];
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ role: opts.role, archivedAt: null, externalTeacherProfile: null }) },
    studentProfile: {
      findUnique: jest.fn().mockResolvedValue(opts.classroom ? { type: 'CLASSROOM', activatedAt: new Date() } : { type: 'ONLINE' }),
    },
    enrollment: {
      findFirst: jest.fn().mockResolvedValue(opts.classroom ? { id: 'e' } : null),
      findMany: jest.fn().mockResolvedValue(opts.classroom ? [{ classroomId: 'c1', classroom: { subject: null } }] : []),
    },
    parentLink: { findMany: jest.fn().mockResolvedValue([]) },
    classTestSession: { findMany: jest.fn().mockResolvedValue([{ testId: 't1' }]) },
    testAccess: { findMany: jest.fn().mockResolvedValue([]) },
    test: { findMany: jest.fn().mockResolvedValue([{ id: 't1' }]) },
    testProblem: {
      findMany: jest.fn().mockResolvedValue([
        { problemId: 'p1', problem: { chapterId: 'ch2' } },
        { problemId: 'p2', problem: { chapterId: 'ch2' } },
        { problemId: 'p9', problem: { chapterId: 'ch4' } },
      ]),
    },
    userPass: { findMany: jest.fn().mockResolvedValue([]) },
    purchase: { findMany: jest.fn().mockResolvedValue([]) },
    problem: { groupBy: jest.fn().mockResolvedValue([{ chapterId: 'ch2', _count: { _all: 2 } }]) },
    chapter: { findMany: jest.fn().mockResolvedValue(chapters) },
    book: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('ContentService.listBooks — сурагч/ажилтан', () => {
  it('сурагчид studentHidden:false + displayOrder эрэмбэ', async () => {
    const prisma = mockPrisma({ role: 'STUDENT', classroom: true });
    const svc = new ContentService(prisma as unknown as PrismaService);
    await svc.listBooks(undefined, { userId: 'u', role: 'STUDENT' as never });
    const q = prisma.book.findMany.mock.calls[0][0];
    expect(q.where).toMatchObject({ archived: false, deletedAt: null, studentHidden: false });
    expect(q.orderBy).toEqual([{ displayOrder: { sort: 'asc', nulls: 'last' } }, { code: 'asc' }]);
  });
  it('нэвтрээгүй ч мөн нуугдана', async () => {
    const prisma = mockPrisma({ role: 'STUDENT', classroom: false });
    const svc = new ContentService(prisma as unknown as PrismaService);
    await svc.listBooks(undefined, null);
    expect(prisma.book.findMany.mock.calls[0][0].where.studentHidden).toBe(false);
  });
  it('төвийн ажилтан бүх номыг харна', async () => {
    const prisma = mockPrisma({ role: 'ADMIN', classroom: false });
    const svc = new ContentService(prisma as unknown as PrismaService);
    await svc.listBooks(undefined, { userId: 'a', role: 'ADMIN' as never });
    expect(prisma.book.findMany.mock.calls[0][0].where).not.toHaveProperty('studentHidden');
  });
});

describe('ContentService.listChapters — танхимын сурагч', () => {
  it('зөвхөн эрхтэй/нээгдсэн бүлэг, нээгдсэн бодлогын тоотой; DB-г нэг удаа', async () => {
    const prisma = mockPrisma({ role: 'STUDENT', classroom: true });
    const svc = new ContentService(prisma as unknown as PrismaService);
    const rows = (await svc.listChapters(undefined, 'b1', undefined, {
      userId: 'u',
      role: 'STUDENT' as never,
    })) as { id: string; access?: string; accessibleProblems?: number }[];
    expect(rows.map((r) => [r.id, r.access, r.accessibleProblems])).toEqual([
      ['ch2', 'released', 2],
      ['ch3', 'full', 5],
    ]);
    expect(prisma.classTestSession.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.problem.groupBy).toHaveBeenCalledTimes(1);
    const where = prisma.chapter.findMany.mock.calls[0][0].where;
    expect(where.OR[1]).toEqual({ book: { archived: false, deletedAt: null, studentHidden: false } });
  });
  it('ангигүй сурагч: жагсаалт өөрчлөгдөхгүй (түгжээтэй бүлгээ харна)', async () => {
    const prisma = mockPrisma({ role: 'STUDENT', classroom: false });
    const svc = new ContentService(prisma as unknown as PrismaService);
    const rows = await svc.listChapters(undefined, 'b1', undefined, { userId: 'u', role: 'STUDENT' as never });
    expect(rows).toHaveLength(4);
  });
  it('ажилтан: бүх бүлэг, release тооцохгүй', async () => {
    const prisma = mockPrisma({ role: 'ADMIN', classroom: false });
    const svc = new ContentService(prisma as unknown as PrismaService);
    const rows = await svc.listChapters(undefined, 'b1', undefined, { userId: 'a', role: 'ADMIN' as never });
    expect(rows).toHaveLength(4);
    expect(prisma.classTestSession.findMany).not.toHaveBeenCalled();
    expect(prisma.chapter.findMany.mock.calls[0][0].where.OR[1]).toEqual({ book: { archived: false, deletedAt: null } });
  });
});
