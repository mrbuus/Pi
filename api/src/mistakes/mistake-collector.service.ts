import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttemptSource, SelfState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MistakeCollector {
  private readonly logger = new Logger(MistakeCollector.name);
  constructor(private readonly prisma: PrismaService) {}

  async collect(input: { userId: string; problemId: string; source: 'PRACTICE' | 'TEST'; sourceRefId?: string | null; testTitle?: string | null; givenAnswer?: unknown }) {
    try {
      const existing = input.sourceRefId ? await this.prisma.mistakeEntry.findUnique({ where: { userId_problemId: { userId: input.userId, problemId: input.problemId } }, select: { sourceRefId: true } }) : null;
      // Cron retries of the same committed attempt must be idempotent, including
      // after the learner has already mastered the entry.
      if (input.sourceRefId && existing?.sourceRefId === input.sourceRefId) return true;
      await this.prisma.mistakeEntry.upsert({
        where: { userId_problemId: { userId: input.userId, problemId: input.problemId } },
        create: {
          userId: input.userId, problemId: input.problemId, source: input.source,
          sourceRefId: input.sourceRefId ?? null, testTitle: input.testTitle ?? null,
          givenAnswer: input.givenAnswer == null ? undefined : JSON.parse(JSON.stringify(input.givenAnswer)),
        },
        update: {
          ...(input.sourceRefId ? { sourceRefId: input.sourceRefId } : {}),
          source: input.source, testTitle: input.testTitle ?? null,
          givenAnswer: input.givenAnswer == null ? undefined : JSON.parse(JSON.stringify(input.givenAnswer)),
          status: 'RETRYING', consecutiveCorrect: 0, lastCorrectAt: null, nextRetryAt: null,
        },
      });
      return true;
    } catch (error) {
      this.logger.error('Mistake collection failed; attempt remains pending', error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPending() {
    const pending = await this.prisma.attempt.findMany({
      where: { mistakeCollectedAt: null, OR: [
        { autoCorrect: false }, { selfState: { in: [SelfState.FAILED, SelfState.FIXED_AFTER_ERROR] } },
      ] },
      orderBy: { createdAt: 'asc' }, take: 100,
    });
    for (const attempt of pending) {
      const test = attempt.testId ? await this.prisma.test.findUnique({ where: { id: attempt.testId }, select: { title: true } }) : null;
      const success = await this.collect({
        userId: attempt.studentId, problemId: attempt.problemId,
        source: attempt.source === AttemptSource.ONLINE_TEST ? 'TEST' : 'PRACTICE',
        sourceRefId: attempt.testId ?? attempt.id, testTitle: test?.title,
        givenAnswer: attempt.givenAnswer,
      });
      if (success) await this.prisma.attempt.updateMany({ where: { id: attempt.id, mistakeCollectedAt: null }, data: { mistakeCollectedAt: new Date() } });
    }
  }
}
