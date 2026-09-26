import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '../generated/prisma/client';
import { choiceModeOf, gradeAnswer, GradableProblem, hasKnownAnswer } from '../tests/grading';
import { PrismaService } from '../prisma/prisma.service';
import { MistakeCollector } from './mistake-collector.service';
import { MistakeQueryDto, MistakeReason, UpdateMistakeDto } from './dto/mistake.dto';
import { nextMistakeRetryState } from './mistake-scheduling';

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService, private readonly collector: MistakeCollector) {}

  async list(userId: string, query: MistakeQueryDto) {
    const where: Prisma.MistakeEntryWhereInput = { userId, ...(query.status ? { status: query.status } : {}), ...(query.source ? { source: query.source } : {}), ...(query.topic ? { problem: { chapter: { topic: { name: { contains: query.topic, mode: 'insensitive' } } } } } : {}) };
    const [allCounts, entries] = await Promise.all([
      this.prisma.mistakeEntry.groupBy({ by: ['status'], where: { userId }, _count: true }),
      this.prisma.mistakeEntry.findMany({
        where,
        include: { problem: { include: {
          chapter: { include: { topic: true } },
          choiceOptions: { orderBy: { order: 'asc' } },
          formulas: { include: { formula: { select: { slug: true, name: true, latex: true } } } },
        } } },
        orderBy: [{ nextRetryAt: 'asc' }, { updatedAt: 'desc' }], take: 200,
      }),
    ]);
    const counts = { NEW: 0, RETRYING: 0, MASTERED: 0 };
    allCounts.forEach((row) => { if (row.status in counts) counts[row.status as keyof typeof counts] = row._count; });
    const mistakeRows = entries as any[];
    const byTopicMap = new Map<string, number>();
    for (const e of mistakeRows) { const topic = e.problem.chapter?.topic?.name ?? 'Бусад'; byTopicMap.set(topic, (byTopicMap.get(topic) ?? 0) + 1); }
    return { counts, byTopic: [...byTopicMap].map(([topic, count]) => ({ topic, count })), items: mistakeRows.map((e) => ({
      id: e.id, problem: { id: e.problem.id, statementText: e.problem.statementText, choices: e.problem.choiceOptions.length ? e.problem.choiceOptions.map((c) => c.text) : e.problem.choices, choiceMode: choiceModeOf({ id: e.problem.id, format: e.problem.format, choices: e.problem.choices, correctAnswer: e.problem.correctAnswer, choiceOptions: e.problem.choiceOptions }), format: e.problem.format, imageKey: e.problem.imageKey },
      givenAnswer: e.givenAnswer, status: e.status, reason: e.reason, note: e.note, testTitle: e.testTitle, createdAt: e.createdAt, nextRetryAt: e.nextRetryAt,
      formulas: e.problem.formulas.filter((pf) => pf.formula.slug).map((pf) => ({ slug: pf.formula.slug, title: pf.formula.name, latex: pf.formula.latex })),
      ...(e.retryCount > 0 || e.status === 'MASTERED' ? { correctAnswer: e.problem.correctAnswer } : {}),
    })) };
  }

  async update(userId: string, id: string, dto: UpdateMistakeDto) {
    const owned = await this.prisma.mistakeEntry.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) throw new NotFoundException('Алдаа олдсонгүй');
    return this.prisma.mistakeEntry.update({ where: { id }, data: { ...(dto.reason !== undefined ? { reason: dto.reason } : {}), ...(dto.note !== undefined ? { note: dto.note } : {}) }, select: { id: true, reason: true, note: true } });
  }

  async retry(userId: string, id: string, answer: unknown) {
    if (answer === undefined || answer === null || answer === '') throw new BadRequestException('Хариултаа оруулна уу');
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const row = await tx.mistakeEntry.findFirst({ where: { id, userId }, include: { problem: { include: { choiceOptions: { orderBy: { order: 'asc' } }, analysis: { select: { status: true, solutionOutline: true } } } } } });
      if (!row) throw new NotFoundException('Алдаа олдсонгүй');
      const gradable: GradableProblem = { id: row.problem.id, format: row.problem.format, choices: row.problem.choices, correctAnswer: row.problem.correctAnswer, choiceOptions: row.problem.choiceOptions };
      if (!hasKnownAnswer(gradable)) throw new BadRequestException('Энэ бодлогын хариу баталгаажаагүй байна');
      const grade = gradeAnswer(gradable, answer);
      const state = nextMistakeRetryState({ status: row.status as 'NEW' | 'RETRYING' | 'MASTERED', retryCount: row.retryCount, consecutiveCorrect: row.consecutiveCorrect, lastCorrectAt: row.lastCorrectAt }, grade.correct, now);
      const changed = await tx.mistakeEntry.updateMany({ where: { id, userId, retryCount: row.retryCount, status: row.status }, data: state });
      if (changed.count !== 1) throw new ConflictException('Дахин оролдоно уу');
      return { correct: grade.correct, correctAnswer: row.problem.correctAnswer, status: state.status, nextRetryAt: state.nextRetryAt, solutionOutline: row.problem.analysis?.status === 'VERIFIED' ? row.problem.analysis.solutionOutline : null };
    });
    return result;
  }

  async today(userId: string) {
    const now = new Date();
    const result = await this.list(userId, {});
    return result.items.filter((item) => item.status !== 'MASTERED' && (!item.nextRetryAt || item.nextRetryAt <= now)).slice(0, 5);
  }

  async student(studentId: string, actor: { userId: string; role: Role }) {
    if (actor.role === Role.TEACHER) {
      const link = await this.prisma.enrollment.findFirst({ where: { studentId, leftAt: null, classroom: { teacherId: actor.userId } } });
      if (!link) throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
    } else if (actor.role === Role.PARENT) {
      const link = await this.prisma.parentLink.findFirst({ where: { parentId: actor.userId, studentId, verifiedAt: { not: null } } });
      if (!link) throw new ForbiddenException('Баталгаажсан холбоо олдсонгүй');
    }
    const entries = await this.prisma.mistakeEntry.findMany({ where: { userId: studentId }, include: { problem: { include: { chapter: { include: { topic: true } } } } } });
    const counts = { NEW: 0, RETRYING: 0, MASTERED: 0 };
    const topics = new Map<string, number>();
    for (const e of entries) { if (e.status in counts) counts[e.status as keyof typeof counts]++; const t = e.problem.chapter?.topic?.name ?? 'Бусад'; topics.set(t, (topics.get(t) ?? 0) + 1); }
    return { counts, byTopic: [...topics].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count), weakestTopics: [...topics].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count).slice(0, 5) };
  }

  async collectPractice(attempts: Array<{ userId: string; problemId: string; id: string; givenAnswer: unknown }>) {
    for (const attempt of attempts) {
      const ok = await this.collector.collect({ userId: attempt.userId, problemId: attempt.problemId, source: 'PRACTICE', sourceRefId: attempt.id, givenAnswer: attempt.givenAnswer });
      if (ok) await this.prisma.attempt.updateMany({ where: { id: attempt.id, mistakeCollectedAt: null }, data: { mistakeCollectedAt: new Date() } });
    }
  }
}
