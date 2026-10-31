import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role, StudentType, Subject } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { todayUB } from './date';

// Багш эрхтэй роль бүлэг — контент/тест/бичлэгийн эрхийн шалгалт бүрт ижил
// (SPEC §11: багш нар үргэлж бүх контентыг харна).
export const TEACHER_ROLES: Role[] = [
  Role.ADMIN,
  Role.TEACHER_PLUS,
  Role.TEACHER,
];

/** Resolve current database identity; an external registration is not centre staff. */
export async function internalTeachingRole(
  prisma: PrismaService,
  userId: string,
): Promise<Role | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      archivedAt: true,
      externalTeacherProfile: { select: { userId: true } },
    },
  });
  if (!user || user.archivedAt) return null;
  if (user.role === Role.ADMIN) return user.role;
  return TEACHER_ROLES.includes(user.role) && !user.externalTeacherProfile
    ? user.role
    : null;
}
export async function assertInternalTeachingStaff(
  prisma: PrismaService,
  userId: string,
): Promise<Role> {
  const role = await internalTeachingRole(prisma, userId);
  if (!role) throw new ForbiddenException('Төвийн багшийн эрх шаардлагатай');
  return role;
}

// Pass.scope-ийн бүтэц (Prisma Json талбар тул runtime-д гараар тодорхойлно).
// scope жишээ: { "all": true } эсвэл
// { "chapterIds": [...], "bookIds": [...], "testIds": [...] }
export type PassScope = {
  all?: boolean;
  chapterIds?: string[];
  bookIds?: string[];
  testIds?: string[];
};

export interface ScopeTarget {
  chapterId?: string | null;
  bookId?: string | null;
  testId?: string | null;
}

// Нэг pass-ын scope тухайн бүлэг/ном/тестийг хамарч байгаа эсэхийг шалгана
// (цэвэр функц — findMany where-гүй, unit тестэд ч ашиглаж болно).
export function scopeCovers(
  scope: PassScope | null | undefined,
  target: ScopeTarget,
): boolean {
  if (!scope) return false;
  if (scope.all === true) return true;
  if (
    target.testId &&
    Array.isArray(scope.testIds) &&
    scope.testIds.includes(target.testId)
  )
    return true;
  if (
    target.chapterId &&
    Array.isArray(scope.chapterIds) &&
    scope.chapterIds.includes(target.chapterId)
  ) {
    return true;
  }
  if (
    target.bookId &&
    Array.isArray(scope.bookIds) &&
    scope.bookIds.includes(target.bookId)
  )
    return true;
  return false;
}

export interface AggregatedPassScope {
  all: boolean;
  chapterIds: string[];
  bookIds: string[];
  testIds: string[];
}

// Хэрэглэгчийн БҮХ идэвхтэй (хугацаа дуусаагүй) эрхийн хамрах хүрээг нэгтгэнэ —
// жагсаалт татах query-д WHERE нөхцөл угсрахад хэрэгтэй (per-row шалгалтаас
// хямд: нэг query-ээр бүх pass-ыг уншаад, дараа нь in-memory угсарна).
export async function collectPassScope(
  prisma: PrismaService,
  userId: string,
): Promise<AggregatedPassScope> {
  const now = new Date();
  const passes = await prisma.userPass.findMany({
    where: {
      userId,
      startsAt: { lte: now },
      expiresAt: { gt: now },
      OR: [
        { scopeSnapshot: { not: Prisma.DbNull } },
        { pass: { active: true } },
      ],
    },
    include: { pass: { select: { scope: true, active: true } } },
  });
  const chapterIds = new Set<string>();
  const bookIds = new Set<string>();
  const testIds = new Set<string>();
  let all = false;
  for (const up of passes) {
    if (!up.scopeSnapshot && up.pass.active === false) continue;
    const scope = (up.scopeSnapshot ?? up.pass.scope) as PassScope | null;
    if (!scope) continue;
    if (scope.all === true) all = true;
    const ids = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter(
            (id): id is string =>
              typeof id === 'string' && id.length > 0 && id.length <= 200,
          )
        : [];
    ids(scope.chapterIds).forEach((id) => chapterIds.add(id));
    ids(scope.bookIds).forEach((id) => bookIds.add(id));
    ids(scope.testIds).forEach((id) => testIds.add(id));
  }
  return {
    all,
    chapterIds: [...chapterIds],
    bookIds: [...bookIds],
    testIds: [...testIds],
  };
}

