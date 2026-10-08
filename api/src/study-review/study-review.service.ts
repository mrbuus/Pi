import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { officialProblemIds } from './official-exposure';
import { randomInt } from 'node:crypto';
import { parseRational } from '../learning-lab/generator';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { canAccessChapter } from '../common/access';
import { choiceModeOf, gradeAnswer, GradableProblem } from '../tests/grading';
import { canonicalizePracticeChoiceInput } from '../recommend/recommend.service';
import {
  normalizeResponse,
  normalizeStart,
  requestHash,
  REVIEW_CAPS,
  selectReviewItems,
  reviewEligible,
  gradeReviewNumber,
  validReviewChoice,
} from './study-review.policy';
const include = {
  items: {
    orderBy: { order: 'asc' as const },
    include: { responses: { orderBy: { occurredAt: 'asc' as const } } },
  },
};
type Run = Prisma.StudyReviewRunGetPayload<{ include: typeof include }>;
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class StudyReviewService {
  constructor(private readonly prisma: PrismaService) {}
  async history(
    userId: string,
    role: Role,
    query: { year?: string; take?: string; cursor?: string },
  ) {
    if (![Role.STUDENT, Role.BUYER].includes(role as 'STUDENT' | 'BUYER'))
      throw new ForbiddenException('Суралцагчийн түүхийн эрх шаардлагатай');
    return this.historyFor(userId, query);
  }

  async childHistory(
    parentId: string,
    childId: string,
    role: Role,
    query: { year?: string; take?: string; cursor?: string },
  ) {
    if (role !== Role.PARENT)
      throw new ForbiddenException('Эцэг эхийн эрх шаардлагатай');
    const link = await this.prisma.parentLink.findFirst({
      where: {
        parentId,
        studentId: childId,
        verifiedAt: { not: null },
        student: { archivedAt: null, role: Role.STUDENT },
      },
      select: { id: true },
    });
    if (!link)
      throw new ForbiddenException(
        'Баталгаажсан хүүхдийн холбоос шаардлагатай',
      );
    return this.historyFor(childId, query);
  }

  private async historyFor(
    userId: string,
    query: { year?: string; take?: string; cursor?: string },
  ) {
    const currentYear = Number(
      new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Ulaanbaatar',
        year: 'numeric',
      }).format(new Date()),
    );
    if (query.year !== undefined && !/^\d{4}$/.test(query.year))
      throw new BadRequestException('Он буруу');
    const year = query.year === undefined ? currentYear : Number(query.year);
    if (year < 2000 || year > 2100) throw new BadRequestException('Он буруу');
    if (query.take !== undefined && !/^\d{1,2}$/.test(query.take))
      throw new BadRequestException('Хуудасны хэмжээ буруу');
    const take = query.take === undefined ? 20 : Number(query.take);
    if (take < 1 || take > 50)
      throw new BadRequestException('Хуудасны хэмжээ 1–50 байна');
    const startedAt = {
      gte: new Date(`${year}-01-01T00:00:00+08:00`),
      lt: new Date(`${year + 1}-01-01T00:00:00+08:00`),
    };
    let cursor: { id: string; startedAt: Date } | null = null;
    if (query.cursor !== undefined) {
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(query.cursor))
        throw new BadRequestException('Түүхийн хуудасны холбоос буруу');
      let decoded: unknown;
      try {
        decoded = JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString('utf8'),
        );
      } catch {
        throw new BadRequestException('Түүхийн хуудасны холбоос буруу');
      }
      if (
        !decoded ||
        typeof decoded !== 'object' ||
        !('id' in decoded) ||
        typeof decoded.id !== 'string' ||
        !('year' in decoded) ||
        decoded.year !== year
      )
        throw new BadRequestException('Түүхийн хуудасны холбоос буруу');
      cursor = await this.prisma.studyReviewRun.findFirst({
        where: { id: decoded.id, userId, startedAt },
        select: { id: true, startedAt: true },
      });
      if (!cursor)
        throw new BadRequestException('Түүхийн хуудасны холбоос буруу');
    }
    const rows = await this.prisma.studyReviewRun.findMany({
      where: {
        userId,
        startedAt,
        ...(cursor
          ? {
              OR: [
                { startedAt: { lt: cursor.startedAt } },
                { startedAt: cursor.startedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: {
        id: true,
        budgetMinutes: true,
        status: true,
        startedAt: true,
        deadlineAt: true,
        submittedAt: true,
        items: {
          select: {
            firstRecordedAt: true,
            immutableFirstCorrect: true,
            immutableFirstFlags: true,
            exposureBeforeFirst: true,
            responses: {
              where: { kind: 'CORRECTION', assistance: true, correct: true },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });
    const page = rows.slice(0, take),
      now = Date.now();
    const items = page.map((run) => ({
      id: run.id,
      budgetMinutes: run.budgetMinutes,
      state:
        run.status === 'OPEN' && run.deadlineAt.getTime() <= now
          ? 'EXPIRED'
          : run.status,
      startedAt: run.startedAt,
      deadlineAt: run.deadlineAt,
      submittedAt: run.submittedAt,
      evidence: {
        assigned: run.items.length,
        answered: run.items.filter((i) => i.firstRecordedAt).length,
        firstCorrect: run.items.filter((i) => i.immutableFirstCorrect === true)
          .length,
        independentFirstCorrect: run.items.filter(
          (i) =>
            i.immutableFirstCorrect === true &&
            !i.exposureBeforeFirst &&
            !i.immutableFirstFlags.some((f) =>
              ['guessed', 'help', 'could-not'].includes(f),
            ),
        ).length,
        assistedFirst: run.items.filter(
          (i) =>
            i.firstRecordedAt &&
            (i.exposureBeforeFirst || i.immutableFirstFlags.includes('help')),
        ).length,
        correctedWithAssistance: run.items.filter((i) => i.responses.length > 0)
          .length,
        unknown: run.items.filter(
          (i) => !i.firstRecordedAt || i.immutableFirstCorrect === null,
        ).length,
      },
    }));
    const last = page.at(-1);
    return {
      year,
      timeZone: 'Asia/Ulaanbaatar',
      items,
      nextCursor:
        rows.length > take && last
          ? Buffer.from(JSON.stringify({ id: last.id, year })).toString(
              'base64url',
            )
          : null,
      caution:
        'Анхны хариу ба тусламжтай засвар тусдаа. Бие даасан гэдэг нь зөвхөн бүртгэгдсэн тусламж ба өөрийн тэмдэглэгээгээр ялгасан; гадуурх тусламжийг ажиглаагүй. Албан ёсны шалгалт эсвэл чадварын магадлал биш.',
    };
  }

  private async chapters(userId: string, role: Role, ids?: string[]) {
    const rows = await this.prisma.chapter.findMany({
      where: { ...(ids ? { id: { in: ids } } : {}), book: { deletedAt: null } },
      include: { book: true },
      orderBy: { id: 'asc' },
      take: ids ? 5 : 500,
    });
    const allowed = [] as typeof rows;
    for (const row of rows)
      if (await canAccessChapter(this.prisma, userId, role, row))
        allowed.push(row);
    if (ids && allowed.length !== ids.length)
      throw new ForbiddenException('Сонгосон сэдвийг үзэх эрхгүй.');
    return allowed;
  }
  private async officialExposure(
    userId: string,
    liveOnly = false,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<Set<string>> {
    const sessions = await db.testAttemptSession.findMany({
      where: {
        studentId: userId,
        ...(liveOnly
          ? {
              status: 'IN_PROGRESS',
              OR: [{ deadlineAt: null }, { deadlineAt: { gt: new Date() } }],
            }
          : {}),
      },
      select: { problemOrder: true, draftAnswers: true },
    });
    return new Set(sessions.flatMap(officialProblemIds));
  }

  private async candidates(userId: string, chapterIds: string[]) {
    const rows = await this.prisma.problem.findMany({
      where: {
        chapterId: { in: chapterIds },
        deletedAt: null,
        chapter: { bookId: { not: null }, book: { deletedAt: null } },
        analysis: { answerKeyStatus: 'VERIFIED' },
      },
      include: { analysis: true, choiceOptions: true },
      orderBy: { id: 'asc' },
      take: 2000,
    });
    const ids = rows.map((p) => p.id);
    const [attempts, events, reviews, official] = await Promise.all([
      this.prisma.attempt.findMany({
        where: { studentId: userId, problemId: { in: ids } },
        select: { problemId: true },
      }),
      this.prisma.learningEvent.findMany({
        where: {
          userId,
          problemId: { in: ids },
          type: {
            in: [
              'ANSWER_SUBMITTED',
              'HINT_USED',
              'RETRY',
              'PROBLEM_OPENED',
              'VIDEO_STARTED',
              'VIDEO_COMPLETED',
            ],
          },
        },
        select: { problemId: true },
      }),
      this.prisma.studyReviewItem.findMany({
        where: { run: { userId }, problemId: { in: ids } },
        select: { problemId: true },
      }),
      this.officialExposure(userId),
    ]);
    const seen = new Set(
      [...attempts, ...events, ...reviews].map((p) => p.problemId),
    );
    return rows.filter(
      (p) => !official.has(p.id) && !seen.has(p.id) && reviewEligible(p),
    );
  }

  async options(userId: string, role: Role) {
    const chapters = await this.chapters(userId, role);
    const fresh = await this.candidates(
      userId,
      chapters.map((c) => c.id),
    );
    const resumable = await this.prisma.studyReviewRun.findFirst({
      where: { userId, status: 'OPEN', deadlineAt: { gt: new Date() } },
      orderBy: { startedAt: 'desc' },
      select: { id: true, requestedChapterIds: true },
    });
    const resumeRunId = resumable?.requestedChapterIds.every((id) =>
      chapters.some((c) => c.id === id),
    )
      ? resumable.id
      : null;
    return {
      budgets: [10, 30, 60],
      caps: REVIEW_CAPS,
      resumeRunId,
      chapters: chapters.map((c) => ({
        id: c.id,
        title: c.title,
        freshCount: fresh.filter((p) => p.chapterId === c.id).length,
      })),
      coverageLimit: 2000,
    };
  }
  private async owned(userId: string, role: Role, id: string) {
    const run = await this.prisma.studyReviewRun.findFirst({
      where: { id, userId },
      include,
    });
    if (!run) throw new NotFoundException('Давталт олдсонгүй.');
    await this.chapters(userId, role, run.requestedChapterIds);
    return run;
  }
  private publicKey(snapshot: Prisma.JsonValue) {
    const grade = snapshot as unknown as GradableProblem;
    const choice = grade.choiceOptions?.find((o) => o.isCorrect);
    return choice ? choice.text : grade.correctAnswer;
  }
  private async view(run: Run) {
    const liveOfficial = await this.officialExposure(run.userId, true);
    const expired =
      run.status === 'OPEN' && Date.now() >= run.deadlineAt.getTime();
    const status = expired ? 'EXPIRED' : run.status;
    const closed = status !== 'OPEN';
    return {
      id: run.id,
      budgetMinutes: run.budgetMinutes,
      startedAt: run.startedAt,
      deadlineAt: run.deadlineAt,
      status,
      serverNow: new Date(),
      selectionVersion: run.selectionVersion,
      items: run.items.map((item) => ({
        id: item.id,
        problemId: item.problemId,
        order: item.order,
        source: item.sourceSnapshot,
        first: item.firstRecordedAt
          ? {
              answer: item.immutableFirstAnswer,
              flags: item.immutableFirstFlags,
              correct: item.immutableFirstCorrect,
              recordedAt: item.firstRecordedAt,
            }
          : null,
        responses: item.responses.map((r) => ({
          id: r.id,
          kind: r.kind,
          answer: r.answer,
          flags: r.flags,
          correct: r.correct,
          assistance: r.assistance,
          occurredAt: r.occurredAt,
        })),
        ...(closed && !liveOfficial.has(item.problemId)
          ? {
              solution:
                (item.gradeSnapshot as Record<string, unknown>).solution ??
                null,
              answerKey: this.publicKey(item.gradeSnapshot),
            }
          : {}),
      })),
      evidence: {
        assigned: run.items.length,
        answered: run.items.filter((i) => i.firstRecordedAt).length,
        firstCorrect: run.items.filter((i) => i.immutableFirstCorrect === true)
          .length,
        independentFirstCorrect: run.items.filter(
          (i) =>
            i.immutableFirstCorrect === true &&
            !i.exposureBeforeFirst &&
            !i.immutableFirstFlags.some((f) =>
              ['guessed', 'help', 'could-not'].includes(f),
            ),
        ).length,
        unknown: run.items.filter(
          (i) => !i.firstRecordedAt || i.immutableFirstCorrect === null,
        ).length,
      },
      caution:
        'Бие даан гэдэг нь мэдэгдэж буй бүртгэл ба өөрийн тэмдэглэгээгээр ялгасан үр дүн; гадуурх тусламжийг ажиглаагүй. Албан ёсны шалгалт, чадварын магадлал эсвэл хурдны үнэлгээ биш.',
    };
  }
  async get(userId: string, role: Role, id: string) {
    const run = await this.owned(userId, role, id);
    if (run.status === 'OPEN' && Date.now() >= run.deadlineAt.getTime()) {
      await this.prisma.studyReviewRun.updateMany({
        where: { id, userId, status: 'OPEN' },
        data: { status: 'EXPIRED' },
      });
      run.status = 'EXPIRED';
    }
    return this.view(run);
  }
  async create(
    userId: string,
    role: Role,
    body: Parameters<typeof normalizeStart>[0],
  ) {
    const input = normalizeStart(body),
      hash = requestHash({
        budgetMinutes: input.budgetMinutes,
        chapterIds: input.chapterIds,
      });
    await this.chapters(userId, role, input.chapterIds);
    const id = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`study-review-user:${userId}`}))`;
        const replay = await tx.studyReviewRun.findUnique({
          where: {
            userId_clientRequestId: {
              userId,
              clientRequestId: input.clientRequestId,
            },
          },
        });
        if (replay) {
          if (replay.normalizedRequestHash !== hash)
            throw new ConflictException(
              'Ижил хүсэлтийн дугаарт өөр сонголт өгсөн байна.',
            );
          return replay.id;
        }
        // Selection under the per-user lock excludes previous review assignments as well as actual answer/help records.
        const candidates = await this.candidates(userId, input.chapterIds);
        if (!candidates.length)
          throw new BadRequestException(
            'Шалгасан түлхүүртэй, өмнө нь бүртгэгдээгүй бодлого алга. Өөр сэдэв сонгоно уу.',
          );
        const seed = randomInt(0, 2147483647);
        const selected = selectReviewItems(
          candidates,
          input.chapterIds,
          seed,
          REVIEW_CAPS[input.budgetMinutes],
        );
        const startedAt = new Date(),
          deadlineAt = new Date(
            startedAt.getTime() + input.budgetMinutes * 60000,
          );
        const run = await tx.studyReviewRun.create({
          data: {
            userId,
            clientRequestId: input.clientRequestId,
            normalizedRequestHash: hash,
            budgetMinutes: input.budgetMinutes,
            requestedChapterIds: input.chapterIds,
            startedAt,
            deadlineAt,
            seed,
            selectionVersion: 'fresh-verified-bank-v1',
            items: {
              create: selected.map((p, order) => ({
                problemId: p.id,
                order,
                sourceSnapshot: json({
                  statement: p.statementText,
                  imageKey: p.imageKey,
                  token: p.token,
                  format: p.format,
                  choiceMode: choiceModeOf(p),
                  choices:
                    p.format !== 'CHOICE'
                      ? null
                      : p.choiceOptions.length
                        ? [...p.choiceOptions]
                            .sort((a, b) => a.order - b.order)
                            .map((c) => ({ label: c.label, text: c.text }))
                        : p.choices,
                }),
                gradeSnapshot: json({
                  id: p.id,
                  format: p.format,
                  choices: p.choices,
                  correctAnswer: p.correctAnswer,
                  choiceOptions: p.choiceOptions.map((c) => ({
                    order: c.order,
                    text: c.text,
                    isCorrect: c.isCorrect,
                  })),
                  solution:
                    p.analysis?.status === 'VERIFIED'
                      ? p.analysis.solutionOutline
                      : null,
                }),
                gradingVersion: 'bank-choice-exact-number-v1',
                eligibilityAtStart: 'fresh-verified-key',
              })),
            },
          },
        });
        return run.id;
      },
      { timeout: 20000 },
    );
    return this.get(userId, role, id);
  }
  async response(
    userId: string,
    role: Role,
    id: string,
    itemId: string,
    body: Parameters<typeof normalizeResponse>[0],
  ) {
    const input = normalizeResponse(body),
      hash = requestHash({
        kind: input.kind,
        answer: input.answer,
        flags: input.flags,
      });
    await this.owned(userId, role, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`study-review:${id}`}))`;
      const run = await tx.studyReviewRun.findFirst({
        where: { id, userId },
        include,
      });
      if (!run) throw new NotFoundException();
      const item = run.items.find((i) => i.id === itemId);
      if (!item) throw new NotFoundException('Бодлого олдсонгүй.');
      const liveOfficial = await this.officialExposure(userId, true, tx);
      if (liveOfficial.has(item.problemId))
        throw new ForbiddenException(
          'Энэ бодлого идэвхтэй шалгалтад байна. Шалгалт дууссаны дараа давтлагаа үргэлжлүүлнэ үү.',
        );
      const replay = item.responses.find(
        (r) => r.clientRequestId === input.clientRequestId,
      );
      if (replay) {
        if (replay.requestHash !== hash)
          throw new ConflictException('Ижил хүсэлтийн хариулт өөр байна.');
        return;
      }
      const closed =
        run.status !== 'OPEN' || Date.now() >= run.deadlineAt.getTime();
      if (input.kind === 'FIRST' && (closed || item.firstRecordedAt))
        throw new ConflictException(
          closed ? 'Давталт хаагдсан.' : 'Эхний хариулт хадгалагдсан.',
        );
      if (input.kind === 'CORRECTION' && !item.firstRecordedAt)
        throw new ConflictException('Эхний хариултаа өгнө үү.');
      const grade = item.gradeSnapshot as unknown as GradableProblem;
      const hint = await tx.learningEvent.findFirst({
        where: {
          userId,
          problemId: item.problemId,
          type: {
            in: [
              'HINT_USED',
              'ANSWER_SUBMITTED',
              'RETRY',
              'PROBLEM_OPENED',
              'VIDEO_STARTED',
              'VIDEO_COMPLETED',
            ],
          },
          occurredAt: { gte: run.startedAt },
        },
      });
      const official = await this.officialExposure(userId, false, tx);
      const assistance =
        closed ||
        !!hint ||
        official.has(item.problemId) ||
        input.flags.includes('help');
      if (
        grade.format === 'FILL_NUMBER' &&
        item.gradingVersion === 'bank-choice-exact-number-v1' &&
        input.answer.trim() &&
        !parseRational(input.answer)
      )
        throw new BadRequestException(
          'Бүхэл тоо, 8 хүртэл орны аравтын бутархай эсвэл энгийн бутархай бичнэ үү.',
        );
      if (
        grade.format === 'CHOICE' &&
        item.gradingVersion === 'bank-choice-exact-number-v1' &&
        input.answer.trim() &&
        !validReviewChoice(
          choiceModeOf(grade),
          grade.choiceOptions?.length ||
            (Array.isArray(grade.choices) ? grade.choices.length : 0),
          input.answer,
        )
      )
        throw new BadRequestException('Байгаа сонголтоос сонгоно уу.');
      const indexAnswer =
        grade.format === 'CHOICE' && choiceModeOf(grade) === 'TEXT'
          ? /^choice:(\d)$/.exec(input.answer)
          : null;
      const correct =
        grade.format === 'FILL_NUMBER' &&
        item.gradingVersion === 'bank-choice-exact-number-v1'
          ? gradeReviewNumber(grade.correctAnswer, input.answer)
          : gradeAnswer(
              grade,
              indexAnswer
                ? Number(indexAnswer[1])
                : canonicalizePracticeChoiceInput(grade, input.answer),
            ).correct;
      await tx.studyReviewResponse.create({
        data: {
          itemId,
          userId,
          clientRequestId: input.clientRequestId,
          requestHash: hash,
          kind: input.kind,
          answer: input.answer,
          flags: input.flags,
          correct,
          assistance,
        },
      });
      if (input.kind === 'FIRST')
        await tx.studyReviewItem.update({
          where: { id: itemId },
          data: {
            firstRecordedAt: new Date(),
            immutableFirstAnswer: input.answer,
            immutableFirstFlags: input.flags,
            immutableFirstCorrect: correct,
            exposureBeforeFirst: assistance,
          },
        });
      if (run.status === 'OPEN' && closed)
        await tx.studyReviewRun.update({
          where: { id },
          data: { status: 'EXPIRED' },
        });
    });
    return this.get(userId, role, id);
  }
  async submit(userId: string, role: Role, id: string) {
    await this.owned(userId, role, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`study-review:${id}`}))`;
      const run = await tx.studyReviewRun.findFirst({ where: { id, userId } });
      if (run?.status === 'OPEN')
        await tx.studyReviewRun.update({
          where: { id },
          data: {
            status:
              Date.now() >= run.deadlineAt.getTime() ? 'EXPIRED' : 'SUBMITTED',
            submittedAt: new Date(),
          },
        });
    });
    return this.get(userId, role, id);
  }
}
