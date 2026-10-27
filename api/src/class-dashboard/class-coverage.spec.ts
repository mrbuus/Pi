import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { buildRoadmap } from '../class-sessions/roadmap.logic';
import { Role } from '../generated/prisma/enums';
import {
  buildCoverageTree,
  furthestCoveredChapter,
  planPastSave,
} from './class-coverage.logic';
import { ClassCoverageService } from './class-coverage.service';
import { ClassDashboardController } from './class-dashboard.controller';
import { ClassDashboardService } from './class-dashboard.service';

describe('«Өмнө үзсэн сэдэв» — цэвэр логик', () => {
  it('шинэ сонголт → үүсгэнэ', () => {
    expect(planPastSave([], ['t2', 't1', 't1'])).toEqual({
      create: ['t1', 't2'],
      restore: [],
      remove: [],
      keep: [],
    });
  });

  it('давтан хадгалах — өөрчлөлтгүй (idempotent)', () => {
    const rows = [
      { testId: 't1', removedAt: null },
      { testId: 't2', removedAt: null },
    ];
    expect(planPastSave(rows, ['t2', 't1'])).toEqual({
      create: [],
      restore: [],
      remove: [],
      keep: ['t1', 't2'],
    });
  });

  it('сонголтоос гаргавал зөөлөн хасна, хассаныг дахин сонговол сэргээнэ', () => {
    const rows = [
      { testId: 't1', removedAt: null },
      { testId: 't2', removedAt: new Date('2026-10-20') },
    ];
    expect(planPastSave(rows, ['t2'])).toEqual({
      create: [],
      restore: ['t2'],
      remove: ['t1'],
      keep: [],
    });
  });

  const books = [
    { id: 'b2', code: '200V3', title: '200x200' },
    { id: 'b1', code: '100V3', title: '100x100' },
    { id: 'bh', code: 'HAV', title: 'Хавтгай' },
  ];
  const chapters = [
    { id: 'c11', bookId: 'b1', order: 1, title: 'Олонлог · Тест 1' },
    { id: 'c12', bookId: 'b1', order: 2, title: 'Олонлог · Тест 2' },
    { id: 'c21', bookId: 'b2', order: 1, title: 'Функц · Тест 1' },
    { id: 'c22', bookId: 'b2', order: 2, title: 'Функц · Тест 2' },
    { id: 'cempty', bookId: 'b2', order: 3, title: 'Тестгүй' },
    { id: 'ch1', bookId: 'bh', order: 1, title: 'Гурвалжин' },
  ];
  const tests = [
    { id: 't11B', chapterId: 'c11', title: 'Олонлог 1', variantLabel: 'B' },
    { id: 't11A', chapterId: 'c11', title: 'Олонлог 1', variantLabel: 'A' },
    { id: 't12A', chapterId: 'c12', title: 'Олонлог 2', variantLabel: 'A' },
    { id: 't21A', chapterId: 'c21', title: 'Функц 1', variantLabel: 'A' },
    { id: 't22A', chapterId: 'c22', title: 'Функц 2', variantLabel: 'A' },
    { id: 'th1', chapterId: 'ch1', title: 'Гурвалжин', variantLabel: null },
  ];

  it('мод: 100V3 → 200V3 → бусад, тестгүй бүлэг орохгүй, огноотой ба огноогүйг нэгтгэнэ', () => {
    const tree = buildCoverageTree({
      books,
      chapters,
      tests,
      pastTestIds: ['t11A', 't11B', 't21A'],
      lessonDates: new Map([
        ['t21A', ['2026-10-25', '2026-10-24']],
        ['t12A', ['2026-10-26']],
      ]),
    });
    expect(tree.map((b) => b.code)).toEqual(['100V3', '200V3', 'HAV']);
    expect(tree[0].chapters[0].tests.map((t) => t.variant)).toEqual(['A', 'B']);
    expect(tree[0]).toMatchObject({
      totalChapters: 2,
      coveredChapters: 2,
      pastChapters: 1,
    });
    expect(tree[1].chapters.map((c) => c.id)).toEqual(['c21', 'c22']);
    expect(tree[1].chapters[0].tests[0]).toEqual({
      id: 't21A',
      title: 'Функц 1',
      variant: 'A',
      past: true,
      lessonDates: ['2026-10-24', '2026-10-25'],
    });
    expect(tree[1]).toMatchObject({ coveredChapters: 1, pastChapters: 0 });
  });

  it('одоогийн бүлэг: үндсэн номын хамгийн хол үзсэн бүлэг', () => {
    expect(
      furthestCoveredChapter({
        books,
        chapters,
        coveredChapterIds: ['c11', 'c22', 'ch1'],
      }),
    ).toBe('c22');
    expect(
      furthestCoveredChapter({ books, chapters, coveredChapterIds: ['ch1'] }),
    ).toBe('ch1');
    expect(
      furthestCoveredChapter({ books, chapters, coveredChapterIds: [] }),
    ).toBeNull();
  });

  it('замын зураг: өмнө үзсэн бүлэг DONE (огноогүй), дараагийн санал түүний дараахаас', () => {
    const r = buildRoadmap({
      books: books.slice(0, 2),
      chapters: chapters.filter((c) => c.bookId !== 'bh'),
      tests: tests
        .filter((t) => t.chapterId !== 'ch1')
        .map((t) => ({ ...t, problemIds: ['p1', 'p2'] })),
      sessions: [],
      removedTestIds: [],
      pastTestIds: ['t11A', 't12A', 't21A'],
    });
    const c11 = r.books[0].topics[0].chapters[0];
    expect(c11.tests.find((t) => t.testId === 't11A')).toMatchObject({
      status: 'DONE',
      past: true,
    });
    expect(c11.tests.find((t) => t.testId === 't11A')?.doneOn).toBeUndefined();
    // B хувилбар нь өөрөө тэмдэглэгдээгүй ч бүлэг нь DONE
    expect(c11.tests.find((t) => t.testId === 't11B')).toMatchObject({
      status: 'DONE',
    });
    expect(c11.tests.find((t) => t.testId === 't11B')?.past).toBeUndefined();
    expect(r.next).toEqual(['t22A']);
  });
});