// Хэрэглэгчийн идэвхтэй эрхүүдээс АЛЬ НЭГ нь заасан бүлэг/ном/тестийг хамарч
// байгаа эсэхийг шалгана (нэг зорилтот объектын эрх шалгах үед — жагсаалт
// татахад collectPassScope-ийг шууд ашигла).
export async function hasCoveringPass(
  prisma: PrismaService,
  userId: string,
  target: ScopeTarget,
): Promise<boolean> {
  const scope = await collectPassScope(prisma, userId);
  if (scope.all) return true;
  if (target.testId && scope.testIds.includes(target.testId)) return true;
  if (target.chapterId && scope.chapterIds.includes(target.chapterId)) {
    return true;
  }
  if (target.bookId && scope.bookIds.includes(target.bookId)) return true;
  return false;
}

// Танхимын идэвхтэй (activatedAt-тай, leftAt: null) сурагч эсэхийг шалгана.
// Зөвхөн STUDENT рольд хамаарна (эцэг эх/багш өөрийн StudentProfile-гүй).
export async function hasActiveClassroomEnrollment(
  prisma: PrismaService,
  userId: string,
  role: Role,
): Promise<boolean> {
  if (role !== Role.STUDENT) return false;
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (profile?.type !== StudentType.CLASSROOM || !profile.activatedAt) {
    return false;
  }
  const active = await prisma.enrollment.findFirst({
    where: { studentId: userId, leftAt: null, classroom: { archived: false } },
  });
  return !!active;
}

export interface ChapterAccessTarget {
  id: string;
  bookId: string | null;
  freePreview: boolean;
}

// ============ Ангид НЭЭГДСЭН тест (эзэн 2026-10-29) ============
// Танхимын сурагч бүх бүлгийг (хариутай нь) харж, өнөөдрийн ангийн тестийн
// хариуг урьдчилан мэдэж болдог байсан. Одоо зөвхөн өөрийн ангид багшийн
// нээсэн тестийн бодлогууд л харагдана. Нэгж нь ТЕСТ — нэг бүлэгт 20 хүртэл
// тест (A/B) байдаг тул бүлгээр нээвэл бусад тест нь задарна.
// Нээгдсэн = ангид хийсэн (ClassTestSession.date) эсвэл оноосон (TestAccess)
// өдөр нь ӨНГӨРСӨН (Улаанбаатарын өнөөдрөөс өмнө). Өнөөдрийнх маргааш нээгдэнэ.
// 1000 бодлого / ЭЕШ сорил өөрийн эргэн харалтын дүрэмтэй (thousand/review-gate)
// тул энд хэзээ ч нээгдэхгүй.
export const RELEASE_EXCLUDED_TYPES = ['THOUSAND', 'EESH_MOCK'] as const;

export interface ClassroomRelease {
  testIds: Set<string>;
  problemIds: Set<string>;
  chapterIds: Set<string>;
}

/**
 * classroomRelease-ийн богино хугацааны санах ой (аудит 2026-10-29): нэг хүсэлт (жиш:
 * файлын эрх) бодлого бүрээр дахин дахин дууддаг тул (prisma, userId, role)-оор 30 секунд
 * хадгална. Хүчингүй болгох = зөвхөн TTL — шинэ нээлт/анги солих нь хамгийн ихдээ 30с
 * хоцорч харагдана (нээлт өдрөөр тооцогддог тул хүлээн зөвшөөрөгдөнө). Prisma объект бүр
 * өөрийн Map-тэй (WeakMap) — тестийн mock-ууд хоорондоо холилдохгүй. Буцаах Set-үүдийг
 * дуудагч ӨӨРЧЛӨХГҮЙ (хуваалцсан объект).
 */
const RELEASE_TTL_MS = 30_000;
const RELEASE_CACHE_MAX = 500;
const releaseCache = new WeakMap<
  object,
  Map<string, { at: number; value: Promise<ClassroomRelease | null> }>
