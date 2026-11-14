import type { PrismaService } from '../prisma/prisma.service';

/**
 * Хоёр ангид зэрэг суух (эзэн 2026-11-12): сурагч математикийн анги + Нийгмийн ангид
 * ЗЭРЭГ бүртгэлтэй байж болно. «Чиглэл» (track) тус бүрт нэг л идэвхтэй анги —
 * анги солиход зөвхөн ижил чиглэлийн өмнөх анги хаагдана.
 *
 * Чиглэл = Classroom.subject; хоосон бол нэрээр («НИЙГЭМ (Зүүн 4)» → Нийгэм, бусад нь
 * математик). Нэрээр таних нь payments/ledger-load.ts `primaryEnrollment`-тэй ижил дүрэм —
 * одоогийн НИЙГЭМ ангийн subject-ийг өөрчлөхгүйгээр ажиллана.
 */
export type ClassTrack = 'MATH' | 'SOCIAL_STUDIES' | 'SAT';

export interface TrackClass {
  name: string;
  subject?: string | null;
}

export function classTrack(c: TrackClass): ClassTrack {
  if (c.subject === 'SOCIAL_STUDIES' || c.subject === 'SAT' || c.subject === 'MATH')
    return c.subject;
  return /нийгэм/i.test(c.name) ? 'SOCIAL_STUDIES' : 'MATH';
}

const TRACK_ORDER: ClassTrack[] = ['MATH', 'SAT', 'SOCIAL_STUDIES'];

/** Үндсэн (математикийн) анги эхэнд; ижил чиглэл дотор оролтын дараалал хэвээр */
export function mainFirst<T extends { classroom: TrackClass }>(rows: readonly T[]): T[] {
  return rows
    .map((r, i) => ({ r, i, k: TRACK_ORDER.indexOf(classTrack(r.classroom)) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.r);
}

export interface ActiveClass {
  classroomId: string;
  joinedAt: Date;
  classroom: { id: string; name: string; subject: string | null; grade: number | null };
}

/**
 * Сурагчийн одоо сууж буй (архивлаагүй) ангиуд — үндсэн анги эхэнд, дараа нь сүүлд
 * орсон нь. «Сурагчийн анги» гэж ГАНЦ анги хэрэгтэй газар `[0]`-ийг авна.
 */
export async function activeClasses(
  prisma: Pick<PrismaService, 'enrollment'>,
  studentId: string,
): Promise<ActiveClass[]> {
  const rows = await prisma.enrollment.findMany({
    where: { studentId, leftAt: null, classroom: { archived: false } },
    orderBy: { joinedAt: 'desc' },
    select: {
      classroomId: true,
      joinedAt: true,
      classroom: { select: { id: true, name: true, subject: true, grade: true } },
    },
  });
  return mainFirst(rows);
}
