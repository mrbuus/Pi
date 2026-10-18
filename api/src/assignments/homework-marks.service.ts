import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { dateKey, parseDateOnly } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { classTeacherWhere } from '../common/class-teachers';
import { PrismaService } from '../prisma/prisma.service';
import { homeworkVariants, normalizeVariant } from '../attendance/board-logic';
import { loadPreviousLesson } from '../attendance/lesson-dates';
import { assertMarkAccess } from '../attendance/marking-access';
import { SetHomeworkMarkDto } from './dto/set-homework-mark.dto';
import type {
  BulkHomeworkMarksDto,
  HomeworkOnlyIf,
  PatchHomeworkMarkDto,
} from './homework-marks.dto';

// Эзний #1 хүсэлт: багш ангийнхаа гэрийн даалгаврыг өдөр бүр НЭГ ХУРДАН
// тороор (grid) тэмдэглэдэг байх ёстой. Assignment/Submission-ы "багш
// даалгавар үүсгээд сурагч илгээх" урсгалаас ялгаатай — DailyHomeworkMark
// бол зөвхөн "анги + сурагч + өдөр" мөр бүрд НЭГ өнгө + чөлөөт тайлбар.
/** Сурагчийн самбарт харуулах өгөгдмөл хоног. */
export const MY_MARKS_DAYS = 14;