>();

export function clearClassroomReleaseCache(prisma?: PrismaService): void {
  if (prisma) releaseCache.delete(prisma);
}

export function classroomRelease(
  prisma: PrismaService,
  userId: string,
  role: Role,
): Promise<ClassroomRelease | null> {
  const map =
    releaseCache.get(prisma) ??
    new Map<string, { at: number; value: Promise<ClassroomRelease | null> }>();
  releaseCache.set(prisma, map);
  const key = `${role}:${userId}`;
  const now = Date.now();
  const hit = map.get(key);
  if (hit && now - hit.at < RELEASE_TTL_MS) return hit.value;
  if (map.size >= RELEASE_CACHE_MAX)
    for (const [k, v] of map) if (now - v.at >= RELEASE_TTL_MS) map.delete(k);
  if (map.size >= RELEASE_CACHE_MAX) map.clear();
  const value = loadClassroomRelease(prisma, userId, role);
  map.set(key, { at: now, value });
  value.catch(() => map.delete(key));
  return value;
}

async function loadClassroomRelease(
  prisma: PrismaService,
  userId: string,
  role: Role,
): Promise<ClassroomRelease | null> {
  if (!(await hasActiveClassroomEnrollment(prisma, userId, role))) return null;
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId, leftAt: null, classroom: { archived: false } },
    select: { classroomId: true },
  });
  const classroomIds = enrollments.map((e) => e.classroomId);
  const todayDate = todayUB(); // UB огнооны UTC шөнө дунд (@db.Date-тэй харьцуулна)
  const todayStart = new Date(todayDate.getTime() - 8 * 60 * 60 * 1000);
  const testWhere: Prisma.TestWhereInput = {
    deletedAt: null,
    type: { notIn: [...RELEASE_EXCLUDED_TYPES] },
  };
  const [sessions, accesses] = await Promise.all([
    prisma.classTestSession.findMany({
      where: {
        classroomId: { in: classroomIds },
        testId: { not: null },
        date: { lt: todayDate },
      },
      select: { testId: true },
    }),
    prisma.testAccess.findMany({
      where: {
        classroomId: { in: classroomIds },
        assignedAt: { lt: todayStart },
        test: testWhere,
      },
      select: { testId: true },
    }),
  ]);
  const testIds = new Set<string>();
  for (const a of accesses) testIds.add(a.testId);
  // ClassTestSession тест рүү relation-гүй тул төрлийг тусад нь шүүнэ
  const sessionTestIds = [
    ...new Set(sessions.flatMap((s) => (s.testId ? [s.testId] : []))),
  ];
  if (sessionTestIds.length) {
    const valid = await prisma.test.findMany({
      where: { id: { in: sessionTestIds }, ...testWhere },
      select: { id: true },
    });
    for (const t of valid) testIds.add(t.id);
  }
  const release: ClassroomRelease = {
    testIds,
    problemIds: new Set(),
    chapterIds: new Set(),
  };
  if (testIds.size === 0) return release;
  const rows = await prisma.testProblem.findMany({
    where: { testId: { in: [...testIds] }, problem: { deletedAt: null } },
    select: { problemId: true, problem: { select: { chapterId: true } } },
  });
  for (const r of rows) {
    release.problemIds.add(r.problemId);
    release.chapterIds.add(r.problem.chapterId);
  }
  return release;
}

// ============ Хичээлээр хаалттай контент (эзэн 2026-10-18) ============
// MATH = анхдагч, нийтийн хичээл. Бусад хичээл (SOCIAL_STUDIES, SAT) зөвхөн
// тухайн хичээлтэй ИДЭВХТЭЙ ангийн хэрэглэгчид харагдана (эцэг эх — баталгаажсан
// холбоотой хүүхдийнх). Classroom.subject null = MATH. Төвийн ажилтан бүгдийг харна.
// Номгүй бүлэг, бүлэггүй тест = MATH.

/** Ангиар хаалттай хичээлүүд (MATH-аас бусад) */
export const GATED_SUBJECTS: Subject[] = Object.values(Subject).filter(
  (s) => s !== Subject.MATH,
);

