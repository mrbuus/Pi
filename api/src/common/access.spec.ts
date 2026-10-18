import { Role, StudentType, Subject } from '../generated/prisma/enums';
import {
  blockedSubjects,
  canAccessChapter,
  catalogSubjectsFor,
  chapterSubjectWhere,
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
  currentRole?: Role;
  hasActiveEnrollment?: boolean;
  userPasses?: FakeUserPass[];
  /** Видеотой ном худалдаж авсан (grantedAt бөглөгдсөн) эсэх */
  hasVideoPurchase?: boolean;
  /** Бүлгийн номын хичээл (анхдагч MATH) */
  bookSubject?: Subject;
  /** Идэвхтэй ангиудын хичээл (null = MATH). Өгөөгүй бол hasActiveEnrollment-ээс */
  classSubjects?: (Subject | null)[];
  /** PARENT: баталгаажсан хүүхдийн ангиудын хичээл */
  childClassSubjects?: (Subject | null)[];
}) {
  const own =
    opts.classSubjects ?? (opts.hasActiveEnrollment ? [null] : []);
  return {
    user: { findUnique: async () => ({ role: opts.currentRole ?? Role.STUDENT, archivedAt: null, externalTeacherProfile: null }) },
    studentProfile: {
      findUnique: async () => opts.studentProfile ?? null,
    },
    book: {
      findUnique: async () => ({ subject: opts.bookSubject ?? Subject.MATH }),
    },
    parentLink: {
      findMany: async () =>
        opts.childClassSubjects ? [{ studentId: 'child' }] : [],
    },
    enrollment: {
      findFirst: async () => (opts.hasActiveEnrollment ? { id: 'e1' } : null),
      findMany: async ({ where }: any) => {
        const ids: string[] = where.studentId.in;
        return [
          ...own,
          ...(ids.includes('child') ? (opts.childClassSubjects ?? []) : []),
        ].map((subject) => ({ classroom: { subject } }));
      },
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
    // canAccessChapter-ийн Purchase гинж (ном+видео худалдан авалт) —
    // анхдагчаар юу ч аваагүй гэж үзнэ
    purchase: {
      findFirst: async () => (opts.hasVideoPurchase ? { id: 'pu1' } : null),
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

  it('current active internal ADMIN/TEACHER_PLUS/TEACHER receive staff access', async () => {
    for (const role of [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER]) {
      const prisma = makeAccessPrisma({ currentRole: role });
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

  it('ном+видео худалдаж авсан (grantedAt бөглөгдсөн) сурагчид ALLOW', async () => {
    // Дэлгүүрийн «ном + видео тайлбартай» хувилбар — pass/enrollment-гүй ч
    // тухайн номын бүлгүүдэд хандана (эзний шийдвэр 2026-08-08)
    const prisma = makeAccessPrisma({ hasVideoPurchase: true });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      true,
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

  it('Purchase гинж: BOOK + includesVideo=true худалдан авалтаас видео эрх ALLOW', async () => {
    // Purchase эрхийн гинж: тухайн номын (chapter.bookId) видеотай бүтээгдэхүүнийг
    // худалдаж авсан бол видео бүлгийг үзэх эрх өгнө
    const prisma = makeAccessPrisma({});
    // Purchase.findFirst() stub эвлүүлэх
    (prisma.purchase as any) = {
      findFirst: async () => ({
        id: 'p1',
        userId: 's1',
        productItemId: 'prod1',
        grantedAt: new Date(),
      }),
    };
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      true,
    );
  });

  it('Purchase гинж: DENY бол purchase эрх DENY хэвээр', async () => {
    // Purchase байхгүй бол video эрх DENY
    const prisma = makeAccessPrisma({});
    (prisma.purchase as any) = {
      findFirst: async () => null, // Purchase олдсонгүй
    };
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, chapter)).toBe(
      false,
    );
  });
});

// ===== Хичээлээр хаалттай контент (эзэн 2026-10-18) =====

describe('Нийгмийн ухааны (gated) бүлэг — зөвхөн тухайн хичээлийн ангид', () => {
  const social = { id: 'sc1', bookId: 'sb1', freePreview: false };
  const socialFree = { id: 'sc2', bookId: 'sb1', freePreview: true };
  const math = { id: 'c1', bookId: 'b1', freePreview: false };
  const activeClassroom = {
    studentProfile: { type: StudentType.CLASSROOM, activatedAt: new Date() },
    hasActiveEnrollment: true,
  };

  it('математикийн ангийн сурагчид DENY (freePreview, {all} pass байсан ч)', async () => {
    const prisma = makeAccessPrisma({
      ...activeClassroom,
      bookSubject: Subject.SOCIAL_STUDIES,
      userPasses: [{ expiresAt: FUTURE, scope: { all: true } }],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, social)).toBe(false);
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, socialFree)).toBe(false);
  });

  it('нийгмийн ухааны ангийн сурагчид ALLOW', async () => {
    const prisma = makeAccessPrisma({
      ...activeClassroom,
      classSubjects: [Subject.SOCIAL_STUDIES],
      bookSubject: Subject.SOCIAL_STUDIES,
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, social)).toBe(true);
  });

  it('нийгмийн ухааны анги математикийн бүлгийг ангиар НЭЭХГҮЙ (pass/худалдан авалт хэвээр)', async () => {
    const prisma = makeAccessPrisma({
      ...activeClassroom,
      classSubjects: [Subject.SOCIAL_STUDIES],
    });
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, math)).toBe(false);
    const withPass = makeAccessPrisma({
      ...activeClassroom,
      classSubjects: [Subject.SOCIAL_STUDIES],
      userPasses: [{ expiresAt: FUTURE, scope: { chapterIds: ['c1'] } }],
    });
    expect(await canAccessChapter(withPass, 's1', Role.STUDENT, math)).toBe(true);
  });

  it('математикийн ангийн сурагч математикийн бүлгийг хэвээр ALLOW', async () => {
    const prisma = makeAccessPrisma(activeClassroom);
    expect(await canAccessChapter(prisma, 's1', Role.STUDENT, math)).toBe(true);
  });

  it('BUYER (ангигүй) — нийгмийн ухааныг ном худалдаж авсан ч DENY', async () => {
    const prisma = makeAccessPrisma({
      bookSubject: Subject.SOCIAL_STUDIES,
      hasVideoPurchase: true,
    });
    expect(await canAccessChapter(prisma, 'b1', Role.BUYER, social)).toBe(false);
  });

  it('төвийн ажилтан нийгмийн ухааныг ALLOW', async () => {
    const prisma = makeAccessPrisma({
      currentRole: Role.TEACHER,
      bookSubject: Subject.SOCIAL_STUDIES,
    });
    expect(await canAccessChapter(prisma, 't1', Role.TEACHER, social)).toBe(true);
  });

  it('дуудагч book.subject дамжуулбал номын query хийхгүй', async () => {
    const prisma = makeAccessPrisma({ ...activeClassroom });
    prisma.book.findUnique = jest.fn();
    expect(
      await canAccessChapter(prisma, 's1', Role.STUDENT, {
        ...social,
        book: { subject: Subject.SOCIAL_STUDIES },
      } as typeof social),
    ).toBe(false);
    expect(prisma.book.findUnique).not.toHaveBeenCalled();
  });
});

