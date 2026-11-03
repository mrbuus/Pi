import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { choiceModeOf, gradeAnswer, GradableProblem, hasKnownAnswer } from '../tests/grading';
import { MistakesService, publicCorrectAnswer, safeAnswerFields } from './mistakes.service';
import {
  INITIAL_EASE,
  isReviewDue,
  nextProblemReview,
  ProblemReviewSource,
  wrongEventSchedule,
} from './problem-review-scheduling';

const DUE_LIMIT_DEFAULT = 10;
const DUE_LIMIT_MAX = 30;

const REVIEW_INCLUDE = {
  problem: {
    include: {
      choiceOptions: { orderBy: { order: 'asc' } },
      formulas: { include: { formula: { select: { slug: true, name: true, latex: true } } } },
      analysis: { select: { status: true, solutionOutline: true } },
    },
  },
} satisfies Prisma.ProblemReviewInclude;

type ReviewWithProblem = Prisma.ProblemReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

function gradableOf(row: ReviewWithProblem): GradableProblem {
  return {
    id: row.problem.id,
    format: row.problem.format,
    choices: row.problem.choices,
    correctAnswer: row.problem.correctAnswer,
    choiceOptions: row.problem.choiceOptions,
  };
}

/** `/mistakes/today`-ийн `problem`-той ижил хэлбэр — хариуны түлхүүр, бодолт ХАРИУЛАХААС ӨМНӨ ирэхгүй. */
function serializeDue(row: ReviewWithProblem) {
  const g = gradableOf(row);
  return {
    id: row.id,
    problem: {
      id: row.problem.id,
      statementText: row.problem.statementText,
      choices:
        row.problem.choiceOptions.length > 0 ? row.problem.choiceOptions.map((c) => c.text) : row.problem.choices,
      choiceMode: choiceModeOf(g),
      answerFields: safeAnswerFields(g),
      format: row.problem.format,
      imageKey: row.problem.imageKey,
    },
    dueAt: row.dueAt,
    intervalDays: row.intervalDays,
    reps: row.reps,
    lapses: row.lapses,
    lastResult: row.lastResult,
    source: row.source,
    formulas: row.problem.formulas
      .filter((link) => link.formula.slug !== null)
      .map((link) => ({ slug: link.formula.slug, title: link.formula.name, latex: link.formula.latex })),
  };
}

export interface WrongEvent {
  studentId: string;
  problemId: string;
  source: ProblemReviewSource;
  occurredAt: Date;
}

