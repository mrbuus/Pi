import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Role, LearningEventType } from '../generated/prisma/enums';
import { canAccessChapter } from '../common/access';
import { gradeAnswer, hasKnownAnswer } from '../tests/grading';
import { canonicalizePracticeChoiceInput } from '../recommend/recommend.service';
import { Family, generate, fromId, gradeGenerated } from './generator';

export interface ResponseInput {
  problemId: string;
  answer: string;
  mode?: string;
  flags?: string[];
  timing?: {
    focusedMs?: number;
    hiddenMs?: number;
    unknownMs?: number;
    buttons?: number;
    /** Бодож байхдаа сайтаас гарсан (таб сольсон/цонх орхисон) тоо — эзэн 2026-10-13 */
    leaves?: number;
  };
}
const FLAGS = ['unsure', 'guessed', 'could-not', 'help'];
const firstId = (userId: string, problemId: string) =>
  'lab-first-' +
  createHash('sha256')
    .update(JSON.stringify([userId, problemId]))
    .digest('hex');
@Injectable()
export class LearningLabService {
  constructor(private readonly prisma: PrismaService) {}
  private validate(body: ResponseInput) {
    if (
      !body ||
      typeof body.problemId !== 'string' ||
      body.problemId.length > 160 ||
      typeof body.answer !== 'string' ||
      body.answer.length > 128
    )
      throw new BadRequestException('Хариултаа шалгана уу.');
    if (body.mode && !['independent', 'classroom', 'probe'].includes(body.mode))
      throw new BadRequestException('Бодох хэлбэрээ шалгана уу.');
    if (
      body.flags &&
      (!Array.isArray(body.flags) ||
        body.flags.length > 4 ||
        !body.flags.every((f) => FLAGS.includes(f)))
    )
      throw new BadRequestException('Тэмдэглэгээгээ шалгана уу.');
    if (!body.answer.trim() && !body.flags?.includes('could-not'))
      throw new BadRequestException(
        'Хариулт эсвэл «Бодож чадаагүй» тэмдэглэгээ хэрэгтэй.',
      );
    if (
      body.timing &&
      Object.entries(body.timing).some(
        ([key, value]) =>
          !['focusedMs', 'hiddenMs', 'unknownMs', 'buttons', 'leaves'].includes(
            key,
          ) ||
          !Number.isSafeInteger(value) ||
          value < 0 ||
          value > (key === 'buttons' || key === 'leaves' ? 100 : 1800000),
      )
    )
      throw new BadRequestException('Хугацааны мэдээлэл буруу байна.');
  }
  async problem(userId: string, family: Family, seed: number) {
    try {
      const generated = generate(family, seed);
      const {
        id,
        statement,
        verification,
        family: generatedFamily,
        seed: generatedSeed,
      } = generated;
      const publicProblem = {
        id,
        statement,
        verification,
        family: generatedFamily,
        seed: generatedSeed,
      };
      const first = await this.prisma.learningEvent.findUnique({
        where: { id: firstId(userId, publicProblem.id) },
      });
      return { ...publicProblem, first: first?.meta ?? null };
    } catch {
      throw new BadRequestException(
        'Бодлогын төрөл эсвэл дугаарыг шалгана уу.',
      );
    }
  }
  private async bank(userId: string, id: string, role: Role = Role.STUDENT) {
    const problem = await this.prisma.problem.findFirst({
      where: { OR: [{ id }, { token: id }], deletedAt: null },
      include: {
        chapter: { include: { book: true } },
        choiceOptions: true,
        analysis: true,
      },
    });
    if (!problem || problem.deletedAt)
      throw new NotFoundException('Бодлого олдсонгүй.');
    if (!(await canAccessChapter(this.prisma, userId, role, problem.chapter)))
      throw new ForbiddenException('Энэ бодлогыг үзэх эрхгүй.');
    return problem;
  }
  async bankProblem(userId: string, id: string, role: Role = Role.STUDENT) {
    const p = await this.bank(userId, id, role);
    const first = await this.prisma.learningEvent.findUnique({
      where: { id: firstId(userId, p.id) },
    });
    return {
      id: p.id,
      statement: p.statementText,
      imageKey: p.imageKey,
      choices: p.choiceOptions.length
        ? p.choiceOptions
            .sort((a, b) => a.order - b.order)
            .map((c) => ({ label: c.label, text: c.text }))
        : p.choices,
      first: first?.meta ?? null,
    };
  }
  private async grade(
    userId: string,
    id: string,
    answer: string,
    role: Role = Role.STUDENT,
  ) {
    if (id.startsWith('lab-')) {
      try {
        return gradeGenerated(fromId(id), answer);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Хариултаа шалгана уу.',
        );
      }
    }
    const p = await this.bank(userId, id, role);
    if (
      !hasKnownAnswer(p) ||
      (p.analysis && p.analysis.answerKeyStatus !== 'VERIFIED') ||
      (typeof p.correctAnswer === 'object' &&
        p.correctAnswer !== null &&
        !Array.isArray(p.correctAnswer))
    )
      return null;
    return gradeAnswer(p, canonicalizePracticeChoiceInput(p, answer)).correct;
  }
  async respond(
    userId: string,
    body: ResponseInput,
    role: Role = Role.STUDENT,
  ) {
    this.validate(body);
    if (body.problemId.startsWith('lab-')) {
      try {
        fromId(body.problemId);
      } catch {
        throw new BadRequestException('Бодлогын дугаарыг шалгана уу.');
      }
    }
    // Still check content entitlement before returning a replay.
    const correct =
      body.flags?.includes('could-not') && !body.answer.trim()
        ? body.problemId.startsWith('lab-')
          ? (fromId(body.problemId), false)
          : (await this.bank(userId, body.problemId, role), false)
        : await this.grade(userId, body.problemId, body.answer, role);
    const meta = {
      lab: 'v1',
      kind: 'first',
      answer: body.answer,
      flags: [...new Set(body.flags ?? [])],
      mode: body.mode ?? 'independent',
      correct,
      timing: body.timing ?? {},
      attention: 'unknown',
      source: body.problemId.startsWith('lab-')
        ? 'verified-template'
        : 'existing-bank',
      recordedAt: new Date().toISOString(),
    };
    // Unique primary key + no update: retry, reload, parallel tabs cannot overwrite the first response.
    const row = await this.prisma.learningEvent.upsert({
      where: { id: firstId(userId, body.problemId) },
      update: {},
      create: {
        id: firstId(userId, body.problemId),
        userId,
        problemId: body.problemId,
        type: LearningEventType.ANSWER_SUBMITTED,
        meta,
      },
    });
    return row.meta;
  }
  private async serialized<T>(
    userId: string,
    problemId: string,
    operation: (service: LearningLabService) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${problemId}))::text`;
      return operation(new LearningLabService(tx as unknown as PrismaService));
    });
  }
  async correction(
    userId: string,
    body: ResponseInput,
    role: Role = Role.STUDENT,
  ) {
    this.validate(body);
    return this.serialized(userId, body.problemId, (service) =>
      service.correctionLocked(userId, body, role),
    );
  }
  private async correctionLocked(
    userId: string,
    body: ResponseInput,
    role: Role = Role.STUDENT,
  ) {
    this.validate(body);
    const first = await this.prisma.learningEvent.findUnique({
      where: { id: firstId(userId, body.problemId) },
    });
    if (!first || first.userId !== userId)
      throw new ForbiddenException('Эхний хариултаа эхлээд тэмдэглэнэ үү.');
    const exposed = await this.prisma.learningEvent.findFirst({
      where: {
        userId,
        problemId: body.problemId,
        type: LearningEventType.HINT_USED,
        id: { startsWith: 'lab-event-' },
        OR: [
          { meta: { path: ['lab'], equals: 'v1' } },
          { meta: { path: ['kind'], equals: 'video-solution-open' } },
        ],
      },
    });
    const correct = await this.grade(userId, body.problemId, body.answer, role);
    const meta = {
      lab: 'v1',
      kind: exposed ? 'solution-assisted-correction' : 'retry-before-solution',
      answer: body.answer,
      correct,
      timing: body.timing ?? {},
    };
    await this.prisma.learningEvent.create({
      data: {
        id: `lab-event-${randomUUID()}`,
        userId,
        problemId: body.problemId,
        type: LearningEventType.RETRY,
        meta,
      },
    });
    return meta;
  }
  async solution(userId: string, id: string, role: Role = Role.STUDENT) {
    if (typeof id !== 'string' || id.length > 160)
      throw new BadRequestException('Бодлогын дугаарыг шалгана уу.');
    return this.serialized(userId, id, (service) =>
      service.solutionLocked(userId, id, role),
    );
  }
  private async solutionLocked(
    userId: string,
    id: string,
    role: Role = Role.STUDENT,
  ) {
    if (typeof id !== 'string' || id.length > 160)
      throw new BadRequestException('Бодлогын дугаарыг шалгана уу.');
    const first = await this.prisma.learningEvent.findUnique({
      where: { id: firstId(userId, id) },
    });
    if (!first || first.userId !== userId)
      throw new ForbiddenException('Эхний хариултаа эхлээд тэмдэглэнэ үү.');
    let text: string | null;
    if (id.startsWith('lab-')) {
      try {
        text = fromId(id).solution;
      } catch {
        throw new BadRequestException('Бодлого олдсонгүй.');
      }
    } else {
      const p = await this.bank(userId, id, role);
      text =
        p.analysis?.status === 'VERIFIED' ? p.analysis.solutionOutline : null;
    }
    if (text)
      await this.prisma.learningEvent.create({
        data: {
          id: `lab-event-${randomUUID()}`,
          userId,
          problemId: id,
          type: LearningEventType.HINT_USED,
          meta: { lab: 'v1', kind: 'solution-viewed' },
        },
      });
    return { text, available: !!text };
  }
  async history(userId: string) {
    const rows = await this.prisma.learningEvent.findMany({
      where: {
        userId,
        AND: [
          {
            OR: [
              { id: { startsWith: 'lab-first-' } },
              { id: { startsWith: 'lab-event-' } },
            ],
          },
          {
            OR: [
              { meta: { path: ['lab'], equals: 'v1' } },
              { meta: { path: ['kind'], equals: 'video-solution-open' } },
            ],
          },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      problemId: r.problemId,
      at: r.occurredAt,
      ...(r.meta as Record<string, unknown>),
    }));
  }
  async review(actorId: string, role: Role, studentId: string) {
    if (
      role === Role.TEACHER &&
      !(await this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null, classroom: { teacherId: actorId } },
      }))
    )
      throw new ForbiddenException('Энэ сурагчийн мэдээллийг үзэх эрхгүй.');
    if (
      !([Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN] as Role[]).includes(role)
    )
      throw new ForbiddenException();
    return this.history(studentId);
  }
}
