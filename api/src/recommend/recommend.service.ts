import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { todayUB } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  activeClassSubjects,
  blockedSubjects,
  canAccessChapter,
  canAccessProblem,
  classroomRelease,
  activePurchaseWhere,
  collectPassScope,
  hasActiveClassroomEnrollment,
} from '../common/access';
import { MistakeCollector } from '../mistakes/mistake-collector.service';
import {
  choiceModeOf,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
} from '../tests/grading';
import {
  recommend,
  type CandidateProblem,
  type Recommendation,
} from './scheduler';

export function canonicalizePracticeChoiceInput(
  problem: GradableProblem,
  givenAnswer: unknown,
): unknown {
  if (choiceModeOf(problem) !== 'TEXT' || typeof givenAnswer !== 'string')
    return givenAnswer;
  const token = givenAnswer.trim();
  const choices = problem.choiceOptions?.length
    ? [...problem.choiceOptions]
        .sort((a, b) => a.order - b.order)
        .map((option) => option.text)
    : Array.isArray(problem.choices)
      ? problem.choices.map(String)
      : [];
  const textIndex = choices.findIndex(
    (choice) => choice.trim().toLowerCase() === token.toLowerCase(),
  );
  if (textIndex >= 0) return textIndex;
  if (/^[A-Za-z]$/.test(token)) return token.toUpperCase().charCodeAt(0) - 65;
  return givenAnswer;
}

import {
  measuredEvidence,
  labEvidence,
  observedDifficulty,
  emptyEvidence,
} from './evidence';
import type { TopicEvidence } from './evidence';
export type EvidenceRecommendation = Recommendation & {
  evidence: TopicEvidence;
  uncertainty: 'small-sample' | 'observed-only';
  explanation: string;
  contract: 'observed-independent-v1';
};
@Injectable()
export class RecommendService {
  constructor(
    private prisma: PrismaService,
    private mistakes: MistakeCollector,
  ) {}

