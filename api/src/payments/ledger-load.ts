// Ledger-ийн оролтыг (суудаг анги, 7 хоногийн өдөр, гараар «бүтэн жил») олон
// сурагчид НЭГ ДОР ачаална. Төлбөр хэсэг, ангийн самбар, буцаалт бүгд ижил
// тооцоо харуулахын тулд нэг газраас (эзэн 2026-10-31: ангийн самбар «дутуу»
// гэж харуулдаг байсан хүүхэд Төлбөр хэсэгт «төлсөн» байсан).
import { AttendanceStatus, PaymentStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import {
  ACADEMIC_YEAR,
  computeLedger,
  resolveCycleStart,
  tierFor,
  type AttendanceStart,
  type CycleStartSource,
  type DateKey,
  type LedgerResult,
  type MonthKey,
  type MonthPeriod,
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

/**
 * Анги бүр 7 хоногт хэдэн өдөр ордог — ТОГТМОЛ хэв маягаар (дуусах огноогүй
 * мөрийн давхардаагүй гараг). «Одоо хүчинтэй» мөрөөр тоолбол гараг солиход
 * завсарт нэг өдөр дутна: хуучин мөр өнөөдөр хаагдаж, шинэ нь маргаашаас
 * эхэлдэг (2026-11-01: 12-9-ийн Бямба → Ням, 6 анги «3 өдөр» болж 300 мянга
 * гарсан). Тогтмол мөргүй (бүгд түр) ангид одоо хүчинтэйгээр.
 */
export async function classDays(
  prisma: PrismaService,
  classroomIds: string[],
  now = new Date(),
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!classroomIds.length) return out;
  const rows = await prisma.classSchedule.findMany({
    where: {
      deletedAt: null,
      classroomId: { in: [...new Set(classroomIds)] },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    },
    select: { classroomId: true, weekday: true, effectiveFrom: true, effectiveTo: true },
  });
  const open = new Map<string, Set<number>>();
  const current = new Map<string, Set<number>>();
  const add = (m: Map<string, Set<number>>, id: string, wd: number) =>
    (m.get(id) ?? m.set(id, new Set()).get(id)!).add(wd);
  for (const r of rows) {
    if (!r.effectiveTo) add(open, r.classroomId, r.weekday);
    if (r.effectiveFrom <= now) add(current, r.classroomId, r.weekday);
  }
  for (const id of new Set(rows.map((r) => r.classroomId)))
    out.set(id, (open.get(id) ?? current.get(id))?.size ?? 0);
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

/**
 * Энэ жилийн анхны ирц (resolveCycleStart-д) — 3 бөөн асуулга, хүүхэд бүрээр биш (N+1 үгүй).
 * firstAny = жил эхэлснээс хойших хамгийн эртний бичлэг (ямар ч төлөв) ба түүний анги; classFirst =
 * тэр ангид ирц бүртгэж эхэлсэн өдөр; firstPresent = анх ирсэн (PRESENT/LATE).
 */
export async function attendanceStartsFor(
  prisma: PrismaService,
  studentIds: string[],
  year = ACADEMIC_YEAR,
): Promise<Map<string, AttendanceStart>> {
  const out = new Map<string, AttendanceStart>();
  if (!studentIds.length) return out;
  const from = new Date(`${year.months[0]}-01T00:00:00Z`);
  const [any, present] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['studentId', 'classroomId'],
      where: { studentId: { in: studentIds }, date: { gte: from } },
      _min: { date: true },
    }),
    prisma.attendance.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
        date: { gte: from },
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
      },
      _min: { date: true },
    }),
  ]);
  const earliest = new Map<string, { classroomId: string; date: Date }>();
  for (const r of any) {
    const d = r._min.date;
    if (!d) continue;
    const cur = earliest.get(r.studentId);
    if (!cur || d < cur.date) earliest.set(r.studentId, { classroomId: r.classroomId, date: d });
  }
  if (!earliest.size) return out;
  const classFirst = new Map(
    (
      await prisma.attendance.groupBy({
        by: ['classroomId'],
        where: { classroomId: { in: [...new Set([...earliest.values()].map((e) => e.classroomId))] } },
        _min: { date: true },
      })
    ).map((r) => [r.classroomId, r._min.date]),
  );
  const presentBy = new Map(present.map((r) => [r.studentId, r._min.date]));
  for (const [id, e] of earliest) {
    const cf = classFirst.get(e.classroomId);
    if (!cf) continue;
    out.set(id, { firstAny: dateKey(e.date)!, classFirst: dateKey(cf)!, firstPresent: dateKey(presentBy.get(id)) });
  }
  return out;
}

/** Хүүхэд бүрийн энэ жилийн мөчлөг эхлэх өдөр (гараар > ирц > joinedOn > 1-ний өдөр) */
export async function cycleStartsFor(
  prisma: PrismaService,
  profiles: { id: string; cycleStartOn: Date | null | undefined; joinedOn: Date | null | undefined }[],
): Promise<Map<string, { on: DateKey | null; source: CycleStartSource }>> {
  const att = await attendanceStartsFor(prisma, profiles.map((p) => p.id));
  return new Map(
    profiles.map((p) => [p.id, resolveCycleStart(dateKey(p.cycleStartOn), att.get(p.id), dateKey(p.joinedOn))]),
  );
}

