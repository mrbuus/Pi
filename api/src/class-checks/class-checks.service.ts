import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { bookTitle, isBookKey } from '../book-payments/book-payments.logic';
import {
  BookPaymentsService,
  type ShapedBookPayment,
} from '../book-payments/book-payments.service';
import { ClassDashboardService } from '../class-dashboard/class-dashboard.service';
import { assertInternalTeachingStaff } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import {
  ARCHIVED_LIST_MAX,
  cleanCheckAmount,
  cleanCheckTitle,
  isUniqueViolation,
  OPEN_CHECKS_MAX,
  studentContacts,
} from './class-checks.logic';
import type {
  CreateClassCheckDto,
  SetClassCheckMarkDto,
  UpdateClassCheckDto,
} from './class-checks.dto';

// role — Багш+ хүний нэрийн ард «+» (вэб lib/personName.staffName)
type Person = {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
};

const MARK_SELECT = {
  studentId: true,
  checked: true,
  updatedById: true,
  updatedAt: true,
} as const;

const CHECK_SELECT = {
  id: true,
  classroomId: true,
  title: true,
  amount: true,
  bookKey: true,
  createdById: true,
  createdAt: true,
  archivedAt: true,
  archivedById: true,
  marks: { select: MARK_SELECT },
} as const;

type CheckRow = {
  id: string;
  classroomId: string;
  title: string;
  amount: number | null;
  bookKey: string | null;
  createdById: string;
  createdAt: Date;
  archivedAt: Date | null;
  archivedById: string | null;
  marks: {
    studentId: string;
    checked: boolean;
    updatedById: string;
    updatedAt: Date;
  }[];
};

/**
 * Номын чекийн нэг сурагчийн мөр — BookPayment-аас. `elsewhere` = өөр ангид
 * байхдаа төлсөн (энэ ангийн мөнгөнд орохгүй, эндээс засахгүй).
 */
function bookMark(p: ShapedBookPayment, classroomId: string) {
  const paid = p.status === 'PAID';
  return {
    studentId: p.studentId,
    checked: paid,
    skipped: p.status === 'SKIPPED',
    updatedAt: p.createdAt,
    updatedBy: p.createdBy,
    collectedBy: p.collectedBy,
    amount: p.amount,
    note: p.note,
    elsewhere:
      paid && p.classroom?.id !== classroomId
        ? { name: p.classroom?.name ?? null }
        : null,
  };
}
type BookMark = ReturnType<typeof bookMark>;

/**
 * «Чек» — ангийн нэртэй шалгах жагсаалт (эзэн 2026-10-22). Багш бүр
 * (ADMIN/TEACHER_PLUS/TEACHER) өөрийн харах ангидаа (ангийн самбарын эрхтэй ижил)
 * нээж, нэрийг засаж, хааж (зөөлөн), сурагч бүрийг тэмдэглэнэ.
 */
