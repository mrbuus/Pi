import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { AttendanceStatus, Role } from '../generated/prisma/enums';
import { classTeacherWhere, isClassTeacher } from '../common/class-teachers';
import { PrismaService } from '../prisma/prisma.service';
import { shortName } from '../revisions/revision-snapshot';
import { ScheduleService } from '../schedule/schedule.service';
import {
  DEFAULT_CRITERIA,
  addDaysKey,
  computeRisk,
  countStatuses,
  criteriaToStore,
  lessonAssignmentIds,
  monthRange,
  normalizeCriteria,
  submittedStudentIds,
  summarizeRecorders,
  ubDateKey,
} from './board-logic';
import { loadPreviousLesson } from './lesson-dates';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { RiskCriteriaDto } from './dto/risk-criteria.dto';
import { TEACHER_SEES_ALL, assertMarkAccess } from './marking-access';

// /schedule/days-аас "бодит хичээлтэй өдөр" хайхад хэтэрхий нарийн цонхоор
// эхлээд олдохгүй бол улам өргөтгөж дахин хайна (жишээ нь ангийн хуваарь
// саяхан эхэлсэн, эсвэл урт амралтын дараа) — гэхдээ хэт хол очихгүй.
const CLASS_DAY_LOOKBACK_START = 21;
const CLASS_DAY_LOOKBACK_MAX = 189;

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
    private audit: AuditService,
  ) {}

  // parseDateOnly plain Error шидвэл HTTP 500 болчихно — энд эргүүлж 400
  // болгож, хэрэглэгчид ойлгомжтой монгол мессеж өгнө.
  private parseDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException(
        'Огнооны формат буруу байна (YYYY-MM-DD)',
      );
    }
  }

  // ADMIN/TEACHER_PLUS — бүх анги; TEACHER — ангийн/хуваарийн багш эсвэл тэр
  // өдрийн ахлах/туслах багш (marking-access.ts, D9).
  private assertClassAccess(
    classroomId: string,
    userId: string,
    role: Role,
    when: { date?: Date; from?: Date; to?: Date } = {},
  ) {
    return assertMarkAccess(this.prisma, classroomId, userId, role, when);
  }

  /**
   * НЭГ товшилт = НЭГ сурагчийн upsert (D8). Мөр бүрийн утга:
   * - status: утга → upsert; null → тэмдэглэгээ цэвэрлэх (мөр устна); ирүүлээгүй → зөвхөн тэмдэглэл/хугацаа
   * - note: ирүүлээгүй → ХУУЧНААРАА (устахгүй); null/"" → цэвэрлэнэ
   * - lateRange: LATE-ээс өөр төлөвт үргэлж null; ирүүлээгүй → хуучнаараа
   * - onlyIf: серверийн одоогийн төлөв ийм байвал л бичнэ (бөөнөөр, буцаах — өөр багшийнхыг дарахгүй)
   */
  async mark(
    classroomId: string,
    dto: MarkAttendanceDto,
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dto.date);
    await this.assertClassAccess(classroomId, userId, role, { date });

    const activeStudentIds = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: { classroomId, leftAt: null, student: { archivedAt: null } },
          select: { studentId: true },
        })
      ).map((e) => e.studentId),
    );
    const invalid = dto.entries.filter(
      (e) => !activeStudentIds.has(e.studentId),
    );
    if (invalid.length > 0) {
      throw new ForbiddenException(
        `Энэ ангид байхгүй сурагч байна: ${invalid.map((e) => e.studentId).join(', ')}`,
      );
    }

    // Нэг сурагч хоёр удаа ирвэл сүүлийнх нь хүчинтэй
    const entries = [
      ...new Map(dto.entries.map((e) => [e.studentId, e])).values(),
    ];
    const ids = entries.map((e) => e.studentId);

    const result = await this.prisma.$transaction(async (tx) => {
      const beforeRows = await tx.attendance.findMany({
        where: { classroomId, date, studentId: { in: ids } },
      });
      const before = new Map(beforeRows.map((r) => [r.studentId, r]));
      const applied: string[] = [];
      const skipped: string[] = [];
      const changes: {
        action: 'CREATE' | 'UPDATE' | 'DELETE';
        before: (typeof beforeRows)[number] | null;
        after: (typeof beforeRows)[number] | null;
      }[] = [];

      for (const entry of entries) {
        const cur = before.get(entry.studentId) ?? null;
        if (entry.onlyIf) {
          const ok =
            entry.onlyIf === 'UNMARKED'
              ? cur === null
              : cur?.status === entry.onlyIf;
          if (!ok) {
            skipped.push(entry.studentId);
            continue;
          }
        }
        const note =
          entry.note === undefined
            ? undefined
            : entry.note === null || entry.note.trim() === ''
              ? null
              : entry.note.trim();
        const where = {
          classroomId_studentId_date: {
            classroomId,
            studentId: entry.studentId,
            date,
          },
        };

        if (entry.status === null) {
          if (cur) {
            await tx.attendance.delete({ where });
            changes.push({ action: 'DELETE', before: cur, after: null });
          }
          applied.push(entry.studentId);
          continue;
        }

        if (entry.status === undefined) {
          // Зөвхөн тэмдэглэл/хугацаа: мөргүй бол бичих зүйлгүй
          if (!cur) {
            skipped.push(entry.studentId);
            continue;
          }
          const after = await tx.attendance.update({
            where,
            data: {
              markedById: userId,
              ...(note !== undefined ? { note } : {}),
              ...(entry.lateRange !== undefined &&
              cur.status === AttendanceStatus.LATE
                ? { lateRange: entry.lateRange }
                : {}),
            },
          });
          changes.push({ action: 'UPDATE', before: cur, after });
          applied.push(entry.studentId);
          continue;
        }

        const isLate = entry.status === AttendanceStatus.LATE;
        const lateRange = !isLate
          ? null
          : entry.lateRange !== undefined
            ? entry.lateRange
            : undefined;
        const after = await tx.attendance.upsert({
          where,
          create: {
            classroomId,
            studentId: entry.studentId,
            date,
            status: entry.status,
            markedById: userId,
            note: note ?? null,
            lateRange: lateRange ?? null,
          },
          update: {
            status: entry.status,
            markedById: userId,
            ...(note !== undefined ? { note } : {}),
            ...(lateRange !== undefined ? { lateRange } : {}),
          },
        });
        changes.push({ action: cur ? 'UPDATE' : 'CREATE', before: cur, after });
        applied.push(entry.studentId);
      }
      return { applied, skipped, changes };
    });

    // Аудит (AuditService алдааг өөрөө залгина)
    await Promise.all(
      result.changes.map((c) =>
        this.audit.record({
          actorId: userId,
          actorRole: role,
          action: c.action,
          entity: 'Attendance',
          entityId: (c.after ?? c.before)!.id,
          before: c.before,
          after: c.after,
        }),
      ),
    );

    const rows = await this.attendanceRows(classroomId, date, ids);
    return {
      marked: result.applied.length,
      date: dateKey(date),
      applied: result.applied,
      skipped: result.skipped,
      rows,
    };
  }

  /* ───────── Самбар (эзэн 2026-10-18) ───────── */

  private async markerNames(ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map<string, string>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return new Map(users.map((u) => [u.id, shortName(u)]));
  }

  private async attendanceRows(
    classroomId: string,
    date: Date,
    studentIds?: string[],
  ) {
    const rows = await this.prisma.attendance.findMany({
      where: {
        classroomId,
        date,
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
      },
      select: {
        studentId: true,
        status: true,
        note: true,
        lateRange: true,
        markedById: true,
      },
    });
    const names = await this.markerNames(rows.map((r) => r.markedById));
    return rows.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      note: r.note,
      lateRange: r.lateRange,
      markedBy: names.get(r.markedById) ?? null,
    }));
  }

  private async homeworkRows(classroomId: string, date: Date) {
    const rows = await this.prisma.dailyHomeworkMark.findMany({
      where: { classroomId, date },
      select: {
        studentId: true,
        status: true,
        comment: true,
        markedById: true,
        updatedAt: true,
      },
    });
    const names = await this.markerNames(rows.map((r) => r.markedById));
    return rows.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      comment: r.comment,
      markedBy: names.get(r.markedById) ?? null,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Энэ анги, энэ өдрийн ирцийг ХЭН авсан, даалгаврыг ХЭН шалгасан (эзэн 2026-10-22):
   * мөр бүрийн сүүлчийн тэмдэглэгч (`markedById`) → багш тус бүрийн тоо ба сүүлийн цаг.
   * Ирцийн мөрөнд цаг (updatedAt) байхгүй тул тэр багшийн тэр мөрийн аудитын сүүлийн
   * бичлэгээс; аудит олдохгүй бол цаг null. Даалгавар — мөрийн updatedAt.
   */
  private async recordedBy(classroomId: string, date: Date) {
    const [attRows, hwRows] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { classroomId, date },
        select: { id: true, markedById: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId, date, status: { not: null } },
        select: { markedById: true, updatedAt: true },
      }),
    ]);
    const audits = attRows.length
      ? await this.prisma.auditLog.findMany({
          where: {
            entity: 'Attendance',
            entityId: { in: attRows.map((r) => r.id) },
          },
          select: { entityId: true, actorId: true, at: true },
        })
      : [];
    const lastAt = new Map<string, Date>();
    for (const a of audits) {
      const k = `${a.entityId}|${a.actorId}`;
      const cur = lastAt.get(k);
      if (!cur || a.at > cur) lastAt.set(k, a.at);
    }
    const names = await this.markerNames([
      ...attRows.map((r) => r.markedById),
      ...hwRows.map((r) => r.markedById),
    ]);
    return {
      attendance: summarizeRecorders(
        attRows.map((r) => ({
          markedById: r.markedById,
          at: lastAt.get(`${r.id}|${r.markedById}`) ?? null,
        })),
        names,
      ),
      homework: summarizeRecorders(
        hwRows.map((r) => ({ markedById: r.markedById, at: r.updatedAt })),
        names,
      ),
    };
  }

  /** Шалгуур + эрсдэлийн тэмдэг: [min(өдөр, өнөөдөр) − windowDays, min(өдөр, өнөөдөр)] */
  private async riskFor(
    classroomId: string,
    key: string,
    studentIds: string[],
    rawCriteria: unknown,
  ) {
    const criteria = normalizeCriteria(rawCriteria);
    const today = dateKey(todayUB());
    const upTo = key < today ? key : today;
    const from = addDaysKey(upTo, -criteria.windowDays);
    const range = { gte: this.parseDate(from), lte: this.parseDate(upTo) };
    const [att, hw] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { classroomId, date: range, studentId: { in: studentIds } },
        select: { studentId: true, date: true, status: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: {
          classroomId,
          date: range,
          studentId: { in: studentIds },
          status: { not: null },
        },
        select: { studentId: true, date: true, status: true },
      }),
    ]);
    const flags = computeRisk(
      studentIds,
      att.map((r) => ({ ...r, date: dateKey(r.date) })),
      hw.map((r) => ({ ...r, date: dateKey(r.date) })),
      criteria,
    );
    return { criteria, flags };
  }

  /**
   * «Илгээсэн»: тухайн хичээлийн даалгаврыг (Assignment/Submission) илгээсэн одоогийн
   * сурагчид. Даалгавар сонгох дүрэм — board-logic.lessonAssignmentIds.
   */
  private async sentFor(classroomId: string, key: string, studentIds: string[]) {
    const [byAssignment, byHomework] = await Promise.all([
      this.assignmentSentFor(classroomId, key, studentIds),
      this.homeworkSentFor(classroomId, key, studentIds),
    ]);
    if (!byHomework.length) return byAssignment;
    return {
      assignmentIds: byAssignment.assignmentIds,
      students: [...new Set([...byAssignment.students, ...byHomework])],
    };
  }

  /**
   * Гэрийн даалгаврын онлайн бодолт/зураг (homework-practice, эзэн 2026-10-29): ӨМНӨХ хичээлийн
   * өдрийн (lessonDate) даалгаврыг ИЛГЭЭСЭН (HomeworkAttempt SUBMITTED) эсвэл зураг (HomeworkPhoto)
   * явуулсан одоогийн сурагчид. Мөр байхгүй бол өмнөх хичээлийг тооцоолохгүй (хөнгөн).
   */
  private async homeworkSentFor(
    classroomId: string,
    key: string,
    studentIds: string[],
  ): Promise<string[]> {
    if (!studentIds.length) return [];
    const range = {
      gte: parseDateOnly(addDaysKey(key, -35)),
      lt: parseDateOnly(key),
    };
    const [attempts, photos] = await Promise.all([
      this.prisma.homeworkAttempt.findMany({
        where: {
          classroomId,
          status: 'SUBMITTED',
          lessonDate: range,
          studentId: { in: studentIds },
        },
        select: { studentId: true, lessonDate: true },
      }),
      this.prisma.homeworkPhoto.findMany({
        where: {
          classroomId,
          deletedAt: null,
          lessonDate: range,
          studentId: { in: studentIds },
        },
        select: { studentId: true, lessonDate: true },
      }),
    ]);
    if (!attempts.length && !photos.length) return [];
    const { prev } = await loadPreviousLesson(this.prisma, classroomId, key);
    if (!prev) return [];
    return submittedStudentIds(
      [...attempts, ...photos]
        .filter((r) => dateKey(r.lessonDate) === prev)
        .map((r) => ({
          studentId: r.studentId,
          submittedAt: r.lessonDate,
          imageKeys: [],
        })),
      studentIds,
    );
  }

  private async assignmentSentFor(
    classroomId: string,
    key: string,
    studentIds: string[],
  ) {
    const dayStart = new Date(`${key}T00:00:00+08:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const createdFrom = new Date(`${addDaysKey(key, -35)}T00:00:00+08:00`);
    const assignments = await this.prisma.assignment.findMany({
      where: {
        classroomId,
        deletedAt: null,
        OR: [
          { dueDate: { gte: dayStart, lt: dayEnd } },
          { createdAt: { gte: createdFrom, lt: dayEnd } },
        ],
      },
      select: { id: true, dueDate: true, createdAt: true },
    });
    if (!assignments.length || !studentIds.length)
      return { assignmentIds: [] as string[], students: [] as string[] };
    const hasDue = assignments.some(
      (a) => a.dueDate && ubDateKey(a.dueDate) === key,
    );
    const prev = hasDue
      ? null
      : (await loadPreviousLesson(this.prisma, classroomId, key)).prev;
    const ids = lessonAssignmentIds(assignments, key, prev);
    if (!ids.length) return { assignmentIds: [], students: [] };
    const subs = await this.prisma.submission.findMany({
      where: {
        assignmentId: { in: ids },
        studentId: { in: studentIds },
        OR: [{ submittedAt: { not: null } }, { imageKeys: { isEmpty: false } }],
      },
      select: { studentId: true, submittedAt: true, imageKeys: true },
    });
    return { assignmentIds: ids, students: submittedStudentIds(subs, studentIds) };
  }

  /** Тухайн өдөр хичээлтэй, хэрэглэгчийн тэмдэглэж болох ангиуд (D9) */
  async boardClasses(
    dateStr: string,
    userId: string,
    role: Role,
    selectedId?: string,
  ) {
    const key = dateKey(this.parseDate(dateStr));
    const selected = selectedId
      ? await this.selectedClass(selectedId, userId, role)
      : null;
    const classrooms = await this.prisma.classroom.findMany({
      where: { archived: false },
      select: {
        id: true,
        name: true,
        type: true,
        grade: true,
        teacherId: true,
        assistantTeacherId: true,
        _count: {
          select: {
            enrollments: {
              where: { leftAt: null, student: { archivedAt: null } },
            },
          },
        },
      },
    });
    if (!classrooms.length) return { date: key, classes: [], selected };
    const week = await this.schedule.getWeek(
      key,
      classrooms.map((c) => c.id),
    );
    const day = week.days.find((d) => d.date === key);
    const entries = day && !day.isHoliday ? day.entries : [];

    const isStaffAll = role === Role.ADMIN || role === Role.TEACHER_PLUS;
    const ownSchedules = isStaffAll
      ? new Set<string>()
      : new Set(
          (
            await this.prisma.classSchedule.findMany({
              where: { teacherId: userId },
              select: { classroomId: true },
            })
          ).map((s) => s.classroomId),
        );
    const byId = new Map(classrooms.map((c) => [c.id, c]));
    const grouped = new Map<string, typeof entries>();
    for (const e of entries) {
      const cls = byId.get(e.classroomId);
      if (!cls) continue;
      const allowed =
        isStaffAll ||
        (role === Role.TEACHER && TEACHER_SEES_ALL) ||
        (role === Role.TEACHER &&
          (isClassTeacher(cls, userId) ||
            ownSchedules.has(cls.id) ||
            e.leadTeacher?.id === userId ||
            e.assistantTeacher?.id === userId));
      if (!allowed) continue;
      grouped.set(cls.id, [...(grouped.get(cls.id) ?? []), e]);
    }
    const classes = [...grouped.entries()].map(([id, list]) => {
      const cls = byId.get(id)!;
      return {
        id,
        name: cls.name,
        type: cls.type,
        grade: cls.grade,
        studentCount: cls._count.enrollments,
        lessons: list
          .sort((a, b) => a.startMinute - b.startMinute)
          .map((e) => ({
            scheduleId: e.scheduleId,
            startMinute: e.startMinute,
            endMinute: e.endMinute,
            room: e.room,
            topic: e.topic,
            teacherName: e.teacherName,
                leadTeacher: e.leadTeacher?.name ?? null,
                assistantTeacher: e.assistantTeacher?.name ?? null,
              })),
      };
    });
    classes.sort(
      (a, b) =>
        a.lessons[0].startMinute - b.lessons[0].startMinute ||
        a.name.localeCompare(b.name, 'mn'),
    );
    return { date: key, classes, selected };
  }

  /** Сонгосон анги тэр өдөр хичээлгүй байсан ч нэр, сурагчийн тоо (огнооны зурваст) — эрхтэй бол */
  private async selectedClass(classroomId: string, userId: string, role: Role) {
    try {
      // Багш: ангийн/хуваарийн багш эсвэл сүүлийн/ойрын 60 хоногт тэр ангид орсон
      const today = todayUB();
      await this.assertClassAccess(classroomId, userId, role, {
        from: addDateDays(today, -60),
        to: addDateDays(today, 60),
      });
    } catch {
      return null;
    }
    const c = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            enrollments: {
              where: { leftAt: null, student: { archivedAt: null } },
            },
          },
        },
      },
    });
    return c
      ? { id: c.id, name: c.name, type: c.type, studentCount: c._count.enrollments }
      : null;
  }

  /** Самбарын бүтэн өгөгдөл: хичээл, сурагчид, тэр өдрийн тэмдэглэгээ, шалгуур, эрсдэл */
  async board(classroomId: string, dateStr: string, userId: string, role: Role) {
    const date = this.parseDate(dateStr);
    const key = dateKey(date);
    const classroom = await this.assertClassAccess(classroomId, userId, role, {
      date,
    });
    const [enrollments, week, attendance, homework] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classroomId, leftAt: null, student: { archivedAt: null } },
        select: {
          joinedAt: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentCode: true,
            },
          },
        },
        orderBy: [
          { student: { firstName: 'asc' } },
          { student: { lastName: 'asc' } },
        ],
      }),
      this.schedule.getWeek(key, [classroomId]),
      this.attendanceRows(classroomId, date),
      this.homeworkRows(classroomId, date),
    ]);
    const day = week.days.find((d) => d.date === key);
    const lessons = (day && !day.isHoliday ? day.entries : [])
      .filter((e) => e.classroomId === classroomId)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((e) => ({
        scheduleId: e.scheduleId,
        startMinute: e.startMinute,
        endMinute: e.endMinute,
        room: e.room,
        topic: e.topic,
        teacherName: e.teacherName,
        leadTeacher: e.leadTeacher?.name ?? null,
        assistantTeacher: e.assistantTeacher?.name ?? null,
      }));
    const students = enrollments.map((e) => ({
      id: e.student.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      code: e.student.studentCode,
      joinedAt: e.joinedAt,
    }));
    const ids = students.map((s) => s.id);
    const [risk, sent, recordedBy] = await Promise.all([
      this.riskFor(classroomId, key, ids, classroom.riskCriteria),
      this.sentFor(classroomId, key, ids),
      this.recordedBy(classroomId, date),
    ]);
    return {
      date: key,
      today: dateKey(todayUB()),
      classroom: {
        id: classroom.id,
        name: classroom.name,
        type: classroom.type,
        grade: classroom.grade,
      },
      holiday: day?.isHoliday ? (day.holiday?.title ?? null) : null,
      lessons,
      students,
      attendance,
      homework,
      criteria: risk.criteria,
      risk: risk.flags,
      sent,
      recordedBy,
      canEditCriteria: role === Role.ADMIN || role === Role.TEACHER_PLUS,
    };
  }

  /** 15 сек тутмын хөнгөн шинэчлэл: тэр өдрийн тэмдэглэгээ + эрсдэл */
  async marks(classroomId: string, dateStr: string, userId: string, role: Role) {
    const date = this.parseDate(dateStr);
    const classroom = await this.assertClassAccess(classroomId, userId, role, {
      date,
    });
    const studentIds = (
      await this.prisma.enrollment.findMany({
        where: { classroomId, leftAt: null, student: { archivedAt: null } },
        select: { studentId: true },
      })
    ).map((e) => e.studentId);
    const [attendance, homework, risk, sent, recordedBy] = await Promise.all([
      this.attendanceRows(classroomId, date),
      this.homeworkRows(classroomId, date),
      this.riskFor(classroomId, dateKey(date), studentIds, classroom.riskCriteria),
      this.sentFor(classroomId, dateKey(date), studentIds),
      this.recordedBy(classroomId, date),
    ]);
    return {
      date: dateKey(date),
      attendance,
      homework,
      criteria: risk.criteria,
      risk: risk.flags,
      sent,
      recordedBy,
    };
  }

  async getCriteria(
    classroomId: string,
    userId: string,
    role: Role,
    dateStr?: string,
  ) {
    const classroom = await this.assertClassAccess(
      classroomId,
      userId,
      role,
      dateStr ? { date: this.parseDate(dateStr) } : {},
    );
    return {
      criteria: normalizeCriteria(classroom.riskCriteria),
      isDefault: classroom.riskCriteria === null,
      defaults: DEFAULT_CRITERIA,
    };
  }

  /** Багш+ / Админ л (controller-ийн @Roles) — анхдагчтай тэнцүү бол null хадгална */
  async setCriteria(
    classroomId: string,
    dto: RiskCriteriaDto,
    userId: string,
    role: Role,
  ) {
    const classroom = await this.assertClassAccess(classroomId, userId, role);
    const parsed = criteriaToStore({ ...dto });
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    const updated = await this.prisma.classroom.update({
      where: { id: classroomId },
      data: {
        riskCriteria:
          parsed.value === null
            ? Prisma.DbNull
            : (parsed.value as unknown as Prisma.InputJsonValue),
      },
      select: { riskCriteria: true },
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'UPDATE',
      entity: 'ClassroomRiskCriteria',
      entityId: classroomId,
      before: { riskCriteria: classroom.riskCriteria ?? null },
      after: { riskCriteria: updated.riskCriteria ?? null },
    });
    return {
      criteria: normalizeCriteria(updated.riskCriteria),
      isDefault: updated.riskCriteria === null,
      defaults: DEFAULT_CRITERIA,
    };
  }

  /**
   * Сурагчийн drawer (самбарын нэр дээр дарахад): утас, сургууль + БҮХ ирц/даалгавар
   * (эзэн 2026-10-22). `month` (YYYY-MM, анхдагч нь `date`-ийн сар) — тэр сарын хичээлийн
   * өдөр (энэ анги), ирц, даалгавар (бүх анги — анги сольсон бол өмнөх ангийнх ч), төлөв
   * бүрийн тоо (өнгөрсөн, элссэнээс хойшхи тэмдэглээгүй хичээлийг оруулаад). `history` —
   * бүх хугацааны нийт тоо, «Илгээсэн» даалгавар, хамгийн эхний бичлэгийн огноо (сарын навигаци).
   */
  async studentCard(
    classroomId: string,
    studentId: string,
    dateStr: string,
    userId: string,
    role: Role,
    monthStr?: string,
  ) {
    const date = this.parseDate(dateStr);
    const key = dateKey(date);
    await this.assertClassAccess(classroomId, userId, role, { date });
    const range = monthRange(monthStr || key.slice(0, 7));
    if (!range) {
      throw new BadRequestException('Сарын формат буруу байна (YYYY-MM)');
    }
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { classroomId, studentId, leftAt: null },
      select: { joinedAt: true },
    });
    if (!enrollment) throw new NotFoundException('Сурагч энэ ангид алга байна');

    const { from: monthFrom, to: monthTo } = range;
    const [user, days, allAtt, allHw, sentCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentCode: true,
          phone: true,
          createdAt: true,
          lastSeenAt: true,
          studentProfile: {
            select: {
              school: true,
              grade: true,
              fatherPhone: true,
              motherPhone: true,
              joinedOn: true,
            },
          },
        },
      }),
      this.schedule.expandDays(monthFrom, monthTo, classroomId),
      // Бүх хугацааны мөр (сурагч жилд ~150 хичээл) — нийт тоо, сарын хэсэг хоёуланд
      this.prisma.attendance.findMany({
        where: { studentId },
        select: {
          date: true,
          status: true,
          lateRange: true,
          note: true,
          classroomId: true,
          markedById: true,
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: {
          studentId,
          OR: [{ status: { not: null } }, { comment: { not: null } }],
        },
        select: {
          date: true,
          status: true,
          comment: true,
          classroomId: true,
          markedById: true,
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.submission.count({
        where: {
          studentId,
          assignment: { deletedAt: null },
          OR: [
            { submittedAt: { not: null } },
            { imageKeys: { isEmpty: false } },
          ],
        },
      }),
    ]);
    if (!user) throw new NotFoundException('Сурагч олдсонгүй');
    const p = user.studentProfile;

    const inMonth = (d: Date) => {
      const k = dateKey(d);
      return k >= monthFrom && k <= monthTo;
    };
    const monthAttRows = allAtt.filter((r) => inMonth(r.date));
    const monthHwRows = allHw.filter((r) => inMonth(r.date));
    const otherClassIds = [
      ...new Set(
        [...monthAttRows, ...monthHwRows]
          .map((r) => r.classroomId)
          .filter((id) => id !== classroomId),
      ),
    ];
    const [classNames, names] = await Promise.all([
      otherClassIds.length
        ? this.prisma.classroom
            .findMany({
              where: { id: { in: otherClassIds } },
              select: { id: true, name: true },
            })
            .then((list) => new Map(list.map((c) => [c.id, c.name])))
        : Promise.resolve(new Map<string, string>()),
      this.markerNames([
        ...monthAttRows.map((r) => r.markedById),
        ...monthHwRows.map((r) => r.markedById),
      ]),
    ]);
    const otherClass = (id: string) =>
      id === classroomId ? null : (classNames.get(id) ?? null);

    // Энэ ангид элссэнээс (сургалтад элссэн нь хожуу бол түүнээс) өмнөх хичээлийг
    // «тэмдэглээгүй» гэж тоолохгүй; ирээдүйн хичээлийг ч мөн.
    const enrolledOn = dateKey(enrollment.joinedAt);
    const profileJoined = p?.joinedOn ? dateKey(p.joinedOn) : null;
    const classJoinedOn =
      profileJoined && profileJoined > enrolledOn ? profileJoined : enrolledOn;
    const today = dateKey(todayUB());
    const lessonDays = days
      .filter((d) => d.classes.length > 0)
      .map((d) => d.date);
    const expected = lessonDays.filter((k) => k >= classJoinedOn && k <= today);

    const monthAtt = monthAttRows.map((r) => ({
      date: dateKey(r.date),
      status: r.status,
      lateRange: r.lateRange,
      note: r.note,
      classroom: otherClass(r.classroomId),
      markedBy: names.get(r.markedById) ?? null,
    }));
    const monthHw = monthHwRows.map((r) => ({
      date: dateKey(r.date),
      status: r.status,
      comment: r.comment,
      classroom: otherClass(r.classroomId),
      markedBy: names.get(r.markedById) ?? null,
    }));
    const firstDates = [allAtt.at(-1)?.date, allHw.at(-1)?.date]
      .filter((d): d is Date => !!d)
      .map(dateKey)
      .sort();

    return {
      student: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        code: user.studentCode,
        phone: user.phone,
        fatherPhone: p?.fatherPhone ?? null,
        motherPhone: p?.motherPhone ?? null,
        school: p?.school ?? null,
        grade: p?.grade ?? null,
        joinedOn: profileJoined ?? enrolledOn,
        registeredAt: user.createdAt,
        lastSeenAt: user.lastSeenAt,
      },
      month: {
        from: monthFrom,
        to: monthTo,
        lessonDays,
        classJoinedOn,
        attendance: monthAtt,
        homework: monthHw,
        counts: countStatuses(
          monthAtt.map((r) => ({ key: r.date, status: r.status })),
          monthHw.map((r) => ({ key: r.date, status: r.status })),
          expected,
        ),
      },
      history: {
        first: firstDates[0] ?? null,
        totals: countStatuses(
          allAtt.map((r) => ({ key: dateKey(r.date), status: r.status })),
          allHw.map((r) => ({ key: dateKey(r.date), status: r.status })),
        ),
        sent: sentCount,
      },
    };
  }

  // Ангийн сүүлийн 2 БОДИТ хичээлтэй өдрийг тогтооно (beforeDate-ээс өмнөх).
  // Боломжтой бол /schedule/days (ClassSchedule + AcademicCalendarDay)-аас
  // тооцно; тухайн ангид хуваарь огт бүртгэгдээгүй бол өнгөрсөн ирцийн
  // бодит огноонуудаас (сүүлийн 2 ялгаатай огноо) буцаана.
  private async getLastClassDays(
    classroomId: string,
    beforeDate: Date,
  ): Promise<{ dates: string[]; source: 'schedule' | 'attendance-fallback' }> {
    const hasSchedule =
      (await this.prisma.classSchedule.count({ where: { classroomId } })) > 0;

    if (hasSchedule) {
      const to = addDateDays(beforeDate, -1);
      let found: string[] = [];
      for (
        let windowDays = CLASS_DAY_LOOKBACK_START;
        windowDays <= CLASS_DAY_LOOKBACK_MAX && found.length < 2;
        windowDays *= 3
      ) {
        const from = addDateDays(to, -(windowDays - 1));
        const days = await this.schedule.expandDays(
          dateKey(from),
          dateKey(to),
          classroomId,
        );
        found = days.filter((d) => d.classes.length > 0).map((d) => d.date);
      }
      if (found.length > 0) {
        return { dates: found.slice(-2), source: 'schedule' };
      }
      // Хуваарь бүртгэгдсэн ч тухайн хугацаанд нэг ч бодит хичээлтэй өдөр
      // олдоогүй бол (ж: бүх хуваарь шинэ) доорх fallback руу шилжинэ.
    }

    const rows = await this.prisma.attendance.findMany({
      where: { classroomId, date: { lt: beforeDate } },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 2,
    });
    return {
      dates: rows.map((r) => dateKey(r.date)).reverse(),
      source: 'attendance-fallback',
    };
  }

  async byClassAndDate(
    classroomId: string,
    date: string,
    userId: string,
    role: Role,
  ) {
    const parsedDate = this.parseDate(date);
    await this.assertClassAccess(classroomId, userId, role, {
      date: parsedDate,
    });

    // Тухайн өдөр идэвхтэй байсан бүх сурагчийг ирцтэй нь хамт буцаана —
    // ирц тэмдэглээгүй сурагч null статустай харагдана
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null, student: { archivedAt: null } },
      select: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { student: { firstName: 'asc' } },
    });
    const records = await this.prisma.attendance.findMany({
      where: { classroomId, date: parsedDate },
    });
    const byStudent = new Map(records.map((r) => [r.studentId, r]));

    // markedById → багшийн нэр (эзэн: "хэн гэдэг багш энэ ангийн ирцийг
    // тэмдэглэсэн" харагдах ёстой)
    const markerIds = [...new Set(records.map((r) => r.markedById))];
    const markers = markerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: markerIds } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : [];
    const markerById = new Map(markers.map((m) => [m.id, m]));

    // Сүүлийн 2 бодит хичээлтэй өдөр аль алинд нь ирц тэмдэглэгдээгүй
    // сурагчийг UI дээр саарал өнгөөр ялгахад ашиглана.
    const { dates: lastTwoClassDays } = await this.getLastClassDays(
      classroomId,
      parsedDate,
    );
    let unmarkedCountByStudent = new Map<string, number>();
    if (lastTwoClassDays.length > 0) {
      const priorRecords = await this.prisma.attendance.findMany({
        where: {
          classroomId,
          date: { in: lastTwoClassDays.map((d) => this.parseDate(d)) },
        },
        select: { studentId: true },
      });
      unmarkedCountByStudent = new Map();
      for (const r of priorRecords) {
        unmarkedCountByStudent.set(
          r.studentId,
          (unmarkedCountByStudent.get(r.studentId) ?? 0) + 1,
        );
      }
    }

    return enrollments.map((e) => {
      const record = byStudent.get(e.student.id);
      const markedCount = unmarkedCountByStudent.get(e.student.id) ?? 0;
      return {
        student: e.student,
        status: record?.status ?? null,
        note: record?.note ?? null,
        lateRange: record?.lateRange ?? null,
        markedBy: record ? (markerById.get(record.markedById) ?? null) : null,
        // Хэрэв харьцуулах хичээлтэй өдөр олдоогүй бол (шинэ анги) саарал
        // болгохгүй — зөвхөн сүүлийн 2 хичээлтэй өдөр ХОЁУЛАА тэмдэглэгдээгүй
        // байвал true.
        unmarkedLastTwoClassDays:
          lastTwoClassDays.length > 0 && markedCount === 0,
      };
    });
  }

  // 🎯 Сурагч тус бүрийн ХОЦРОЛТ/ТАСАЛСАН тоо тухайн хугацаанд — давтан
  // тасалдаг сурагчийг өнгөөр ялгахад ашиглана. SQL (groupBy) талд аггрегат
  // хийнэ — JS дотор бичлэг бүрийг тоолохгүй.
  async history(
    classroomId: string,
    from: string,
    to: string,
    userId: string,
    role: Role,
  ) {
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
    await this.assertClassAccess(classroomId, userId, role, {
      from: fromDate,
      to: toDate,
    });

    const [enrollments, counts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classroomId, leftAt: null, student: { archivedAt: null } },
        select: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { student: { firstName: 'asc' } },
      }),
      this.prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where: {
          classroomId,
          date: { gte: fromDate, lte: toDate },
          status: { in: [AttendanceStatus.LATE, AttendanceStatus.ABSENT] },
        },
        _count: { _all: true },
      }),
    ]);

    const countsByStudent = new Map<string, { late: number; absent: number }>();
    for (const c of counts) {
      const entry = countsByStudent.get(c.studentId) ?? {
        late: 0,
        absent: 0,
      };
      if (c.status === AttendanceStatus.LATE) entry.late = c._count._all;
      else if (c.status === AttendanceStatus.ABSENT)
        entry.absent = c._count._all;
      countsByStudent.set(c.studentId, entry);
    }

    return enrollments.map((e) => {
      const counted = countsByStudent.get(e.student.id) ?? {
        late: 0,
        absent: 0,
      };
      return {
        student: e.student,
        late: counted.late,
        absent: counted.absent,
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
          ...(TEACHER_SEES_ALL ? {} : { classroom: classTeacherWhere(userId) }),
        },
      });
      if (enrollment) return student;
    }
    throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
  }

  // Багш/Админ: тухайн сурагчийн ирцийн бүтэн түүх (бүх анги, огнооны
  // мужаар) — сурагчийн дэлгэрэнгүй явцын хуудсанд ашиглана.
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

    const records = await this.prisma.attendance.findMany({
      where: { studentId, date: { gte: fromDate, lte: toDate } },
      select: {
        date: true,
        status: true,
        note: true,
        lateRange: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
    return records;
  }

  myAttendance(studentId: string, from?: string, to?: string) {
    return this.prisma.attendance.findMany({
      where: {
        studentId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: this.parseDate(from) } : {}),
                ...(to ? { lte: this.parseDate(to) } : {}),
              },
            }
          : {}),
      },
      select: {
        date: true,
        status: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
