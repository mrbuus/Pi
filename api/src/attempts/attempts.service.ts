import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  AttemptSource,
  Role,
  SelfState,
} from '../generated/prisma/enums';
import {
  addDateDays,
  dateKey,
  daysBetweenDateOnly,
  parseDateOnly,
  todayUB,
} from '../common/date';
import { EVENING_MARKING_WINDOW_DAYS } from '../common/marking';
import { PrismaService } from '../prisma/prisma.service';
import { EveningReportDto } from './dto/evening-report.dto';

// Амжилт = алдаагүй бодсон эсвэл алдаад зассан; буудсан/алдсан = сул тал
function isSuccess(selfState: SelfState | null, autoCorrect: boolean | null) {
  if (selfState === SelfState.SOLVED_CLEAN) return true;
  if (selfState === SelfState.FIXED_AFTER_ERROR) return true;
  if (selfState === SelfState.GUESSED) return false;
  if (selfState === SelfState.FAILED) return false;
  return autoCorrect === true;
}

const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

export type AttentionSeverity = 'danger' | 'warning';

export interface AttentionFlag {
  type: 'ATTENDANCE_ABSENT' | 'ATTENDANCE_LATE' | 'MARKING_MISSING';
  severity: AttentionSeverity;
  title: string;
  detail: string;
}

function fullName(user: { firstName: string; lastName: string }) {
  return `${user.lastName} ${user.firstName}`.trim();
}

@Injectable()
export class AttemptsService {
  constructor(private prisma: PrismaService) {}

