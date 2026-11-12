import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { assertInternalTeachingStaff, TEACHER_ROLES } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import type { SetBookPaymentDto } from './book-payments.dto';
import {
  BOOKS,
  bookTitle,
  classBookSummary,
  cleanBookAmount,
  cleanBookNote,
  collectorTotals,
  isBookKey,
  lockedElsewhere,
  samePayment,
  type PaymentValue,
} from './book-payments.logic';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
};

const ROW_SELECT = {
  id: true,
  studentId: true,
  bookKey: true,
  status: true,
  amount: true,
  classroomId: true,
  checkId: true,
  collectedById: true,
  note: true,
  createdById: true,
  createdAt: true,
  voidedAt: true,
  voidedById: true,
} as const;

export interface BookPaymentRow {
  id: string;
  studentId: string;
  bookKey: string;
  status: string;
  amount: number | null;
  classroomId: string | null;
  checkId: string | null;
  collectedById: string | null;
  note: string | null;
  createdById: string;
  createdAt: Date;
  voidedAt: Date | null;
  voidedById: string | null;
}

export interface ShapedBookPayment {
  id: string;
  studentId: string;
  bookKey: string;
  status: string;
  amount: number | null;
  note: string | null;
  classroom: { id: string; name: string } | null;
  collectedBy: Person | null;
  createdBy: Person | null;
  createdAt: string;
  voidedAt: string | null;
  voidedBy: Person | null;
}

const isUniqueViolation = (err: unknown) =>
  (err as { code?: unknown } | null)?.code === 'P2002';

/**
 * «Номын мөнгө» (эзэн 2026-11-12) — сурагч × номын төлбөрийн бүртгэл. Хоёр
 * замаар бичигдэнэ: ангийн номын чекээс (ClassChecksService) ба сурагчийн
 * хуудаснаас. Мөр хэзээ ч устахгүй: өөрчлөх бүрд хуучин нь voidedAt авч шинэ
 * мөр үүснэ, дээр нь аудит.
 */
