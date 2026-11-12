import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ubDateKey } from '../attendance/board-logic';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PaymentStatus, Role } from '../generated/prisma/enums';
import {
  ACADEMIC_YEAR,
  computeLedger,
  tierFor,
  todayKeyUB,
} from '../payments/ledger';
import {
  classDays,
  primaryEnrollment,
  settlements,
} from '../payments/ledger-load';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import {
  WEB_ATTENDANCE_FROM,
  computeWithdrawal,
  dayBefore,
  firstPattern,
  heldLessonDays,
  leaveCandidates,
  lessonsPerMonthFor,
  projectLessonDays,
  webMarkingStart,
  type DateKey,
  type WithdrawalResult,
} from './withdrawal';
import { toEstimate, type RefundEstimate } from './refund-estimate';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dk = (d: Date | null | undefined): DateKey | null =>
  d ? d.toISOString().slice(0, 10) : null;

export interface WithdrawalOptions {
  leftOn: string;
  countFrom?: string | null;
  /** Ажилтны «суугаагүй» гэж сонгосон өдрүүд (эмнэлгийн чөлөө) */
  exclude?: string[];
}

/**
 * Сургалтаас хасах (эзэн 2026-11-03): гэрээгээр буцаах төлбөрийг тооцож (withdrawal.ts), «Хасах» дарахад
 * сурагчийг архивлаж, тооцоог StudentWithdrawal-д хадгална; буцаах дүн > 0 бол TuitionRefund (DRAFT) —
 * батлах/шилжүүлэх нь одоогийн буцаалтын урсгалаар.
 */
