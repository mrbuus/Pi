import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { ClassDashboardService } from '../class-dashboard/class-dashboard.service';
import { assertInternalTeachingStaff } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import {
  ARCHIVED_LIST_MAX,
  cleanCheckAmount,
  cleanCheckTitle,
  isUniqueViolation,
  OPEN_CHECKS_MAX,
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

  private static shape(c: CheckRow, people: Map<string, Person>) {
    return {
      id: c.id,
      title: c.title,
      amount: c.amount,
      createdAt: c.createdAt.toISOString(),
      createdBy: people.get(c.createdById) ?? null,
      archivedAt: c.archivedAt?.toISOString() ?? null,
      archivedBy: c.archivedById ? (people.get(c.archivedById) ?? null) : null,
      marks: c.marks.map((m) => ({
        studentId: m.studentId,
        checked: m.checked,
        updatedAt: m.updatedAt.toISOString(),
        updatedBy: people.get(m.updatedById) ?? null,
      })),
    };
  }

  private async shapeOne(c: CheckRow) {
    return ClassChecksService.shape(
      c,
      await this.people(ClassChecksService.staffIds([c])),
    );
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
      checks: open.map((c) => ClassChecksService.shape(c, people)),
      archived: archived.map((c) => ClassChecksService.shape(c, people)),
    };
  }

  // ───────────────────────── Бичих ─────────────────────────

  async create(classroomId: string, dto: CreateClassCheckDto, userId: string) {
    const role = await this.access(classroomId, userId);
    const title = cleanCheckTitle(dto.title);
    if (!title) throw new BadRequestException('Чекийн нэрээ бичнэ үү');
    const amount = cleanCheckAmount(dto.amount ?? null);
    if (Number.isNaN(amount)) throw new BadRequestException('Дүн буруу байна');
    const openCount = await this.prisma.classCheck.count({
      where: { classroomId, archivedAt: null, deletedAt: null },
    });
    if (openCount >= OPEN_CHECKS_MAX)
      throw new BadRequestException(
        `Нээлттэй чек ${OPEN_CHECKS_MAX}-аас олон байж болохгүй — дууссаныг нь хаана уу`,
      );
    const created = await this.prisma.classCheck.create({
      data: { classroomId, title, amount, createdById: userId },
      select: CHECK_SELECT,
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'CREATE',
      entity: 'ClassCheck',
      entityId: created.id,
      after: { classroomId, title, amount },
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
    if (dto.title !== undefined) {
      const title = cleanCheckTitle(dto.title);
      if (!title) throw new BadRequestException('Чекийн нэрээ бичнэ үү');
      if (title !== before.title) data.title = title;
    }
    if (dto.amount !== undefined) {
      const amount = cleanCheckAmount(dto.amount);
      if (Number.isNaN(amount))
        throw new BadRequestException('Дүн буруу байна');
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
      select: { id: true, archivedAt: true },
    });
    if (!check) throw new NotFoundException('Чек олдсонгүй');
    if (check.archivedAt)
      throw new BadRequestException(
        'Хаагдсан чекийг засахгүй — эхлээд сэргээнэ үү',
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
