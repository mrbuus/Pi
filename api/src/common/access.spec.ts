import { Role, StudentType } from '../generated/prisma/enums';
import {
  canAccessChapter,
  collectPassScope,
  hasActiveClassroomEnrollment,
  hasCoveringPass,
  scopeCovers,
} from './access';

const FUTURE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

// ===== scopeCovers — цэвэр функц, PrismaService огт хэрэггүй =====

describe('scopeCovers', () => {
  it('null/undefined scope үргэлж DENY (хэзээ ч ALLOW болохгүй)', () => {
    expect(scopeCovers(null, { chapterId: 'c1' })).toBe(false);
    expect(scopeCovers(undefined, { chapterId: 'c1' })).toBe(false);
  });

  it('{all: true} scope бүх target-ыг зөвшөөрнө', () => {
    expect(scopeCovers({ all: true }, {})).toBe(true);
    expect(scopeCovers({ all: true }, { chapterId: 'c1' })).toBe(true);
  });

  it('chapterIds таарвал ALLOW, таарахгүй бол DENY', () => {
    expect(scopeCovers({ chapterIds: ['c1'] }, { chapterId: 'c1' })).toBe(
      true,
    );
    expect(scopeCovers({ chapterIds: ['c1'] }, { chapterId: 'c2' })).toBe(
      false,
    );
  });

  it('bookIds таарвал ALLOW, таарахгүй бол DENY', () => {
    expect(scopeCovers({ bookIds: ['b1'] }, { bookId: 'b1' })).toBe(true);
    expect(scopeCovers({ bookIds: ['b1'] }, { bookId: 'b2' })).toBe(false);
  });

  it('testIds таарвал ALLOW', () => {
    expect(scopeCovers({ testIds: ['t1'] }, { testId: 't1' })).toBe(true);
    expect(scopeCovers({ testIds: ['t1'] }, { testId: 't2' })).toBe(false);
  });

  it('хоосон {} scope ямар ч target-д DENY', () => {
    expect(
      scopeCovers(
        {},
        { chapterId: 'c1', bookId: 'b1', testId: 't1' },
      ),
    ).toBe(false);
  });

  it('malformed scope (талбар нь null) DENY хийнэ, throw хийхгүй', () => {
    expect(() =>
      scopeCovers(
        { chapterIds: null, bookIds: undefined } as any,
        { chapterId: 'c1', bookId: 'b1' },
      ),
    ).not.toThrow();
    expect(
      scopeCovers(
        { chapterIds: null, bookIds: undefined } as any,
        { chapterId: 'c1', bookId: 'b1' },
      ),
    ).toBe(false);
  });
});

// ===== PrismaService-ийг stub-ласан бусад функцууд =====

interface FakeStudentProfile {
  type: StudentType;
  activatedAt: Date | null;
}

interface FakeUserPass {
  expiresAt: Date;
  scope: any;
}

function makeAccessPrisma(opts: {
  studentProfile?: FakeStudentProfile | null;
  hasActiveEnrollment?: boolean;
  userPasses?: FakeUserPass[];
}) {
  return {
    studentProfile: {
      findUnique: async () => opts.studentProfile ?? null,
    },
    enrollment: {
      findFirst: async () => (opts.hasActiveEnrollment ? { id: 'e1' } : null),
    },
    userPass: {
      findMany: async ({ where }: any) => {
        // Бодит query шиг expiresAt > now шүүлтийг эндээ л симуляцлана —
        // дууссан pass-ыг DB-ийн адилаар огт буцаахгүй.
        const now: Date = where.expiresAt.gt;
        return (opts.userPasses ?? [])
          .filter((p) => p.expiresAt > now)
          .map((p) => ({ pass: { scope: p.scope } }));
      },
    },
  } as any;
}

describe('hasActiveClassroomEnrollment', () => {
  it('STUDENT биш ролийг шууд false буцаана', async () => {
    const prisma = makeAccessPrisma({});
    expect(
      await hasActiveClassroomEnrollment(prisma, 'u1', Role.PARENT),
    ).toBe(false);
  });

  it('StudentProfile байхгүй бол false', async () => {
    const prisma = makeAccessPrisma({ studentProfile: null });
    expect(
      await hasActiveClassroomEnrollment(prisma, 'u1', Role.STUDENT),
    ).toBe(false);
  });

  it('ONLINE төрлийн сурагчид false (танхимын биш)', async () => {
    const prisma = makeAccessPrisma({
      studentProfile: { type: StudentType.ONLINE, activatedAt: new Date() },
      hasActiveEnrollment: true,
    });
    expect(
      await hasActiveClassroomEnrollment(prisma, 'u1', Role.STUDENT),
    ).toBe(false);
  });

  it('activatedAt байхгүй бол false', async () => {
    const prisma = makeAccessPrisma({
      studentProfile: { type: StudentType.CLASSROOM, activatedAt: null },
      hasActiveEnrollment: true,
    });
    expect(
      await hasActiveClassroomEnrollment(prisma, 'u1', Role.STUDENT),
    ).toBe(false);
  });

  it('идэвхжсэн танхимын сурагч, идэвхтэй Enrollment-тэй бол true', async () => {
    const prisma = makeAccessPrisma({
      studentProfile: { type: StudentType.CLASSROOM, activatedAt: new Date() },
      hasActiveEnrollment: true,
    });
    expect(
      await hasActiveClassroomEnrollment(prisma, 'u1', Role.STUDENT),
    ).toBe(true);
  });

  it('идэвхжсэн ч Enrollment (leftAt: null) байхгүй бол false', async () => {
    const prisma = makeAccessPrisma({
      studentProfile: { type: StudentType.CLASSROOM, activatedAt: new Date() },
      hasActiveEnrollment: false,
    });
    expect(
      await hasActiveClassroomEnrollment(prisma, 'u1', Role.STUDENT),
    ).toBe(false);
  });
});

