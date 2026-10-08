import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

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
async function chapterGrant(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
  requiresVideo: boolean,
): Promise<boolean> {
  if (chapter.freePreview) return true;
  if (
    TEACHER_ROLES.includes(role) &&
    (await internalTeachingRole(prisma, userId))
  )
    return true;
  if (await hasActiveClassroomEnrollment(prisma, userId, role)) return true;
  if (
    await hasCoveringPass(prisma, userId, {
      chapterId: chapter.id,
      bookId: chapter.bookId,
    })
  )
    return true;
  if (!chapter.bookId) return false;
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
  return !!purchase;
}
/** General theory/problem content includes book-only purchases. */
export function canAccessChapter(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
): Promise<boolean> {
  return chapterGrant(prisma, userId, role, chapter, false);
}
/** Media additionally requires the BOOK product's includesVideo entitlement. */
export function canAccessVideoChapter(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
): Promise<boolean> {
  return chapterGrant(prisma, userId, role, chapter, true);
}