/** ClassCoveredTest-ийн санах ойн хуулбар — сервисийн ашигладаг where хэлбэрүүд */
function fakePrisma(
  opts: { role?: string; external?: boolean; archived?: boolean } = {},
) {
  type Row = {
    id: string;
    classroomId: string;
    testId: string;
    chapterId: string | null;
    source: string;
    createdById: string;
    removedAt: Date | null;
    removedById: string | null;
    updatedById?: string | null;
  };
  const rows: Row[] = [];
  const inList = (v: string, w?: { in: string[] }) => !w || w.in.includes(v);
  const removedMatch = (r: Row, w: unknown) =>
    w === undefined
      ? true
      : w === null
        ? r.removedAt === null
        : r.removedAt !== null; // { not: null }
  const match = (r: Row, where: any) =>
    r.classroomId === where.classroomId &&
    inList(r.testId, where.testId) &&
    removedMatch(r, where.removedAt);
  const prisma: any = {
    user: {
      findUnique: jest.fn(async () => ({
        role: opts.role ?? Role.TEACHER,
        archivedAt: null,
        externalTeacherProfile: opts.external ? { userId: 'x' } : null,
      })),
    },
    classroom: {
      findUnique: jest.fn(async () => ({
        id: 'c1',
        archived: !!opts.archived,
        subject: null,
      })),
    },
    book: {
      findMany: jest.fn(async () => [
        { id: 'b1', code: '100V3', title: '100x100' },
      ]),
    },
    chapter: {
      findMany: jest.fn(async () => [
        { id: 'ch1', bookId: 'b1', order: 1, title: 'Олонлог · Тест 1' },
        { id: 'ch2', bookId: 'b1', order: 2, title: 'Олонлог · Тест 2' },
      ]),
    },
    test: {
      findMany: jest.fn(async () => [
        { id: 'tA', chapterId: 'ch1', title: 'Олонлог 1', variantLabel: 'A' },
        { id: 'tB', chapterId: 'ch1', title: 'Олонлог 1', variantLabel: 'B' },
        { id: 'tC', chapterId: 'ch2', title: 'Олонлог 2', variantLabel: 'A' },
      ]),
    },
    classTestSession: { findMany: jest.fn(async () => []) },
    classCoveredTest: {
      findMany: jest.fn(async ({ where }: any) =>
        rows.filter((r) => match(r, where)).map((r) => ({ ...r })),
      ),
      createMany: jest.fn(async ({ data }: any) => {
        for (const d of data)
          if (
            !rows.some(
              (r) => r.classroomId === d.classroomId && r.testId === d.testId,
            )
          )
            rows.push({
              id: `r${rows.length}`,
              removedAt: null,
              removedById: null,
              ...d,
            });
        return { count: data.length };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = rows.filter((r) => match(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  prisma.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  return { prisma, rows };
}

function serviceFor(prisma: any) {
  const dashboard = new ClassDashboardService(prisma as never, {} as never);
  return new ClassCoverageService(prisma as never, dashboard);
}

describe('ClassCoverageService — хадгалах', () => {
  it('хадгалах: мөр үүсгэж, аудит бичнэ; мод нь тэмдэглэгээг харуулна', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = serviceFor(prisma);
    const res = await svc.savePast('c1', ['tA', 'tB'], 'teacher');
    expect(res).toMatchObject({
      added: 2,
      restored: 0,
      removed: 0,
      unchanged: 0,
      total: 2,
    });
    expect(
      rows.map((r) => [r.testId, r.chapterId, r.source, r.createdById]),
    ).toEqual([
      ['tA', 'ch1', 'PAST', 'teacher'],
      ['tB', 'ch1', 'PAST', 'teacher'],
    ]);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
      actorId: 'teacher',
      actorRole: Role.TEACHER,
      entity: 'ClassCoveredTest',
      entityId: 'c1',
      before: { active: [] },
      after: { active: ['tA', 'tB'], added: ['tA', 'tB'] },
    });
    const tree = await svc.tree('c1', 'teacher');
    expect(tree.books[0].chapters[0].tests.map((t) => t.past)).toEqual([
      true,
      true,
    ]);
    expect(tree.books[0].chapters[1].tests[0].past).toBe(false);
  });

  it('давтан хадгалах — бичилт ч, аудит ч үгүй', async () => {
    const { prisma } = fakePrisma();
    const svc = serviceFor(prisma);
    await svc.savePast('c1', ['tA', 'tB'], 'teacher');
    prisma.classCoveredTest.createMany.mockClear();
    prisma.classCoveredTest.updateMany.mockClear();
    prisma.auditLog.create.mockClear();
    const again = await svc.savePast('c1', ['tB', 'tA', 'tA'], 'teacher');
    expect(again).toMatchObject({
      added: 0,
      restored: 0,
      removed: 0,
      unchanged: 2,
    });
    expect(prisma.classCoveredTest.createMany).not.toHaveBeenCalled();
    expect(prisma.classCoveredTest.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('сонголтоос гаргах = зөөлөн хасалт (мөр үлдэнэ), дахин тэмдэглэвэл сэргэнэ', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = serviceFor(prisma);
    await svc.savePast('c1', ['tA', 'tB'], 'teacher');
    const res = await svc.savePast('c1', ['tA'], 'teacher2');
    expect(res).toMatchObject({ added: 0, removed: 1, unchanged: 1 });
    expect(rows).toHaveLength(2);
    const tB = rows.find((r) => r.testId === 'tB')!;
    expect(tB.removedAt).toBeInstanceOf(Date);
    expect(tB.removedById).toBe('teacher2');
    expect(prisma.classCoveredTest.delete).not.toHaveBeenCalled();
    expect(prisma.classCoveredTest.deleteMany).not.toHaveBeenCalled();
    expect(
      prisma.auditLog.create.mock.calls.at(-1)[0].data.after,
    ).toMatchObject({
      active: ['tA'],
      removed: ['tB'],
    });
    const tree = await svc.tree('c1', 'teacher');
    expect(tree.books[0].chapters[0].tests.map((t) => [t.id, t.past])).toEqual([
      ['tA', true],
      ['tB', false],
    ]);

    const back = await svc.savePast('c1', ['tA', 'tB'], 'teacher');
    expect(back).toMatchObject({ added: 0, restored: 1, removed: 0 });
    expect(rows).toHaveLength(2);
    expect(tB.removedAt).toBeNull();
  });

  it('бүгдийг арилгах — хоосон багц бүх тэмдэглэгээг зөөлөн хасна', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = serviceFor(prisma);
    await svc.savePast('c1', ['tA', 'tC'], 'teacher');
    const res = await svc.savePast('c1', [], 'teacher');
    expect(res).toMatchObject({ removed: 2 });
    expect(rows.every((r) => r.removedAt !== null)).toBe(true);
  });

  it('каталогт байхгүй тест → 400, юу ч бичихгүй', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = serviceFor(prisma);
    await expect(
      svc.savePast('c1', ['tA', 'ghost'], 'teacher'),
    ).rejects.toThrow('олдсонгүй');
    expect(rows).toHaveLength(0);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

describe('ClassCoverageService — эрх', () => {
  it('маршрут: JWT + RolesGuard, ADMIN/TEACHER_PLUS/TEACHER', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ClassDashboardController,
    );
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, ClassDashboardController)).toEqual([
      Role.ADMIN,
      Role.TEACHER_PLUS,
      Role.TEACHER,
    ]);
    // Аргын түвшинд өөр @Roles байхгүй — ангийн самбарын эрх хэвээр
    const proto = ClassDashboardController.prototype as unknown as Record<
      string,
      object
    >;
    expect(Reflect.getMetadata(ROLES_KEY, proto.coverageTree)).toBeUndefined();
    expect(
      Reflect.getMetadata(ROLES_KEY, proto.savePastCoverage),
    ).toBeUndefined();
  });

  it.each([Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER])(
    '%s тэмдэглэж чадна',
    async (role) => {
      const { prisma, rows } = fakePrisma({ role });
      await serviceFor(prisma).savePast('c1', ['tA'], 'u');
      expect(rows).toHaveLength(1);
      expect(prisma.auditLog.create.mock.calls[0][0].data.actorRole).toBe(role);
    },
  );

  it.each([Role.STUDENT, Role.PARENT, Role.BUYER])(
    '%s — хориглоно',
    async (role) => {
      const { prisma, rows } = fakePrisma({ role });
      await expect(
        serviceFor(prisma).savePast('c1', ['tA'], 'u'),
      ).rejects.toThrow('Төвийн багшийн эрх');
      await expect(serviceFor(prisma).tree('c1', 'u')).rejects.toThrow(
        'Төвийн багшийн эрх',
      );
      expect(rows).toHaveLength(0);
    },
  );

  it('гадны багш — хориглоно', async () => {
    const { prisma } = fakePrisma({ role: Role.TEACHER, external: true });
    await expect(
      serviceFor(prisma).savePast('c1', ['tA'], 'u'),
    ).rejects.toThrow('Төвийн багшийн эрх');
  });

  it('архивласан анги → олдсонгүй', async () => {
    const { prisma } = fakePrisma({ archived: true });
    await expect(
      serviceFor(prisma).savePast('c1', ['tA'], 'u'),
    ).rejects.toThrow('Анги олдсонгүй');
  });
});