@Injectable()
export class BookPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────────────────── Унших туслахууд ─────────────────────────

  private async people(
    ids: Iterable<string | null>,
  ): Promise<Map<string, Person>> {
    const unique = [...new Set(ids)].filter((x): x is string => !!x);
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return new Map(rows.map((u) => [u.id, u]));
  }

  private async classNames(
    ids: Iterable<string | null>,
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids)].filter((x): x is string => !!x);
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.classroom.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((c) => [c.id, c.name]));
  }

  /** Мөрүүдийг хүний нэр, ангийн нэртэй нь буцаана (нэг багц асуулгаар) */
  async shape(rows: readonly BookPaymentRow[]): Promise<ShapedBookPayment[]> {
    const [people, classes] = await Promise.all([
      this.people(
        rows.flatMap((r) => [r.collectedById, r.createdById, r.voidedById]),
      ),
      this.classNames(rows.map((r) => r.classroomId)),
    ]);
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      bookKey: r.bookKey,
      status: r.status,
      amount: r.amount,
      note: r.note,
      classroom: r.classroomId
        ? { id: r.classroomId, name: classes.get(r.classroomId) ?? '' }
        : null,
      collectedBy: r.collectedById
        ? (people.get(r.collectedById) ?? null)
        : null,
      createdBy: people.get(r.createdById) ?? null,
      createdAt: r.createdAt.toISOString(),
      voidedAt: r.voidedAt?.toISOString() ?? null,
      voidedBy: r.voidedById ? (people.get(r.voidedById) ?? null) : null,
    }));
  }

  /**
   * Ангийн номын чекүүдэд хэрэгтэй идэвхтэй мөрүүд: одоогийн сурагчдын (аль ч
   * ангид төлсөн) + энэ ангид төлсөн (гарсан сурагчийнх ч) мөр.
   */
  async activeForClass(
    classroomId: string,
    bookKeys: readonly string[],
    rosterIds: readonly string[],
  ): Promise<BookPaymentRow[]> {
    if (bookKeys.length === 0) return [];
    return this.prisma.bookPayment.findMany({
      where: {
        voidedAt: null,
        bookKey: { in: [...bookKeys] },
        OR: [{ studentId: { in: [...rosterIds] } }, { classroomId }],
      },
      select: ROW_SELECT,
    });
  }

  // ───────────────────────── Бичих цөм ─────────────────────────

  /** Мөнгө хүлээж авсан хүн — идэвхтэй Админ/Багш+/Багш байх ёстой */
  private async assertCollector(id: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, archivedAt: true },
    });
    if (!u || u.archivedAt || !TEACHER_ROLES.includes(u.role))
      throw new BadRequestException('Мөнгө авсан багшийг зөв сонгоно уу');
  }

  /**
   * Сурагч × номын идэвхтэй мөрийг `value`-аар солино (null = тэмдэглэгээг
   * болиулах). Ижил агуулгатай бол юу ч бичихгүй. Хуучин мөр voidedAt авна —
   * устахгүй. `guard` нь транзакц дотор идэвхтэй мөрийг хараад татгалзаж болно
   * (зэрэг дарсан үед ч зөв). Хоёр хүн зэрэг бичвэл нэг нь P2002 авч дахин оролдоно.
   */
  private async write(
    studentId: string,
    bookKey: string,
    value: PaymentValue | null,
    ctx: {
      actorId: string;
      actorRole: Role;
      checkId: string | null;
      guard?: (active: BookPaymentRow | null) => void;
    },
  ): Promise<BookPaymentRow | null> {
    const run = () =>
      this.prisma.$transaction(async (tx) => {
        const active = await tx.bookPayment.findFirst({
          where: { studentId, bookKey, voidedAt: null },
          select: ROW_SELECT,
        });
        ctx.guard?.(active);
        if (value && active && samePayment(active, value))
          return { before: active, after: active, changed: false };
        if (!value && !active)
          return { before: null, after: null, changed: false };
        if (active)
          await tx.bookPayment.updateMany({
            where: { id: active.id, voidedAt: null },
            data: { voidedAt: new Date(), voidedById: ctx.actorId },
          });
        const after = value
          ? await tx.bookPayment.create({
              data: {
                studentId,
                bookKey,
                ...value,
                checkId: ctx.checkId,
                createdById: ctx.actorId,
              },
              select: ROW_SELECT,
            })
          : null;
        return { before: active, after, changed: true };
      });
    let res: Awaited<ReturnType<typeof run>>;
    try {
      res = await run();
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      res = await run();
    }
    if (res.changed) {
      const brief = (r: BookPaymentRow | null) =>
        r && {
          status: r.status,
          amount: r.amount,
          classroomId: r.classroomId,
          collectedById: r.collectedById,
          note: r.note,
        };
      await this.audit.record({
        actorId: ctx.actorId,
        actorRole: ctx.actorRole,
        action: !res.before ? 'CREATE' : res.after ? 'UPDATE' : 'DELETE',
        entity: 'BookPayment',
        entityId: `${studentId}:${bookKey}`,
        before: brief(res.before),
        after: res.after
          ? { studentId, bookKey, ...brief(res.after) }
          : { studentId, bookKey, voided: true },
      });
    }
    return res.after;
  }

  // ───────────────────────── Ангийн чекээс ─────────────────────────

  /**
   * Ангийн номын чекээс тэмдэглэх. Эрх, чек, бүртгэлийг ClassChecksService
   * шалгасан байна. Анхдагч: дүн = чекийн үнэ, авсан багш = тэмдэглэж буй хүн.
   * Өөр ангид төлсөн мөнгийг эндээс хөндөхгүй.
   */
  async markFromCheck(input: {
    classroomId: string;
    check: { id: string; bookKey: string; amount: number | null };
    studentId: string;
    dto: {
      checked: boolean;
      skipped?: boolean;
      amount?: number | null;
      collectedById?: string;
      note?: string | null;
    };
    actorId: string;
    actorRole: Role;
  }): Promise<BookPaymentRow | null> {
    const { classroomId, check, studentId, dto, actorId, actorRole } = input;
    let value: PaymentValue | null = null;
    if (dto.skipped) {
      value = {
        status: 'SKIPPED',
        amount: null,
        classroomId,
        collectedById: null,
        note: cleanBookNote(dto.note),
      };
    } else if (dto.checked) {
      const amount =
        dto.amount === undefined ? check.amount : cleanBookAmount(dto.amount);
      if (Number.isNaN(amount))
        throw new BadRequestException('Дүн буруу байна');
      const collectedById = dto.collectedById ?? actorId;
      if (collectedById !== actorId) await this.assertCollector(collectedById);
      value = {
        status: 'PAID',
        amount,
        classroomId,
        collectedById,
        note: cleanBookNote(dto.note),
      };
    }
    return this.write(studentId, check.bookKey, value, {
      actorId,
      actorRole,
      checkId: check.id,
      guard: (active) => {
        if (lockedElsewhere(active, classroomId))
          throw new BadRequestException(
            'Энэ сурагч өөр ангид байхдаа төлсөн — сурагчийн хуудасны «Ном» хэсгээс засна',
          );
      },
    });
  }

  // ───────────────────────── Сурагчийн хуудаснаас ─────────────────────────

  private async student(studentId: string) {
    const s = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        enrollments: {
          orderBy: { joinedAt: 'desc' },
          select: {
            classroomId: true,
            leftAt: true,
            classroom: { select: { id: true, name: true, archived: true } },
          },
        },
      },
    });
    if (!s || s.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
    return s;
  }

  /** Ном бүрийн санал болгох үнэ: эхлээд сурагчийн ангийн чек, эс бөгөөс хамгийн сүүлийн чек */
  private async suggestedAmounts(
    classroomIds: readonly string[],
  ): Promise<Map<string, number>> {
    const checks = await this.prisma.classCheck.findMany({
      where: { bookKey: { not: null }, amount: { not: null }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { bookKey: true, amount: true, classroomId: true },
    });
    const mine = new Set(classroomIds);
    const out = new Map<string, number>();
    for (const c of checks)
      if (mine.has(c.classroomId) && !out.has(c.bookKey!))
        out.set(c.bookKey!, c.amount!);
    for (const c of checks)
      if (!out.has(c.bookKey!)) out.set(c.bookKey!, c.amount!);
    return out;
  }

  /** Сурагчийн бүх ном: одоогийн төлөв + өөрчлөлтийн түүх (шинэ нь эхэнд) */
  async studentBooks(studentId: string, userId: string) {
    await assertInternalTeachingStaff(this.prisma, userId);
    const s = await this.student(studentId);
    const current = s.enrollments.filter(
      (e) => !e.leftAt && !e.classroom.archived,
    );
    const [rows, suggested] = await Promise.all([
      this.prisma.bookPayment.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        select: ROW_SELECT,
      }),
      this.suggestedAmounts(current.map((e) => e.classroomId)),
    ]);
    const shaped = await this.shape(rows);
    const active = new Map(
      shaped.filter((r) => !r.voidedAt).map((r) => [r.bookKey, r]),
    );
    const seen = new Set<string>();
    return {
      student: { id: s.id, firstName: s.firstName, lastName: s.lastName },
      // Одоогийн анги эхэнд, дараа нь өмнө сууж байсан ангиуд (давхардалгүй)
      classrooms: [...current, ...s.enrollments]
        .filter((e) => !seen.has(e.classroomId) && seen.add(e.classroomId))
        .map((e) => ({
          id: e.classroom.id,
          name: e.classroom.name,
          current: !e.leftAt && !e.classroom.archived,
        })),
      books: BOOKS.map((b) => ({
        key: b.key,
        title: b.title,
        suggestedAmount: suggested.get(b.key) ?? null,
        payment: active.get(b.key) ?? null,
      })),
      history: shaped.map((r) => ({ ...r, title: bookTitle(r.bookKey) })),
    };
  }

  /**
   * Сурагчийн хуудаснаас тэмдэглэх/засах/болиулах — ангиас гадуур ч болно.
   * Анги өгөөгүй бол: байгаа мөрийн анги → сурагчийн одоогийн анги → ангигүй.
   */
  async setFromProfile(
    studentId: string,
    bookKey: string,
    dto: SetBookPaymentDto,
    userId: string,
  ) {
    const actorRole = await assertInternalTeachingStaff(this.prisma, userId);
    if (!isBookKey(bookKey)) throw new NotFoundException('Ном олдсонгүй');
    const s = await this.student(studentId);
    let value: PaymentValue | null = null;
    let checkId: string | null = null;
    if (dto.status !== 'NONE') {
      const active = await this.prisma.bookPayment.findFirst({
        where: { studentId, bookKey, voidedAt: null },
        select: ROW_SELECT,
      });
      let classroomId: string | null;
      if (dto.classroomId !== undefined) {
        classroomId = dto.classroomId;
        if (
          classroomId &&
          !s.enrollments.some((e) => e.classroomId === classroomId)
        )
          throw new BadRequestException('Сурагч энэ ангид сууж байгаагүй');
      } else if (active) classroomId = active.classroomId;
      else
        classroomId =
          s.enrollments.find((e) => !e.leftAt && !e.classroom.archived)
            ?.classroomId ?? null;
      const check = classroomId
        ? await this.prisma.classCheck.findFirst({
            where: { classroomId, bookKey, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { id: true, amount: true },
          })
        : null;
      checkId = check?.id ?? null;
      const note = cleanBookNote(dto.note);
      if (dto.status === 'SKIPPED') {
        value = {
          status: 'SKIPPED',
          amount: null,
          classroomId,
          collectedById: null,
          note,
        };
      } else {
        const amount =
          dto.amount === undefined || dto.amount === null
            ? (check?.amount ?? null)
            : cleanBookAmount(dto.amount);
        if (amount === null) throw new BadRequestException('Дүнгээ оруулна уу');
        if (Number.isNaN(amount))
          throw new BadRequestException('Дүн буруу байна');
        const collectedById = dto.collectedById ?? userId;
        if (collectedById !== userId) await this.assertCollector(collectedById);
        value = { status: 'PAID', amount, classroomId, collectedById, note };
      }
    }
    const row = await this.write(studentId, bookKey, value, {
      actorId: userId,
      actorRole,
      checkId,
    });
    return row ? (await this.shape([row]))[0] : null;
  }

  /** «Хэн авсан» сонгогч — идэвхтэй Админ, Багш+, Багш (нэрээр) */
  async collectors(userId: string) {
    await assertInternalTeachingStaff(this.prisma, userId);
    const rows = await this.prisma.user.findMany({
      where: {
        role: { in: TEACHER_ROLES },
        archivedAt: null,
        externalTeacherProfile: null,
      },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return rows.sort(
      (a, b) =>
        a.firstName.localeCompare(b.firstName, 'mn') ||
        a.lastName.localeCompare(b.lastName, 'mn'),
    );
  }

  // ───────────────────────── Самбар ─────────────────────────

  /**
   * «Дотоод → Номын мөнгө»: ном бүрээр аль анги авсан, хэд нь өгсөн, багш тус
   * бүр хэдийг хураасан. Багш (TEACHER) тоо, хувийг бүгдийг харна, мөнгөн
   * дүнгээс зөвхөн ӨӨРИЙН хураасныг (төлбөрийн нийт дүнг Багш харахгүй дүрэм).
   */
  async dashboard(userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const seeAllMoney = role !== Role.TEACHER;
    const [checks, payments] = await Promise.all([
      this.prisma.classCheck.findMany({
        where: { bookKey: { not: null }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          classroomId: true,
          bookKey: true,
          amount: true,
          archivedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.bookPayment.findMany({
        where: { voidedAt: null },
        select: ROW_SELECT,
      }),
    ]);
    const classIds = [
      ...new Set([
        ...checks.map((c) => c.classroomId),
        ...payments.flatMap((p) => (p.classroomId ? [p.classroomId] : [])),
      ]),
    ];
    const [classrooms, enrollments, people] = await Promise.all([
      this.prisma.classroom.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true, archived: true },
      }),
      this.prisma.enrollment.findMany({
        where: {
          classroomId: { in: classIds },
          leftAt: null,
          student: { archivedAt: null },
        },
        select: { classroomId: true, studentId: true },
      }),
      this.people(payments.map((p) => p.collectedById)),
    ]);
    const classById = new Map(classrooms.map((c) => [c.id, c]));
    const roster = new Map<string, string[]>();
    for (const e of enrollments) {
      const list = roster.get(e.classroomId) ?? [];
      list.push(e.studentId);
      roster.set(e.classroomId, list);
    }

    const books = BOOKS.map((b) => {
      const bookPayments = payments.filter((p) => p.bookKey === b.key);
      const bookChecks = checks.filter((c) => c.bookKey === b.key);
      const ids = new Set([
        ...bookChecks.map((c) => c.classroomId),
        ...bookPayments.flatMap((p) => (p.classroomId ? [p.classroomId] : [])),
      ]);
      const classes = [...ids]
        .map((classroomId) => {
          const c = classById.get(classroomId);
          // Шинэ нь эхэнд эрэмбэлэгдсэн тул find = хамгийн сүүлийн чек
          const check = bookChecks.find((x) => x.classroomId === classroomId);
          const rosterIds = roster.get(classroomId) ?? [];
          const inRoster = new Set(rosterIds);
          const sum = classBookSummary(
            rosterIds,
            bookPayments.filter(
              (p) => p.classroomId === classroomId || inRoster.has(p.studentId),
            ),
            classroomId,
          );
          return {
            classroomId,
            name: c?.name ?? '',
            classArchived: c?.archived ?? true,
            checkId: check?.id ?? null,
            hidden: !!check?.archivedAt,
            price: check?.amount ?? null,
            openedAt: check?.createdAt.toISOString() ?? null,
            ...sum,
            collected: seeAllMoney ? sum.collected : null,
          };
        })
        .sort((x, y) => x.name.localeCompare(y.name, 'mn', { numeric: true }));
      const noClass = bookPayments.filter(
        (p) => p.status === 'PAID' && !p.classroomId,
      );
      return {
        key: b.key,
        title: b.title,
        classes,
        noClassPaid: noClass.length,
        paid: bookPayments.filter((p) => p.status === 'PAID').length,
        collected: seeAllMoney
          ? bookPayments.reduce(
              (n, p) => n + (p.status === 'PAID' ? (p.amount ?? 0) : 0),
              0,
            )
          : null,
      };
    }).filter((b) => b.classes.length > 0 || b.paid > 0);

    const collectors = collectorTotals(payments)
      .filter((t) => seeAllMoney || t.collectedById === userId)
      .map((t) => ({
        person: people.get(t.collectedById) ?? null,
        count: t.count,
        sum: t.sum,
        byBook: t.byBook.map((x) => ({ ...x, title: bookTitle(x.bookKey) })),
      }));
    return { seeAllMoney, books, collectors };
  }
}
