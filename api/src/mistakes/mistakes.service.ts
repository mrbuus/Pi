import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '../generated/prisma/client';
import { collectPassScope, hasActiveClassroomEnrollment } from '../common/access';
import { choiceModeOf, gradeAnswer, GradableProblem, hasKnownAnswer } from '../tests/grading';
import { PrismaService } from '../prisma/prisma.service';
import { MistakeQueryDto, UpdateMistakeDto } from './dto/mistake.dto';
import { nextMistakeRetryState } from './mistake-scheduling';

const ENTRY_INCLUDE = {
  problem: {
    include: {
      chapter: { include: { topic: true } },
      choiceOptions: { orderBy: { order: 'asc' } },
      formulas: { include: { formula: { select: { slug: true, name: true, latex: true } } } },
      analysis: { select: { status: true, solutionOutline: true } },
    },
  },
} satisfies Prisma.MistakeEntryInclude;

type EntryWithProblem = Prisma.MistakeEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

function gradable(entry: EntryWithProblem): GradableProblem {
  return {
    id: entry.problem.id,
    format: entry.problem.format,
    choices: entry.problem.choices,
    correctAnswer: entry.problem.correctAnswer,
    choiceOptions: entry.problem.choiceOptions,
  };
}

function safeAnswerFields(problem: GradableProblem): string[] | undefined {
  const answer = problem.correctAnswer;
  if (!hasKnownAnswer(problem) || !answer || typeof answer !== 'object' || Array.isArray(answer)) return undefined;
  const fields = Object.keys(answer as Record<string, unknown>).filter((key) =>
    key !== 'manualReview' && key !== 'reason' && /^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(key),
  );
  return fields.length > 0 && fields.length <= 20 ? fields : undefined;
}

function publicCorrectAnswer(problem: GradableProblem): unknown {
  if (choiceModeOf(problem) === 'TEXT') {
    const options = [...(problem.choiceOptions ?? [])].sort((a, b) => a.order - b.order);
    const correctOption = options.find((option) => option.isCorrect);
    if (correctOption) return correctOption.text;
    if (typeof problem.correctAnswer === 'string' && Array.isArray(problem.choices)) {
      const letter = problem.correctAnswer.trim().toUpperCase();
      const index = letter.charCodeAt(0) - 65;
      return problem.choices[index] ?? problem.correctAnswer;
    }
  }
  return problem.correctAnswer;
}

