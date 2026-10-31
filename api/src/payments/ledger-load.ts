// Ledger-ийн оролтыг (суудаг анги, 7 хоногийн өдөр, гараар «бүтэн жил») олон
// сурагчид НЭГ ДОР ачаална. Төлбөр хэсэг, ангийн самбар, буцаалт бүгд ижил
// тооцоо харуулахын тулд нэг газраас (эзэн 2026-10-31: ангийн самбар «дутуу»
// гэж харуулдаг байсан хүүхэд Төлбөр хэсэгт «төлсөн» байсан).
import { PaymentStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import {
  ACADEMIC_YEAR,
  computeLedger,
  tierFor,
  type DateKey,
  type LedgerResult,
} from './ledger';

export interface LedgerClassroom {
  id: string;
  name: string;
}

export interface Settlement {
  id: string;
  note: string | null;
  createdById: string;
  createdAt: Date;
}

/**
 * Үнийг тодорхойлох анги: идэвхтэй танхимын анги, Нийгмээс бусад нь түрүүнд,
 * дараа нь хамгийн сүүлд орсон. Оролт joinedAt-аар буурахаар эрэмбэлэгдсэн.
 */
export function primaryEnrollment<
  T extends { classroom: { name: string; type: string; archived: boolean } },
>(enrollments: T[]): T | null {
  const live = enrollments.filter((e) => e.classroom.type === 'IN_PERSON' && !e.classroom.archived);
  return live.find((e) => !/нийгэм/i.test(e.classroom.name)) ?? live[0] ?? enrollments[0] ?? null;
}

/** Анги бүр 7 хоногт хэдэн өдөр ордог — одоо хүчинтэй хуваарийн давхардаагүй гараг. */
export async function classDays(
  prisma: PrismaService,
  classroomIds: string[],
  now = new Date(),
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!classroomIds.length) return out;
  const rows = await prisma.classSchedule.findMany({
    where: {
      classroomId: { in: [...new Set(classroomIds)] },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    },
    select: { classroomId: true, weekday: true },
    distinct: ['classroomId', 'weekday'],
  });
  for (const r of rows) out.set(r.classroomId, (out.get(r.classroomId) ?? 0) + 1);
  return out;
}

/** Энэ хичээлийн жилд гараар «бүтэн жил» гэж тооцсон идэвхтэй шийдвэр. */
export async function settlements(
  prisma: PrismaService,
  studentIds: string[],
  year = ACADEMIC_YEAR.id,
): Promise<Map<string, Settlement>> {
  const out = new Map<string, Settlement>();
  if (!studentIds.length) return out;
  const rows = await prisma.tuitionSettlement.findMany({
    where: { year, revokedAt: null, studentId: { in: studentIds } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, studentId: true, note: true, createdById: true, createdAt: true },
  });
  for (const { studentId, ...s } of rows) out.set(studentId, s);
  return out;
}

const dateKey = (d: Date | null | undefined): DateKey | null =>
  d ? d.toISOString().slice(0, 10) : null;

/**
 * Ангийн самбарт: сурагч бүрийн ledger (4 асуулга). Төлбөр хэсгийн
 * PaymentsLedgerService.rows()-тэй ЯГ ижил оролт.
 */
export async function ledgersFor(
  prisma: PrismaService,
  studentIds: string[],
  today: DateKey,
): Promise<Map<string, LedgerResult>> {
  const out = new Map<string, LedgerResult>();
  if (!studentIds.length) return out;
  const [users, payments, settled] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        studentProfile: {
          select: { grade: true, tuitionPlan: true, tuitionAmount: true, joinedOn: true, leftOn: true },
        },
        enrollments: {
          where: { leftAt: null },
          orderBy: { joinedAt: 'desc' },
          select: { classroom: { select: { id: true, name: true, type: true, archived: true } } },
        },
      },
    }),
    prisma.payment.findMany({
      where: { userId: { in: studentIds }, status: PaymentStatus.CONFIRMED, storePurchaseId: null },
      select: { userId: true, amount: true, forMonth: true, paidAt: true },
    }),
    settlements(prisma, studentIds),
  ]);
  const primary = new Map(users.map((u) => [u.id, primaryEnrollment(u.enrollments)?.classroom ?? null]));
  const days = await classDays(
    prisma,
    [...primary.values()].filter((c) => !!c).map((c) => c!.id),
  );
  const payBy = new Map<string, { amount: number; forMonth: string | null; paidOn: DateKey | null }[]>();
  for (const p of payments) {
    const list = payBy.get(p.userId) ?? [];
    list.push({ amount: p.amount, forMonth: p.forMonth, paidOn: dateKey(p.paidAt) });
    payBy.set(p.userId, list);
  }
  for (const u of users) {
    const profile = u.studentProfile;
    const classroom = primary.get(u.id) ?? null;
    out.set(
      u.id,
      computeLedger({
        plan: profile?.tuitionPlan ?? null,
        tuitionAmount: profile?.tuitionAmount ?? null,
        tier: tierFor(profile?.grade, classroom?.name, classroom ? days.get(classroom.id) : null).tier,
        startDate: dateKey(profile?.joinedOn),
        leftOn: dateKey(profile?.leftOn),
        payments: payBy.get(u.id) ?? [],
        today,
        settled: settled.has(u.id),
      }),
    );
  }
  return out;
}
