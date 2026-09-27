import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { calculateReadiness, ReadinessAttempt, ulaanbaatarDateOnly } from './readiness';
import { readinessTopicCode } from './readiness-weights';

@Injectable()
export class ReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getForStudent(requesterId: string, role: Role, studentId: string) {
    await this.assertCanRead(requesterId, role, studentId);
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: Role.STUDENT, archivedAt: null },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Сурагч олдсонгүй');
    const asOf = ulaanbaatarDateOnly(new Date());
    // The earliest of eight weekly snapshots needs its own trailing 60-day
    // window (roughly 109 days from the current snapshot).
    const since = new Date(asOf.getTime() - 110 * 86_400_000);
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId, occurredOn: { gte: since, lte: asOf }, problem: { deletedAt: null } },
      select: {
        id: true, problemId: true, occurredOn: true, autoCorrect: true, selfState: true,
        problem: { select: { analysis: { select: { topic: true } }, formulas: { select: { formula: { select: { topicSlugs: true } } } }, chapter: { select: { topic: { select: { name: true } } } } } },
      },
      orderBy: [{ occurredOn: 'asc' }, { id: 'asc' }],
    });
    const data: ReadinessAttempt[] = [];
    for (const attempt of attempts) {
      // Match AttemptsService.isSuccess: corrected/self-reported state takes
      // precedence over the original automatic correctness value.
      const outcome = attempt.selfState === 'SOLVED_CLEAN' || attempt.selfState === 'FIXED_AFTER_ERROR'
        ? true
        : attempt.selfState === 'FAILED' || attempt.selfState === 'GUESSED'
          ? false
          : attempt.autoCorrect;
      const codes = new Set<string>();
      const raw = attempt.problem.analysis?.topic;
      const analysisTopic = readinessTopicCode(raw);
      if (analysisTopic) codes.add(analysisTopic);
      for (const link of attempt.problem.formulas) for (const code of link.formula.topicSlugs) {
        const topic = readinessTopicCode(code);
        if (topic) codes.add(topic);
      }
      const chapterTopic = readinessTopicCode(attempt.problem.chapter.topic?.name);
      if (chapterTopic) codes.add(chapterTopic);
      for (const code of codes) data.push({ id: attempt.id, problemId: attempt.problemId, topic: code, at: attempt.occurredOn, correct: outcome });
    }
    return calculateReadiness(data, asOf);
  }

  private async assertCanRead(requesterId: string, role: Role, studentId: string) {
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return;
    if (role === Role.STUDENT) {
      if (requesterId !== studentId) throw new ForbiddenException();
      return;
    }
    if (role === Role.PARENT) {
      const link = await this.prisma.parentLink.findFirst({ where: { parentId: requesterId, studentId, verifiedAt: { not: null } } });
      if (!link) throw new ForbiddenException();
      return;
    }
    if (role === Role.TEACHER) {
      const enrollment = await this.prisma.enrollment.findFirst({ where: { studentId, leftAt: null, classroom: { archived: false, teacherId: requesterId } } });
      if (!enrollment) throw new ForbiddenException();
      return;
    }
    throw new ForbiddenException();
  }
}