function parseAnswerForDisplay(value: Prisma.JsonValue): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function serializeEntry(entry: EntryWithProblem) {
  const problem: GradableProblem = gradable(entry);
  const revealAnswer = entry.status === 'MASTERED' || (
    entry.retryCount > 0 && (
      entry.sourceOccurredAt == null ||
      (entry.lastRetryAt != null && entry.lastRetryAt >= entry.sourceOccurredAt)
    )
  );
  return {
    id: entry.id,
    problem: {
      id: entry.problem.id,
      statementText: entry.problem.statementText,
      choices: entry.problem.choiceOptions.length > 0
        ? entry.problem.choiceOptions.map((choice) => choice.text)
        : entry.problem.choices,
      choiceMode: choiceModeOf(problem),
      answerFields: safeAnswerFields(problem),
      format: entry.problem.format,
      imageKey: entry.problem.imageKey,
    },
    givenAnswer: parseAnswerForDisplay(entry.givenAnswer),
    status: entry.status,
    retryCount: entry.retryCount,
    reason: entry.reason,
    note: entry.note,
    testTitle: entry.testTitle,
    createdAt: entry.createdAt,
    nextRetryAt: entry.nextRetryAt,
    formulas: entry.problem.formulas
      .filter((link) => link.formula.slug !== null)
      .map((link) => ({ slug: link.formula.slug, title: link.formula.name, latex: link.formula.latex })),
    ...(revealAnswer
      ? { correctAnswer: publicCorrectAnswer(problem) }
      : {}),
    ...(entry.retryCount > 0 && entry.problem.analysis?.status === 'VERIFIED'
      ? { solutionOutline: entry.problem.analysis.solutionOutline }
      : {}),
  };
}

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  private async accessibleChapterWhere(userId: string): Promise<Prisma.ChapterWhereInput> {
    const contentNotDeleted: Prisma.ChapterWhereInput = {
      deletedAt: null,
      OR: [{ bookId: null }, { book: { is: { deletedAt: null } } }],
    };
    if (await hasActiveClassroomEnrollment(this.prisma, userId, Role.STUDENT)) {
      return contentNotDeleted;
    }

    const scope = await collectPassScope(this.prisma, userId);
    if (scope.all) return contentNotDeleted;

    const purchasedBooks = await this.prisma.purchase.findMany({
      where: {
        userId,
        grantedAt: { not: null },
        productItem: { kind: 'BOOK', includesVideo: true },
      },
      select: { productItem: { select: { refId: true } } },
    });
    const bookIds = [...new Set([
      ...scope.bookIds,
      ...purchasedBooks.map((purchase) => purchase.productItem.refId),
    ])];
    return {
      deletedAt: null,
      AND: [
        { OR: [{ bookId: null }, { book: { is: { deletedAt: null } } }] },
        {
          OR: [
            { freePreview: true },
            ...(scope.chapterIds.length > 0 ? [{ id: { in: scope.chapterIds } }] : []),
            ...(bookIds.length > 0 ? [{ bookId: { in: bookIds } }] : []),
          ],
        },
      ],
    };
  }

  async list(userId: string, query: MistakeQueryDto) {
    const chapterAccess = await this.accessibleChapterWhere(userId);
    const accessibleProblem: Prisma.MistakeEntryWhereInput['problem'] = {
      deletedAt: null,
      chapter: {
        is: {
          ...chapterAccess,
          ...(query.topic
            ? { topic: { is: { name: { contains: query.topic, mode: 'insensitive' } } } }
            : {}),
        },
      },
    };
    const activeProblem: Prisma.MistakeEntryWhereInput = {
      userId,
      problem: accessibleProblem,
    };
    const where: Prisma.MistakeEntryWhereInput = {
      ...activeProblem,
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
    };

    const [statusCounts, topicCounts, entries] = await Promise.all([
      this.prisma.mistakeEntry.groupBy({ by: ['status'], where: activeProblem, _count: true }),
      this.prisma.$queryRaw<{ topic: string; count: number }[]>(Prisma.sql`
        SELECT COALESCE(topic."name", 'Бусад') AS topic, COUNT(*)::int AS count
        FROM "MistakeEntry" AS mistake
        JOIN "Problem" AS problem ON problem."id" = mistake."problemId"
        LEFT JOIN "Chapter" AS chapter ON chapter."id" = problem."chapterId"
        LEFT JOIN "Topic" AS topic ON topic."id" = chapter."topicId"
        WHERE mistake."userId" = ${userId} AND problem."deletedAt" IS NULL
        GROUP BY topic."name"
        ORDER BY count DESC, topic ASC
      `),
      this.prisma.mistakeEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        take: 201,
      }),
    ]);

    const counts = { NEW: 0, RETRYING: 0, MASTERED: 0 };
    for (const row of statusCounts) {
      if (row.status in counts) counts[row.status as keyof typeof counts] = row._count;
    }
    const hasMore = entries.length > 200;
    const page = entries.slice(0, 200);
    return {
      counts,
      byTopic: topicCounts,
      items: page.map((entry) => serializeEntry(entry as EntryWithProblem)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async update(userId: string, id: string, dto: UpdateMistakeDto) {
    const owned = await this.prisma.mistakeEntry.findFirst({
      where: { id, userId, problem: { deletedAt: null } },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Алдаа олдсонгүй');
    return this.prisma.mistakeEntry.update({
      where: { id },
      data: {
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
      select: { id: true, reason: true, note: true },
    });
  }

  async retry(userId: string, id: string, answer: unknown) {
    if (answer === undefined || answer === null || answer === '') {
      throw new BadRequestException('Хариултаа оруулна уу');
    }
    const now = new Date();
    const chapterAccess = await this.accessibleChapterWhere(userId);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.mistakeEntry.findFirst({
        where: { id, userId, problem: { deletedAt: null, chapter: { is: chapterAccess } } },
        include: { problem: { include: {
          choiceOptions: { orderBy: { order: 'asc' } },
          analysis: { select: { status: true, solutionOutline: true } },
        } } },
      });
      if (!row) throw new NotFoundException('Алдаа олдсонгүй');
      const gradableProblem: GradableProblem = {
        id: row.problem.id,
        format: row.problem.format,
        choices: row.problem.choices,
        correctAnswer: row.problem.correctAnswer,
        choiceOptions: row.problem.choiceOptions,
      };
      if (!hasKnownAnswer(gradableProblem)) {
        throw new BadRequestException('Энэ бодлогын хариу баталгаажаагүй байна');
      }

      const grade = gradeAnswer(gradableProblem, answer);
      const state = nextMistakeRetryState({
        status: row.status as 'NEW' | 'RETRYING' | 'MASTERED',
        retryCount: row.retryCount,
        consecutiveCorrect: row.consecutiveCorrect,
        lastCorrectAt: row.lastCorrectAt,
      }, grade.correct, now);
      const changed = await tx.mistakeEntry.updateMany({
        where: {
          id,
          userId,
          retryCount: row.retryCount,
          status: row.status,
          sourceRefId: row.sourceRefId,
          sourceOccurredAt: row.sourceOccurredAt,
        },
        data: state,
      });
      if (changed.count !== 1) throw new ConflictException('Дахин оролдоно уу');

      return {
        correct: grade.correct,
        correctAnswer: publicCorrectAnswer(gradableProblem),
        status: state.status,
        retryCount: state.retryCount,
        nextRetryAt: state.nextRetryAt,
        solutionOutline: row.problem.analysis?.status === 'VERIFIED'
          ? row.problem.analysis.solutionOutline
          : null,
      };
    });
  }

  async today(userId: string) {
    const now = new Date();
    const chapterAccess = await this.accessibleChapterWhere(userId);
    const due = await this.prisma.mistakeEntry.findMany({
      where: {
        userId,
        status: { in: ['NEW', 'RETRYING'] },
        problem: { deletedAt: null, chapter: { is: chapterAccess } },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ nextRetryAt: 'asc' }, { updatedAt: 'asc' }],
      take: 5,
    });
    return due.map((entry) => serializeEntry(entry as EntryWithProblem));
  }

  async student(studentId: string, actor: { userId: string; role: Role }) {
    if (actor.role === Role.TEACHER) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null, classroom: { teacherId: actor.userId } },
      });
      if (!enrollment) throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
    } else if (actor.role === Role.PARENT) {
      const link = await this.prisma.parentLink.findFirst({
        where: { parentId: actor.userId, studentId, verifiedAt: { not: null } },
      });
      if (!link) throw new ForbiddenException('Баталгаажсан холбоо олдсонгүй');
    }

    const [statusCounts, topics] = await Promise.all([
      this.prisma.mistakeEntry.groupBy({
        by: ['status'], where: { userId: studentId, problem: { deletedAt: null } }, _count: true,
      }),
      this.prisma.$queryRaw<{ topic: string; count: number }[]>(Prisma.sql`
        SELECT COALESCE(topic."name", 'Бусад') AS topic, COUNT(*)::int AS count
        FROM "MistakeEntry" AS mistake
        JOIN "Problem" AS problem ON problem."id" = mistake."problemId"
        LEFT JOIN "Chapter" AS chapter ON chapter."id" = problem."chapterId"
        LEFT JOIN "Topic" AS topic ON topic."id" = chapter."topicId"
        WHERE mistake."userId" = ${studentId} AND problem."deletedAt" IS NULL
          AND mistake."status" <> 'MASTERED'
        GROUP BY topic."name"
        ORDER BY count DESC, topic ASC
      `),
    ]);
    const counts = { NEW: 0, RETRYING: 0, MASTERED: 0 };
    for (const row of statusCounts) {
      if (row.status in counts) counts[row.status as keyof typeof counts] = row._count;
    }
    return { counts, byTopic: topics, weakestTopics: topics.slice(0, 5) };
  }
}