@Injectable()
export class HomeworkMarksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // parseDateOnly plain Error шидвэл HTTP 500 болчихно — энд эргүүлж 400
  // болгож, хэрэглэгчид ойлгомжтой монгол мессеж өгнө.
  private parseDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException('Огнооны формат буруу байна (YYYY-MM-DD)');
    }
  }

  // ADMIN/TEACHER_PLUS — бүх анги; TEACHER — ангийн/хуваарийн багш эсвэл тэр
  // өдрийн ахлах/туслах багш (attendance/marking-access.ts, ирцтэй НЭГ дүрэм).
  private assertClassAccess(
    classroomId: string,
    userId: string,
    role: Role,
    date?: Date,
  ) {
    return assertMarkAccess(this.prisma, classroomId, userId, role, {
      date,
    });
  }

  // GET — сонгосон ангийн идэвхтэй сурагчид бүгд, нэрээр эрэмбэлсэн. Тэмдэглэгээгүй
  // сурагч status: null-тэй ирнэ (UI-д цагаан/хоосон харагдана).
  async listForClass(
    classroomId: string,
    date: string,
    userId: string,
    role: Role,
  ) {
    const parsedDate = this.parseDate(date);
    await this.assertClassAccess(classroomId, userId, role, parsedDate);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null, student: { archivedAt: null } },
      select: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { student: { firstName: 'asc' } },
    });

    const marks = await this.prisma.dailyHomeworkMark.findMany({
      where: { classroomId, date: parsedDate },
    });
    const byStudent = new Map(marks.map((m) => [m.studentId, m]));

    // markedById → багшийн нэр (ирцийн жишиг загвартай адил хэв маяг)
    const markerIds = [...new Set(marks.map((m) => m.markedById))];
    const markers = markerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: markerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const markerById = new Map(markers.map((m) => [m.id, m]));

    return enrollments.map((e) => {
      const m = byStudent.get(e.student.id);
      return {
        student: e.student,
        status: m?.status ?? null,
        comment: m?.comment ?? null,
        markedBy: m ? (markerById.get(m.markedById) ?? null) : null,
        updatedAt: m?.updatedAt ?? null,
      };
    });
  }

  // TEACHER зөвхөн өөрийн ангийн сурагчийг харна; TEACHER_PLUS/ADMIN бүх
  // сурагчийг харна (activity.service.ts-ийн assertStudentAccess-тэй ижил
  // хэв маяг — SPEC §13).
  private async assertStudentAccess(
    studentId: string,
    userId: string,
    role: Role,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return student;
    if (role === Role.TEACHER) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          leftAt: null,
          classroom: classTeacherWhere(userId),
        },
      });
      if (enrollment) return student;
    }
    throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
  }

  // Багш/Админ: тухайн сурагчийн гэрийн даалгаврын тэмдэглэгээний бүтэн
  // түүх (бүх анги, огнооны мужаар) — сурагчийн явцын хуудсанд ашиглана.
  async byStudent(
    studentId: string,
    from: string,
    to: string,
    userId: string,
    role: Role,
  ) {
    await this.assertStudentAccess(studentId, userId, role);
    if (!from || !to) {
      throw new BadRequestException(
        '"from" болон "to" огноо заавал шаардлагатай',
      );
    }
    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);
    if (fromDate > toDate) {
      throw new BadRequestException(
        '"from" огноо "to" огнооноос өмнө байх ёстой',
      );
    }

    const marks = await this.prisma.dailyHomeworkMark.findMany({
      where: { studentId, date: { gte: fromDate, lte: toDate } },
      select: {
        date: true,
        status: true,
        comment: true,
        updatedAt: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
    return marks;
  }

  // Сурагч: ӨӨРИЙН сүүлийн N хоногийн тэмдэглэгээ (танхимын анги).
  // Эзний шийдвэр (2026-09-26): танхимд багш дэвтрийг ангид шалгаж энэ
  // загвараар тэмдэглэдэг, онлайнд Assignment/Submission. Өмнө нь сурагч энэ
  // тэмдэглэгээг огт хардаггүй байв. studentId нь JWT-ээс ирдэг тул эрхийн
  // нэмэлт шалгалт хэрэггүй — өөр хүний мөр рүү хүрэх зам байхгүй.
  async mine(studentId: string, days = MY_MARKS_DAYS, now = new Date()) {
    const span = Math.min(Math.max(Math.trunc(days) || MY_MARKS_DAYS, 1), 60);
    const from = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (span - 1),
      ),
    );
    return this.prisma.dailyHomeworkMark.findMany({
      where: { studentId, date: { gte: from }, status: { not: null } },
      select: {
        date: true,
        status: true,
        comment: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async mineYear(studentId: string, yearValue: string) {
    if (
      !/^\d{4}$/.test(yearValue) ||
      Number(yearValue) < 1900 ||
      Number(yearValue) > 2100
    ) {
      throw new BadRequestException('Он буруу байна');
    }
    const year = Number(yearValue);
    return this.prisma.dailyHomeworkMark.findMany({
      where: {
        studentId,
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
        status: { not: null },
      },
      select: {
        date: true,
        status: true,
        comment: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  private async markerName(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!u) return null;
    const first = u.firstName.trim();
    const last = u.lastName.trim();
    return last ? `${last.charAt(0).toUpperCase()}. ${first}` : first;
  }

  private static passes(
    onlyIf: HomeworkOnlyIf | undefined,
    current: { status: string | null } | null,
  ) {
    if (!onlyIf) return true;
    // «Тэмдэглээгүй» = мөргүй эсвэл төлөвгүй (зөвхөн тайлбартай мөр)
    if (onlyIf === 'UNMARKED') return !current || current.status === null;
    return current?.status === onlyIf;
  }

  // PATCH — нэг сурагчийн нэг өдрийн тэмдэглэгээг upsert хийнэ. status болон
  // comment тус тусдаа ирж болно (dto-д ирээгүй талбарыг хөндөхгүй). onlyIf —
  // серверийн төлөв таарахгүй бол бичихгүй (applied: false), зэрэг тэмдэглэх үед.
  async setMark(
    classroomId: string,
    studentId: string,
    dto: SetHomeworkMarkDto | PatchHomeworkMarkDto,
    userId: string,
    role: Role,
  ) {
    const parsedDate = this.parseDate(dto.date);
    await this.assertClassAccess(classroomId, userId, role, parsedDate);

    const enrolled = await this.prisma.enrollment.findFirst({
      where: {
        classroomId,
        studentId,
        leftAt: null,
        student: { archivedAt: null },
      },
    });
    if (!enrolled) {
      throw new NotFoundException('Сурагч энэ ангид алга байна');
    }

    const where = {
      classroomId_studentId_date: {
        classroomId,
        studentId,
        date: parsedDate,
      },
    };
    const before = await this.prisma.dailyHomeworkMark.findUnique({ where });

    const onlyIf = (dto as PatchHomeworkMarkDto).onlyIf;
    if (!HomeworkMarksService.passes(onlyIf, before)) {
      return {
        student: { id: studentId },
        applied: false,
        status: before?.status ?? null,
        comment: before?.comment ?? null,
        markedBy: before ? await this.markerName(before.markedById) : null,
        updatedAt: before?.updatedAt ?? null,
      };
    }

    const comment =
      dto.comment === undefined
        ? undefined
        : dto.comment === null || dto.comment.trim() === ''
          ? null
          : dto.comment.trim();

    const updated = await this.prisma.dailyHomeworkMark.upsert({
      where,
      create: {
        classroomId,
        studentId,
        date: parsedDate,
        status: dto.status ?? null,
        comment: comment ?? null,
        markedById: userId,
      },
      update: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(comment !== undefined ? { comment } : {}),
        markedById: userId,
      },
    });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: before ? 'UPDATE' : 'CREATE',
      entity: 'DailyHomeworkMark',
      entityId: updated.id,
      before: before ?? null,
      after: updated,
    });

    return {
      student: { id: studentId },
      applied: true,
      status: updated.status,
      comment: updated.comment,
      markedBy: await this.markerName(userId),
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * «Бүгд хийсэн» / «Буцаах»: зөвхөн илгээсэн нүднүүд, нөхцөлтэй (onlyIf) — өөр
   * багшийн тэр хооронд тэмдэглэснийг дарахгүй. Тайлбарт хүрэхгүй.
   */
  async bulk(
    classroomId: string,
    dto: BulkHomeworkMarksDto,
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dto.date);
    await this.assertClassAccess(classroomId, userId, role, date);
    const entries = [
      ...new Map(dto.entries.map((e) => [e.studentId, e])).values(),
    ];
    const ids = entries.map((e) => e.studentId);
    const active = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: {
            classroomId,
            studentId: { in: ids },
            leftAt: null,
            student: { archivedAt: null },
          },
          select: { studentId: true },
        })
      ).map((e) => e.studentId),
    );
    const invalid = ids.filter((id) => !active.has(id));
    if (invalid.length) {
      throw new ForbiddenException(
        `Энэ ангид байхгүй сурагч байна: ${invalid.join(', ')}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const beforeRows = await tx.dailyHomeworkMark.findMany({
        where: { classroomId, date, studentId: { in: ids } },
      });
      const before = new Map(beforeRows.map((r) => [r.studentId, r]));
      const applied: string[] = [];
      const skipped: string[] = [];
      const changes: {
        before: (typeof beforeRows)[number] | null;
        after: (typeof beforeRows)[number];
      }[] = [];
      for (const e of entries) {
        const cur = before.get(e.studentId) ?? null;
        if (!HomeworkMarksService.passes(e.onlyIf, cur)) {
          skipped.push(e.studentId);
          continue;
        }
        if (e.status === undefined) {
          skipped.push(e.studentId);
          continue;
        }
        // Төлөвийг цэвэрлэхэд хоосон мөр үлдээхгүй (тайлбаргүй бол устгана)
        if (e.status === null && cur && !cur.comment) {
          await tx.dailyHomeworkMark.delete({ where: { id: cur.id } });
          applied.push(e.studentId);
          continue;
        }
        if (e.status === null && !cur) {
          applied.push(e.studentId);
          continue;
        }
        const after = await tx.dailyHomeworkMark.upsert({
          where: {
            classroomId_studentId_date: {
              classroomId,
              studentId: e.studentId,
              date,
            },
          },
          create: {
            classroomId,
            studentId: e.studentId,
            date,
            status: e.status,
            markedById: userId,
          },
          update: { status: e.status, markedById: userId },
        });
        changes.push({ before: cur, after });
        applied.push(e.studentId);
      }
      return { applied, skipped, changes };
    });

    await Promise.all(
      result.changes.map((c) =>
        this.audit.record({
          actorId: userId,
          actorRole: role,
          action: c.before ? 'UPDATE' : 'CREATE',
          entity: 'DailyHomeworkMark',
          entityId: c.after.id,
          before: c.before,
          after: c.after,
        }),
      ),
    );

    const rows = await this.prisma.dailyHomeworkMark.findMany({
      where: { classroomId, date, studentId: { in: ids } },
      select: { studentId: true, status: true, comment: true, updatedAt: true },
    });
    const name = await this.markerName(userId);
    return {
      date: dateKey(date),
      applied: result.applied,
      skipped: result.skipped,
      rows: rows.map((r) => ({ ...r, markedBy: name })),
    };
  }

  /**
   * Тухайн хичээлийн гэрийн даалгаврын ОНЛАЙН дүн (эзэн 2026-10-18): ӨМНӨХ хичээлд
   * ангид хийсэн тест (ClassTestSession) бүрийн нөгөө хувилбар (A → B, groupKey-ээр)
   * = гэрийн даалгавар; сурагч бүрийн TestResult (оноо/дээд оноо).
   */
  async online(
    classroomId: string,
    dateStr: string,
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dateStr);
    const key = dateKey(date);
    await this.assertClassAccess(classroomId, userId, role, date);
    const [{ prev, sessions }, enrollments] = await Promise.all([
      loadPreviousLesson(this.prisma, classroomId, key),
      this.prisma.enrollment.findMany({
        where: { classroomId, leftAt: null, student: { archivedAt: null } },
        select: { studentId: true },
      }),
    ]);
    const empty = {
      date: key,
      previousLessonDate: prev,
      tests: [] as {
        testId: string;
        title: string;
        variant: string | null;
        problems: number;
        fromTestId: string;
      }[],
      students: {} as Record<
        string,
        { score: number; max: number; testId: string; taken: number }
      >,
    };
    if (!prev) return empty;

    const doneIds = [
      ...new Set(
        sessions
          .filter((s) => dateKey(s.date) === prev && s.testId)
          .map((s) => s.testId as string),
      ),
    ];
    if (!doneIds.length) return empty;
    const done = await this.prisma.test.findMany({
      where: { id: { in: doneIds } },
      select: { id: true, groupKey: true, variantLabel: true },
    });
    const groups = [
      ...new Set(done.map((t) => t.groupKey).filter((g): g is string => !!g)),
    ];
    if (!groups.length) return empty;
    const siblings = await this.prisma.test.findMany({
      where: { groupKey: { in: groups }, deletedAt: null },
      select: {
        id: true,
        title: true,
        groupKey: true,
        variantLabel: true,
        _count: { select: { problems: true } },
      },
    });
    // Ангид хийсэн дарааллаар
    const ordered = doneIds
      .map((id) => done.find((t) => t.id === id))
      .filter((t): t is (typeof done)[number] => !!t);
    const pairs = homeworkVariants(ordered, siblings);
    if (!pairs.length) return empty;

    const byId = new Map(siblings.map((t) => [t.id, t]));
    const studentIds = enrollments.map((e) => e.studentId);
    const results = await this.prisma.testResult.findMany({
      where: {
        testId: { in: pairs.map((p) => p.testId) },
        studentId: { in: studentIds },
      },
      select: { testId: true, studentId: true, totalScore: true, maxScore: true },
    });
    const students: (typeof empty)['students'] = {};
    for (const p of pairs) {
      for (const r of results.filter((x) => x.testId === p.testId)) {
        const cur = students[r.studentId];
        if (cur) {
          cur.score += r.totalScore;
          cur.max += r.maxScore;
          cur.taken += 1;
        } else {
          students[r.studentId] = {
            score: r.totalScore,
            max: r.maxScore,
            testId: r.testId,
            taken: 1,
          };
        }
      }
    }
    for (const s of Object.values(students)) {
      s.score = Math.round(s.score * 10) / 10;
      s.max = Math.round(s.max * 10) / 10;
    }
    return {
      date: key,
      previousLessonDate: prev,
      tests: pairs.map((p) => {
        const t = byId.get(p.testId)!;
        return {
          testId: t.id,
          title: t.title,
          variant: normalizeVariant(t.variantLabel),
          problems: t._count.problems,
          fromTestId: p.fromTestId,
        };
      }),
      students,
    };
  }
}