/** computeLedger-ийн cycleStart (зөвхөн сайтын баталгаатай эх сурвалж) */
export const siteCycleStart = (c: { on: DateKey | null; source: CycleStartSource } | undefined) =>
  c?.on && (c.source === 'MANUAL' || c.source === 'ATTENDANCE') ? { on: c.on, source: c.source } : null;

/** Сайтаас сунгасан хугацаа (идэвхтэй) — хүүхэд бүрээр */
export async function extensionsFor(prisma: PrismaService, studentIds: string[]) {
  const out = new Map<string, { id: string; month: MonthKey; days: number; reason: string; gapFrom: Date | null; gapTo: Date | null; createdById: string; createdAt: Date }[]>();
  if (!studentIds.length) return out;
  const rows = await prisma.tuitionExtension.findMany({
    where: { studentId: { in: studentIds }, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, studentId: true, month: true, days: true, reason: true, gapFrom: true, gapTo: true, createdById: true, createdAt: true },
  });
  for (const { studentId, ...e } of rows) (out.get(studentId) ?? out.set(studentId, []).get(studentId)!).push(e);
  return out;
}

// Шийтийн сарын бүлэг: «Төлсөн дүн» багана, «Хугацаа» нь дараагийнх нь (O=6-7 … AY=6-7)
const SHEET_MONTH_COLS = ['O', 'R', 'U', 'X', 'AA', 'AD', 'AG', 'AJ', 'AM', 'AP', 'AS', 'AV', 'AY'];
const colIndex = (l: string) => [...l].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const yearOf = (m: number) => (m >= 6 ? 2026 : 2027);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Шийтийн «Хугацаа» нүд → сар бүрийн хугацаа («08/04-09/14»). Хугацааны эхлэх сар
 * бүлгийн сартай таарахгүй бол (ажилтны алдаа) авахгүй. Эзэн жагсаалт давуу, дараа нь «Сар бүр».
 */
export async function sheetPeriodsFor(prisma: PrismaService, studentIds: string[]) {
  const out = new Map<string, Record<MonthKey, MonthPeriod>>();
  if (!studentIds.length) return out;
  const rows = await prisma.sheetRow.findMany({
    where: { studentId: { in: studentIds }, goneAt: null, tab: { in: ['Суудал баталгаажуулалт', 'Сар бүр'] } },
    select: { studentId: true, tab: true, cells: true },
  });
  // «Сар бүр» эхэлж, «Суудал баталгаажуулалт» сүүлд → эзэн жагсаалт дарж бичнэ. ӨС-ийн эрэмбэ
  // (collation)-д найдахгүй: өмнө нь «Сар бүр» сүүлд орж хуучин «10/01-11/01» эзнийхийг дардаг байв (2026-11-19)
  rows.sort((a, b) => (a.tab === 'Сар бүр' ? 0 : 1) - (b.tab === 'Сар бүр' ? 0 : 1));
  for (const r of rows) {
    const cells = (r.cells ?? {}) as Record<string, unknown>;
    const mine = out.get(r.studentId!) ?? {};
    SHEET_MONTH_COLS.forEach((col, i) => {
      const month = `${yearOf(((5 + i) % 12) + 1)}-${pad(((5 + i) % 12) + 1)}`;
      const text = String(cells[colLetterOf(colIndex(col) + 1)] ?? '');
      const m = /^\s*(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/.exec(text);
      if (!m) return;
      const from = `${yearOf(+m[1])}-${pad(+m[1])}-${pad(+m[2])}`;
      const to = `${yearOf(+m[3])}-${pad(+m[3])}-${pad(+m[4])}`;
      if (from.slice(0, 7) !== month || to <= from || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return;
      mine[month] = { from, to };
    });
    out.set(r.studentId!, mine);
  }
  return out;
}

function colLetterOf(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
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
          select: { grade: true, tuitionPlan: true, tuitionAmount: true, tuitionAgreed: true, joinedOn: true, leftOn: true, cycleStartOn: true },
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
      select: { id: true, userId: true, amount: true, forMonth: true, paidAt: true },
    }),
    settlements(prisma, studentIds),
  ]);
  const [extensions, sheetPeriods, cycles] = await Promise.all([
    extensionsFor(prisma, studentIds),
    sheetPeriodsFor(prisma, studentIds),
    cycleStartsFor(prisma, users.map((u) => ({ id: u.id, cycleStartOn: u.studentProfile?.cycleStartOn, joinedOn: u.studentProfile?.joinedOn }))),
  ]);
  const primary = new Map(users.map((u) => [u.id, primaryEnrollment(u.enrollments)?.classroom ?? null]));
  const days = await classDays(
    prisma,
    [...primary.values()].filter((c) => !!c).map((c) => c!.id),
  );
  const payBy = new Map<string, { id: string; amount: number; forMonth: string | null; paidOn: DateKey | null }[]>();
  for (const p of payments) {
    const list = payBy.get(p.userId) ?? [];
    list.push({ id: p.id, amount: p.amount, forMonth: p.forMonth, paidOn: dateKey(p.paidAt) });
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
        agreed: profile?.tuitionAgreed ?? null,
        periods: sheetPeriods.get(u.id),
        extensions: extensions.get(u.id),
        cycleStart: siteCycleStart(cycles.get(u.id)),
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