describe('collectPassScope / hasCoveringPass', () => {
  it('дууссан UserPass-ыг тооцохгүй (шүүгдэж орхигдоно)', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: PAST, scope: { all: true } }],
    });
    const scope = await collectPassScope(prisma, 'u1');
    expect(scope).toEqual({ all: false, chapterIds: [], bookIds: [], testIds: [] });
  });

  it('олон идэвхтэй pass-ын scope-ийг нэгтгэнэ', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [
        { expiresAt: FUTURE, scope: { chapterIds: ['c1'] } },
        { expiresAt: FUTURE, scope: { bookIds: ['b1'], testIds: ['t1'] } },
      ],
    });
    const scope = await collectPassScope(prisma, 'u1');
    expect(scope.all).toBe(false);
    expect(scope.chapterIds).toEqual(['c1']);
    expect(scope.bookIds).toEqual(['b1']);
    expect(scope.testIds).toEqual(['t1']);
  });

  it('null scope-той pass юу ч нэмэхгүй', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: null }],
    });
    const scope = await collectPassScope(prisma, 'u1');
    expect(scope).toEqual({ all: false, chapterIds: [], bookIds: [], testIds: [] });
  });

  it('hasCoveringPass: дууссан pass DENY өгнө', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: PAST, scope: { all: true } }],
    });
    expect(
      await hasCoveringPass(prisma, 'u1', { chapterId: 'c1' }),
    ).toBe(false);
  });

  it('hasCoveringPass: идэвхтэй {all:true} pass ALLOW өгнө', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: { all: true } }],
    });
    expect(
      await hasCoveringPass(prisma, 'u1', { chapterId: 'c1' }),
    ).toBe(true);
  });
});

describe('canAccessChapter — SPEC §11 хандалтын дүрэм', () => {
  const chapter = { id: 'c1', bookId: 'b1', freePreview: false };
  const freeChapter = { id: 'c2', bookId: 'b1', freePreview: true };

  it('ADMIN/TEACHER_PLUS/TEACHER эрхтэй роль үргэлж (өөр ямар ч мэдээлэлгүй ч) ALLOW', async () => {
    const prisma = makeAccessPrisma({});
    for (const role of [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER]) {
      expect(await canAccessChapter(prisma, 'u1', role, chapter)).toBe(true);
    }
  });

  it('freePreview бүлгийг pass/enrollment-гүй сурагч ч харна', async () => {
    const prisma = makeAccessPrisma({});
    expect(
      await canAccessChapter(prisma, 's1', Role.STUDENT, freeChapter),
    ).toBe(true);
  });

  it('freePreview биш бол pass/enrollment-гүй сурагчид DENY', async () => {
    const prisma = makeAccessPrisma({});
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });

  it('танхимын идэвхтэй сурагч бүх бүлгийг ALLOW', async () => {
    const prisma = makeAccessPrisma({
      studentProfile: { type: StudentType.CLASSROOM, activatedAt: new Date() },
      hasActiveEnrollment: true,
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      true,
    );
  });

  it('дууссан UserPass эрх өгөхгүй — DENY (аюулгүй байдлын гол зан төлөв)', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: PAST, scope: { all: true } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });

  it('идэвхтэй {all:true} pass бүх бүлгийг ALLOW', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: { all: true } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      true,
    );
  });

  it('scope.chapterIds таарвал ALLOW', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: { chapterIds: ['c1'] } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      true,
    );
  });

  it('scope.chapterIds таарахгүй бол DENY', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: { chapterIds: ['other'] } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });

  it('scope.bookIds таарвал ALLOW', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: { bookIds: ['b1'] } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      true,
    );
  });

  it('scope.bookIds таарахгүй бол DENY', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: { bookIds: ['other-book'] } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });

  it('null scope-той pass DENY хийнэ, хэзээ ч ALLOW болохгүй', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: null }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });

  it('malformed scope ({} хоосон объект) DENY хийнэ', async () => {
    const prisma = makeAccessPrisma({
      userPasses: [{ expiresAt: FUTURE, scope: {} }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });
});
