import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { dateKey, parseDateOnly, todayUB } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { classTeacherWhere } from '../common/class-teachers';
import { PrismaService } from '../prisma/prisma.service';
import { addDaysKey, homeworkVariants, normalizeVariant } from '../attendance/board-logic';
import { loadPreviousLesson } from '../attendance/lesson-dates';
import {
  loadDeadlineOverride,
  ubAt,
} from '../homework-practice/homework-deadline';
import { loadPlanned } from '../homework-practice/planned-tests';
import {
  COMMENT_MAX,
  cleanText,
  loadHomeworkComments,
} from '../homework-practice/homework-comments';
import {
  correctAnswerView,
  gradeHomework,
  myAnswerView,
  type HomeworkProblemRow,
} from '../homework-practice/homework-logic';
import {
  TEACHER_SEES_ALL,
  assertMarkAccess,
} from '../attendance/marking-access';
import { withPlus } from '../revisions/revision-snapshot';
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
          select: { id: true, firstName: true, lastName: true, role: true },
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
          // Эзэн 2026-10-19: багш бүх сурагчийн түүхийг УНШИНА (бичих зам өөрчлөгдөөгүй)
          ...(TEACHER_SEES_ALL ? {} : { classroom: classTeacherWhere(userId) }),
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
      select: { firstName: true, lastName: true, role: true },
    });
    if (!u) return null;
    const first = u.firstName.trim();
    const last = u.lastName.trim();
    // Багш+ бол «+» (эзэн 2026-10-23)
    return withPlus(last ? `${last.charAt(0).toUpperCase()}. ${first}` : first, u.role);
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
  /**
   * Өмнөх хичээлийн гэрийн даалгавар болох тестүүд: хичээл батлагдсан (ClassTestSession) бол тэр,
   * үгүй бол хуваарьт төлөвлөсөн («Орох тест», эзэн 2026-11-03). A → B хувилбар (groupKey-ээр).
   */
  private async homeworkTests(classroomId: string, key: string) {
    const { prev, sessions } = await loadPreviousLesson(
      this.prisma,
      classroomId,
      key,
    );
    const none = {
      prev,
      pairs: [] as { fromTestId: string; testId: string }[],
      siblings: [] as {
        id: string;
        title: string;
        groupKey: string | null;
        variantLabel: string | null;
        _count: { problems: number };
      }[],
    };
    if (!prev) return none;
    let doneIds = [
      ...new Set(
        sessions
          .filter((s) => dateKey(s.date) === prev && s.testId)
          .map((s) => s.testId as string),
      ),
    ];
    if (!doneIds.length) {
      const planned = await loadPlanned(
        this.prisma,
        [classroomId],
        prev,
        prev,
        dateKey(todayUB()),
      );
      doneIds = [
        ...new Set(
          planned
            .filter((s) => s.date === prev && s.testId)
            .map((s) => s.testId as string),
        ),
      ];
    }
    if (!doneIds.length) return none;
    const done = await this.prisma.test.findMany({
      where: { id: { in: doneIds } },
      select: { id: true, groupKey: true, variantLabel: true },
    });
    const groups = [
      ...new Set(done.map((t) => t.groupKey).filter((g): g is string => !!g)),
    ];
    if (!groups.length) return none;
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
    return { prev, pairs: homeworkVariants(ordered, siblings), siblings };
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
    const [{ prev, pairs, siblings }, enrollments] = await Promise.all([
      this.homeworkTests(classroomId, key),
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
    if (!prev || !pairs.length) return empty;

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
    // Танхимын сурагчийн гэртээ онлайнаар бодож ИЛГЭЭСЭН гэрийн даалгавар (HomeworkAttempt,
    // lessonDate = өмнөх хичээл) — тэр тестэд шалгалтын дүн (TestResult) байхгүй бол
    // зөв бодсон тоо / нийт бодлогоор тооцно (homework-practice, эзэн 2026-10-29).
    const counted = new Set(results.map((r) => `${r.testId}|${r.studentId}`));
    const attempts = await this.prisma.homeworkAttempt.findMany({
      where: {
        classroomId,
        lessonDate: parseDateOnly(prev),
        status: 'SUBMITTED',
        round: 1,
        testId: { in: pairs.map((p) => p.testId) },
        studentId: { in: studentIds },
      },
      select: { testId: true, studentId: true, score: true, total: true },
    });
    for (const a of attempts) {
      if (counted.has(`${a.testId}|${a.studentId}`)) continue;
      const cur = students[a.studentId];
      if (cur) {
        cur.score += a.score ?? 0;
        cur.max += a.total ?? 0;
        cur.taken += 1;
      } else {
        students[a.studentId] = {
          score: a.score ?? 0,
          max: a.total ?? 0,
          testId: a.testId,
          taken: 1,
        };
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

  /**
   * Нэг сурагчийн онлайн гэрийн даалгаврын ДЭЛГЭРЭНГҮЙ (эзэн 2026-11-03): тест бүрийн оноо,
   * эхэлсэн/илгээсэн цаг, бодсон хугацаа, вэбээс гарсан тоо, бодлого бүрийн хариу (үсэг) +
   * зөв хариу, мөн сурагчийн илгээсэн дэвтрийн зураг (PDF). Бодлогын агуулга ИЛГЭЭХГҮЙ.
   */
  async onlineDetail(
    classroomId: string,
    dateStr: string,
    studentId: string,
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dateStr);
    const key = dateKey(date);
    await this.assertClassAccess(classroomId, userId, role, date);
    const enrolled = await this.prisma.enrollment.findFirst({
      where: { classroomId, studentId, leftAt: null },
      select: { student: { select: { firstName: true, lastName: true } } },
    });
    if (!enrolled) throw new NotFoundException('Сурагч энэ ангид алга байна');
    const { prev, pairs, siblings } = await this.homeworkTests(
      classroomId,
      key,
    );
    const student = {
      id: studentId,
      firstName: enrolled.student.firstName,
      lastName: enrolled.student.lastName,
    };
    // Багшийн тохируулсан хугацаа (байвал) — «хоцорсон»-ыг үүгээр тооцно
    const override = prev
      ? await loadDeadlineOverride(this.prisma, classroomId, prev)
      : null;
    const dueAt = override?.dueAt ?? new Date(`${key}T00:00:00+08:00`);
    const photo = prev
      ? await this.prisma.homeworkPhoto.findFirst({
          where: {
            studentId,
            classroomId,
            lessonDate: parseDateOnly(prev),
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, fileKey: true, pages: true, createdAt: true, caption: true, returnedAt: true },
        })
      : null;
    // Сурагчид харагдах сэтгэгдэл (багшийн дотоод тэмдэглэлээс тусдаа) — даалгавар өгсөн өдрөөр
    const comments = prev
      ? (
          await loadHomeworkComments(
            this.prisma,
            { studentId, classroomId, lessonDate: parseDateOnly(prev) },
            userId,
          )
        ).map((c) => c.view)
      : [];
    const photoView = photo
      ? {
          id: photo.id,
          fileKey: photo.fileKey,
          pages: photo.pages,
          caption: photo.caption,
          returnedAt: photo.returnedAt?.toISOString() ?? null,
          uploadedAt: photo.createdAt.toISOString(),
          // Энэ өдөр = дараагийн хичээл: өмнөх хичээлийн зургийг хугацаанаас (анхдагч нь энэ өдрийн
          // 00:00, эсвэл багшийн тохируулсан) хойш илгээсэн бол хоцорсон
          late: photo.createdAt.getTime() >= dueAt.getTime(),
        }
      : null;
    const deadline = {
      dueAt: dueAt.toISOString(),
      allowLate: override?.allowLate ?? true,
      custom: !!override,
    };
    if (!prev || !pairs.length)
      return {
        date: key,
        previousLessonDate: prev,
        student,
        tests: [],
        photo: photoView,
        comments,
        redos: [],
        deadline,
      };

    const testIds = pairs.map((p) => p.testId);
    const [attempts, exams, problemRows] = await Promise.all([
      this.prisma.homeworkAttempt.findMany({
        where: {
          studentId,
          classroomId,
          lessonDate: parseDateOnly(prev),
          round: 1,
          testId: { in: testIds },
        },
      }),
      this.prisma.testResult.findMany({
        where: { studentId, testId: { in: testIds } },
        select: { testId: true, totalScore: true, maxScore: true },
      }),
      this.prisma.testProblem.findMany({
        where: { testId: { in: testIds } },
        orderBy: [{ testId: 'asc' }, { order: 'asc' }],
        select: {
          testId: true,
          problemId: true,
          order: true,
          problem: {
            select: {
              id: true,
              format: true,
              statementText: true,
              imageKey: true,
              choices: true,
              correctAnswer: true,
              choiceOptions: {
                select: { order: true, text: true, isCorrect: true, imageKey: true },
              },
            },
          },
        },
      }),
    ]);
    const finals = attempts.length
      ? await this.prisma.homeworkCheck.findMany({
          where: { attemptId: { in: attempts.map((a) => a.id) }, n: 0 },
          select: { attemptId: true, results: true },
        })
      : [];
    const bySibling = new Map(siblings.map((t) => [t.id, t]));
    const asObj = (v: unknown): Record<string, unknown> =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};

    const tests = pairs.map((pair) => {
      const t = bySibling.get(pair.testId);
      const a = attempts.find((x) => x.testId === pair.testId);
      const exam = exams.find((x) => x.testId === pair.testId);
      const rows = problemRows.filter(
        (r) => r.testId === pair.testId,
      ) as unknown as HomeworkProblemRow[];
      let attempt: Record<string, unknown> | null = null;
      if (a) {
        const answers = asObj(a.answers);
        const stored = finals.find((f) => f.attemptId === a.id);
        const results =
          a.status === 'SUBMITTED' && stored
            ? asObj(stored.results)
            : (gradeHomework(rows, answers).results as Record<string, unknown>);
        attempt = {
          id: a.id,
          status: a.status,
          startedAt: a.startedAt.toISOString(),
          submittedAt: a.submittedAt?.toISOString() ?? null,
          durationSec: a.submittedAt
            ? Math.max(
                0,
                Math.floor((a.submittedAt.getTime() - a.startedAt.getTime()) / 1000),
              )
            : null,
          activeSec: a.activeSec,
          awaySec: a.awaySec,
          leaveCount: a.leaveCount,
          openCount: a.openCount,
          checksUsed: a.checksUsed,
          late:
            !!a.submittedAt &&
            !!(override?.dueAt ?? a.deadlineAt) &&
            a.submittedAt.getTime() > (override?.dueAt ?? a.deadlineAt)!.getTime(),
          score: a.score,
          total: a.total,
          items: rows.map((r, i) => ({
            n: i + 1,
            problemId: r.problemId,
            mine: myAnswerView(answers[r.problemId]),
            correct: correctAnswerView(r),
            result: (results[r.problemId] as string | undefined) ?? null,
          })),
        };
      }
      return {
        testId: pair.testId,
        title: t?.title ?? 'Тест',
        variant: normalizeVariant(t?.variantLabel ?? null),
        problems: t?._count.problems ?? rows.length,
        // Хариуны түлхүүр (эзэн 2026-11-05: «1-A, 2-B» багана) — сурагч бодоогүй ч багшид харагдана
        key: rows.map((r, i) => ({ n: i + 1, answer: correctAnswerView(r) })),
        attempt,
        exam: exam ? { score: exam.totalScore, max: exam.maxScore } : null,
      };
    });
    // «Дахин бодох» (2-р оролдлого): тэр хичээлийн А, Б тестийг сурагч дахин бодсон бол багш харна
    const redoRows = await this.prisma.homeworkAttempt.findMany({
      where: {
        studentId,
        classroomId,
        lessonDate: parseDateOnly(prev),
        round: { gt: 1 },
      },
      orderBy: { startedAt: 'asc' },
    });
    const redoTests = redoRows.length
      ? await this.prisma.test.findMany({
          where: { id: { in: redoRows.map((r) => r.testId) } },
          select: { id: true, title: true, variantLabel: true },
        })
      : [];
    const redoCounted = new Map(redoTests.map((t) => [t.id, t]));
    const aIds = new Set(pairs.map((p) => p.fromTestId));
    const redos = redoRows.map((a) => {
      const t = redoCounted.get(a.testId);
      return {
        attemptId: a.id,
        testId: a.testId,
        title: t?.title ?? 'Тест',
        variant: normalizeVariant(t?.variantLabel ?? null),
        kind: aIds.has(a.testId) ? ('CLASS' as const) : ('HOME' as const),
        round: a.round,
        status: a.status,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt?.toISOString() ?? null,
        activeSec: a.activeSec,
        awaySec: a.awaySec,
        leaveCount: a.leaveCount,
        openCount: a.openCount,
        score: a.score,
        total: a.total,
      };
    });
    return {
      date: key,
      previousLessonDate: prev,
      student,
      tests,
      photo: photoView,
      comments,
      redos,
      deadline,
    };
  }

  /* ───────── Гэрийн даалгаврын хугацаа (эзэн 2026-11-05) ───────── */

  /**
   * Самбарын өдөр D-д шалгах даалгавар = өмнөх хичээл P-д өгсөн. Хугацааг P..D хооронд (хуанлийн
   * өдөр бүр) сонгоно; анхдагч нь D-ийн 00:00, хоцорч илгээж болно.
   */
  private async deadlineWindow(
    classroomId: string,
    dateStr: string,
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dateStr);
    const key = dateKey(date);
    await this.assertClassAccess(classroomId, userId, role, date);
    const { prev } = await loadPreviousLesson(this.prisma, classroomId, key);
    const days: string[] = [];
    if (prev) for (let d = prev; d <= key; d = addDaysKey(d, 1)) days.push(d);
    return { key, prev, days };
  }

  private deadlineView(
    w: { key: string; prev: string | null; days: string[] },
    row: { dueAt: Date; allowLate: boolean; updatedAt?: Date } | null,
  ) {
    const fallback = new Date(`${w.key}T00:00:00+08:00`);
    return {
      date: w.key,
      lessonDate: w.prev,
      days: w.days,
      defaultDueAt: fallback.toISOString(),
      dueAt: (row?.dueAt ?? fallback).toISOString(),
      allowLate: row?.allowLate ?? true,
      custom: !!row,
    };
  }

  async getDeadline(classroomId: string, dateStr: string, userId: string, role: Role) {
    const w = await this.deadlineWindow(classroomId, dateStr, userId, role);
    const row = w.prev ? await loadDeadlineOverride(this.prisma, classroomId, w.prev) : null;
    return this.deadlineView(w, row);
  }

  async setDeadline(
    classroomId: string,
    dto: { date: string; dueDate: string; time: string; allowLate: boolean },
    userId: string,
    role: Role,
  ) {
    const w = await this.deadlineWindow(classroomId, dto.date, userId, role);
    if (!w.prev)
      throw new BadRequestException('Өмнөх хичээл олдсонгүй — тохируулах даалгавар алга');
    if (!w.days.includes(dto.dueDate))
      throw new BadRequestException(
        `Хугацааг ${w.prev}-аас ${w.key} хооронд сонгоно уу`,
      );
    const dueAt = ubAt(dto.dueDate, dto.time);
    const lessonDate = parseDateOnly(w.prev);
    const before = await this.prisma.homeworkDeadline.findUnique({
      where: { classroomId_lessonDate: { classroomId, lessonDate } },
    });
    const row = await this.prisma.homeworkDeadline.upsert({
      where: { classroomId_lessonDate: { classroomId, lessonDate } },
      create: { classroomId, lessonDate, dueAt, allowLate: dto.allowLate, setById: userId },
      update: { dueAt, allowLate: dto.allowLate, setById: userId },
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: before ? 'UPDATE' : 'CREATE',
      entity: 'HomeworkDeadline',
      entityId: row.id,
      before: before ?? null,
      after: row,
    });
    return this.deadlineView(w, row);
  }

  /* ───────── Сурагчид харагдах сэтгэгдэл, «Буцаах» (эзэн 2026-11-05) ───────── */

  /** Самбарын өдөр D → даалгавар өгсөн өмнөх хичээл; сурагч ангид байх ёстой */
  private async homeworkThread(
    classroomId: string,
    dateStr: string,
    studentId: string,
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dateStr);
    await this.assertClassAccess(classroomId, userId, role, date);
    const enrolled = await this.prisma.enrollment.findFirst({
      where: { classroomId, studentId, leftAt: null },
      select: { id: true },
    });
    if (!enrolled) throw new NotFoundException('Сурагч энэ ангид алга байна');
    const { prev } = await loadPreviousLesson(this.prisma, classroomId, dateKey(date));
    if (!prev) throw new BadRequestException('Энэ өдрийн өмнө хичээл олдсонгүй');
    return parseDateOnly(prev);
  }

  private async threadView(classroomId: string, studentId: string, lessonDate: Date, userId: string) {
    return (
      await loadHomeworkComments(this.prisma, { studentId, classroomId, lessonDate }, userId)
    ).map((c) => c.view);
  }

  async addComment(
    classroomId: string,
    dateStr: string,
    studentId: string,
    bodyRaw: unknown,
    userId: string,
    role: Role,
  ) {
    const body = cleanText(bodyRaw, COMMENT_MAX, 'Сэтгэгдэл');
    const lessonDate = await this.homeworkThread(classroomId, dateStr, studentId, userId, role);
    await this.prisma.homeworkComment.create({
      data: { classroomId, studentId, lessonDate, authorId: userId, authorRole: role, body },
    });
    return { comments: await this.threadView(classroomId, studentId, lessonDate, userId) };
  }

  /**
   * «Буцаах»: даалгавар хангалтгүй — шалтгааныг сурагчид харагдах сэтгэгдэл болгон бичиж, сүүлийн
   * зургийг буцаасан гэж тэмдэглэнэ. Сурагч хугацаа хаагдсан ч дахин илгээж чадна. Зураг устгахгүй.
   */
  async returnPhoto(
    classroomId: string,
    dateStr: string,
    studentId: string,
    reasonRaw: unknown,
    userId: string,
    role: Role,
  ) {
    const body = cleanText(reasonRaw, COMMENT_MAX, 'Буцаах шалтгаан');
    const lessonDate = await this.homeworkThread(classroomId, dateStr, studentId, userId, role);
    const photo = await this.prisma.homeworkPhoto.findFirst({
      where: { studentId, classroomId, lessonDate, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, returnedAt: true },
    });
    if (!photo) throw new NotFoundException('Сурагч энэ даалгаврын зураг илгээгээгүй байна');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.homeworkPhoto.update({
        where: { id: photo.id },
        data: { returnedAt: now, returnedById: userId },
      }),
      this.prisma.homeworkComment.create({
        data: { classroomId, studentId, lessonDate, authorId: userId, authorRole: role, kind: 'RETURN', body },
      }),
    ]);
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'UPDATE',
      entity: 'HomeworkPhoto',
      entityId: photo.id,
      before: { returnedAt: photo.returnedAt },
      after: { returnedAt: now, returnedById: userId },
    });
    return {
      returnedAt: now.toISOString(),
      comments: await this.threadView(classroomId, studentId, lessonDate, userId),
    };
  }

  /** Өөрийн бичсэн сэтгэгдлийг нууна (мөр үлдэнэ) */
  async hideComment(id: string, userId: string) {
    const row = await this.prisma.homeworkComment.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!row || row.authorId !== userId) throw new NotFoundException('Сэтгэгдэл олдсонгүй');
    await this.prisma.homeworkComment.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { hidden: true };
  }
}
