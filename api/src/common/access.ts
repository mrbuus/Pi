import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

// Багш эрхтэй роль бүлэг — контент/тест/бичлэгийн эрхийн шалгалт бүрт ижил
// (SPEC §11: багш нар үргэлж бүх контентыг харна).
export const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

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
  if (scope.all) return true;
  if (target.testId && scope.testIds?.includes(target.testId)) return true;
  if (target.chapterId && scope.chapterIds?.includes(target.chapterId)) {
    return true;
  }
  if (target.bookId && scope.bookIds?.includes(target.bookId)) return true;
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
  const passes = await prisma.userPass.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    include: { pass: { select: { scope: true } } },
  });
  const chapterIds = new Set<string>();
  const bookIds = new Set<string>();
  const testIds = new Set<string>();
  let all = false;
  for (const up of passes) {
    const scope = up.pass.scope as PassScope | null;
    if (!scope) continue;
    if (scope.all) all = true;
    scope.chapterIds?.forEach((id) => chapterIds.add(id));
    scope.bookIds?.forEach((id) => bookIds.add(id));
    scope.testIds?.forEach((id) => testIds.add(id));
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
    where: { studentId: userId, leftAt: null },
  });
  return !!active;
}

export interface ChapterAccessTarget {
  id: string;
  bookId: string | null;
  freePreview: boolean;
}

// Хандалтын дүрэм (SPEC §11), бодлого/бичлэг/тест гурван газар ижил:
// багш нар бүгдийг; нээлттэй бүлгийг хэн ч; танхимын идэвхтэй сурагч бүгдийг;
// бусад нь хүчинтэй эрхийнхээ (pass) хамрах хүрээгээр. ТҮҮНЭЭС ГАДНА: худалдан авалт
// дээр тухайн номын видеотай бүтээгдэхүүн худалдаж авсан (Purchase→ProductItem→Book→Chapter).
export async function canAccessChapter(
  prisma: PrismaService,
  userId: string,
  role: Role,
  chapter: ChapterAccessTarget,
): Promise<boolean> {
  if (TEACHER_ROLES.includes(role)) return true;
  if (chapter.freePreview) return true;
  if (await hasActiveClassroomEnrollment(prisma, userId, role)) return true;

  // Pass эрхийг шалгана
  if (
    await hasCoveringPass(prisma, userId, {
      chapterId: chapter.id,
      bookId: chapter.bookId,
    })
  ) {
    return true;
  }

  // Purchase гинж: тухайн номын (chapter.bookId) видеотай бүтээгдэхүүн худалдаж авсан уу
  if (chapter.bookId) {
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        grantedAt: { not: null }, // төлбөр баталгаажсан
        productItem: {
          kind: 'BOOK',
          includesVideo: true,
          refId: chapter.bookId,
        },
      },
    });
    if (purchase) return true;
  }

  return false;
}
