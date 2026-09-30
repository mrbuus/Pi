import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type Formula } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReviewExercises,
  formulaVersion,
  interleave,
  quizzes,
  shuffle,
  type ExerciseMode,
} from './formula-review.exercises';
import { SubmitReviewDto } from './formula-review.dto';
import { reviewDay, reviewStreak, scheduleReview } from './review-scheduler';

const usable: Prisma.FormulaWhereInput = {
  slug: { not: null },
  latex: { not: null },
  sectionSlug: { not: null },
};
const formulaOrder: Prisma.FormulaOrderByWithRelationInput[] = [
  { sectionSlug: 'asc' },
  { order: 'asc' },
  { id: 'asc' },
];
@Injectable()
export class FormulaReviewService {
  private readonly exercises: ReviewExercises;
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.exercises = new ReviewExercises(
      config.getOrThrow<string>('JWT_SECRET'),
    );
  }
  private seen(userId: string): Prisma.FormulaWhereInput {
    return {
      problems: {
        some: { problem: { attempts: { some: { studentId: userId } } } },
      },
    };
  }
  private fresh(userId: string): Prisma.FormulaWhereInput {
    return {
      ...usable,
      reviews: { none: { userId } },
      OR: [{ level: 'CORE' }, this.seen(userId)],
    };
  }
  async due(userId: string, limit = 10, now = new Date()) {
    const dueWhere: Prisma.FormulaReviewWhereInput = {
      userId,
      dueAt: { lte: now },
      formula: usable,
    };
    const [dueCount, newCount, dueRows, seenRows, coreRows] = await Promise.all(
      [
        this.prisma.formulaReview.count({ where: dueWhere }),
        this.prisma.formula.count({ where: this.fresh(userId) }),
        this.prisma.formulaReview.findMany({
          where: dueWhere,
          orderBy: [{ dueAt: 'asc' }, { formulaId: 'asc' }],
          take: limit * 5,
          include: { formula: true },
        }),
        this.prisma.formula.findMany({
          where: {
            ...usable,
            reviews: { none: { userId } },
            ...this.seen(userId),
          },
          take: limit * 5,
          orderBy: formulaOrder,
        }),
        this.prisma.formula.findMany({
          where: {
            ...usable,
            level: 'CORE',
            reviews: { none: { userId } },
            NOT: this.seen(userId),
          },
          take: limit * 5,
          orderBy: formulaOrder,
        }),
      ],
    );
    const reviewMap = new Map(dueRows.map((row) => [row.formulaId, row]));
    const selected = [
      ...interleave(dueRows.map((row) => row.formula)),
      ...interleave(seenRows),
      ...interleave(coreRows),
    ].slice(0, limit);
    const cards: ReturnType<typeof this.card>[] = [];
    for (let i = 0; i < selected.length; ) {
      const groupRows = selected.slice(i, i + 4);
      if (
        i % 7 === 3 &&
        groupRows.length === 4 &&
        new Set(groupRows.map((row) => row.latex)).size === 4
      ) {
        const group = { id: randomUUID(), formulas: shuffle(groupRows) };
        for (const formula of groupRows)
          cards.push(
            this.card(
              userId,
              formula,
              'match',
              now,
              reviewMap.get(formula.id),
              undefined,
              group,
            ),
          );
        i += 4;
      } else {
        const wanted =
          i % 7 === 1 ? 'blank' : i % 7 === 2 ? 'truefalse' : 'flashcard';
        const formula = selected[i];
        const quizIndex = quizzes(formula).findIndex(
          (quiz) =>
            quiz.type === wanted &&
            (wanted !== 'blank' || (quiz.distractors?.length ?? 0) >= 3),
        );
        const mode: ExerciseMode = quizIndex < 0 ? 'flashcard' : wanted;
        cards.push(
          this.card(
            userId,
            formula,
            mode,
            now,
            reviewMap.get(formula.id),
            quizIndex < 0 ? undefined : quizIndex,
          ),
        );
        i++;
      }
    }
    return { dueCount, newCount, cards };
  }
  private card(
    userId: string,
    formula: Formula,
    mode: ExerciseMode,
    now: Date,
    review?: { box: number; dueAt: Date },
    quizIndex?: number,
    group?: { id: string; formulas: Formula[] },
  ) {
    const { exercise } = this.exercises.create(
      userId,
      formula,
      mode,
      now,
      quizIndex,
      group,
    );
    return {
      slug: formula.slug!,
      title: formula.name,
      section: formula.sectionSlug,
      latex: mode === 'flashcard' ? formula.latex : null,
      general: mode === 'flashcard' ? formula.general : null,
      quiz: exercise.prompt
        ? [{ type: mode, prompt: exercise.prompt, options: exercise.options }]
        : [],
      box: review?.box ?? 0,
      dueAt: review?.dueAt.toISOString() ?? now.toISOString(),
      exercise,
    };
  }
  async stats(userId: string, now = new Date()) {
    const [mastered, reviewed, fresh, days] = await Promise.all([
      this.prisma.formulaReview.count({
        where: { userId, box: 5, formula: usable },
      }),
      this.prisma.formulaReview.count({ where: { userId, formula: usable } }),
      this.prisma.formula.count({ where: this.fresh(userId) }),
      this.prisma.formulaReviewDay.findMany({
        where: { userId },
        orderBy: { day: 'desc' },
      }),
    ]);
    const today = reviewDay(now).getTime();
    return {
      mastered,
      learning: reviewed - mastered,
      new: fresh,
      reviewedToday:
        days.find((day) => day.day.getTime() === today)?.count ?? 0,
      streakDays: reviewStreak(
        days.filter((day) => day.count > 0).map((day) => day.day),
        now,
      ),
    };
  }
  async submit(
    userId: string,
    slug: string,
    dto: SubmitReviewDto,
    now = new Date(),
  ) {
    const formula = await this.prisma.formula.findUnique({ where: { slug } });
    if (!formula || !formula.latex || !formula.sectionSlug)
      throw new NotFoundException('Томьёо олдсонгүй');
    // The original {result} contract is explicitly a self-assessment. The UI
    // always uses a signed exercise and objective answers are graded below.
    if (!dto.exerciseToken && (!dto.result || dto.answer !== undefined))
      throw new BadRequestException('Дасгалын мэдээлэл шаардлагатай.');
    const challenge = dto.exerciseToken
      ? this.exercises.read(dto.exerciseToken, userId, slug, now)
      : this.exercises.create(userId, formula, 'flashcard', now).challenge;
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          slug,
          token: dto.exerciseToken ?? null,
          answer: dto.answer ?? null,
          result: challenge.mode === 'flashcard' ? dto.result : null,
        }),
      )
      .digest('hex');
    const attemptKey = { userId, exerciseId: challenge.nonce };
    const saved = await this.prisma.formulaReviewAttempt.findUnique({
      where: { userId_exerciseId: attemptKey },
    });
    if (saved) return this.receipt(saved, fingerprint);
    const graded = this.exercises.grade(
      challenge,
      formula,
      dto.answer,
      dto.result,
    );
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const existing = await tx.formulaReviewAttempt.findUnique({
              where: { userId_exerciseId: attemptKey },
            });
            if (existing) return this.receipt(existing, fingerprint);
            const currentFormula = await tx.formula.findUnique({
              where: { id: formula.id },
            });
            if (
              !currentFormula ||
              formulaVersion(currentFormula) !== challenge.version
            )
              throw new ConflictException(
                'Томьёо шинэчлэгдсэн. Шинэ сесс эхлүүлнэ үү.',
              );
            if (challenge.mode === 'match') {
              const current = await tx.formula.findMany({
                where: { id: { in: challenge.matches!.map((row) => row.id) } },
              });
              if (
                current.length !== challenge.matches!.length ||
                current.some(
                  (row) =>
                    challenge.matches!.find((item) => item.id === row.id)
                      ?.version !== formulaVersion(row),
                )
              )
                throw new ConflictException(
                  'Хосын томьёо шинэчлэгдсэн. Шинэ сесс эхлүүлнэ үү.',
                );
            }

            const previous = await tx.formulaReview.findUnique({
              where: { userId_formulaId: { userId, formulaId: formula.id } },
            });
            const next = scheduleReview(previous, graded.result, now);
            await tx.formulaReview.upsert({
              where: { userId_formulaId: { userId, formulaId: formula.id } },
              create: { userId, formulaId: formula.id, ...next },
              update: next,
            });
            const day = reviewDay(now);
            await tx.formulaReviewDay.upsert({
              where: { userId_day: { userId, day } },
              create: { userId, day, count: 1 },
              update: { count: { increment: 1 } },
            });
            const response = {
              slug,
              box: next.box,
              dueAt: next.dueAt.toISOString(),
              streak: next.streak,
              result: graded.result,
              source: graded.source,
              feedback: graded.feedback,
            };
            await tx.formulaReviewAttempt.create({
              data: {
                ...attemptKey,
                formulaId: formula.id,
                fingerprint,
                response,
                createdAt: now,
              },
            });
            return response;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : undefined;
        if ((code === 'P2034' || code === 'P2002') && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException('Давталтыг дахин хадгална уу.');
  }
  private receipt(
    saved: { fingerprint: string; response: Prisma.JsonValue },
    fingerprint: string,
  ) {
    if (saved.fingerprint !== fingerprint)
      throw new ConflictException(
        'Энэ дасгалын хариулт аль хэдийн хадгалагдсан.',
      );
    return saved.response;
  }
}
