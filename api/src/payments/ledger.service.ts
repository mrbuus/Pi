import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  PaymentMethod,
  PaymentStatus,
  Role,
  StudentNoteType,
  StudentType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACADEMIC_YEAR,
  computeLedger,
  promiseState,
  tierFor,
  todayKeyUB,
  type DateKey,
  type LedgerResult,
  type MonthKey,
  type PromiseState,
} from './ledger';
import { withPlus } from '../revisions/revision-snapshot';
import { AuditService } from '../audit/audit.service';
import { PaymentsService, type PaymentActor } from './payments.service';
import { classDays, primaryEnrollment, settlements } from './ledger-load';
import type { CreatePaymentDto } from './dto/payment.dto';
import type { LedgerPayDto, LedgerSettleDto } from './dto/ledger.dto';

/** Төлбөрийн хэсгийн нэг сурагчийн мөр — блок, өр, тэмдэглэл, амлалт. */
export interface LedgerRow extends Omit<LedgerResult, 'plan'> {
  id: string;
  firstName: string;
  lastName: string;
  code: string | null;
  phone: string | null;
  classroom: { id: string; name: string } | null;
  plan: LedgerResult['plan'] & { raw: string | null };
  startDate: DateKey | null;
  leftOn: DateKey | null;
  notes: {
    count: number;
    last: { body: string; authorName: string | null; at: string } | null;
  };
  promise: {
    on: DateKey;
    state: PromiseState;
    overdueDays: number;
  } | null;
}

const STUDENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  studentCode: true,
  studentProfile: {
    select: {
      grade: true,
      tuitionPlan: true,
      tuitionAmount: true,
      joinedOn: true,
      leftOn: true,
    },
  },
  enrollments: {
    where: { leftAt: null },
    orderBy: { joinedAt: 'desc' as const },
    select: { classroom: { select: { id: true, name: true, type: true, archived: true } } },
  },
} satisfies Prisma.UserSelect;

const dateKey = (d: Date | null | undefined): DateKey | null =>
  d ? d.toISOString().slice(0, 10) : null;
// Багш+ бол «+» (эзэн 2026-10-23)
const authorLabel = (a: { firstName: string; lastName: string | null; role?: string | null }) =>
  withPlus(`${a.lastName ? `${a.lastName.charAt(0)}. ` : ''}${a.firstName}`.trim(), a.role);

/** Хамгийн асуудалтай нь эхэнд: өртэй сар → өрийн дүн → тасарсан амлалт. */
export function problemOrder(a: LedgerRow, b: LedgerRow): number {
  return (
    b.owedMonths - a.owedMonths ||
    b.owedNow - a.owedNow ||
    (b.promise?.state === 'BROKEN' ? b.promise.overdueDays + 1 : 0) -
      (a.promise?.state === 'BROKEN' ? a.promise.overdueDays + 1 : 0)
  );
}

export const isProblem = (r: LedgerRow) =>
  r.owedNow > 0 || r.promise?.state === 'BROKEN';