  private parseApiDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException('Огноо буруу байна');
    }
  }

  private assertEveningWindowOpen(occurredOn: Date) {
    const today = todayUB();
    const ageDays = daysBetweenDateOnly(today, occurredOn);
    if (ageDays < 0) {
      throw new BadRequestException(
        'Ирээдүйн өдрөөр оройн тэмдэглэгээ хийх боломжгүй',
      );
    }
    if (ageDays >= EVENING_MARKING_WINDOW_DAYS) {
      throw new BadRequestException(
        `Оройн тэмдэглэгээний ${EVENING_MARKING_WINDOW_DAYS} өдрийн хугацаа хаагдсан`,
      );
    }
  }

  private async assertClassReadAccess(
    classroomId: string,
    userId: string,
    role: Role,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, teacherId: true, archived: true },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн багш нар');
    }
    if (role === Role.TEACHER && classroom.teacherId !== userId) {
      throw new ForbiddenException('Энэ ангид хандах эрхгүй');
    }
  }

  // Оройн тэмдэглэгээ — утас хураадаг танхимын горимын гол урсгал (SPEC §9.1.1)
  async eveningReport(dto: EveningReportDto, studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
    });
    if (!enrollment) {
      throw new ForbiddenException('Та идэвхтэй ангид бүртгэлгүй байна');
    }

    const occurredOn = dto.date ? this.parseApiDate(dto.date) : todayUB();
    this.assertEveningWindowOpen(occurredOn);

    // Token-уудыг ID болгож тайлна
    const tokens = dto.entries
      .filter((e) => !e.problemId && e.token)
      .map((e) => e.token!);
    const byToken = new Map(
      (
        await this.prisma.problem.findMany({
          where: { token: { in: tokens } },
          select: { id: true, token: true },
        })
      ).map((p) => [p.token, p.id]),
    );

    const resolvedRows = dto.entries.map((e) => {
      const problemId = e.problemId ?? byToken.get(e.token ?? '');
      if (!problemId) {
        throw new NotFoundException(
          `Бодлого олдсонгүй: ${e.token ?? e.problemId ?? '?'}`,
        );
      }
      return {
        studentId,
        problemId,
        source: AttemptSource.EVENING_SELF_REPORT,
        occurredOn,
        selfState: e.selfState,
        timeSpentSec: e.timeSpentSec,
        classroomId: enrollment.classroomId,
      };
    });
    const rows = [...new Map(resolvedRows.map((r) => [r.problemId, r])).values()];

    await this.prisma.$transaction(async (tx) => {
      await tx.attempt.deleteMany({
        where: {
          studentId,
          classroomId: enrollment.classroomId,
          occurredOn,
          source: AttemptSource.EVENING_SELF_REPORT,
          problemId: { in: rows.map((r) => r.problemId) },
        },
      });
      await tx.attempt.createMany({ data: rows });
    });
    return { recorded: rows.length, date: occurredOn };
  }

  myAttempts(studentId: string, from?: string, to?: string) {
    return this.prisma.attempt.findMany({
      where: {
        studentId,
        ...(from || to
          ? {
              occurredOn: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        problem: {
          select: {
            token: true,
            chapter: { select: { title: true } },
          },
        },
      },
      orderBy: { occurredOn: 'desc' },
      take: 200,
    });
  }

  // «Миний сул талууд» — шошго бүрээр амжилтын хувь (адаптив профайлын 1-р үе, SPEC §9.3)
  async myStats(studentId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId },
      include: {
        problem: {
          select: {
            chapter: { select: { id: true, title: true } },
            tags: { include: { tag: true } },
          },
        },
      },
    });

    type Bucket = { attempts: number; success: number };
    const byTag = new Map<string, Bucket & { type: string }>();
    const byChapter = new Map<string, Bucket & { title: string }>();

    for (const a of attempts) {
      const ok = isSuccess(a.selfState, a.autoCorrect);
      for (const pt of a.problem.tags) {
        const key = pt.tag.name;
        const b = byTag.get(key) ?? {
          attempts: 0,
          success: 0,
          type: pt.tag.type,
        };
        b.attempts += 1;
        if (ok) b.success += 1;
        byTag.set(key, b);
      }
      const ch = a.problem.chapter;
      const c = byChapter.get(ch.id) ?? {
        attempts: 0,
        success: 0,
        title: ch.title,
      };
      c.attempts += 1;
      if (ok) c.success += 1;
      byChapter.set(ch.id, c);
    }

    const round = (x: number) => Math.round(x * 100);
    return {
      totalAttempts: attempts.length,
      // Сул талаас нь эхэлж эрэмбэлнэ — бэлтгэх дараалал нь энэ
      weakestTags: [...byTag.entries()]
        .map(([name, b]) => ({
          tag: name,
          type: b.type,
          attempts: b.attempts,
          successRate: round(b.success / b.attempts),
        }))
        .sort((a, b) => a.successRate - b.successRate),
      chapters: [...byChapter.entries()].map(([id, c]) => ({
        chapterId: id,
        title: c.title,
        attempts: c.attempts,
        successRate: round(c.success / c.attempts),
      })),
    };
  }

  // Анги бүрийн өдрийн дүгнэлт — шөнө бүр cron дуудна, гараар ч ажиллуулж болно
  async buildDailySummary(date: Date) {
    const classrooms = await this.prisma.classroom.findMany({
      where: { archived: false },
      include: {
        enrollments: { where: { leftAt: null }, select: { studentId: true } },
      },
    });

    let built = 0;
    for (const c of classrooms) {
      const studentIds = c.enrollments.map((e) => e.studentId);
      if (studentIds.length === 0) continue;

      const attempts = await this.prisma.attempt.findMany({
        where: { classroomId: c.id, occurredOn: date },
        include: {
          problem: { select: { chapter: { select: { title: true } } } },
        },
      });

      const marked = new Set(attempts.map((a) => a.studentId));
      const byState: Record<string, number> = {};
      const byChapter: Record<string, { total: number; failed: number }> = {};
      for (const a of attempts) {
        const s = a.selfState ?? 'AUTO';
        byState[s] = (byState[s] ?? 0) + 1;
        const ch = a.problem.chapter.title;
        byChapter[ch] = byChapter[ch] ?? { total: 0, failed: 0 };
        byChapter[ch].total += 1;
        if (!isSuccess(a.selfState, a.autoCorrect)) byChapter[ch].failed += 1;
      }

      await this.prisma.dailyClassSummary.upsert({
        where: { classroomId_date: { classroomId: c.id, date } },
        create: {
          classroomId: c.id,
          date,
          stats: {
            studentsTotal: studentIds.length,
            studentsMarked: marked.size,
            studentsNotMarked: studentIds.filter((id) => !marked.has(id)),
            totalAttempts: attempts.length,
            byState,
            byChapter,
          },
        },
        update: {
          stats: {
            studentsTotal: studentIds.length,
            studentsMarked: marked.size,
            studentsNotMarked: studentIds.filter((id) => !marked.has(id)),
            totalAttempts: attempts.length,
            byState,
            byChapter,
          },
        },
      });
      built += 1;
    }
    return { date, classroomsProcessed: built };
  }

  async getDailySummary(
    classroomId: string,
    date: string,
    userId: string,
    role: Role,
  ) {
    await this.assertClassReadAccess(classroomId, userId, role);
    const summary = await this.prisma.dailyClassSummary.findUnique({
      where: {
        classroomId_date: { classroomId, date: this.parseApiDate(date) },
      },
    });
    if (!summary) {
      throw new BadRequestException('Энэ өдрийн дүгнэлт хараахан бодогдоогүй');
    }
    return summary;
  }

  async getAttention(
    classroomId: string,
    date: string | undefined,
    userId: string,
    role: Role,
  ) {
    await this.assertClassReadAccess(classroomId, userId, role);
    const targetDate = date ? this.parseApiDate(date) : todayUB();
    const attendanceSince = addDateDays(targetDate, -6);
    const markingSince = addDateDays(
      targetDate,
      -(EVENING_MARKING_WINDOW_DAYS - 1),
    );

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    const students = enrollments
      .map((e) => e.student)
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'mn'));
    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) {
      return {
        date: dateKey(targetDate),
        windowDays: EVENING_MARKING_WINDOW_DAYS,
        rows: [],
        totals: { flagged: 0, students: 0 },
      };
    }

    const [attendances, sessions] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          classroomId,
          studentId: { in: studentIds },
          date: { gte: attendanceSince, lte: targetDate },
        },
        select: { studentId: true, date: true, status: true },
      }),
      this.prisma.classTestSession.findMany({
        where: {
          classroomId,
          date: { gte: markingSince, lte: targetDate },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const tests = await this.prisma.test.findMany({
      where: { id: { in: sessions.map((s) => s.testId) } },
      select: {
        id: true,
        title: true,
        problems: { select: { problemId: true } },
      },
    });
    const testById = new Map(tests.map((t) => [t.id, t]));
    const sessionTasks = sessions
      .map((session) => {
        const test = testById.get(session.testId);
        if (!test) return null;
        const excluded = new Set(session.excludedProblemIds);
        const problemIds = test.problems
          .map((p) => p.problemId)
          .filter((id) => !excluded.has(id));
        if (problemIds.length === 0) return null;
        return {
          date: session.date,
          title: test.title,
          problemIds,
        };
      })
      .filter((task): task is NonNullable<typeof task> => task !== null);

    const markingAttempts =
      sessionTasks.length === 0
        ? []
        : await this.prisma.attempt.findMany({
            where: {
              classroomId,
              studentId: { in: studentIds },
              source: AttemptSource.EVENING_SELF_REPORT,
              occurredOn: { in: sessionTasks.map((s) => s.date) },
              problemId: {
                in: [...new Set(sessionTasks.flatMap((s) => s.problemIds))],
              },
            },
            select: { studentId: true, occurredOn: true, problemId: true },
          });

    const marked = new Set(
      markingAttempts.map(
        (a) => `${a.studentId}|${dateKey(a.occurredOn)}|${a.problemId}`,
      ),
    );
    const sessionsDueForMarking = sessionTasks.filter(
      (session) => daysBetweenDateOnly(targetDate, session.date) > 0,
    );

    const attendanceByStudent = new Map<
      string,
      { absent: number; late: number; absentToday: boolean }
    >();
    for (const row of attendances) {
      const bucket = attendanceByStudent.get(row.studentId) ?? {
        absent: 0,
        late: 0,
        absentToday: false,
      };
      if (row.status === AttendanceStatus.ABSENT) {
        bucket.absent += 1;
        if (dateKey(row.date) === dateKey(targetDate)) {
          bucket.absentToday = true;
        }
      }
      if (row.status === AttendanceStatus.LATE) bucket.late += 1;
      attendanceByStudent.set(row.studentId, bucket);
    }

    const rows = students
      .map((student) => {
        const flags: AttentionFlag[] = [];
        const attendance = attendanceByStudent.get(student.id);
        if (attendance?.absentToday) {
          flags.push({
            type: 'ATTENDANCE_ABSENT',
            severity: 'danger',
            title: 'Өнөөдөр тасалсан',
            detail: 'Өнөөдрийн ирц дээр ABSENT гэж тэмдэглэгдсэн',
          });
        } else if ((attendance?.absent ?? 0) >= 2) {
          flags.push({
            type: 'ATTENDANCE_ABSENT',
            severity: 'warning',
            title: 'Таслалт давтагдсан',
            detail: `Сүүлийн 7 хоногт ${attendance?.absent ?? 0} удаа тасалсан`,
          });
        }
        if ((attendance?.late ?? 0) >= 2) {
          flags.push({
            type: 'ATTENDANCE_LATE',
            severity: 'warning',
            title: 'Хоцролт давтагдсан',
            detail: `Сүүлийн 7 хоногт ${attendance?.late ?? 0} удаа хоцорсон`,
          });
        }

        const missingSessions = sessionsDueForMarking
          .map((session) => {
            const missing = session.problemIds.filter(
              (problemId) =>
                !marked.has(
                  `${student.id}|${dateKey(session.date)}|${problemId}`,
                ),
            ).length;
            return { ...session, missing };
          })
          .filter((session) => session.missing > 0);
        if (missingSessions.length > 0) {
          const missingProblems = missingSessions.reduce(
            (sum, session) => sum + session.missing,
            0,
          );
          flags.push({
            type: 'MARKING_MISSING',
            severity: missingSessions.length >= 2 ? 'danger' : 'warning',
            title: 'Оройн тэмдэглэгээ дутуу',
            detail: `${missingSessions.length} тестийн ${missingProblems} бодлого тэмдэглэгдээгүй`,
          });
        }

        if (flags.length === 0) return null;
        return {
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            name: fullName(student),
          },
          flags,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        const rank: Record<AttentionSeverity, number> = {
          danger: 0,
          warning: 1,
        };
        return (
          rank[a.flags[0].severity] - rank[b.flags[0].severity] ||
          a.student.name.localeCompare(b.student.name, 'mn')
        );
      });

    return {
      date: dateKey(targetDate),
      windowDays: EVENING_MARKING_WINDOW_DAYS,
      rows,
      totals: {
        flagged: rows.length,
        students: studentIds.length,
      },
    };
  }
}
