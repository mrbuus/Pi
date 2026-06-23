import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttemptSource, Role, SelfState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { EveningReportDto } from './dto/evening-report.dto';

function todayUB(): Date {
  return new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(
      new Date(),
    ),
  );
}

// Амжилт = алдаагүй бодсон эсвэл алдаад зассан; буудсан/алдсан = сул тал
function isSuccess(selfState: SelfState | null, autoCorrect: boolean | null) {
  if (selfState === SelfState.SOLVED_CLEAN) return true;
  if (selfState === SelfState.FIXED_AFTER_ERROR) return true;
  if (selfState === SelfState.GUESSED) return false;
  if (selfState === SelfState.FAILED) return false;
  return autoCorrect === true;
}

@Injectable()
export class AttemptsService {
  constructor(private prisma: PrismaService) {}

  // Оройн тэмдэглэгээ — утас хураадаг танхимын горимын гол урсгал (SPEC §9.1.1)
  async eveningReport(dto: EveningReportDto, studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
    });
    if (!enrollment) {
      throw new ForbiddenException('Та идэвхтэй ангид бүртгэлгүй байна');
    }

    const occurredOn = dto.date ? new Date(dto.date) : todayUB();

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

    const rows = dto.entries.map((e) => {
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

    await this.prisma.attempt.createMany({ data: rows });
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
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');
    if (role === Role.TEACHER && classroom.teacherId !== userId) {
      throw new ForbiddenException('Энэ ангид хандах эрхгүй');
    }
    const teacherRoles: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];
    if (!teacherRoles.includes(role)) {
      throw new ForbiddenException('Зөвхөн багш нар');
    }
    const summary = await this.prisma.dailyClassSummary.findUnique({
      where: {
        classroomId_date: { classroomId, date: new Date(date) },
      },
    });
    if (!summary) {
      throw new BadRequestException('Энэ өдрийн дүгнэлт хараахан бодогдоогүй');
    }
    return summary;
  }
}