describe('catalogSubjectsFor — номын сангийн хичээлийн шүүлт', () => {
  it('нэвтрээгүй → зөвхөн MATH', async () => {
    expect(await catalogSubjectsFor(makeAccessPrisma({}), null)).toEqual([
      Subject.MATH,
    ]);
  });

  it('ажилтан → null (хязгааргүй)', async () => {
    const prisma = makeAccessPrisma({ currentRole: Role.TEACHER_PLUS });
    expect(
      await catalogSubjectsFor(prisma, { userId: 't', role: Role.TEACHER_PLUS }),
    ).toBeNull();
  });

  it('математикийн ангийн сурагч → MATH', async () => {
    const prisma = makeAccessPrisma({ hasActiveEnrollment: true });
    expect(
      await catalogSubjectsFor(prisma, { userId: 's', role: Role.STUDENT }),
    ).toEqual([Subject.MATH]);
  });

  it('зөвхөн нийгмийн ухааны ангитай сурагч → SOCIAL_STUDIES (математик нуугдана)', async () => {
    const prisma = makeAccessPrisma({ classSubjects: [Subject.SOCIAL_STUDIES] });
    expect(
      await catalogSubjectsFor(prisma, { userId: 's', role: Role.STUDENT }),
    ).toEqual([Subject.SOCIAL_STUDIES]);
  });

  it('хоёр ангитай сурагч → хоёр хичээл', async () => {
    const prisma = makeAccessPrisma({
      classSubjects: [null, Subject.SOCIAL_STUDIES],
    });
    expect(
      (await catalogSubjectsFor(prisma, { userId: 's', role: Role.STUDENT }))?.sort(),
    ).toEqual([Subject.MATH, Subject.SOCIAL_STUDIES].sort());
  });

  it('PARENT → MATH + баталгаажсан хүүхдийн ангийн хичээл', async () => {
    const prisma = makeAccessPrisma({
      currentRole: Role.PARENT,
      childClassSubjects: [Subject.SOCIAL_STUDIES],
    });
    expect(
      await catalogSubjectsFor(prisma, { userId: 'p', role: Role.PARENT }),
    ).toEqual([Subject.MATH, Subject.SOCIAL_STUDIES]);
    const noChild = makeAccessPrisma({ currentRole: Role.PARENT });
    expect(
      await catalogSubjectsFor(noChild, { userId: 'p', role: Role.PARENT }),
    ).toEqual([Subject.MATH]);
  });

  it('blockedSubjects / chapterSubjectWhere', () => {
    expect(blockedSubjects([Subject.MATH])).toEqual(
      expect.arrayContaining([Subject.SOCIAL_STUDIES]),
    );
    expect(blockedSubjects([Subject.SOCIAL_STUDIES])).not.toContain(
      Subject.SOCIAL_STUDIES,
    );
    expect(chapterSubjectWhere([Subject.SOCIAL_STUDIES])).toEqual({
      OR: [{ book: { subject: { in: [Subject.SOCIAL_STUDIES] } } }],
    });
    expect(chapterSubjectWhere([Subject.MATH])).toEqual({
      OR: [{ bookId: null }, { book: { subject: { in: [Subject.MATH] } } }],
    });
  });
});