@Injectable()
export class PaymentsLedgerService {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
    private audit: AuditService,
  ) {}

  private baseWhere(): Prisma.UserWhereInput {
    return {
      role: Role.STUDENT,
      archivedAt: null,
      studentProfile: { type: StudentType.CLASSROOM },
    };
  }

  /** Сурагчдын мөрийг нэг дор (3 асуулга) тооцно. */
  async rows(where: Prisma.UserWhereInput, today = todayKeyUB()) {
    const users = await this.prisma.user.findMany({
      where: { AND: [this.baseWhere(), where] },
      select: STUDENT_SELECT,
    });
    if (!users.length) return [];
    const ids = users.map((u) => u.id);
    const primary = new Map(
      users.map((u) => [u.id, primaryEnrollment(u.enrollments)?.classroom ?? null]),
    );
    const [payments, notes, days, settled] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          userId: { in: ids },
          status: PaymentStatus.CONFIRMED,
          storePurchaseId: null,
        },
        select: {
          userId: true,
          amount: true,
          forMonth: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      this.prisma.studentNote.findMany({
        where: { studentId: { in: ids }, type: StudentNoteType.PAYMENT },
        orderBy: { createdAt: 'desc' },
        select: {
          studentId: true,
          body: true,
          createdAt: true,
          createdById: true,
          promisedOn: true,
          resolvedAt: true,
        },
      }),
      classDays(
        this.prisma,
        [...primary.values()].filter((c) => !!c).map((c) => c!.id),
      ),
      settlements(this.prisma, ids),
    ]);
    const authors = new Map(
      (
        await this.prisma.user.findMany({
          where: { id: { in: [...new Set(notes.map((n) => n.createdById))] } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      ).map((a) => [a.id, authorLabel(a)]),
    );
    const payBy = new Map<string, typeof payments>();
    for (const p of payments) {
      const list = payBy.get(p.userId) ?? [];
      list.push(p);
      payBy.set(p.userId, list);
    }
    const notesBy = new Map<string, typeof notes>();
    for (const n of notes) {
      const list = notesBy.get(n.studentId) ?? [];
      list.push(n);
      notesBy.set(n.studentId, list);
    }

    return users.map((u): LedgerRow => {
      const profile = u.studentProfile;
      const primaryClass = primary.get(u.id) ?? null;
      const classroom = primaryClass ? { id: primaryClass.id, name: primaryClass.name } : null;
      const mine = payBy.get(u.id) ?? [];
      const startDate = dateKey(profile?.joinedOn);
      const leftOn = dateKey(profile?.leftOn);
      const { plan, ...ledger } = computeLedger({
        plan: profile?.tuitionPlan ?? null,
        tuitionAmount: profile?.tuitionAmount ?? null,
        tier: tierFor(profile?.grade, classroom?.name, classroom ? days.get(classroom.id) : null).tier,
        startDate,
        leftOn,
        payments: mine.map((p) => ({
          amount: p.amount,
          forMonth: p.forMonth,
          paidOn: dateKey(p.paidAt),
        })),
        today,
        settled: settled.has(u.id),
      });
      const myNotes = notesBy.get(u.id) ?? [];
      const last = myNotes[0];
      const promised = myNotes.find((n) => n.promisedOn && !n.resolvedAt);
      let promise: LedgerRow['promise'] = null;
      if (promised?.promisedOn) {
        const on = dateKey(promised.promisedOn)!;
        const ps = promiseState(
          on,
          todayKeyUB(promised.createdAt),
          mine.map((p) => dateKey(p.paidAt ?? p.createdAt)!),
          today,
        );
        // Өргүй болсон бол хуучин амлалтыг «тасарсан» гэж харуулахгүй
        if (ledger.owedNow > 0 || ps.state === 'UPCOMING')
          promise = { on, ...ps };
      }
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        code: u.studentCode,
        phone: u.phone,
        classroom,
        plan: { ...plan, raw: profile?.tuitionPlan ?? null },
        startDate,
        leftOn,
        ...ledger,
        notes: {
          count: myNotes.length,
          last: last
            ? {
                body: last.body.length > 160 ? `${last.body.slice(0, 157)}...` : last.body,
                authorName: authors.get(last.createdById) ?? null,
                at: last.createdAt.toISOString(),
              }
            : null,
        },
        promise,
      };
    });
  }

  currentMonth(today: DateKey): MonthKey {
    const m = today.slice(0, 7);
    const months = ACADEMIC_YEAR.months;
    if (m < months[0]) return months[0];
    if (m > months[months.length - 1]) return months[months.length - 1];
    return m;
  }

  private yearView() {
    const { id, months, firstHalfEnd, secondHalfDue } = ACADEMIC_YEAR;
    return { id, months, firstHalfEnd, secondHalfDue };
  }

  /** Төвийн хураангуй + анги бүрийн энэ сарын төлөв. */
  async overview() {
    const today = todayKeyUB();
    const month = this.currentMonth(today);
    const idx = ACADEMIC_YEAR.months.indexOf(month);
    const [rows, pending, classrooms] = await Promise.all([
      this.rows({}, today),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.PENDING },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.classroom.findMany({
        where: { archived: false },
        select: { id: true, name: true },
      }),
    ]);
    type ClassStat = {
      id: string;
      name: string;
      students: number;
      expected: number;
      covered: number;
      /** Энэ сарын хугацаа нь болсон ч төлөгдөөгүй хэсэг */
      late: number;
      owedStudents: number;
      owedNow: number;
      brokenPromises: number;
      notes: number;
    };
    const blank = (id: string, name: string): ClassStat => ({
      id,
      name,
      students: 0,
      expected: 0,
      covered: 0,
      late: 0,
      owedStudents: 0,
      owedNow: 0,
      brokenPromises: 0,
      notes: 0,
    });
    const byClass = new Map<string, ClassStat>(
      classrooms.map((c) => [c.id, blank(c.id, c.name)]),
    );
    const total = blank('all', 'Төв');
    let problems = 0;
    let upcoming = 0;
    let unassigned = 0;
    for (const r of rows) {
      const stat = r.classroom ? byClass.get(r.classroom.id) : null;
      if (!stat) unassigned++;
      const b = r.blocks[idx];
      for (const s of stat ? [stat, total] : [total]) {
        s.students++;
        if (b && b.state !== 'OFF') {
          s.expected += b.due;
          s.covered += b.paid;
          if (b.dueOn && b.dueOn <= today) s.late += b.due - b.paid;
        }
        if (r.owedNow > 0) {
          s.owedStudents++;
          s.owedNow += r.owedNow;
        }
        if (r.promise?.state === 'BROKEN') s.brokenPromises++;
        if (r.notes.count) s.notes++;
      }
      if (isProblem(r)) problems++;
      if (r.promise?.state === 'UPCOMING') upcoming++;
    }
    const collator = new Intl.Collator('mn', { numeric: true });
    return {
      year: this.yearView(),
      today,
      month,
      totals: {
        ...total,
        problems,
        upcomingPromises: upcoming,
        unassigned,
        pending: { count: pending._count, amount: pending._sum.amount ?? 0 },
      },
      classes: [...byClass.values()]
        .filter((c) => c.students > 0)
        .sort((a, b) => collator.compare(a.name, b.name)),
    };
  }

  /** Ангийн мөрүүд, эсвэл төвийн асуудалтай жагсаалт, эсвэл хайлт. */
  async board(params: {
    classroomId?: string;
    view?: 'problems' | 'promises';
    q?: string;
    offset?: number;
    limit?: number;
  }) {
    const today = todayKeyUB();
    const collator = new Intl.Collator('mn');
    const byName = (a: LedgerRow, b: LedgerRow) =>
      collator.compare(a.firstName, b.firstName) ||
      collator.compare(a.lastName, b.lastName);
    const base = { year: this.yearView(), today, month: this.currentMonth(today) };

    if (params.classroomId) {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: params.classroomId },
        select: { id: true, name: true },
      });
      if (!classroom) throw new NotFoundException('Анги олдсонгүй');
      const rows = await this.rows(
        { enrollments: { some: { classroomId: classroom.id, leftAt: null } } },
        today,
      );
      return { ...base, classroom, total: rows.length, rows: rows.sort(byName) };
    }

    const q = params.q?.trim();
    if (q) {
      if (q.length < 2)
        throw new BadRequestException('Хайх үг 2-оос дээш тэмдэгт');
      const digits = q.replace(/\D/g, '');
      const rows = await this.rows(
        {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            ...(digits.length >= 4
              ? [
                  { phone: { contains: digits } },
                  { studentCode: { contains: digits } },
                ]
              : []),
          ],
        },
        today,
      );
      return { ...base, total: rows.length, rows: rows.sort(byName).slice(0, 40) };
    }

    if (params.view === 'promises') {
      // Өдөр тутмын залгах жагсаалт: тасарсан (хэтэрсэн хоногоор), дараа нь удахгүй
      const rows = (await this.rows({}, today))
        .filter((r) => r.promise && r.promise.state !== 'KEPT')
        .sort(
          (a, b) =>
            (a.promise!.state === 'BROKEN' ? 0 : 1) - (b.promise!.state === 'BROKEN' ? 0 : 1) ||
            b.promise!.overdueDays - a.promise!.overdueDays ||
            a.promise!.on.localeCompare(b.promise!.on),
        );
      return {
        ...base,
        total: rows.length,
        owedNow: rows.reduce((s, r) => s + r.owedNow, 0),
        rows,
      };
    }

    if (params.view === 'problems') {
      const limit = Math.min(Math.max(params.limit ?? 40, 1), 200);
      const offset = Math.max(params.offset ?? 0, 0);
      const ranked = (await this.rows({}, today)).filter(isProblem).sort(problemOrder);
      return {
        ...base,
        total: ranked.length,
        owedNow: ranked.reduce((s, r) => s + r.owedNow, 0),
        rows: ranked.slice(offset, offset + limit),
      };
    }
    throw new BadRequestException('Анги, хайлт эсвэл харагдац сонгоно уу');
  }

  /** Нэг сурагчийн бүх мэдээлэл — дэлгэрэнгүй хуудсанд нэг дуудлагаар. */
  async student(id: string) {
    const today = todayKeyUB();
    const [row] = await this.rows({ id }, today);
    if (!row) throw new NotFoundException('Сурагч олдсонгүй');
    const [profile, payments, notes, refunds, days, settled] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId: id },
        select: {
          grade: true,
          tuitionPlan: true,
          tuitionAmount: true,
          tuitionNote: true,
          fatherPhone: true,
          motherPhone: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { userId: id, storePurchaseId: null },
        orderBy: [{ paidAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          description: true,
          forMonth: true,
          paidAt: true,
          createdAt: true,
          confirmedById: true,
        },
      }),
      this.prisma.studentNote.findMany({
        where: { studentId: id, type: StudentNoteType.PAYMENT },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          body: true,
          createdAt: true,
          createdById: true,
          promisedOn: true,
          resolvedAt: true,
        },
      }),
      this.prisma.tuitionRefund.findMany({
        where: { studentId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          leftOn: true,
          refundAmount: true,
          shortfall: true,
          createdAt: true,
          classroom: { select: { name: true } },
        },
      }),
      classDays(this.prisma, row.classroom ? [row.classroom.id] : []),
      settlements(this.prisma, [id]),
    ]);
    const settlement = settled.get(id) ?? null;
    const people = new Map(
      (
        await this.prisma.user.findMany({
          where: {
            id: {
              in: [
                ...new Set([
                  ...notes.map((n) => n.createdById),
                  ...payments.map((p) => p.confirmedById).filter((x): x is string => !!x),
                  ...(settlement ? [settlement.createdById] : []),
                ]),
              ],
            },
          },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      ).map((a) => [a.id, authorLabel(a)]),
    );
    const paidDates = payments
      .filter((p) => p.status === PaymentStatus.CONFIRMED)
      .map((p) => dateKey(p.paidAt ?? p.createdAt)!);
    const daysPerWeek = row.classroom ? (days.get(row.classroom.id) ?? null) : null;
    const { tier } = tierFor(profile?.grade, row.classroom?.name, daysPerWeek);
    return {
      year: this.yearView(),
      today,
      month: this.currentMonth(today),
      row,
      tier,
      daysPerWeek,
      settlement: settlement
        ? {
            note: settlement.note,
            at: settlement.createdAt,
            authorName: people.get(settlement.createdById) ?? null,
          }
        : null,
      profile,
      payments: payments.map(({ confirmedById, ...p }) => ({
        ...p,
        confirmedBy: confirmedById ? (people.get(confirmedById) ?? null) : null,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt,
        authorName: people.get(n.createdById) ?? null,
        promisedOn: dateKey(n.promisedOn),
        resolvedAt: n.resolvedAt,
        promise: n.promisedOn
          ? promiseState(
              dateKey(n.promisedOn)!,
              todayKeyUB(n.createdAt),
              paidDates,
              today,
            )
          : null,
      })),
      refunds: refunds.map((r) => ({
        ...r,
        leftOn: dateKey(r.leftOn),
        classroom: r.classroom.name,
      })),
    };
  }

  /**
   * Гараар төлбөр бүртгэж ШУУД баталгаажуулна — ажилтан мөнгийг өөрөө авсан
   * (бэлэн/данс) тул хоёр алхам шаардахгүй. Аудит: CREATE + (UPDATE) + CONFIRM.
   */
  async pay(studentId: string, dto: LedgerPayDto, actor: PaymentActor) {
    const today = todayKeyUB();
    if (dto.paidOn && (dto.paidOn > today || dto.paidOn < ACADEMIC_YEAR.paymentsFrom))
      throw new BadRequestException('Төлсөн өдөр буруу байна');
    const create: CreatePaymentDto = {
      amount: dto.amount,
      method: dto.method as PaymentMethod,
      forMonth: dto.forMonth,
      description: dto.note?.trim() || undefined,
      clientRequestId: dto.clientRequestId,
    };
    const created = (await this.payments.createManual(create, studentId, actor)) as {
      id: string;
      status: PaymentStatus;
    };
    if (created.status === PaymentStatus.PENDING) {
      if (dto.paidOn && dto.paidOn !== today)
        await this.payments.update(
          created.id,
          { paidAt: `${dto.paidOn}T04:00:00.000Z`, reason: 'Төлсөн өдөр (гараар бүртгэл)' },
          actor,
        );
      await this.payments.confirm(created.id, {}, actor);
    }
    const [row] = await this.rows({ id: studentId }, today);
    return { paymentId: created.id, row };
  }

  /**
   * Багш+ / Админ: стандарт үнээс бага төлсөн ч «бүтэн жил» гэж тооцох, эсвэл
   * буцааж системийн тооцоонд (дутуу) оруулах (эзэн 2026-10-31). Тайлбар сонголттой.
   * Устгахгүй — буцаахад revokedAt; түүх AuditLog-д.
   */
  async settle(studentId: string, dto: LedgerSettleDto, actor: PaymentActor) {
    const year = ACADEMIC_YEAR.id;
    const today = todayKeyUB();
    const student = await this.prisma.user.findFirst({
      where: { AND: [this.baseWhere(), { id: studentId }] },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Сурагч олдсонгүй');
    const note = dto.note?.trim() || null;
    const change = await this.prisma.$transaction(async (tx) => {
      const active = await tx.tuitionSettlement.findFirst({
        where: { studentId, year, revokedAt: null },
      });
      if (dto.full) {
        if (active) return null; // аль хэдийн бүтэн — давхар дарсан
        const created = await tx.tuitionSettlement.create({
          data: { studentId, year, note, createdById: actor.id },
        });
        return { action: 'SETTLE', id: created.id, before: null, after: created };
      }
      if (!active) return null;
      const revoked = await tx.tuitionSettlement.update({
        where: { id: active.id },
        data: { revokedAt: new Date(), revokedById: actor.id },
      });
      return { action: 'UNSETTLE', id: active.id, before: active, after: revoked };
    });
    if (change)
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: change.action,
        entity: 'TuitionSettlement',
        entityId: change.id,
        before: change.before ?? undefined,
        after: { ...change.after, studentId },
        reason: dto.full ? (note ?? 'Бүтэн жилд тооцсон') : (note ?? 'Системийн тооцоонд буцаасан'),
      });
    const [row] = await this.rows({ id: studentId }, today);
    return { row };
  }
}