@Injectable()
export class ProblemReviewService implements OnModuleDestroy {
  private readonly logger = new Logger(ProblemReviewService.name);
  private readonly background = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mistakes: MistakesService,
  ) {}

  /**
   * Буруу бодсон үйл явдлыг бүртгэнэ (маргааш давтана). Идэмпотент: [occurredAt] нь сүүлийн
   * үйл явдлаас хуучин/тэнцүү бол юу ч өөрчлөхгүй — давтан дуудалт, хоцорсон цуглуулга хуваарийг тэглэхгүй.
   * Алдаа шиддэггүй: дүгнэлтийн үр дүнг хэзээ ч өөрчлөхгүй, унагаахгүй.
   */
  async recordWrong(event: WrongEvent): Promise<boolean> {
    if (!Number.isFinite(event.occurredAt.getTime())) return false;
    try {
      const existing = await this.prisma.problemReview.findUnique({
        where: { studentId_problemId: { studentId: event.studentId, problemId: event.problemId } },
        select: { intervalDays: true, ease: true, reps: true, lapses: true, lastEventAt: true },
      });
      if (existing && existing.lastEventAt.getTime() >= event.occurredAt.getTime()) return true;
      const next = wrongEventSchedule(existing, event.occurredAt);
      if (existing) {
        await this.prisma.problemReview.updateMany({
          where: {
            studentId: event.studentId,
            problemId: event.problemId,
            lastEventAt: { lt: event.occurredAt },
          },
          data: { ...next, source: event.source, lastEventAt: event.occurredAt },
        });
        return true;
      }
      await this.prisma.problemReview.createMany({
        data: [
          {
            studentId: event.studentId,
            problemId: event.problemId,
            ...next,
            source: event.source,
            lastEventAt: event.occurredAt,
          },
        ],
        skipDuplicates: true,
      });
      return true;
    } catch (error) {
      this.logger.error(
        'Problem review scheduling failed; grading result is unaffected',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /** Хүсэлтийн замаас гадуур (илгээлтийн хариуг саатуулахгүй), дараалсан. */
  recordWrongInBackground(events: WrongEvent[]): void {
    if (events.length === 0) return;
    const run = (async () => {
      for (const event of events) await this.recordWrong(event);
    })();
    this.background.add(run);
    void run.finally(() => this.background.delete(run));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.background]);
  }

  private dueWhere(studentId: string, now: Date, chapterAccess: Prisma.ChapterWhereInput) {
    return {
      studentId,
      dueAt: { lte: now },
      problem: { deletedAt: null, chapter: { is: chapterAccess } },
    } satisfies Prisma.ProblemReviewWhereInput;
  }

  async due(studentId: string, limitRaw?: string) {
    const limit = parseLimit(limitRaw);
    const now = new Date();
    const chapterAccess = await this.mistakes.accessibleChapterWhere(studentId);
    const where = this.dueWhere(studentId, now, chapterAccess);
    const [total, rows] = await Promise.all([
      this.prisma.problemReview.count({ where }),
      this.prisma.problemReview.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
        take: limit * 2,
      }),
    ]);
    // Хариуны түлхүүргүй бодлогыг дүгнэх боломжгүй тул харуулахгүй
    const gradable = rows.filter((row) => hasKnownAnswer(gradableOf(row)));
    return {
      total: Math.max(0, total - (rows.length - gradable.length)),
      items: gradable.slice(0, limit).map(serializeDue),
    };
  }

  async answer(studentId: string, id: string, answer: unknown) {
    if (answer === undefined || answer === null || answer === '') {
      throw new BadRequestException('Хариултаа оруулна уу');
    }
    const now = new Date();
    const chapterAccess = await this.mistakes.accessibleChapterWhere(studentId);
    const row = await this.prisma.problemReview.findFirst({
      where: { id, studentId, problem: { deletedAt: null, chapter: { is: chapterAccess } } },
      include: REVIEW_INCLUDE,
    });
    if (!row) throw new NotFoundException('Давтах бодлого олдсонгүй');
    const g = gradableOf(row);
    if (!hasKnownAnswer(g)) throw new BadRequestException('Энэ бодлогын хариу баталгаажаагүй байна');

    const grade = gradeAnswer(g, answer);
    const due = isReviewDue(row.dueAt, now);
    let schedule = {
      dueAt: row.dueAt,
      intervalDays: row.intervalDays,
      reps: row.reps,
      lapses: row.lapses,
    };
    // Зөвхөн хугацаа нь болсон бодлогын хуваарийг өөрчилнө — давхар товшилт интервалыг хоёр сунгахгүй
    if (due) {
      const next = nextProblemReview(
        { intervalDays: row.intervalDays, ease: row.ease ?? INITIAL_EASE, reps: row.reps, lapses: row.lapses },
        grade.correct,
        now,
      );
      const changed = await this.prisma.problemReview.updateMany({
        where: { id: row.id, studentId, dueAt: row.dueAt, reps: row.reps, lapses: row.lapses },
        data: { ...next, lastEventAt: now },
      });
      if (changed.count !== 1) throw new ConflictException('Дахин оролдоно уу');
      schedule = { dueAt: next.dueAt, intervalDays: next.intervalDays, reps: next.reps, lapses: next.lapses };
    }
    return {
      correct: grade.correct,
      correctAnswer: publicCorrectAnswer(g),
      solutionOutline: row.problem.analysis?.status === 'VERIFIED' ? row.problem.analysis.solutionOutline : null,
      scheduled: due,
      ...schedule,
    };
  }
}

function parseLimit(raw?: string): number {
  if (raw === undefined || raw === '') return DUE_LIMIT_DEFAULT;
  if (!/^\d{1,3}$/.test(raw)) throw new BadRequestException('Тоо 1–30 байна');
  const n = Number(raw);
  if (n < 1 || n > DUE_LIMIT_MAX) throw new BadRequestException('Тоо 1–30 байна');
  return n;
}