@Injectable()
export class ClassChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: ClassDashboardService,
    private readonly audit: AuditService,
    private readonly books: BookPaymentsService,
  ) {}

  // ───────────────────────── Эрх ─────────────────────────

  private async access(classroomId: string, userId: string): Promise<Role> {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, archived: true },
    });
    if (!classroom || classroom.archived)
      throw new NotFoundException('Анги олдсонгүй');
    const visible = await this.dashboard.visibleClassIds({ userId, role });
    if (visible !== 'ALL' && !visible.includes(classroomId))
      throw new ForbiddenException('Энэ ангийн чекийг харах эрхгүй');
    return role;
  }

  private async findCheck(classroomId: string, checkId: string) {
    const check = await this.prisma.classCheck.findFirst({
      where: { id: checkId, classroomId, deletedAt: null },
      select: CHECK_SELECT,
    });
    if (!check) throw new NotFoundException('Чек олдсонгүй');
    return check;
  }

  // ───────────────────────── Унших ─────────────────────────

  private async people(ids: Iterable<string>): Promise<Map<string, Person>> {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return new Map(rows.map((u) => [u.id, u]));
  }

  private static staffIds(checks: CheckRow[]): string[] {
    return checks.flatMap((c) => [
      c.createdById,
      ...(c.archivedById ? [c.archivedById] : []),
      ...c.marks.map((m) => m.updatedById),
    ]);
  }

  private static shape(
    c: CheckRow,
    people: Map<string, Person>,
    bookMarks?: BookMark[],
  ) {
    return {
      id: c.id,
      title: c.title,
      amount: c.amount,
      bookKey: c.bookKey,
      createdAt: c.createdAt.toISOString(),
      createdBy: people.get(c.createdById) ?? null,
      archivedAt: c.archivedAt?.toISOString() ?? null,
      archivedBy: c.archivedById ? (people.get(c.archivedById) ?? null) : null,
      marks: c.bookKey
        ? (bookMarks ?? [])
        : c.marks.map((m) => ({
            studentId: m.studentId,
            checked: m.checked,
            updatedAt: m.updatedAt.toISOString(),
            updatedBy: people.get(m.updatedById) ?? null,
          })),
    };
  }

  private async rosterIds(classroomId: string): Promise<string[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null, student: { archivedAt: null } },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  /**
   * Номын чекүүдийн мөрүүд (ном тус бүрээр): одоогийн сурагчдын аль ч ангид
   * төлсөн мөр + энэ ангид төлөөд гарсан сурагчийн мөр.
   */
  private async bookMarks(
    classroomId: string,
    checks: readonly CheckRow[],
    rosterIds: readonly string[],
  ): Promise<Map<string, BookMark[]>> {
    const keys = [
      ...new Set(checks.flatMap((c) => (c.bookKey ? [c.bookKey] : []))),
    ];
    const out = new Map<string, BookMark[]>();
    if (keys.length === 0) return out;
    const rows = await this.books.shape(
      await this.books.activeForClass(classroomId, keys, rosterIds),
    );
    for (const r of rows) {
      const list = out.get(r.bookKey) ?? [];
      list.push(bookMark(r, classroomId));
      out.set(r.bookKey, list);
    }
    return out;
  }

  private async shapeOne(c: CheckRow) {
    const [people, marks] = await Promise.all([
      this.people(ClassChecksService.staffIds([c])),
      c.bookKey
        ? this.rosterIds(c.classroomId).then((ids) =>
            this.bookMarks(c.classroomId, [c], ids),
          )
        : undefined,
    ]);
    return ClassChecksService.shape(c, people, marks?.get(c.bookKey ?? ''));
  }

  /**
   * Ангийн бүх нээлттэй чек (шинэ нь эхэнд) + сүүлийн хаагдсан 50 + одоогийн
   * сурагчид (нэрээр). Ангиас гарсан ч тэмдэглэгдсэн сурагч `former`-т.
   */
  async list(classroomId: string, userId: string) {
    await this.access(classroomId, userId);
    const [enrollments, open, archived] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classroomId, leftAt: null, student: { archivedAt: null } },
        select: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.classCheck.findMany({
        where: { classroomId, archivedAt: null, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: CHECK_SELECT,
      }),
      this.prisma.classCheck.findMany({
        where: { classroomId, archivedAt: { not: null }, deletedAt: null },
        orderBy: { archivedAt: 'desc' },
        take: ARCHIVED_LIST_MAX,
        select: CHECK_SELECT,
      }),
    ]);
    const roster = new Map<string, Person>();
    for (const e of enrollments) roster.set(e.student.id, e.student);
    const formerIds = new Set<string>();
    for (const c of [...open, ...archived])
      for (const m of c.marks)
        if (m.checked && !roster.has(m.studentId)) formerIds.add(m.studentId);
    const bookMarks = await this.bookMarks(
      classroomId,
      [...open, ...archived],
      [...roster.keys()],
    );
    // Энэ ангид номын мөнгөө өгөөд гарсан/шилжсэн сурагч — мөнгө нь энэ ангид үлдэнэ
    for (const marks of bookMarks.values())
      for (const m of marks)
        if (m.checked && !m.elsewhere && !roster.has(m.studentId))
          formerIds.add(m.studentId);
    const people = await this.people([
      ...ClassChecksService.staffIds([...open, ...archived]),
      ...formerIds,
    ]);
    const byName = (a: Person, b: Person) =>
      a.firstName.localeCompare(b.firstName, 'mn') ||
      a.lastName.localeCompare(b.lastName, 'mn');
    return {
      classroomId,
      students: [...roster.values()].sort(byName),
      former: [...formerIds]
        .map((id) => people.get(id))
        .filter((p): p is Person => !!p)
        .sort(byName),
      checks: open.map((c) =>
        ClassChecksService.shape(c, people, bookMarks.get(c.bookKey ?? '')),
      ),
      archived: archived.map((c) =>
        ClassChecksService.shape(c, people, bookMarks.get(c.bookKey ?? '')),
      ),
    };
  }

  /**
   * Чекийн жагсаалтаас нэр дарахад гарах товч мэдээлэл (эзэн 2026-11-10): нэр,
   * код, анги, сурагч/аав/ээж/аппын эцэг эхийн утас, асран хамгаалагчийн
   * тэмдэглэл. Төлбөрийн мэдээлэл БАЙХГҮЙ (Багш ч харна). Зөвхөн энэ ангид
   * бүртгэлтэй (одоо эсвэл өмнө нь) сурагчийнх — өөр хүүхдийнхийг энэ замаар
   * харахгүй.
   */
  async studentInfo(classroomId: string, studentId: string, userId: string) {
    await this.access(classroomId, userId);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { classroomId, studentId },
      orderBy: { joinedAt: 'desc' },
      select: {
        leftAt: true,
        classroom: { select: { name: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            phone: true,
            archivedAt: true,
            studentProfile: {
              select: {
                fatherPhone: true,
                motherPhone: true,
                guardianNote: true,
              },
            },
            childLinks: {
              where: { parent: { archivedAt: null } },
              select: {
                parent: {
                  select: { firstName: true, lastName: true, phone: true },
                },
              },
            },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Энэ ангийн сурагч биш');
    const s = enrollment.student;
    const p = s.studentProfile;
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      studentCode: s.studentCode,
      classroomName: enrollment.classroom.name,
      inClass: !enrollment.leftAt && !s.archivedAt,
      guardianNote: p?.guardianNote?.trim() || null,
      contacts: studentContacts({
        studentPhone: s.phone,
        fatherPhone: p?.fatherPhone,
        motherPhone: p?.motherPhone,
        parents: s.childLinks.map((l) => ({
          name: [l.parent.lastName?.slice(0, 1), l.parent.firstName]
            .filter(Boolean)
            .join('. '),
          phone: l.parent.phone,
        })),
      }),
    };
  }

  // ───────────────────────── Бичих ─────────────────────────

  async create(classroomId: string, dto: CreateClassCheckDto, userId: string) {
    const role = await this.access(classroomId, userId);
    const bookKey = dto.bookKey ?? null;
    if (bookKey !== null && !isBookKey(bookKey))
      throw new BadRequestException('Номоо сонгоно уу');
    // Номын чекийн нэр = номын нэр (бүх ангид ижил, самбарт нэгдэнэ)
    const title = bookKey ? bookTitle(bookKey) : cleanCheckTitle(dto.title);
    if (!title) throw new BadRequestException('Чекийн нэрээ бичнэ үү');
    const amount = cleanCheckAmount(dto.amount ?? null);
    if (Number.isNaN(amount)) throw new BadRequestException('Дүн буруу байна');
    if (bookKey) {
      if (amount === null)
        throw new BadRequestException('Номын үнээ оруулна уу');
      // Нэг ангид нэг номын ганц чек — давхар нээвэл тоо хоёр хуваагдана
      const existing = await this.prisma.classCheck.findFirst({
        where: { classroomId, bookKey, deletedAt: null },
        select: { archivedAt: true },
      });
      if (existing)
        throw new BadRequestException(
          existing.archivedAt
            ? `«${title}» чек энэ ангид нуусан байна — «Нуусан» хэсгээс буцааж гаргана уу`
            : `«${title}» чек энэ ангид аль хэдийн нээлттэй байна`,
        );
    }
    const openCount = await this.prisma.classCheck.count({
      where: { classroomId, archivedAt: null, deletedAt: null },
    });
    if (openCount >= OPEN_CHECKS_MAX)
      throw new BadRequestException(
        `Нээлттэй чек ${OPEN_CHECKS_MAX}-аас олон байж болохгүй — дууссаныг нь хаана уу`,
      );
    const created = await this.prisma.classCheck.create({
      data: { classroomId, title, amount, bookKey, createdById: userId },
      select: CHECK_SELECT,
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'CREATE',
      entity: 'ClassCheck',
      entityId: created.id,
      after: { classroomId, title, amount, bookKey },
    });
    return this.shapeOne(created);
  }

  async update(
    classroomId: string,
    checkId: string,
    dto: UpdateClassCheckDto,
    userId: string,
  ) {
    const role = await this.access(classroomId, userId);
    const before = await this.findCheck(classroomId, checkId);
    const data: {
      title?: string;
      amount?: number | null;
      archivedAt?: Date | null;
      archivedById?: string | null;
    } = {};
    // Хаагдсан чекийн нэр/дүнг засахгүй (тэмдэглэгээтэй адил) — цугларсан мөнгө
    // хаасны дараа өөрчлөгдөж болохгүй. Эхлээд сэргээнэ (нэг хүсэлтэд ч болно).
    const staysArchived = !!before.archivedAt && dto.archived !== false;
    if (
      staysArchived &&
      ((dto.title !== undefined &&
        cleanCheckTitle(dto.title) !== before.title) ||
        (dto.amount !== undefined &&
          cleanCheckAmount(dto.amount) !== before.amount))
    )
      throw new BadRequestException(
        'Нуусан чекийг засахгүй — эхлээд буцааж гаргана уу',
      );
    if (dto.title !== undefined) {
      const title = cleanCheckTitle(dto.title);
      if (!title) throw new BadRequestException('Чекийн нэрээ бичнэ үү');
      if (title !== before.title) {
        if (before.bookKey)
          throw new BadRequestException('Номын чекийн нэрийг солихгүй');
        data.title = title;
      }
    }
    if (dto.amount !== undefined) {
      const amount = cleanCheckAmount(dto.amount);
      if (Number.isNaN(amount))
        throw new BadRequestException('Дүн буруу байна');
      // Үнэ солиход өмнө тэмдэглэсэн сурагчдын дүн хэвээр (мөр бүр өөрийн дүнтэй)
      if (before.bookKey && amount === null)
        throw new BadRequestException('Номын үнээ оруулна уу');
      if (amount !== before.amount) data.amount = amount;
    }
    if (dto.archived === true && !before.archivedAt) {
      data.archivedAt = new Date();
      data.archivedById = userId;
    } else if (dto.archived === false && before.archivedAt) {
      const openCount = await this.prisma.classCheck.count({
        where: { classroomId, archivedAt: null, deletedAt: null },
      });
      if (openCount >= OPEN_CHECKS_MAX)
        throw new BadRequestException(
          `Нээлттэй чек ${OPEN_CHECKS_MAX}-аас олон байж болохгүй`,
        );
      data.archivedAt = null;
      data.archivedById = null;
    }
    if (Object.keys(data).length === 0) return this.shapeOne(before);
    const updated = await this.prisma.classCheck.update({
      where: { id: before.id },
      data,
      select: CHECK_SELECT,
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action:
        data.archivedAt instanceof Date
          ? 'ARCHIVE'
          : data.archivedAt === null
            ? 'RESTORE'
            : 'UPDATE',
      entity: 'ClassCheck',
      entityId: updated.id,
      before: {
        title: before.title,
        amount: before.amount,
        archivedAt: before.archivedAt,
      },
      after: {
        title: updated.title,
        amount: updated.amount,
        archivedAt: updated.archivedAt,
      },
    });
    return this.shapeOne(updated);
  }

  /**
   * Устгах (эзэн 2026-10-23) — ЗӨӨЛӨН: «өгөгдөл хэзээ ч алга болохгүй». Мөр ба
   * сурагчийн тэмдэглэгээ DB-д үлдэнэ (deletedAt + хэн), харин ямар ч жагсаалт,
   * тоонд орохгүй. Хаасан (archived) чекийг ч устгаж болно. Дахин устгавал NotFound.
   */
  async remove(classroomId: string, checkId: string, userId: string) {
    const role = await this.access(classroomId, userId);
    const before = await this.findCheck(classroomId, checkId);
    const deletedAt = new Date();
    // deletedAt: null нөхцөлтэй — хоёр багш зэрэг дарвал анхных нь л бичигдэнэ
    const { count } = await this.prisma.classCheck.updateMany({
      where: { id: before.id, deletedAt: null },
      data: { deletedAt, deletedById: userId },
    });
    if (count === 0) throw new NotFoundException('Чек олдсонгүй');
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'DELETE',
      entity: 'ClassCheck',
      entityId: before.id,
      before: {
        classroomId,
        title: before.title,
        amount: before.amount,
        archivedAt: before.archivedAt,
        checkedCount: before.marks.filter((m) => m.checked).length,
      },
      after: { deletedAt },
    });
    return { id: before.id, deleted: true as const };
  }

  /**
   * Нэг сурагчийг тэмдэглэх/болиулах — тодорхой утга (toggle биш), (checkId,
   * studentId)-аар upsert. Хоёр багш зэрэг анх удаа дарвал нэг нь P2002 авч
   * магадгүй — тэр үед update-ээр дахин бичнэ (сүүлд бичсэн нь ялна).
   */
  async setMark(
    classroomId: string,
    checkId: string,
    studentId: string,
    dto: SetClassCheckMarkDto,
    userId: string,
  ) {
    const role = await this.access(classroomId, userId);
    const check = await this.prisma.classCheck.findFirst({
      where: { id: checkId, classroomId, deletedAt: null },
      select: { id: true, archivedAt: true, bookKey: true, amount: true },
    });
    if (!check) throw new NotFoundException('Чек олдсонгүй');
    if (check.archivedAt)
      throw new BadRequestException(
        'Нуусан чекийг засахгүй — эхлээд буцааж гаргана уу',
      );
    const enrolled = await this.prisma.enrollment.findFirst({
      where: {
        classroomId,
        studentId,
        leftAt: null,
        student: { archivedAt: null },
      },
      select: { id: true },
    });
    if (!enrolled)
      throw new BadRequestException('Энэ сурагч энэ ангид одоо бүртгэлгүй');

    // Номын чек — мөнгөний бүртгэл BookPayment-т (анги сольсон ч, чек нуусан ч үлдэнэ)
    if (check.bookKey) {
      const row = await this.books.markFromCheck({
        classroomId,
        check: { id: check.id, bookKey: check.bookKey, amount: check.amount },
        studentId,
        dto,
        actorId: userId,
        actorRole: role,
      });
      if (row) return bookMark((await this.books.shape([row]))[0], classroomId);
      const me = await this.people([userId]);
      return {
        studentId,
        checked: false,
        skipped: false,
        updatedAt: new Date().toISOString(),
        updatedBy: me.get(userId) ?? null,
        collectedBy: null,
        amount: null,
        note: null,
        elsewhere: null,
      };
    }

    const where = { checkId_studentId: { checkId, studentId } };
    const before = await this.prisma.classCheckMark.findUnique({
      where,
      select: MARK_SELECT,
    });
    let mark: CheckRow['marks'][number];
    try {
      mark = await this.prisma.classCheckMark.upsert({
        where,
        create: {
          checkId,
          studentId,
          checked: dto.checked,
          updatedById: userId,
        },
        update: { checked: dto.checked, updatedById: userId },
        select: MARK_SELECT,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      mark = await this.prisma.classCheckMark.update({
        where,
        data: { checked: dto.checked, updatedById: userId },
        select: MARK_SELECT,
      });
    }
    if (!before || before.checked !== mark.checked)
      await this.audit.record({
        actorId: userId,
        actorRole: role,
        action: before ? 'UPDATE' : 'CREATE',
        entity: 'ClassCheckMark',
        entityId: `${checkId}:${studentId}`,
        before: before ? { checked: before.checked } : null,
        after: { checkId, studentId, checked: mark.checked },
      });
    const people = await this.people([mark.updatedById]);
    return {
      studentId: mark.studentId,
      checked: mark.checked,
      updatedAt: mark.updatedAt.toISOString(),
      updatedBy: people.get(mark.updatedById) ?? null,
    };
  }
}