@Injectable()
export class WithdrawalService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
    private audit: AuditService,
  ) {}

  private parseOpts(o: WithdrawalOptions) {
    if (!DATE.test(o.leftOn ?? ''))
      throw new BadRequestException('Гарсан огноо ЖЖЖЖ-СС-ӨӨ байна');
    if (o.countFrom && !DATE.test(o.countFrom))
      throw new BadRequestException('Эхлэх огноо ЖЖЖЖ-СС-ӨӨ байна');
    const exclude = [
      ...new Set((o.exclude ?? []).filter((d) => DATE.test(d))),
    ].slice(0, 400);
    if (o.leftOn > todayKeyUB())
      throw new BadRequestException('Гарсан огноо ирээдүйд байж болохгүй');
    return { leftOn: o.leftOn, countFrom: o.countFrom || null, exclude };
  }

  /** Тооцоо (хадгалахгүй) — «Сургалтаас хасах» цонхонд */
  async preview(studentId: string, opts: WithdrawalOptions) {
    const o = this.parseOpts(opts);
    return this.compute(studentId, o.leftOn, o.countFrom, o.exclude, true);
  }

  /** Буцаалт тооцоолох хуудас (/app/tuition) — ижил гэрээний дүрэм, хадгалахгүй */
  async previewAny(studentId: string, leftOn: string) {
    const o = this.parseOpts({ leftOn });
    return this.compute(studentId, o.leftOn, null, [], false);
  }

  /**
   * «Одоо гарвал буцаах дүн» (эзэн 2026-11-08) — өнөөдрөөр, анхдагч эхлэх өдрөөр, хасалтгүй тооцоо.
   * Хадгалахгүй. Багшид зөвхөн буцаах дүн + хичээлийн тоо (refund-estimate.ts).
   */
  async estimate(studentId: string, role: Role): Promise<RefundEstimate> {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        role: true,
        archivedAt: true,
        // Танхимын анги л — онлайн сургалтад энэ гэрээний тооцоо хамаарахгүй
        enrollments: {
          where: { leftAt: null, classroom: { type: 'IN_PERSON' } },
          select: { id: true },
        },
      },
    });
    if (!user || user.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
    if (user.archivedAt) return { applicable: false, reason: 'ARCHIVED' };
    if (!user.enrollments.length) return { applicable: false, reason: 'NO_CLASS' };
    const calc = await this.compute(studentId, todayKeyUB(), null, [], true);
    return toEstimate(calc, role);
  }

  private async compute(
    studentId: string,
    leftOn: DateKey,
    countFromIn: DateKey | null,
    exclude: DateKey[],
    requireActive: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        archivedAt: true,
        studentProfile: {
          select: {
            grade: true,
            tuitionPlan: true,
            tuitionAmount: true,
            tuitionAgreed: true,
            joinedOn: true,
          },
        },
        enrollments: {
          orderBy: { joinedAt: 'asc' },
          select: {
            classroomId: true,
            joinedAt: true,
            leftAt: true,
            classroom: {
              select: { id: true, name: true, type: true, archived: true },
            },
          },
        },
      },
    });
    if (!user || user.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
    if (requireActive && user.archivedAt)
      throw new BadRequestException('Сурагч аль хэдийн сургалтаас хасагдсан');
    const open = user.enrollments.filter((e) => !e.leftAt);
    const primary = primaryEnrollment([...open].reverse())?.classroom ?? null;
    if (!primary)
      throw new BadRequestException('Сурагч одоо ямар ч ангид суугаагүй байна');
    const profile = user.studentProfile;
    const firstEnroll = user.enrollments[0]
      ? ubDateKey(user.enrollments[0].joinedAt)
      : null;
    const startDate = dk(profile?.joinedOn) ?? firstEnroll;

    const [payments, days, settled] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          userId: studentId,
          status: PaymentStatus.CONFIRMED,
          storePurchaseId: null,
        },
        select: { amount: true, forMonth: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
      classDays(this.prisma, [primary.id]),
      settlements(this.prisma, [studentId]),
    ]);
    const daysPerWeek = days.get(primary.id) ?? null;
    const tier = tierFor(profile?.grade, primary.name, daysPerWeek).tier;
    const ledgerPayments = payments.map((p) => ({
      amount: p.amount,
      forMonth: p.forMonth,
      paidOn: dk(p.paidAt),
    }));
    const ledger = computeLedger({
      plan: profile?.tuitionPlan ?? null,
      tuitionAmount: profile?.tuitionAmount ?? null,
      agreed: profile?.tuitionAgreed ?? null,
      tier,
      startDate,
      leftOn: null,
      payments: ledgerPayments,
      today: todayKeyUB(),
      settled: settled.has(studentId),
    });

    // Тооцоо эхлэх өдөр: сар бүр төлөгч жил эхлэхээс өмнө орсон бол зуны төлбөр тооцогддоггүй тул
    // 9-р сарын 1; энэ жилийн гэрээнд (3-р сараас хойш) орсон бол эхэлсэн өдөр; хуучин сурагч 9/1.
    const yearStart = `${ACADEMIC_YEAR.months[0]}-01`;
    const defaultFrom =
      !startDate || startDate < ACADEMIC_YEAR.paymentsFrom
        ? yearStart
        : ledger.plan.kind === 'MONTHLY' && startDate < yearStart
          ? yearStart
          : startDate;
    const countFrom = countFromIn ?? defaultFrom;
    if (countFrom > leftOn && countFromIn)
      throw new BadRequestException('Эхлэх огноо гарсан огнооноос хойш байна');

    // Ангид БОЛСОН хичээл: анги бүрийн суусан хугацаагаар (анги сольсон байж болно)
    const lessonDays: DateKey[] = [];
    // Вэбд ирц бүртгэхээс өмнөх хичээл — суусан гэж үзнэ, хасахгүй (эзэн 2026-11-08)
    const assumedDays: DateKey[] = [];
    const segments: {
      classroomId: string;
      name: string;
      from: DateKey;
      to: DateKey;
      webStart: DateKey | null;
      noSchedule: boolean;
    }[] = [];
    // Анхны ангийн Enrollment.joinedAt нь импортын өдөр байж болно (бодит эхлэл = joinedOn) — анхны
    // ангид тооцоо эхлэх өдрөөс, дараагийн (анги сольсон) ангид шилжсэн өдрөөс тоолно
    // Нийгмийн анги тусдаа төлбөртэй — үндсэн анги нийгэм биш бол тоолохгүй
    const social = (name: string) => /нийгэм/i.test(name);
    const inPerson = user.enrollments.filter(
      (e) =>
        e.classroom.type === 'IN_PERSON' &&
        (social(primary.name) || !social(e.classroom.name)),
    );
    for (const [i, e] of inPerson.entries()) {
      const joined = i === 0 ? countFrom : ubDateKey(e.joinedAt);
      const segFrom = joined > countFrom ? joined : countFrom;
      const segTo = [leftOn, e.leftAt ? ubDateKey(e.leftAt) : leftOn].sort()[0];
      if (segFrom > segTo) continue;
      const seg = await this.classLessonDays(e.classroomId, segFrom, segTo);
      const webStart = await this.webStart(e.classroomId);
      lessonDays.push(...seg.days);
      assumedDays.push(...seg.days.filter((d) => !webStart || d < webStart));
      segments.push({
        classroomId: e.classroomId,
        name: e.classroom.name,
        from: segFrom,
        to: segTo,
        webStart,
        noSchedule: seg.noSchedule,
      });
    }
    const assumedSet = new Set(assumedDays);
    // Ирц: зөвхөн вэбд бодитоор бүртгэсэн (2026-10-23-ноос) — өмнөх нь туршилтын бичлэг
    const attFrom = countFrom > WEB_ATTENDANCE_FROM ? countFrom : WEB_ATTENDANCE_FROM;
    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: new Date(`${attFrom}T00:00:00Z`),
          lte: new Date(`${leftOn}T00:00:00Z`),
        },
      },
      select: { date: true, status: true, note: true, classroomId: true },
      orderBy: { date: 'asc' },
    });
    // Өмнө нь гаргасан, цуцлаагүй буцаалт (энэ жилийн) — сэргээгээд дахин хасахад давхар буцаахгүй
    const prior = await this.prisma.tuitionRefund.aggregate({
      where: {
        studentId,
        status: { not: 'CANCELLED' },
        leftOn: { gte: new Date(`${ACADEMIC_YEAR.paymentsFrom}T00:00:00Z`) },
      },
      _sum: { refundAmount: true },
    });
    const result = computeWithdrawal({
      monthlyFee: tier.monthly,
      lessonsPerMonth: lessonsPerMonthFor(daysPerWeek, tier.monthly),
      countFrom,
      leftOn,
      lessonDays,
      excusedDays: leaveCandidates(
        attendance.map((a) => ({ date: dk(a.date)!, status: a.status })),
      ),
      extraExcluded: exclude,
      assumedDays,
      paid: ledger.paidTotal,
      refundedBefore: prior._sum.refundAmount ?? 0,
    });
    const last = result.cycles.at(-1);
    // Гарсан мөчлөгийн хичээлүүд — ажилтан «суугаагүй» (эмнэлгийн чөлөө) гэж сонгоно
    const attByDay = new Map(attendance.map((a) => [dk(a.date)!, a]));
    const lastCycleDays =
      last && !last.full
        ? [...new Set(lessonDays)]
            .filter((d) => d >= last.start && d <= leftOn)
            .sort()
            .map((d) => ({
              date: d,
              status: attByDay.get(d)?.status ?? null,
              note: attByDay.get(d)?.note ?? null,
              leave: last.leaveDay === d,
              excluded: last.extraDays.includes(d),
              // Вэбд ирц бүртгэхээс өмнөх — суусан гэж үзнэ, хасах боломжгүй
              assumed: assumedSet.has(d),
            }))
        : [];
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 } as Record<
      string,
      number
    >;
    for (const a of attendance) counts[a.status] = (counts[a.status] ?? 0) + 1;
    const marks = await this.prisma.dailyHomeworkMark.groupBy({
      by: ['status'],
      where: {
        studentId,
        date: {
          gte: new Date(`${countFrom}T00:00:00Z`),
          lte: new Date(`${leftOn}T00:00:00Z`),
        },
      },
      _count: { _all: true },
    });
    const homework = { DONE: 0, PARTIAL: 0, NOT_DONE: 0 } as Record<
      string,
      number
    >;
    for (const m of marks) if (m.status) homework[m.status] = m._count._all;

    return {
      student: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      classroom: { id: primary.id, name: primary.name },
      plan: {
        kind: ledger.plan.kind,
        autoFull: !!ledger.plan.autoFull,
        settled: ledger.plan.settled,
        price: ledger.price,
      },
      monthlyFee: tier.monthly,
      lessonsPerMonth: lessonsPerMonthFor(daysPerWeek, tier.monthly),
      daysPerWeek,
      startDate,
      countFrom,
      leftOn,
      /** Сүүлийн (одоогийн) ангид вэбд ирц бүртгэж эхэлсэн өдөр */
      webStart: segments.at(-1)?.webStart ?? null,
      segments,
      /** Хуваарьгүй анги — хичээлийн тоог мэдэх боломжгүй (тооцоо дутуу) */
      noSchedule: segments.some((x) => x.noSchedule),
      payments: payments.map((p) => ({
        amount: p.amount,
        paidOn: dk(p.paidAt),
        forMonth: p.forMonth,
      })),
      result,
      lastCycleDays,
      history: {
        lessons: [...new Set(lessonDays)].length,
        attendance: counts,
        homework,
      },
    };
  }

  /** Ангийн вэбд ирц бүртгэж эхэлсэн өдөр (2026-10-23-ноос хойших анхны ирц), бичлэггүй бол null */
  private async webStart(classroomId: string): Promise<DateKey | null> {
    const first = await this.prisma.attendance.findFirst({
      where: {
        classroomId,
        date: { gte: new Date(`${WEB_ATTENDANCE_FROM}T00:00:00Z`) },
      },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    return webMarkingStart(dk(first?.date));
  }

  /**
   * Нэг ангийн [from, to] хооронд болсон хичээлийн өдрүүд (амралт, цуцлалт, зөөлт тооцсон). Хуваарь вэбд
   * хожуу үүссэн бол (анхны мөрийн effectiveFrom > from) түүнээс өмнөх өдрүүдийг анхны хуваарийн
   * гарагаар тооцно — тэр үед ч анги хичээллэж байсан (эзэн 2026-11-08, 13-3 анги).
   */
  private async classLessonDays(
    classroomId: string,
    from: DateKey,
    to: DateKey,
  ): Promise<{ days: DateKey[]; noSchedule: boolean }> {
    const rows = await this.prisma.classSchedule.findMany({
      where: { classroomId, deletedAt: null },
      select: { weekday: true, effectiveFrom: true, effectiveTo: true },
    });
    const pattern = firstPattern(
      rows.map((r) => ({
        weekday: r.weekday,
        effectiveFrom: dk(r.effectiveFrom)!,
        effectiveTo: dk(r.effectiveTo),
      })),
    );
    if (!pattern) return { days: [], noSchedule: true };
    const out: DateKey[] = [];
    if (from < pattern.from) {
      const projTo = [to, dayBefore(pattern.from)].sort()[0];
      const off = await this.prisma.academicCalendarDay.findMany({
        where: {
          deletedAt: null,
          date: {
            gte: new Date(`${from}T00:00:00Z`),
            lte: new Date(`${projTo}T00:00:00Z`),
          },
          OR: [
            { classrooms: { none: {} } },
            { classrooms: { some: { classroomId } } },
          ],
        },
        select: { date: true },
      });
      out.push(
        ...projectLessonDays(
          from,
          projTo,
          pattern.weekdays,
          new Set(off.map((h) => dk(h.date)!)),
        ),
      );
      if (to < pattern.from) return { days: out, noSchedule: false };
      from = pattern.from;
    }
    out.push(...(await this.scheduledLessonDays(classroomId, from, to)));
    return { days: out, noSchedule: false };
  }

  /** Хуваарийн хөдөлгүүрээр [from, to] хооронд болсон хичээлийн өдрүүд (амралт, цуцлалт, зөөлт) */
  private async scheduledLessonDays(
    classroomId: string,
    from: DateKey,
    to: DateKey,
  ): Promise<DateKey[]> {
    const out: DateKey[] = [];
    // expandDays нэг удаад 370 хоног хүртэл
    for (let cur = from; cur <= to; ) {
      const end = new Date(Date.parse(`${cur}T00:00:00Z`) + 360 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const chunkTo = end < to ? end : to;
      const days = await this.schedule.expandDays(cur, chunkTo, classroomId);
      const planned = days
        .filter((d) => d.holiday === null)
        .map((d) => ({
          date: d.date,
          scheduleIds: d.classes
            .filter((c) => c.classroomId === classroomId)
            .map((c) => c.id),
        }))
        .filter((d) => d.scheduleIds.length > 0);
      const ids = [...new Set(planned.flatMap((p) => p.scheduleIds))];
      const exceptions = ids.length
        ? await this.prisma.scheduleException.findMany({
            where: {
              deletedAt: null,
              scheduleId: { in: ids },
              OR: [
                {
                  date: {
                    gte: new Date(`${cur}T00:00:00Z`),
                    lte: new Date(`${chunkTo}T00:00:00Z`),
                  },
                },
                {
                  newDate: {
                    gte: new Date(`${cur}T00:00:00Z`),
                    lte: new Date(`${chunkTo}T00:00:00Z`),
                  },
                },
              ],
            },
            select: { scheduleId: true, date: true, kind: true, newDate: true },
          })
        : [];
      out.push(
        ...heldLessonDays(
          planned,
          exceptions.map((x) => ({
            scheduleId: x.scheduleId,
            date: dk(x.date)!,
            kind: x.kind,
            newDate: dk(x.newDate),
          })),
          cur,
          chunkTo,
        ),
      );
      cur = new Date(Date.parse(`${chunkTo}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10);
    }
    return out;
  }

  /** «Хасах» — архивлаж, тооцоог хадгална. Зөвхөн энэ товчоор тооцоо бүртгэгдэнэ. */
  async withdraw(
    studentId: string,
    body: WithdrawalOptions & { reason?: string; note?: string },
    actor: { userId: string; role: Role },
  ) {
    const o = this.parseOpts(body);
    const reason = (body.reason ?? '').trim();
    if (reason.length < 3) throw new BadRequestException('Шалтгаан оруулна уу');
    const calc = await this.compute(
      studentId,
      o.leftOn,
      o.countFrom,
      o.exclude,
      true,
    );
    const r = calc.result;
    const now = new Date();
    // Архивлах, буцаалт, тооцоо НЭГ гүйлгээнд: зэрэг хоёр «Хасах» дарвал хоёр дахь нь
    // archivedAt:null нөхцөлөөр тасарна (давхар буцаалт үүсэхгүй — аюулгүй байдлын шалгалт)
    const saved = await this.prisma.$transaction(async (tx) => {
      const archived = await tx.user.updateMany({
        where: { id: studentId, role: Role.STUDENT, archivedAt: null },
        data: {
          archivedAt: now,
          archivedById: actor.userId,
          archiveReason: reason,
        },
      });
      if (archived.count === 0)
        throw new BadRequestException('Сурагч аль хэдийн сургалтаас хасагдсан');
      await tx.enrollment.updateMany({
        where: { studentId, leftAt: null },
        data: { leftAt: now, movedById: actor.userId },
      });
      await tx.studentProfile.updateMany({
        where: { userId: studentId },
        data: { leftOn: new Date(`${o.leftOn}T00:00:00Z`) },
      });
      const last = r.cycles.at(-1);
      const refund =
        r.refund > 0
          ? await tx.tuitionRefund.create({
              data: {
                studentId,
                classroomId: calc.classroom.id,
                leftOn: new Date(`${o.leftOn}T00:00:00Z`),
                totalLessonDays: last?.lessons ?? 0,
                attendedLessonDays: last?.counted ?? 0,
                dailyRate: Math.round(r.perLesson),
                totalPaid: r.paid,
                owed: r.owed,
                refundAmount: r.refund,
                shortfall: 0,
                status: 'DRAFT',
                note: 'Сургалтаас хасах үеийн тооцоо (гэрээгээр)',
                createdById: actor.userId,
              },
              select: { id: true },
            })
          : null;
      return tx.studentWithdrawal.create({
        data: {
          studentId,
          classroomId: calc.classroom.id,
          leftOn: new Date(`${o.leftOn}T00:00:00Z`),
          countFrom: new Date(`${calc.countFrom}T00:00:00Z`),
          reason,
          owed: r.owed,
          paid: r.paid,
          refund: r.refund,
          detail: {
            ...calc,
            note: body.note?.trim() || null,
          } as unknown as Prisma.InputJsonValue,
          refundId: refund?.id ?? null,
          createdById: actor.userId,
        },
      });
    });
    await this.audit.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ARCHIVE',
      entity: 'User',
      entityId: studentId,
      before: { archivedAt: null },
      after: { archivedAt: now.toISOString(), withdrawalId: saved.id },
      reason,
    });
    await this.audit.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'CREATE',
      entity: 'StudentWithdrawal',
      entityId: saved.id,
      after: {
        leftOn: o.leftOn,
        owed: r.owed,
        paid: r.paid,
        refund: r.refund,
        refundId: saved.refundId,
      },
      reason,
    });
    return { id: saved.id, refund: r.refund, refundId: saved.refundId };
  }

  /** Хадгалсан тооцоонууд (шинэ нь эхэнд) — сурагчийн «Гарсан тооцоо» таб */
  async list(studentId: string) {
    const rows = await this.prisma.studentWithdrawal.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    const ids = [...new Set(rows.map((r) => r.createdById))];
    const people = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : [];
    const refunds = rows.some((r) => r.refundId)
      ? await this.prisma.tuitionRefund.findMany({
          where: {
            id: { in: rows.flatMap((r) => (r.refundId ? [r.refundId] : [])) },
          },
          select: { id: true, status: true, paidAt: true },
        })
      : [];
    return rows.map((r) => {
      const by = people.find((p) => p.id === r.createdById);
      return {
        id: r.id,
        leftOn: dk(r.leftOn),
        countFrom: dk(r.countFrom),
        reason: r.reason,
        owed: r.owed,
        paid: r.paid,
        refund: r.refund,
        createdAt: r.createdAt.toISOString(),
        createdBy: by
          ? `${by.lastName ? `${by.lastName.slice(0, 1)}.` : ''}${by.firstName}${by.role === 'TEACHER_PLUS' ? '+' : ''}`
          : null,
        refundStatus: refunds.find((x) => x.id === r.refundId) ?? null,
        detail: r.detail as unknown as Record<string, unknown> & {
          result: WithdrawalResult;
        },
      };
    });
  }
}