/**
 * Хэрэглэгчийн идэвхтэй (leftAt: null, архивлаагүй) ангиудын хичээл. PARENT бол
 * баталгаажсан холбоотой хүүхдүүдийн ангиудынх ч орно.
 */
export async function activeClassSubjects(
  prisma: PrismaService,
  userId: string,
  role?: Role,
): Promise<Set<Subject>> {
  const studentIds = [userId];
  if (role === Role.PARENT) {
    const links = await prisma.parentLink.findMany({
      where: { parentId: userId, verifiedAt: { not: null } },
      select: { studentId: true },
    });
    studentIds.push(...links.map((l) => l.studentId));
  }
  const rows = await prisma.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      leftAt: null,
      classroom: { archived: false },
    },
    select: { classroom: { select: { subject: true } } },
  });
  return new Set(rows.map((r) => r.classroom.subject ?? Subject.MATH));
}

/** Хэрэглэгчид ХААЛТТАЙ үлдэх хичээлүүд (өөрийн ангид байхгүй gated хичээл) */
export function blockedSubjects(classSubjects: Iterable<Subject>): Subject[] {
  const own = new Set(classSubjects);
  return GATED_SUBJECTS.filter((s) => !own.has(s));
}

/**
 * Номын сангийн КАТАЛОГТ (номын жагсаалт, бүлгийн жагсаалт) харагдах хичээлүүд.
 * null = хязгааргүй (төвийн ажилтан). Нэвтрээгүй → зөвхөн MATH. Ангитай сурагч →
 * зөвхөн өөрийн ангиудын хичээл (Нийгмийн ухааны ангийн сурагчид математикийн
 * ном харуулахгүй). Бусад (BUYER, PARENT, ангигүй сурагч) → MATH + ангийн хичээл.
 */
export async function catalogSubjectsFor(
  prisma: PrismaService,
  user: { userId: string; role: Role } | null | undefined,
): Promise<Subject[] | null> {
  if (!user?.userId) return [Subject.MATH];
  if (
    TEACHER_ROLES.includes(user.role) &&
    (await internalTeachingRole(prisma, user.userId))
  )
    return null;
  const own = await activeClassSubjects(prisma, user.userId, user.role);
  if (user.role === Role.STUDENT && own.size > 0) return [...own];
  return [...new Set([Subject.MATH, ...own])];
}

/** Бүлгийн жагсаалтын WHERE: номгүй бүлэг MATH-д тооцогдоно */
export function chapterSubjectWhere(
  subjects: Subject[],
): Prisma.ChapterWhereInput {
  return {
    OR: [
      ...(subjects.includes(Subject.MATH) ? [{ bookId: null }] : []),
      { book: { subject: { in: subjects } } },
    ],
  };
}

/** Бүлгийн хичээл — дуудагч `book.subject`-ийг сонгосон бол нэмэлт query хийхгүй */
async function chapterSubjectOf(
  prisma: PrismaService,
  chapter: ChapterAccessTarget,
): Promise<Subject> {
  if ('book' in chapter) {
    const book = chapter.book;
    if (
      book &&
      typeof book === 'object' &&
      'subject' in book &&
      typeof book.subject === 'string'
    )
      return book.subject as Subject;
  }
  if (!chapter.bookId) return Subject.MATH;
  const book = await prisma.book.findUnique({
    where: { id: chapter.bookId },
    select: { subject: true },
  });
  return book?.subject ?? Subject.MATH;
}

