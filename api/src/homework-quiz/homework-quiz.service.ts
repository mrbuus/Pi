import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { assertMarkAccess } from '../attendance/marking-access';
import { monthRange } from '../attendance/board-logic';
import { AuditService } from '../audit/audit.service';
import { dateKey, parseDateOnly } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { shortName } from '../revisions/revision-snapshot';
import { QUIZ_MAX_PROBLEMS, toHundredths } from './quiz-score';

export interface QuizView {
  date: string;
  quiz: {
    id: string;
    problemCount: number;
    updatedAt: Date;
    updatedBy: string;
  } | null;
  scores: { studentId: string; score: number; updatedAt: Date }[];
}

/**
 * Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08). Нэг анги × нэг өдөр = нэг
 * шалгалт (бодлогын тоо), сурагч бүрийн оноо (бүхэл 0..тоо). Эрх = самбарт даалгавар тэмдэглэх
 * эрх (assertMarkAccess). Юу ч хатуу устгахгүй — «устгах/цэвэрлэх» нь deletedAt, аудиттай.
 */
@Injectable()
export class HomeworkQuizService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private parseDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException('Огнооны формат буруу байна (YYYY-MM-DD)');
    }
  }

  private async view(classroomId: string, date: Date): Promise<QuizView> {
    const quiz = await this.prisma.homeworkQuiz.findUnique({
      where: { classroomId_date: { classroomId, date } },
      include: {
        scores: {
          where: { deletedAt: null },
          select: { studentId: true, score: true, updatedAt: true },
        },
      },
    });
    if (!quiz || quiz.deletedAt) return { date: dateKey(date), quiz: null, scores: [] };
    const by = await this.prisma.user.findUnique({
      where: { id: quiz.updatedById },
      select: { firstName: true, lastName: true, role: true },
    });
    return {
      date: dateKey(date),
      quiz: {
        id: quiz.id,
        problemCount: quiz.problemCount,
        updatedAt: quiz.updatedAt,
        updatedBy: shortName(by),
      },
      scores: quiz.scores.map((s) => ({ ...s, score: Number(s.score) })),
    };
  }

  async get(classroomId: string, dateStr: string, userId: string, role: Role) {
    const date = this.parseDate(dateStr);
    await assertMarkAccess(this.prisma, classroomId, userId, role, { date });
    return this.view(classroomId, date);
  }

  /**
   * Шалгалт эхлүүлэх эсвэл бодлогын тоог засах. Устгасан шалгалтыг дахин эхлүүлбэл ижил мөр
   * сэргэнэ, хуучин оноо нуугдсан хэвээр (хоосноос эхэлнэ). Одоогийн онооноос бага тоо болгохгүй.
   */
  async set(classroomId: string, dto: { date: string; problemCount: number }, userId: string, role: Role) {
    const date = this.parseDate(dto.date);
    await assertMarkAccess(this.prisma, classroomId, userId, role, { date });
    const n = dto.problemCount;
    if (!Number.isInteger(n) || n < 1 || n > QUIZ_MAX_PROBLEMS) {
      throw new BadRequestException(`Бодлогын тоо 1-ээс ${QUIZ_MAX_PROBLEMS} хүртэл бүхэл тоо байна`);
    }
    const where = { classroomId_date: { classroomId, date } };
    const before = await this.prisma.homeworkQuiz.findUnique({ where });
    if (before && !before.deletedAt && n < before.problemCount) {
      const over = await this.prisma.homeworkQuizScore.count({
        where: { quizId: before.id, deletedAt: null, score: { gt: n } },
      });
      if (over > 0) {
        throw new BadRequestException(
          `${over} сурагчийн оноо ${n} бодлогоос давж байна. Эхлээд оноог нь засна уу`,
        );
      }
    }
    const row = await this.prisma.homeworkQuiz.upsert({
      where,
      create: { classroomId, date, problemCount: n, createdById: userId, updatedById: userId },
      update: { problemCount: n, updatedById: userId, deletedAt: null },
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: !before ? 'CREATE' : before.deletedAt ? 'RESTORE' : 'UPDATE',
      entity: 'HomeworkQuiz',
      entityId: row.id,
      before: before ?? null,
      after: row,
    });
    return this.view(classroomId, date);
  }

  /** Шалгалтыг нуух (зөөлөн): шалгалт ба оноонууд deletedAt-тай үлдэнэ */
  async remove(classroomId: string, dateStr: string, userId: string, role: Role) {
    const date = this.parseDate(dateStr);
    await assertMarkAccess(this.prisma, classroomId, userId, role, { date });
    const before = await this.prisma.homeworkQuiz.findUnique({
      where: { classroomId_date: { classroomId, date } },
    });
    if (!before || before.deletedAt) return this.view(classroomId, date);
    const now = new Date();
    const [hidden, row] = await this.prisma.$transaction([
      this.prisma.homeworkQuizScore.updateMany({
        where: { quizId: before.id, deletedAt: null },
        data: { deletedAt: now, updatedById: userId },
      }),
      this.prisma.homeworkQuiz.update({
        where: { id: before.id },
        data: { deletedAt: now, updatedById: userId },
      }),
    ]);
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'DELETE',
      entity: 'HomeworkQuiz',
      entityId: row.id,
      before,
      after: row,
      reason: `${hidden.count} сурагчийн оноо хамт нуугдсан`,
    });
    return this.view(classroomId, date);
  }

  /** Нэг сурагчийн оноо: бүхэл 0..бодлогын тоо; null = цэвэрлэх (deletedAt) */
  async setScore(
    classroomId: string,
    studentId: string,
    dto: { date: string; score?: number | null },
    userId: string,
    role: Role,
  ) {
    const date = this.parseDate(dto.date);
    await assertMarkAccess(this.prisma, classroomId, userId, role, { date });
    if (dto.score === undefined) throw new BadRequestException('Оноо дутуу байна');
    const quiz = await this.prisma.homeworkQuiz.findUnique({
      where: { classroomId_date: { classroomId, date } },
    });
    if (!quiz || quiz.deletedAt) {
      throw new NotFoundException('Энэ өдрийн шалгалт алга. Эхлээд бодлогын тоог оруулна уу');
    }
    const score = dto.score;
    // Бутархай 2 хүртэл орон (7.5); харьцуулалт зууны нэгээр бүхэл тоогоор
    if (
      score !== null &&
      (typeof score !== 'number' ||
        !Number.isFinite(score) ||
        Math.abs(score * 100 - toHundredths(score)) > 1e-6 ||
        score < 0 ||
        toHundredths(score) > quiz.problemCount * 100)
    ) {
      throw new BadRequestException(
        `Оноо 0-ээс ${quiz.problemCount} хүртэл, бутархай нь 2 хүртэл оронтой байна`,
      );
    }
    const enrolled = await this.prisma.enrollment.findFirst({
      where: { classroomId, studentId, leftAt: null, student: { archivedAt: null } },
      select: { id: true },
    });
    if (!enrolled) throw new NotFoundException('Сурагч энэ ангид алга байна');

    const where = { quizId_studentId: { quizId: quiz.id, studentId } };
    const before = await this.prisma.homeworkQuizScore.findUnique({ where });
    const active = before && !before.deletedAt ? before : null;
    if (score === null) {
      if (!active) return { studentId, score: null, updatedAt: null };
      const row = await this.prisma.homeworkQuizScore.update({
        where: { id: active.id },
        data: { deletedAt: new Date(), updatedById: userId },
      });
      await this.audit.record({
        actorId: userId,
        actorRole: role,
        action: 'DELETE',
        entity: 'HomeworkQuizScore',
        entityId: row.id,
        before: active,
        after: row,
      });
      return { studentId, score: null, updatedAt: row.updatedAt };
    }
    const exact = (toHundredths(score) / 100).toFixed(2); // Decimal-д мөрөөр — хөвөгч алдаагүй
    if (active && toHundredths(Number(active.score)) === toHundredths(score)) {
      return { studentId, score: Number(active.score), updatedAt: active.updatedAt };
    }
    const row = await this.prisma.homeworkQuizScore.upsert({
      where,
      create: { quizId: quiz.id, studentId, score: exact, updatedById: userId },
      update: { score: exact, updatedById: userId, deletedAt: null },
    });
    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: !before ? 'CREATE' : before.deletedAt ? 'RESTORE' : 'UPDATE',
      entity: 'HomeworkQuizScore',
      entityId: row.id,
      before: before ?? null,
      after: row,
    });
    return { studentId, score: Number(row.score), updatedAt: row.updatedAt };
  }

  /** Сурагчийн drawer: энэ ангийн тухайн сарын шалгалтын оноо (өдөр бүр) */
  async studentMonth(classroomId: string, studentId: string, month: string, userId: string, role: Role) {
    const range = monthRange(month);
    if (!range) throw new BadRequestException('Сарын формат буруу байна (YYYY-MM)');
    const from = parseDateOnly(range.from);
    const to = parseDateOnly(range.to);
    await assertMarkAccess(this.prisma, classroomId, userId, role, { from, to });
    const rows = await this.prisma.homeworkQuizScore.findMany({
      where: {
        studentId,
        deletedAt: null,
        quiz: { classroomId, deletedAt: null, date: { gte: from, lte: to } },
      },
      select: { score: true, quiz: { select: { date: true, problemCount: true } } },
    });
    return rows
      .map((r) => ({ date: dateKey(r.quiz.date), score: Number(r.score), problemCount: r.quiz.problemCount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