  /**
   * Сурагчийн ДАРААГИЙН бодлогуудыг санал болгоно.
   *
   * ЛОГИК:
   * 1. Сурагчийн нэвтэрсэн эсэх, сургууль идэвхтэй эсэх шалгана
   * 2. Сурагчийн өмнөх оролдлогуудыг AttemptSignal болгоно
   * 3. Сурагчийн программын (класс/анги) бодлогуудыг УРЬДЧИЛЖ хязгаарлана
   *    (6125 БҮХ-г гарах биш)
   * 4. Бодлогуудыг CandidateProblem болгоно (difficulty = 1 - correctRate)
   * 5. scheduler.recommend() дуудна
   *
   * PERFORMANCE ГҮЙЦЭТГЭЛ:
   * - Бодлогуудыг урьдчилж хязгаарлана:
   *   * Сурагчийн сүүлийн үзсэн сэдвүүд (Chapter-нууд)
   *   * + шинэ, давтан сэргээх сэдвүүд
   *   * Хэром 100-200 бодлого таран хайна, БҮХ 6125 БИШ
   *
   * topicId = Problem.chapterId
   * (Tag-уудээр үзэхээ хойшлуулж байна — хөтөлбөр дотор олон сэдэв байх үед)
   */
  async getNextProblems(
    studentId: string,
    limit = 10,
    role: Role = Role.STUDENT,
  ): Promise<EvidenceRecommendation[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException('Тоо 1–50 байна.');
    if (role !== Role.STUDENT && role !== Role.BUYER)
      throw new ForbiddenException();
    const [attemptRows, enrollment, exposures, labFirst] = await Promise.all([
      this.prisma.attempt.findMany({
        where: { studentId, problem: { deletedAt: null } },
        select: {
          problemId: true,
          problem: { select: { chapterId: true } },
          autoCorrect: true,
          selfState: true,
          source: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 10000,
      }),
      this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null, classroom: { archived: false } },
        select: {
          classroomId: true,
          classroom: { select: { grade: true, progressChapterId: true } },
        },
      }),
      this.prisma.learningEvent.findMany({
        where: {
          userId: studentId,
          type: 'HINT_USED',
          id: { startsWith: 'lab-event-' },
        },
        select: { problemId: true, occurredAt: true },
        take: 10000,
      }),
      this.prisma.learningEvent.findMany({
        where: { userId: studentId, id: { startsWith: 'lab-first-' } },
        select: { problemId: true, occurredAt: true, meta: true },
        take: 10000,
      }),
    ]);
    const labProblems = await this.prisma.problem.findMany({
      where: {
        id: { in: labFirst.flatMap((e) => (e.problemId ? [e.problemId] : [])) },
        deletedAt: null,
      },
      select: { id: true, chapterId: true },
    });
    const labRows = labFirst.flatMap((e) => {
      const problem = labProblems.find((p) => p.id === e.problemId);
      if (!problem) return [];
      const row = labEvidence(
        problem.id,
        problem.chapterId,
        e.occurredAt,
        e.meta,
      );
      return row ? [row] : [];
    });
    const measured = measuredEvidence(
      [
        ...labRows,
        ...attemptRows.map((row) => ({
          problemId: row.problemId,
          topicId: row.problem.chapterId,
          correct: row.autoCorrect,
          selfState: row.selfState,
          source: row.source,
          at: row.createdAt,
        })),
      ],
      exposures
        .filter((x): x is typeof x & { problemId: string } => !!x.problemId)
        .map((x) => ({ problemId: x.problemId, at: x.occurredAt })),
    );
    const [scope, activeClass, purchases, own] = await Promise.all([
      collectPassScope(this.prisma, studentId),
      hasActiveClassroomEnrollment(this.prisma, studentId, role),
      this.prisma.purchase.findMany({
        where: {
          ...activePurchaseWhere(studentId),
          productItem: { kind: 'BOOK' },
        },
        select: { productItem: { select: { refId: true } } },
      }),
      activeClassSubjects(this.prisma, studentId, role),
    ]);
    const bookIds = [
      ...scope.bookIds,
      ...purchases.map((p) => p.productItem.refId),
    ];
    // Ангидаа байхгүй хичээлийн (Нийгмийн ухаан г.м.) бүлгийг санал болгохгүй
    const blocked = blockedSubjects(own);
    const subjectGate: Prisma.ChapterWhereInput = blocked.length
      ? { NOT: { book: { subject: { in: blocked } } } }
      : {};
    // Танхимын анги бүх бүлгийг БИШ, зөвхөн ангид нээгдсэн тестийн бодлогуудыг
    // нээнэ (эзэн 2026-10-29) — өнөөдрийн тестийг урьдчилан санал болгохгүй.
    const release = activeClass
      ? await classroomRelease(this.prisma, studentId, role)
      : null;
    const entitlement: Prisma.ChapterWhereInput = scope.all
      ? subjectGate
      : {
          ...subjectGate,
          OR: [
            { freePreview: true },
            { id: { in: scope.chapterIds } },
            { bookId: { in: bookIds } },
            ...(release ? [{ id: { in: [...release.chapterIds] } }] : []),
          ],
        };
    const releasedOnly = (chapter: {
      id: string;
      bookId: string | null;
      freePreview: boolean;
    }) =>
      !!release &&
      !scope.all &&
      !chapter.freePreview &&
      !scope.chapterIds.includes(chapter.id) &&
      !(chapter.bookId && bookIds.includes(chapter.bookId));
    const historicalIds = [
      ...new Set([
        ...attemptRows.map((r) => r.problem.chapterId),
        ...labRows.map((r) => r.topicId),
      ]),
    ];
    const historical = historicalIds.length
      ? await this.prisma.chapter.findMany({
          where: {
            id: { in: historicalIds },
            deletedAt: null,
            AND: [entitlement],
          },
          select: {
            id: true,
            bookId: true,
            freePreview: true,
            order: true,
            grade: true,
          },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          take: 30,
        })
      : [];
    const initial = await this.prisma.chapter.findMany({
      where: {
        deletedAt: null,
        AND: [entitlement],
        ...(enrollment?.classroom.grade
          ? { OR: [{ grade: enrollment.classroom.grade }, { grade: null }] }
          : {}),
      },
      select: {
        id: true,
        bookId: true,
        freePreview: true,
        order: true,
        grade: true,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    const eligible = new Map<string, (typeof initial)[number]>();
    for (const chapter of [...historical, ...initial])
      if (!eligible.has(chapter.id)) {
        eligible.set(chapter.id, chapter);
        if (eligible.size >= 12) break;
      }
    const lastClassSession =
      enrollment && !enrollment.classroom.progressChapterId
        ? await this.prisma.classTestSession.findFirst({
            where: {
              classroomId: enrollment.classroomId,
              testId: { not: null },
            },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            select: { testId: true },
          })
        : null;
    const lastTest = lastClassSession?.testId
      ? await this.prisma.test.findUnique({
          where: { id: lastClassSession.testId },
          select: { chapterId: true },
        })
      : null;
    const progressId =
      enrollment?.classroom.progressChapterId ?? lastTest?.chapterId;
    const progress = progressId
      ? await this.prisma.chapter.findUnique({
          where: { id: progressId },
          select: { order: true, bookId: true },
        })
      : null;
    const chapters = [...eligible.values()].filter(
      (c) =>
        !progress ||
        historicalIds.includes(c.id) ||
        c.bookId !== progress.bookId ||
        c.order <= progress.order,
    );
    if (!chapters.length) return [];
    const perChapter = Math.floor(400 / chapters.length);
    const problems = (
      await Promise.all(
        chapters.map((chapter) =>
          this.prisma.problem.findMany({
            where: {
              deletedAt: null,
              chapterId: chapter.id,
              id: releasedOnly(chapter)
                ? {
                    in: [...release!.problemIds],
                    notIn: [...measured.seen],
                  }
                : { notIn: [...measured.seen] },
            },
            select: {
              id: true,
              chapterId: true,
              attemptCount: true,
              correctRate: true,
            },
            orderBy: [{ page: 'asc' }, { number: 'asc' }, { id: 'asc' }],
            take: perChapter,
          }),
        ),
      )
    ).flat();
    const candidates: CandidateProblem[] = problems
      .filter((p) => !measured.seen.has(p.id))
      .map((p) => ({
        id: p.id,
        topicId: p.chapterId,
        difficulty: observedDifficulty(p.correctRate),
        attemptCount: p.attemptCount,
      }));
    const explanations: Record<string, string> = {
      NEW_TOPIC:
        'Энэ эрхтэй сэдвээс хараахан бие даасан хэмжсэн хариулт алга. Нэг шинэ бодлогоор эхэлнэ.',
      RETRY_TOPIC:
        'Өмнөх бие даасан алдаанаас дор хаяж нэг хоног өнгөрсөн; өөр бодлогоор дахин шалгана.',
      WEAK_TOPIC:
        'Өмнөх хэмжсэн хариултын мэдээллээр арай энгийн шинэ бодлого санал болгов.',
      CONFIDENCE:
        'Өмнөх бие даасан зөв хариулттай сэдвийг өөр бодлогоор сэргээнэ.',
      RIGHT_LEVEL:
        'Өмнөх хэмжсэн хариулт ба бодлогын ажигласан хүндрэлээр сонгосон санал.',
    };
    return recommend(measured.history, candidates, {
      now: Date.now(),
      limit,
      maxConsecutiveSameTopic: 1,
      sameProblemOk: false,
    }).map((r) => {
      const evidence = measured.topics.get(r.topicId) ?? emptyEvidence();
      return {
        ...r,
        evidence,
        uncertainty:
          evidence.independentAttempts < 5 ? 'small-sample' : 'observed-only',
        explanation:
          explanations[r.reason] +
          (evidence.independentAttempts < 5
            ? ' Цөөн баримттай; чадварын онош биш.'
            : ' Энэ нь ажигласан баримт, амжилтын баталгаатай магадлал биш.'),
        contract: 'observed-independent-v1',
      };
    });
  }

  async createAttempt(
    studentId: string,
    problemId: string,
    givenAnswer: unknown,
    autoCorrect?: boolean,
    selfState?: string,
    role: Role = Role.STUDENT,
  ) {
    if (role !== Role.STUDENT && role !== Role.BUYER)
      throw new ForbiddenException();
    void autoCorrect; // A client grade never changes the server's key.
    let encoded: string | undefined;
    try {
      encoded = JSON.stringify(givenAnswer);
    } catch {
      throw new BadRequestException('Хариултаа шалгана уу.');
    }
    if (
      typeof problemId !== 'string' ||
      !problemId ||
      problemId.length > 200 ||
      givenAnswer === undefined ||
      typeof encoded !== 'string' ||
      encoded.length > 4096
    )
      throw new BadRequestException('Хариултаа шалгана уу.');
    // Сурагч болон бодлогыг шалгана
    const [student, problem, enrollment] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true },
      }),
      this.prisma.problem.findUnique({
        where: { id: problemId },
        select: {
          id: true,
          deletedAt: true,
          analysis: { select: { answerKeyStatus: true } },
          format: true,
          choices: true,
          correctAnswer: true,
          choiceOptions: {
            orderBy: { order: 'asc' },
            select: { order: true, text: true, isCorrect: true },
          },
          chapter: {
            select: {
              id: true,
              bookId: true,
              freePreview: true,
              deletedAt: true,
            },
          },
        },
      }),
      this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null },
        select: { classroomId: true },
      }),
    ]);

    if (!student) throw new NotFoundException('Сурагч олдсонгүй');
    if (!problem || problem.deletedAt)
      throw new NotFoundException('Бодлого олдсонгүй');

    if (problem.chapter.deletedAt)
      throw new NotFoundException('Бодлого олдсонгүй');
    const allowed = await canAccessProblem(this.prisma, studentId, role, problem);
    if (!allowed)
      throw new ForbiddenException('Энэ бодлогыг бодох эрхгүй байна');

    const gradable: GradableProblem = {
      id: problem.id,
      format: problem.format,
      choices: problem.choices,
      correctAnswer: problem.correctAnswer,
      choiceOptions: problem.choiceOptions,
    };
    // Practice submits free text; exact numeric-looking choice text wins.
    // A numeric JSON value still means the selected display index.
    const rawAnswer = canonicalizePracticeChoiceInput(gradable, givenAnswer);
    const known =
      hasKnownAnswer(gradable) &&
      (!problem.analysis || problem.analysis.answerKeyStatus === 'VERIFIED');
    const grade = known ? gradeAnswer(gradable, rawAnswer) : null;
    const scoredAnswer = grade?.canonicalAnswer ?? rawAnswer;

    // Attempt үүсгэнэ (source = ONLINE_TEST — вэб дээр оролдсон)
    const attempt = await this.prisma.attempt.create({
      data: {
        studentId,
        problemId,
        source: 'ONLINE_TEST',
        occurredOn: todayUB(),
        // The client-supplied grade/state is advisory only; the server owns the key.
        autoCorrect: known ? (grade?.correct ?? false) : null,
        selfState:
          selfState === 'FIXED_AFTER_ERROR' || selfState === 'GUESSED'
            ? selfState
            : null,
        givenAnswer: scoredAnswer as Prisma.InputJsonValue,
        classroomId: enrollment?.classroomId ?? null,
        mistakeCollectedAt:
          known && grade?.correct === false ? null : new Date(),
      },
    });
    if (known && grade?.correct === false) {
      try {
        await this.mistakes.collectAttempt(attempt.id);
      } catch {
        /* the submitted practice attempt remains saved and collector can retry */
      }
    }
    return { attemptId: attempt.id, correct: attempt.autoCorrect };
  }
}