/** A cleared grantedAt revokes/refunds a purchase; there is no separate refund status in Purchase. */
export function activePurchaseWhere(
  userId: string,
  now = new Date(),
): Prisma.PurchaseWhereInput {
  return {
    userId,
    grantedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}
/** Keep pass-only scope distinct so plain BOOK purchases never grant video implicitly. */
export async function collectContentScope(
  prisma: PrismaService,
  userId: string,
): Promise<AggregatedPassScope> {
  const [scope, purchases] = await Promise.all([
    collectPassScope(prisma, userId),
    prisma.purchase.findMany({
      where: activePurchaseWhere(userId),
      select: { productItem: { select: { kind: true, refId: true } } },
    }),
  ]);
  return {
    ...scope,
    bookIds: [
      ...new Set([
        ...scope.bookIds,
        ...purchases
          .filter((p) => p.productItem.kind === 'BOOK')
          .map((p) => p.productItem.refId),
      ]),
    ],
    testIds: [
      ...new Set([
        ...scope.testIds,
        ...purchases
          .filter((p) => p.productItem.kind === 'TEST')
          .map((p) => p.productItem.refId),
      ]),
    ],
  };
}
// ============ Сурагчид ЭХЛҮҮЛЖ болох тестүүд (эзэн 2026-10-29) ============
// Жагсаалт (/tests, /exam-results/my, хичээлийн хуудас) ба эхлэх эрх нэг дүрэмтэй:
// - Ангид оноосон тест — зөвхөн оноосон цаг (assignedAt) нь ирсэн бол
// - pass scope.all, тест тус бүрийн pass, TEST худалдан авалт — үргэлж
// - Бүлэг/номын pass, BOOK худалдан авалт — танхимын сурагчид зөвхөн ангид
//   НЭЭГДСЭН бүлэгт (classroomRelease.chapterIds); BUYER/онлайнд хязгааргүй
export interface StudentTestScope {
  all: boolean;
  classroomIds: string[];
  /** Тест тус бүрийн эрх: pass testIds + TEST худалдан авалт */
  testIds: string[];
  /** Бүлгийн pass */
  chapterIds: string[];
  /** Номын pass + BOOK худалдан авалт */
  bookIds: string[];
  /** Танхимын сурагч: бүлэг/номын эрх зөвхөн эдгээр бүлэгт. null = хязгааргүй */
  releasedChapterIds: string[] | null;
}

export async function studentTestScope(
  prisma: PrismaService,
  userId: string,
  role: Role,
): Promise<StudentTestScope> {
  const [enrollments, scope, release] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        studentId: userId,
        leftAt: null,
        classroom: { archived: false },
      },
      select: { classroomId: true },
    }),
    collectContentScope(prisma, userId),
    classroomRelease(prisma, userId, role),
  ]);
  return {
    all: scope.all,
    classroomIds: enrollments.map((e) => e.classroomId),
    testIds: scope.testIds,
    chapterIds: scope.chapterIds,
    bookIds: scope.bookIds,
    releasedChapterIds: release ? [...release.chapterIds] : null,
  };
}

/**
 * Эхлүүлж болох тестийн WHERE-ийн OR хэсгүүд (цэвэр функц). scope.all бол
 * null (шүүлтгүй). Хоосон массив = юу ч харагдахгүй.
 */
export function studentTestAccessOr(
  scope: StudentTestScope,
  now = new Date(),
): Prisma.TestWhereInput[] | null {
  if (scope.all) return null;
  const or: Prisma.TestWhereInput[] = [];
  if (scope.classroomIds.length) {
    or.push({
      access: {
        some: {
          classroomId: { in: scope.classroomIds },
          assignedAt: { lte: now },
        },
      },
    });
  }
  if (scope.testIds.length) or.push({ id: { in: scope.testIds } });
  const released = scope.releasedChapterIds;
  if (released === null) {
    if (scope.chapterIds.length)
      or.push({ chapterId: { in: scope.chapterIds } });
    if (scope.bookIds.length)
      or.push({ chapter: { bookId: { in: scope.bookIds } } });
  } else {
    const ok = new Set(released);
    const chapters = scope.chapterIds.filter((id) => ok.has(id));
    if (chapters.length) or.push({ chapterId: { in: chapters } });
    if (scope.bookIds.length && released.length)
      or.push({
        AND: [
          { chapter: { bookId: { in: scope.bookIds } } },
          { chapterId: { in: released } },
        ],
      });
  }
  return or;
}

