import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../generated/prisma/client';
import { SelfState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemReviewService } from './problem-review.service';

type MistakeSource = 'PRACTICE' | 'TEST';

interface CollectInput {
  userId: string;
  problemId: string;
  source: MistakeSource;
  sourceRefId: string;
  sourceOccurredAt: Date;
  testTitle?: string | null;
  givenAnswer?: unknown;
  /** Тестийн оролдлого бол тест (хугацаатай давталтын хариу нээх хаалганд) */
  testId?: string | null;
}

@Injectable()
export class MistakeCollector implements OnModuleDestroy {
  private readonly logger = new Logger(MistakeCollector.name);
  /** Хүсэлтийн дараа ажиллаж буй цуглуулга — унтрахдаа дуусахыг хүлээнэ */
  private readonly background = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly reviews?: ProblemReviewService,
  ) {}

  /**
   * Record one wrong-attempt event. A row lock and monotonically increasing
   * event key make retries idempotent and prevent delayed events reopening a
   * mastered entry after a newer attempt has already been collected.
   */
  async collect(input: CollectInput): Promise<boolean> {
    try {
      const answer = input.givenAnswer == null
        ? undefined
        : JSON.parse(JSON.stringify(input.givenAnswer)) as Prisma.InputJsonValue;

      await this.prisma.$transaction(async (tx) => {
        const unique = {
          userId_problemId: {
            userId: input.userId,
            problemId: input.problemId,
          },
        };
        const entry = await tx.mistakeEntry.upsert({
          where: unique,
          create: {
            userId: input.userId,
            problemId: input.problemId,
            source: input.source,
            sourceRefId: input.sourceRefId,
            sourceOccurredAt: input.sourceOccurredAt,
            testTitle: input.testTitle ?? null,
            givenAnswer: answer,
          },
          update: {},
          select: { id: true },
        });

        await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT "id" FROM "MistakeEntry" WHERE "id" = ${entry.id} FOR UPDATE
        `);
        const current = await tx.mistakeEntry.findUniqueOrThrow({
          where: { id: entry.id },
          select: { sourceRefId: true, sourceOccurredAt: true, lastRetryAt: true },
        });

        if (current.sourceRefId === input.sourceRefId) return;
        const currentTime = Math.max(
          current.sourceOccurredAt?.getTime() ?? -Infinity,
          current.lastRetryAt?.getTime() ?? -Infinity,
        );
        const incomingTime = input.sourceOccurredAt.getTime();
        const newerThanSource = incomingTime > (current.sourceOccurredAt?.getTime() ?? -Infinity)
          || (incomingTime === current.sourceOccurredAt?.getTime()
            && input.sourceRefId > (current.sourceRefId ?? ''));
        const afterLastRetry = !current.lastRetryAt || incomingTime > current.lastRetryAt.getTime();
        const isNewer = incomingTime >= currentTime && newerThanSource && afterLastRetry;
        if (!isNewer) return;

        await tx.mistakeEntry.update({
          where: { id: entry.id },
          data: {
            source: input.source,
            sourceRefId: input.sourceRefId,
            sourceOccurredAt: input.sourceOccurredAt,
            testTitle: input.testTitle ?? null,
            givenAnswer: answer,
            status: 'RETRYING',
            retryCount: 0,
            consecutiveCorrect: 0,
            lastCorrectAt: null,
            nextRetryAt: null,
          },
        });
      });
      // Хугацаатай давталт: алдааны дэвтэр commit болсны дараа, тусдаа. recordWrong хэзээ ч
      // шиддэггүй, идэмпотент (lastEventAt) — цуглуулгын үр дүнг өөрчлөхгүй.
      await this.reviews?.recordWrong({
        studentId: input.userId,
        problemId: input.problemId,
        source: input.source,
        occurredAt: input.sourceOccurredAt,
        sourceTestId: input.testId ?? null,
        sourceRefId: input.sourceRefId,
      });
      return true;
    } catch (error) {
      this.logger.error(
        'Mistake collection failed; attempt remains pending',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Хүсэлтийн ЗАМААС ГАДУУР цуглуулна (docs/BACKEND-PERF.md). Нэг илгээлтийн
   * буруу бодлого бүр ~8 query (transaction, мөр түгжээ) — 40 бодлоготой тестэд
   * ~300 query хүсэлтийг барьж байсан. Дүн аль хэдийн commit болсон; алдаа
   * гарвал мөр pending хэвээр үлдэж retryPending (5 мин) дахин авна.
   * Дараалсан (зэрэг биш) — pool-ыг нэг илгээлт эзлэхгүй.
   */
  collectAttemptsInBackground(attemptIds: string[]): void {
    if (attemptIds.length === 0) return;
    const run = (async () => {
      for (const id of attemptIds) await this.collectAttempt(id);
    })().catch((error: unknown) => {
      this.logger.error(
        'Background mistake collection failed; attempts remain pending',
        error instanceof Error ? error.stack : String(error),
      );
    });
    this.background.add(run);
    void run.finally(() => this.background.delete(run));
  }

  /** Graceful shutdown: эхэлсэн цуглуулгыг таслахгүй (SIGTERM → app.close) */
  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.background]);
  }

  /** Collect only the requested committed attempt; grading never scans globally. */
  async collectAttempt(attemptId: string): Promise<boolean> {
    try {
      const attempt = await this.prisma.attempt.findFirst({
        where: {
          id: attemptId,
          mistakeCollectedAt: null,
          deletedAt: null,
          OR: [
            { autoCorrect: false },
            { selfState: { in: [SelfState.FAILED, SelfState.FIXED_AFTER_ERROR] } },
          ],
        },
        select: {
          id: true,
          studentId: true,
          problemId: true,
          source: true,
          testId: true,
          createdAt: true,
          givenAnswer: true,
        },
      });
      if (!attempt) return true;

      const test = attempt.testId
        ? await this.prisma.test.findUnique({
            where: { id: attempt.testId },
            select: { title: true },
          })
        : null;
      const collected = await this.collect({
        userId: attempt.studentId,
        problemId: attempt.problemId,
        source: attempt.testId ? 'TEST' : 'PRACTICE',
        sourceRefId: attempt.id,
        sourceOccurredAt: attempt.createdAt,
        testTitle: test?.title,
        givenAnswer: attempt.givenAnswer,
        testId: attempt.testId,
      });
      if (collected) {
        await this.prisma.attempt.updateMany({
          where: { id: attempt.id, mistakeCollectedAt: null },
          data: { mistakeCollectedAt: new Date() },
        });
      }
      return collected;
    } catch (error) {
      this.logger.error(
        `Pending attempt ${attemptId} could not be collected`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /** Retry at most five bounded batches; individual failed rows remain pending. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPending(): Promise<void> {
    const pageSize = 100;
    let cursorId: string | undefined;
    try {
      for (let page = 0; page < 5; page += 1) {
        const pending = await this.prisma.attempt.findMany({
          where: {
            mistakeCollectedAt: null,
            deletedAt: null,
            OR: [
              { autoCorrect: false },
              { selfState: { in: [SelfState.FAILED, SelfState.FIXED_AFTER_ERROR] } },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
          take: pageSize,
          select: { id: true },
        });
        if (pending.length === 0) return;
        for (const attempt of pending) await this.collectAttempt(attempt.id);
        cursorId = pending[pending.length - 1].id;
        if (pending.length < pageSize) return;
      }
    } catch (error) {
      this.logger.error(
        'Pending mistake collection scan failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
