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
import { studentReviewPolicy } from '../exams/exam-analytics';
import { studentReviewLevel } from '../exams/exam-data';
import { reservedAnywhere } from '../homework-practice/answer-gates';
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
  /** Тест эсвэл гэрийн даалгаврын тест — хариу нээх хаалганд */
  sourceTestId?: string | null;
  /** Attempt / HomeworkAttempt / давтлагын ID */
  sourceRefId?: string | null;
}

/**
 * Хариу, бодолт нээх эсэх. `locked` бол давтлагад огт гаргахгүй, дүгнэхгүй (зөв/буруу ч зөвлөгөө болно).
 * Дүрэм нь одоо байгаа хаалгууд: `reservedAnywhere` (ангид бодогдох тест), шалгалтын
 * `studentReviewLevel` + `studentReviewPolicy` (тест дахин ашиглагдах тул зөв хариу нээхгүй, 1000 бодлого
 * зөвхөн FULL түвшинд), гэрийн даалгавар илгээсний дараах нээлт (тухайн даалгаврын тестэд л).
 */
export interface RevealGate {
  locked: boolean;
  answer: boolean;
  solution: boolean;
}

const LOCKED: RevealGate = { locked: true, answer: false, solution: false };

type GateCache = Map<string, Promise<unknown>>;

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
          data: {
            ...next,
            source: event.source,
            sourceTestId: event.sourceTestId ?? null,
            sourceRefId: event.sourceRefId ?? null,
            lastEventAt: event.occurredAt,
          },
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
            sourceTestId: event.sourceTestId ?? null,
            sourceRefId: event.sourceRefId ?? null,
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
        take: limit * 3,
      }),
    ]);
    // Хариуны түлхүүргүй бодлогыг дүгнэх боломжгүй; хаалттай эх (ангид бодогдох тест г.м.) бодлогыг
    // дүгнэвэл зөв/буруу нь түлхүүрийг задруулна — аль алийг нь гаргахгүй (хуваарь хэвээр, нээгдэхээр гарна)
    const cache: GateCache = new Map();
    const shown: ReviewWithProblem[] = [];
    let hidden = 0;
    for (const row of rows) {
      if (shown.length >= limit) break;
      if (!hasKnownAnswer(gradableOf(row)) || (await this.revealGate(studentId, row, cache)).locked) hidden += 1;
      else shown.push(row);
    }
    return {
      total: Math.max(shown.length, total - hidden),
      items: shown.map(serializeDue),
    };
  }

  /** Бодлогыг агуулсан тест бүрийн хаалгыг нэгтгэнэ (хамгийн хатуу нь давамгайлна). */
  async revealGate(
    studentId: string,
    row: { problemId: string; source: string; sourceTestId?: string | null },
    cache: GateCache = new Map(),
  ): Promise<RevealGate> {
    const links = await this.prisma.testProblem.findMany({
      where: { problemId: row.problemId },
      select: {
        test: { select: { id: true, type: true, chapterId: true, chapter: { select: { bookId: true } } } },
      },
    });
    const tests = [...new Map(links.map((l) => [l.test.id, l.test])).values()];
    if (row.sourceTestId && !tests.some((t) => t.id === row.sourceTestId)) {
      // Эх тест бодлогоос салсан ч нөөцлөлт хэвээр шалгагдана
      if (await this.cached(cache, `reserved:${row.sourceTestId}`, () => reservedAnywhere(this.prisma, row.sourceTestId!)))
        return LOCKED;
    }
    let answer = true;
    for (const test of tests) {
      if (await this.cached(cache, `reserved:${test.id}`, () => reservedAnywhere(this.prisma, test.id))) return LOCKED;
      const level = await this.cached(cache, `level:${test.id}`, () => this.reviewLevel(studentId, test));
      const policy = studentReviewPolicy(test.type, level);
      if (!policy.open || policy.solutions === 'NONE') return LOCKED;
      // Гэрийн даалгавар: илгээсний дараа тухайн тестийн буруу бодлогын хариу нээгддэг (reviewOf)
      const homeworkReveal = row.source === 'HOMEWORK' && row.sourceTestId === test.id;
      if (!policy.correctAnswer && !homeworkReveal) answer = false;
    }
    return { locked: false, answer, solution: true };
  }

  private async reviewLevel(
    studentId: string,
    test: { id: string; type: Parameters<typeof studentReviewPolicy>[0]; chapterId: string | null; chapter: { bookId: string | null } | null },
  ) {
    if (test.type !== 'THOUSAND') return 'FULL' as const;
    const where = { testId_studentId: { testId: test.id, studentId } };
    const [result, session] = await Promise.all([
      this.prisma.testResult.findUnique({ where, select: { createdAt: true } }),
      this.prisma.testAttemptSession.findUnique({ where, select: { submittedAt: true, status: true } }),
    ]);
    const data = {
      result: result as never,
      session: session?.status === 'SUBMITTED' ? ({ submittedAt: session.submittedAt } as never) : null,
    };
    return (await studentReviewLevel(this.prisma, test as never, studentId, data)).level;
  }

  private cached<T>(cache: GateCache, key: string, load: () => Promise<T>): Promise<T> {
    if (!cache.has(key)) cache.set(key, load());
    return cache.get(key) as Promise<T>;
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
    // Хугацаа болоогүй бол дүгнэхгүй: давтан илгээж зөв/буруугаар түлхүүр таах боломжгүй,
    // хариу, бодолт ч задрахгүй. Давхар товшилтын 2 дахь хүсэлт энд 409 авна.
    if (!isReviewDue(row.dueAt, now)) throw new ConflictException('Энэ бодлогын давтах өдөр болоогүй байна');
    const gate = await this.revealGate(studentId, row);
    if (gate.locked) throw new ConflictException('Энэ бодлогыг одоохондоо давтах боломжгүй');

    const grade = gradeAnswer(g, answer);
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
    return {
      correct: grade.correct,
      correctAnswer: gate.answer ? publicCorrectAnswer(g) : null,
      solutionOutline:
        gate.solution && row.problem.analysis?.status === 'VERIFIED' ? row.problem.analysis.solutionOutline : null,
      scheduled: true,
      dueAt: next.dueAt,
      intervalDays: next.intervalDays,
      reps: next.reps,
      lapses: next.lapses,
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