/** Нэг тестэд ангиас гадуурх (pass/худалдан авалт) эрх хүрэх эсэх — цэвэр функц */
export function scopeGrantsTest(
  scope: StudentTestScope,
  test: { id: string; chapterId: string | null; bookId: string | null },
): boolean {
  if (scope.all || scope.testIds.includes(test.id)) return true;
  const viaChapter =
    (!!test.chapterId && scope.chapterIds.includes(test.chapterId)) ||
    (!!test.bookId && scope.bookIds.includes(test.bookId));
  if (!viaChapter) return false;
  if (scope.releasedChapterIds === null) return true;
  return !!test.chapterId && scope.releasedChapterIds.includes(test.chapterId);
}

/**
 * full     — бүлгийн бүх бодлого (багш, freePreview, pass, худалдан авалт)
 * released — зөвхөн ангид нээгдсэн тестийн бодлогууд (`problemIds`)
 * none     — эрхгүй
 */
export type ChapterGrant =
  | { level: 'full' }
  | { level: 'released'; problemIds: Set<string> }
  | { level: 'none' };

async function chapterGrant(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
  requiresVideo: boolean,
): Promise<ChapterGrant> {
  const FULL = { level: 'full' } as const;
  const NONE = { level: 'none' } as const;
  const subject = await chapterSubjectOf(prisma, chapter);
  const gated = subject !== Subject.MATH;
  if (chapter.freePreview && !gated) return FULL;
  if (
    TEACHER_ROLES.includes(role) &&
    (await internalTeachingRole(prisma, userId))
  )
    return FULL;
  // Хаалттай хичээл: тухайн хичээлийн идэвхтэй ангигүй бол ямар ч эрх (pass,
  // худалдан авалт, freePreview) хүрэхгүй
  let own: Set<Subject> | null = null;
  if (gated) {
    own = await activeClassSubjects(prisma, userId, role);
    if (!own.has(subject)) return NONE;
    if (chapter.freePreview) return FULL;
  }
  if (
    await hasCoveringPass(prisma, userId, {
      chapterId: chapter.id,
      bookId: chapter.bookId,
    })
  )
    return FULL;
  if (chapter.bookId) {
    const purchase = await prisma.purchase.findFirst({
      where: {
        ...activePurchaseWhere(userId),
        productItem: {
          kind: 'BOOK',
          refId: chapter.bookId,
          ...(requiresVideo ? { includesVideo: true } : {}),
        },
      },
      select: { id: true },
    });
    if (purchase) return FULL;
  }
  // Танхимын анги: зөвхөн өөрийн хичээлд, зөвхөн НЭЭГДСЭН тестийн бодлогууд
  const release = await classroomRelease(prisma, userId, role);
  if (release && release.chapterIds.has(chapter.id)) {
    own ??= await activeClassSubjects(prisma, userId, role);
    if (own.has(subject))
      return { level: 'released', problemIds: release.problemIds };
  }
  return NONE;
}

/** Бүлгийн түвшний контент (онол, бүлгийн бичлэг, жагсаалт) — нэг ч бодлого нээгдсэн бол хангалттай. */
export async function canAccessChapter(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
): Promise<boolean> {
  return (await chapterGrant(prisma, userId, role, chapter, false)).level !== 'none';
}
/** Media additionally requires the BOOK product's includesVideo entitlement. */
export async function canAccessVideoChapter(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
): Promise<boolean> {
  return (await chapterGrant(prisma, userId, role, chapter, true)).level !== 'none';
}
/** Бүлгийн аль бодлого харагдахыг тодорхойлно — бодлогын жагсаалтыг шүүхэд. */
export function chapterAccessGrant(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
  requiresVideo = false,
): Promise<ChapterGrant> {
  return chapterGrant(prisma, userId, role, chapter, requiresVideo);
}
/**
 * Нэг бодлогын эрх (хариу, бодолт, бичлэг, зураг). Танхимын сурагчид зөвхөн
 * ангид нээгдсэн тестэд орсон бодлого.
 */
export async function canAccessProblem(
  prisma: PrismaService,
  userId: string,
  role: Role,
  problem: { id: string; chapter: ChapterAccessTarget },
  requiresVideo = false,
): Promise<boolean> {
  const grant = await chapterGrant(prisma, userId, role, problem.chapter, requiresVideo);
  if (grant.level === 'full') return true;
  return grant.level === 'released' && grant.problemIds.has(problem.id);
}
