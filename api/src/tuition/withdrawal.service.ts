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
  computeWithdrawal,
  heldLessonDays,
  lessonsPerMonthFor,
  type DateKey,
  type WithdrawalResult,
} from './withdrawal';

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
      lessonDays.push(
        ...(await this.classLessonDays(e.classroomId, segFrom, segTo)),
      );
    }
    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: new Date(`${countFrom}T00:00:00Z`),
          lte: new Date(`${leftOn}T00:00:00Z`),
        },
      },
      select: { date: true, status: true, note: true, classroomId: true },
      orderBy: { date: 'asc' },
    });
    const excused = attendance.filter((a) => a.status === 'EXCUSED');
    const result = computeWithdrawal({
      monthlyFee: tier.monthly,
      lessonsPerMonth: lessonsPerMonthFor(daysPerWeek, tier.monthly),
      countFrom,
      leftOn,
      lessonDays,
      excusedDays: excused.map((a) => dk(a.date)!),
      extraExcluded: exclude,
      paid: ledger.paidTotal,
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

  /** Нэг ангийн [from, to] хооронд болсон хичээлийн өдрүүд (амралт, цуцлалт, зөөлт тооцсон) */
  private async classLessonDays(
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
