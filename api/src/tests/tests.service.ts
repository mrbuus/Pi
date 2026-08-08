import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  AttemptSessionStatus,
  AttemptSource,
  Role,
  SelfState,
  Subject,
  TestGradingMode,
} from '../generated/prisma/enums';
import { collectPassScope, hasCoveringPass, TEACHER_ROLES } from '../common/access';
import { todayUB } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { SaveSessionDto } from './dto/submit-test.dto';
import {
  answerToken,
  buildChoiceOrder,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
} from './grading';

// Хугацаа дууссаны дараах уужим байдал: сүлжээний саатал, эцсийн autosave-д
const GRACE_MS = 30_000;
const MAX_EVENTS = 100;

// Prisma-гийн include-тэй тестийн бодлогын мөр
type TestProblemRow = {
  problemId: string;
  order: number;
  points: number;
  problem: {
    id: string;
    format: GradableProblem['format'];
    statementText: string | null;
    imageKey: string | null;
    choices: unknown;
    correctAnswer: unknown;
    attemptCount: number;
    correctRate: number | null;
    choiceOptions: { order: number; text: string; isCorrect: boolean }[];
    analysis?: { status: string; solutionOutline: string | null } | null;
    chapter: { id: string; title: string };
  };
};

type SessionRow = {
  id: string;
  status: AttemptSessionStatus;
  seed: number;
  problemOrder: unknown;
  choiceOrder: unknown;
  draftAnswers: unknown;
  draftStates: unknown;
  problemTimes: unknown;
  leaveCount: number;
  events: unknown;
  startedAt: Date;
  deadlineAt: Date | null;
  submittedAt: Date | null;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function toGradable(row: TestProblemRow): GradableProblem {
  return {
    id: row.problem.id,
    format: row.problem.format,
    choices: row.problem.choices,
    correctAnswer: row.problem.correctAnswer,
    choiceOptions: row.problem.choiceOptions,
  };
}

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  // TODO(followUp): api/src/audit/audit.service.ts бэлэн болмогц энэ
  // helper-ийг хасаад тэрхүү нэгдсэн AuditService-ийг DI-аар ашиглах.
  private toAuditJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (v === null || v === undefined) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
  }

  private async recordAudit(
    actorId: string,
    actorRole: Role,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action,
        entity,
        entityId,
        before: this.toAuditJson(before),
        after: this.toAuditJson(after),
      },
    });
  }

  // Багш+/Админ тестийг зөөлөн устгана — TestResult/Attempt зэрэг түүхэн
  // бичлэгүүд орфон үлдэхгүйн тулд hard DELETE хийхгүй.
  async remove(testId: string, actorId: string, actorRole: Role) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    const updated = await this.prisma.test.update({
      where: { id: testId },
      data: { deletedAt: new Date() },
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'Test',
      testId,
      test,
      updated,
    );
    return { deleted: true };
  }

  // Ангид оноож байгаа (classroomIds ирсэн) тестийг хариуны түлхүүргүй
  // бодлогоос БҮРЭН бүрдүүлбэл сурагч 0/0 авч будлиантай, шударга бус
  // үр дүн авна (SPEC Fix 1). hasKnownAnswer()-г grading.ts-ээс шууд
  // ашиглана — логик хуулбарлахгүй, нэг эх сурвалжтай байлгана.
  private async checkAnswerCoverage(
    problems: { problemId: string }[],
  ): Promise<
    | { withoutAnswerCount: number; totalProblems: number; message: string }
    | undefined
  > {
    const total = problems.length;
    if (total === 0) return undefined;

    const rows = await this.prisma.problem.findMany({
      where: { id: { in: problems.map((p) => p.problemId) } },
      select: {
        id: true,
        format: true,
        choices: true,
        correctAnswer: true,
        choiceOptions: {
          select: { order: true, text: true, isCorrect: true },
        },
      },
    });
    // Олдоогүй (устсан/буруу id) бодлогыг ч мөн "хариугүй" гэж тооцно —
    // ийм бодлогыг ч мөн автоматаар дүгнэх боломжгүй.
    const knownCount = rows.filter((p) => hasKnownAnswer(p)).length;
    const withoutAnswerCount = total - knownCount;
    if (withoutAnswerCount === 0) return undefined;

    if (withoutAnswerCount === total) {
      throw new BadRequestException(
        `Энэ тестийн бүх ${total} бодлого хариуны түлхүүргүй тул автоматаар дүгнэх боломжгүй — ийм тестийг ангид оноож болохгүй. Эхлээд наад зах нь нэг бодлогод хариу нэмнэ үү.`,
      );
    }

    return {
      withoutAnswerCount,
      totalProblems: total,
      message: `${withoutAnswerCount} бодлого хариуны түлхүүргүй тул дүнд тооцогдохгүй.`,
    };
  }

  async create(dto: CreateTestDto, userId: string) {
    // Зөвхөн ангид ШУУД оноож байгаа үед л шалгана (TestAccess бичигдэх цорын
    // ганц зам) — эс тэгвээс ангид оноогдоогүй ноорог тестэд саад болно.
    const answerWarning = dto.classroomIds?.length
      ? await this.checkAnswerCoverage(dto.problems ?? [])
      : undefined;

    const test = await this.prisma.test.create({
      data: {
        title: dto.title,
        type: dto.type,
        gradingMode: dto.gradingMode ?? TestGradingMode.AUTO,
        chapterId: dto.chapterId,
        timeLimitMin: dto.timeLimitMin,
        pdfKey: dto.pdfKey,
        groupKey: dto.groupKey,
        variantLabel: dto.variantLabel,
        price: dto.price,
        createdById: userId,
        problems: dto.problems?.length
          ? {
              create: dto.problems.map((p) => ({
                problemId: p.problemId,
                order: p.order,
                points: p.points ?? 1,
              })),
            }
          : undefined,
        access: dto.classroomIds?.length
          ? {
              create: dto.classroomIds.map((classroomId) => ({ classroomId })),
            }
          : undefined,
      },
      include: {
        problems: { orderBy: { order: 'asc' } },
        access: true,
      },
    });

    return answerWarning ? { ...test, answerWarning } : test;
  }

  // Багш бүгдийг, сурагч ангидаа оноогдсон ЭСВЭЛ хүчинтэй эрхийнхээ (pass)
  // хамрах хүрээнд орсон тестүүдийг харна (Bug 2 fix — SPEC §11)
  async list(userId: string, role: Role, subject?: Subject) {
    const subjectFilter: Prisma.TestWhereInput = subject
      ? { chapter: { book: { subject } } }
      : {};

    if (TEACHER_ROLES.includes(role)) {
      return this.prisma.test.findMany({
        where: { ...subjectFilter, deletedAt: null },
        include: {
          _count: { select: { problems: true, results: true } },
          access: { include: { classroom: { select: { name: true } } } },
          chapter: { select: { book: { select: { code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    const [enrollment, scope] = await Promise.all([
      this.prisma.enrollment.findFirst({
        where: { studentId: userId, leftAt: null },
      }),
      collectPassScope(this.prisma, userId),
    ]);

    let accessFilter: Prisma.TestWhereInput | undefined;
    if (!scope.all) {
      const accessOr: Prisma.TestWhereInput[] = [];
      if (enrollment) {
        accessOr.push({ access: { some: { classroomId: enrollment.classroomId } } });
      }
      if (scope.testIds.length) accessOr.push({ id: { in: scope.testIds } });
      if (scope.chapterIds.length) {
        accessOr.push({ chapterId: { in: scope.chapterIds } });
      }
      if (scope.bookIds.length) {
        accessOr.push({ chapter: { bookId: { in: scope.bookIds } } });
      }
      if (accessOr.length === 0) return [];
      accessFilter = { OR: accessOr };
    }

    const rows = await this.prisma.test.findMany({
      where: { ...subjectFilter, ...accessFilter, deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        gradingMode: true,
        timeLimitMin: true,
        variantLabel: true,
        groupKey: true, // сэдвээр бүлэглэх UI-д: "Илтгэгч тэгшитгэл 1"
        chapter: { select: { book: { select: { code: true } } } }, // номын өнгө
        createdAt: true,
        _count: { select: { problems: true } },
        results: {
          where: { studentId: userId },
          select: { totalScore: true, maxScore: true },
        },
        attemptSessions: {
          where: { studentId: userId },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Сурагчид session-ий төлөвийг нэг талбар болгож өгнө (Үргэлжлүүлэх товч)
    return rows.map(({ attemptSessions, ...t }) => ({
      ...t,
      sessionStatus: attemptSessions[0]?.status ?? null,
    }));
  }

  // GET /tests/:id — багшид бүрэн бүтэц, сурагчид зөвхөн интро мета
  // (бодлогууд ЗӨВХӨН session эхэлсний дараа очно — урьдчилж харах цоорхойг хаана)
  async getOne(testId: string, userId: string, role: Role) {
    if (TEACHER_ROLES.includes(role)) {
      const test = await this.prisma.test.findUnique({
        where: { id: testId },
        include: {
          problems: {
            orderBy: { order: 'asc' },
            include: {
              problem: {
                select: {
                  id: true,
                  token: true,
                  format: true,
                  statementText: true,
                  imageKey: true,
                  choices: true,
                },
              },
            },
          },
          access: true,
        },
      });
      if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
      return test;
    }

    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        problems: { select: { points: true } },
        access: true,
      },
    });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    await this.assertStudentAccess(test, userId);

    const [result, session] = await Promise.all([
      this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      }),
      this.prisma.testAttemptSession.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { status: true, deadlineAt: true },
      }),
    ]);

    return {
      id: test.id,
      title: test.title,
      type: test.type,
      gradingMode: test.gradingMode,
      timeLimitMin: test.timeLimitMin,
      variantLabel: test.variantLabel,
      problemCount: test.problems.length,
      totalPoints: test.problems.reduce((s, p) => s + p.points, 0),
      myResult: result,
      sessionStatus: session?.status ?? null,
    };
  }

  // ============ Session-т суурилсан шалгалт (Шийдвэр 2) ============

  // Шалгалт эхлэх / үргэлжлүүлэх. Session нэг л удаа үүсч дараалал нь хөлдөнө;
  // дахин дуудахад ижил дараалал, хадгалсан хариулт, үлдсэн хугацаа буцна.
  async start(testId: string, userId: string) {
    const test = await this.loadTestWithProblems(testId);
    if (test.gradingMode === TestGradingMode.MANUAL) {
      throw new BadRequestException(
        'Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөхгүй.',
      );
    }
    if (test.problems.length === 0) {
      throw new BadRequestException('Энэ тестэд бодлого оруулаагүй байна');
    }
    await this.assertStudentAccess(test, userId);

    let session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;

    if (!session) {
      // Цаасан дүн аль хэдийн орсон бол онлайнаар дахин өгөхгүй
      const existing = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
      });
      if (existing) {
        return {
          session: { status: AttemptSessionStatus.SUBMITTED },
          result: {
            totalScore: existing.totalScore,
            maxScore: existing.maxScore,
          },
        };
      }

      const seed = randomInt(1, 2 ** 31);
      const gradables = test.problems.map(toGradable);
      const choiceOrder = buildChoiceOrder(gradables, seed);
      const problemOrder = test.problems.map((tp) => tp.problemId);
      const now = new Date();
      try {
        session = (await this.prisma.testAttemptSession.create({
          data: {
            testId,
            studentId: userId,
            seed,
            problemOrder,
            choiceOrder: choiceOrder as Prisma.InputJsonValue,
            deadlineAt: test.timeLimitMin
              ? new Date(now.getTime() + test.timeLimitMin * 60_000)
              : null,
          },
        })) as SessionRow;
      } catch (e) {
        // Зэрэг хоёр төхөөрөмжөөс эхлүүлсэн race — байгаа session-ийг авна
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          session = (await this.prisma.testAttemptSession.findUnique({
            where: { testId_studentId: { testId, studentId: userId } },
          })) as SessionRow;
        } else throw e;
      }
    }

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      const result = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      });
      return { session: { status: session.status }, result };
    }

    // Хугацаа хэтэрсэн бол сүүлийн draft-аар автоматаар дүгнэнэ
    if (this.isExpired(session)) {
      const { result } = await this.finalize(test, session, userId);
      return {
        session: { status: AttemptSessionStatus.SUBMITTED },
        result: { totalScore: result.totalScore, maxScore: result.maxScore },
      };
    }

    return {
      test: {
        id: test.id,
        title: test.title,
        variantLabel: test.variantLabel,
        gradingMode: test.gradingMode,
        timeLimitMin: test.timeLimitMin,
      },
      session: this.sessionView(session),
      problems: this.buildProblemViews(test.problems, session),
    };
  }

  // Heartbeat: сурагч "амьд байна" тэмдэглээлдээ (хэрэглэгчийн үйл явдал бүртгэлээд).
  // Бичих үйлдэл хийхгүй, зөвхөн амьдралт статус. Хугацаа хэтэрсэн бол SUBMITTED буцаана.
  async heartbeat(testId: string, userId: string, event?: string) {
    const session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      const result = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      });
      return { status: session.status, result, remainingSec: null };
    }

    // Хугацаа хэтэрсэн бол эцсийн дүгнэлт хийнэ (өөрөөс үүдэлтэй)
    if (this.isExpired(session)) {
      const test = await this.loadTestWithProblems(testId);
      const { result } = await this.finalize(test, session, userId);
      return {
        status: AttemptSessionStatus.SUBMITTED,
        result: { totalScore: result.totalScore, maxScore: result.maxScore },
        remainingSec: null,
      };
    }

    // Үйл явдал log, session өөрчилл БҮҮ (зөвхөн амьдралт)
    if (event) {
      const events = Array.isArray(session.events)
        ? [...(session.events as unknown[])]
        : [];
      events.push({ t: new Date().toISOString(), type: event });
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

      await this.prisma.testAttemptSession.update({
        where: { id: session.id },
        data: { events: events as Prisma.InputJsonValue },
      });
    }

    return {
      status: session.status,
      leaveCount: session.leaveCount,
      remainingSec: this.remainingSec(session.deadlineAt),
    };
  }

  // Autosave: хариулт/тэмдэглэгээ/хугацааг нэгтгэж хадгална, үйл явдал бүртгэнэ.
  // Хугацаа дууссан байвал шууд дүгнэж SUBMITTED буцаана (клиент үр дүн рүү шилжинэ).
  /**
   * ⚡ ГҮЙЦЭТГЭЛИЙН ГОЛ ЗАМ. Автосэйв нь сурагч тутамд ~1.2 секунд тутам,
   * 100 минутын шалгалтад ~300 удаа дуудагдана. 1000 сурагч зэрэг шалгалт
   * өгвөл энэ нь тогтмол ~50 хүсэлт/сек.
   *
   * Өмнө нь энд loadTestWithProblems() дуудагдаж, ДУУДАЛТ БҮРТ 40 бодлогын
   * бүтэн текст, choices, correctAnswer, бүх choiceOptions, analysis.
   * solutionOutline-ыг DB-ээс татдаг байв — гэтэл үүнийг ЗӨВХӨН бодлогын
   * id-нуудыг шалгахад ашигладаг (mergeDrafts → validIds).
   *
   * Одоо хөнгөн query-гээр зөвхөн problemId-г татна. Бүтэн тест зөвхөн
   * хугацаа дуусаж finalize хийх үед л (сурагч тутамд ХАМГИЙН ИХДЭЭ 1 удаа)
   * ачаалагдана.
   */
  private loadTestProblemIds(testId: string) {
    return this.prisma.testProblem.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      select: { problemId: true },
    });
  }

  async saveSession(testId: string, userId: string, dto: SaveSessionDto) {
    const [problemRefs, session] = await Promise.all([
      this.loadTestProblemIds(testId),
      this.prisma.testAttemptSession.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
      }) as Promise<SessionRow | null>,
    ]);
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      const result = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      });
      return { status: session.status, result };
    }

    const merged = this.mergeDrafts(problemRefs, session, dto);

    if (this.isExpired(session)) {
      // Зөвхөн ЭНД бүтэн тест хэрэгтэй — оноо бодоход хариун түлхүүр шаардлагатай.
      const test = await this.loadTestWithProblems(testId);
      const { result } = await this.finalize(test, session, userId, merged);
      return {
        status: AttemptSessionStatus.SUBMITTED,
        result: { totalScore: result.totalScore, maxScore: result.maxScore },
      };
    }

    const updated = await this.prisma.testAttemptSession.update({
      where: { id: session.id },
      data: {
        draftAnswers: merged.answers as Prisma.InputJsonValue,
        draftStates: merged.states as Prisma.InputJsonValue,
        problemTimes: merged.times as Prisma.InputJsonValue,
        leaveCount: merged.leaveCount,
        events: merged.events as Prisma.InputJsonValue,
      },
      select: { leaveCount: true, deadlineAt: true, status: true },
    });

    return {
      status: updated.status,
      leaveCount: updated.leaveCount,
      remainingSec: this.remainingSec(updated.deadlineAt),
    };
  }

  // Эцсийн илгээлт — сүүлд ирсэн өөрчлөлтийг нэгтгээд дүгнэнэ (idempotent)
  async submit(testId: string, dto: SaveSessionDto, userId: string) {
    const test = await this.loadTestWithProblems(testId);
    if (test.gradingMode === TestGradingMode.MANUAL) {
      throw new BadRequestException(
        'Энэ тестийн хариу баталгаажаагүй тул авто оноо бодохгүй. Багш дүнг гараар оруулна.',
      );
    }
    await this.assertStudentAccess(test, userId);
    const session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      throw new ConflictException('Та энэ тестийг аль хэдийн өгсөн байна');
    }

    const merged = this.mergeDrafts(test.problems, session, dto);
    return this.finalize(test, session, userId, merged);
  }

  // Дууссан шалгалтын эргэн харах дэлгэц: бодлого бүрд ✓/✗ + өөрийн хариулт.
  // Зөв хариуг задлахгүй (тест дахин ашиглагдана) — зөвхөн юуг алдсанаа харна.
  async review(testId: string, userId: string) {
    const test = await this.loadTestWithProblems(testId);
    const session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;
    if (!session || session.status !== AttemptSessionStatus.SUBMITTED) {
      throw new NotFoundException('Дууссан шалгалт олдсонгүй');
    }
    const result = await this.prisma.testResult.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
      select: { totalScore: true, maxScore: true, createdAt: true },
    });

    const byId = new Map(test.problems.map((tp) => [tp.problemId, tp]));
    const orderIds = (session.problemOrder as string[]).filter((id) =>
      byId.has(id),
    );
    const answers = asRecord(session.draftAnswers);
    const choiceOrder = asRecord(session.choiceOrder) as Record<
      string,
      number[]
    >;

    const items = orderIds.map((pid, i) => {
      const tp = byId.get(pid)!;
      const g = toGradable(tp);
      const raw = answers[pid];
      const { correct, canonicalAnswer } = gradeAnswer(
        g,
        raw,
        choiceOrder[pid],
      );
      const answered =
        raw !== undefined && raw !== null && answerToken(raw) !== '';
      // Бодолт зөвхөн VERIFIED статустай үед нээгдэнэ — AI/авто ноорог задрахгүй
      const a = tp.problem.analysis;
      return {
        n: i + 1,
        points: tp.points,
        chapterId: tp.problem.chapter.id,
        chapterTitle: tp.problem.chapter.title,
        statementText: tp.problem.statementText,
        imageKey: tp.problem.imageKey,
        answered,
        correct: answered ? correct : false,
        // Импортын явцад хариу тодорхойгүй үлдсэн бодлого (жиш: 300x300,
        // эх docx-д хариуны түлхүүр байгаагүй) — review дэлгэц дээр "буруу"
        // гэж бүү харуул, учир нь бид ч мэдэхгүй.
        answerUnknown: !hasKnownAnswer(g),
        // canonicalAnswer нь gradeAnswer-ийн бүх салбарт string|null (харуулах
        // зориулалттай тул answerToken (жижиг үсэг рүү хөрвүүлдэг) ашиглахгүй)
        myAnswer: answered
          ? typeof canonicalAnswer === 'string'
            ? canonicalAnswer
            : ''
          : null,
        solution:
          a?.status === 'VERIFIED' && a.solutionOutline
            ? a.solutionOutline
            : null,
      };
    });

    return { result, items, leaveCount: session.leaveCount };
  }

  // ============ Багшийн хэсэг (өөрчлөлтгүй үлдсэн урсгалууд) ============

  // Сэдвийн бүлгийн шалгалт (36+4 цаасан) — багш дүн оруулна
  async enterResult(
    testId: string,
    dto: EnterResultDto,
    userId: string,
    role: Role,
  ) {
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн багш дүн оруулна');
    }
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Тест олдсонгүй');

    return this.prisma.testResult.upsert({
      where: {
        testId_studentId: { testId, studentId: dto.studentId },
      },
      create: {
        testId,
        studentId: dto.studentId,
        totalScore: dto.totalScore,
        maxScore: dto.maxScore,
        enteredById: userId,
        source: AttemptSource.CHAPTER_EXAM,
      },
      update: {
        totalScore: dto.totalScore,
        maxScore: dto.maxScore,
        enteredById: userId,
      },
    });
  }

  // Багшийн «Шалгалтын дүн» хэсэг (SPEC §8) — тестээр нэгтгэсэн дүнгүүд
  async results(testId: string, userId: string, role: Role) {
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн багш нэгтгэл харна');
    }
    const rows = await this.prisma.testResult.findMany({
      where: { testId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { totalScore: 'desc' },
    });
    // Анти-чит: шалгалтын горимоос гарсан тоог багшид харуулна (Шийдвэр 3)
    const sessions = await this.prisma.testAttemptSession.findMany({
      where: { testId },
      select: { studentId: true, leaveCount: true },
    });
    const leaveBy = new Map(sessions.map((s) => [s.studentId, s.leaveCount]));
    return rows.map((r) => ({
      ...r,
      leaveCount: leaveBy.get(r.studentId) ?? null,
    }));
  }

  // Сурагчийн өөрийн дүнгүүд — эцэг эхэд мөн энэ өгөгдөл харагдана
  myResults(studentId: string) {
    return this.prisma.testResult.findMany({
      where: { studentId },
      include: {
        test: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // TEACHER зөвхөн өөрийн ангийн сурагчийг харна; TEACHER_PLUS/ADMIN бүх
  // сурагчийг харна (activity.service.ts-ийн assertStudentAccess-тэй ижил
  // хэв маяг — SPEC §13).
  private async assertStaffStudentAccess(
    studentId: string,
    userId: string,
    role: Role,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return student;
    if (role === Role.TEACHER) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          leftAt: null,
          classroom: { teacherId: userId },
        },
      });
      if (enrollment) return student;
    }
    throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
  }

  // Багш/Админ: тухайн сурагчийн шалгалтын бүх дүн — "Бие даасан явц" таб
  async resultsForStudent(studentId: string, userId: string, role: Role) {
    await this.assertStaffStudentAccess(studentId, userId, role);
    return this.prisma.testResult.findMany({
      where: { studentId },
      include: {
        test: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Дотоод туслахууд ============

  private async loadTestWithProblems(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        problems: {
          orderBy: { order: 'asc' },
          include: {
            problem: {
              select: {
                id: true,
                format: true,
                statementText: true,
                imageKey: true,
                choices: true,
                correctAnswer: true,
                attemptCount: true,
                correctRate: true,
                choiceOptions: {
                  select: { order: true, text: true, isCorrect: true },
                },
                // Бодолт: зөвхөн багш баталгаажуулсныг review-д үзүүлнэ (Шийдвэр Д)
                analysis: {
                  select: { status: true, solutionOutline: true },
                },
                // Сэдвийн задаргаа харуулахын тулд chapter-ийг оруулнэ
                chapter: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
        access: true,
      },
    });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    return test;
  }

  // Ангийн (Enrollment + TestAccess) ЭСВЭЛ хүчинтэй эрхийн (UserPass.scope,
  // Bug 2 fix) ЭСВЭЛ нэг удаагийн худалдан авалт (Purchase) аль нэгээр
  // нэвтэрсэн байхыг шаардана.
  private async assertStudentAccess(
    test: {
      id: string;
      chapterId: string | null;
      access: { classroomId: string }[];
    },
    userId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: userId, leftAt: null },
    });
    if (
      enrollment &&
      test.access.some((a) => a.classroomId === enrollment.classroomId)
    ) {
      return;
    }

    let bookId: string | null = null;
    if (test.chapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: test.chapterId },
        select: { bookId: true },
      });
      bookId = chapter?.bookId ?? null;
    }
    const viaPass = await hasCoveringPass(this.prisma, userId, {
      testId: test.id,
      chapterId: test.chapterId,
      bookId,
    });
    if (viaPass) {
      return;
    }

    // Нэг удаагийн худалдан авалт: Purchase.kind=TEST, refId=test.id
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        userId,
        productItem: {
          kind: 'TEST',
          refId: test.id,
        },
      },
    });
    if (purchase && purchase.grantedAt) {
      return;
    }

    throw new ForbiddenException('Энэ тестийг худалдаж авууд эсвэл танай ангид оноогдоон байна');
  }

  private isExpired(session: SessionRow): boolean {
    return (
      !!session.deadlineAt &&
      Date.now() > session.deadlineAt.getTime() + GRACE_MS
    );
  }

  private remainingSec(deadlineAt: Date | null): number | null {
    if (!deadlineAt) return null;
    return Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / 1000));
  }

  private sessionView(session: SessionRow) {
    return {
      status: session.status,
      startedAt: session.startedAt,
      remainingSec: this.remainingSec(session.deadlineAt),
      leaveCount: session.leaveCount,
      draftAnswers: asRecord(session.draftAnswers),
      draftStates: asRecord(session.draftStates),
    };
  }

  // Сурагчид очих бодлогын харагдац: token/зөв хариу байхгүй, сонголтууд
  // session-д хөлдсөн дарааллаар (Шийдвэр 2, 6)
  private buildProblemViews(problems: TestProblemRow[], session: SessionRow) {
    const byId = new Map(problems.map((tp) => [tp.problemId, tp]));
    const orderIds = (session.problemOrder as string[]).filter((id) =>
      byId.has(id),
    );
    const choiceOrder = asRecord(session.choiceOrder) as Record<
      string,
      number[]
    >;

    return orderIds.map((pid) => {
      const tp = byId.get(pid)!;
      const g = toGradable(tp);
      const mode = choiceModeOf(g);
      let choices: string[] | null = null;
      if (mode === 'TEXT') {
        const texts = choiceTextsOf(g);
        const perm = choiceOrder[pid];
        choices = perm ? perm.map((origIdx) => texts[origIdx]) : texts;
      } else if (mode === 'LETTER') {
        choices = choiceTextsOf(g); // үсгүүд, байрлал хөдлөхгүй
      }
      return {
        id: pid,
        format: tp.problem.format,
        statementText: tp.problem.statementText,
        imageKey: tp.problem.imageKey,
        points: tp.points,
        choiceMode: mode,
        choices,
      };
    });
  }

  // dto-г session-ий draft дээр нэгтгэнэ. Зөвхөн тестийн бодлогын түлхүүрүүдийг
  // хүлээн авна (халдлагаар дурын түлхүүр шахахаас хамгаална).
  // Зөвхөн problemId л хэрэгтэй тул хөнгөн төрөл хүлээж авна — ингэснээр
  // автосэйвийн зам бүтэн TestProblemRow ачаалах шаардлагагүй болно.
  private mergeDrafts(
    problems: { problemId: string }[],
    session: SessionRow,
    dto: SaveSessionDto,
  ) {
    const validIds = new Set(problems.map((tp) => tp.problemId));
    const answers = { ...asRecord(session.draftAnswers) };
    const states = { ...asRecord(session.draftStates) };
    const times = { ...asRecord(session.problemTimes) };

    for (const [pid, v] of Object.entries(dto.answers ?? {})) {
      if (!validIds.has(pid)) continue;
      if (v === null || v === undefined || v === '') delete answers[pid];
      else if (typeof v === 'number' || typeof v === 'string') answers[pid] = v;
    }
    const validStates = new Set(Object.values(SelfState));
    for (const [pid, v] of Object.entries(dto.selfStates ?? {})) {
      if (validIds.has(pid) && validStates.has(v as SelfState)) states[pid] = v;
    }
    for (const [pid, v] of Object.entries(dto.problemTimes ?? {})) {
      if (!validIds.has(pid)) continue;
      const n = Math.round(Number(v));
      if (Number.isFinite(n) && n >= 0 && n <= 24 * 3600) times[pid] = n;
    }

    let leaveCount = session.leaveCount;
    const events = Array.isArray(session.events)
      ? [...(session.events as unknown[])]
      : [];
    if (dto.event) {
      if (dto.event === 'LEAVE' || dto.event === 'FULLSCREEN_EXIT') {
        leaveCount += 1;
      }
      events.push({ t: new Date().toISOString(), type: dto.event });
      if (events.length > MAX_EVENTS)
        events.splice(0, events.length - MAX_EVENTS);
    }

    return { answers, states, times, leaveCount, events };
  }

  // Эцсийн дүгнэлт: оноо бодох + TestResult + Attempt бичилтүүд + session хөлдөөх.
  //
  // ⚠️ ХОЁР ХЭСЭГТ САНААТАЙГААР ХУВААСАН (2026-08-08, 2000 зэрэг хэрэглэгчийн зорилт):
  //   1. АТОМИК — TestResult + Attempt.createMany + Session нэг $transaction([...])-д.
  //      Массив хэлбэр (interactive callback БИШ) тул Prisma нэг багцаар илгээж,
  //      холболтыг богино хугацаанд барина.
  //   2. ТУСДАА — Problem-ийн статистик нэг bulk UPDATE-ээр, transaction-оос ГАДНА.
  //      Өмнө нь 40+ бодлого × Problem.update() нь transaction-ыг 1-2 секунд барьж,
  //      зэрэг илгээх үед бусад сурагчийн бичилт дараалалд ордог байв.
  //      Статистик хоцорсон ч сурагчийн ДҮН зөв байх нь чухал тул алдааг зөвхөн
  //      log-д бичээд илгээлтийг унагаахгүй.
  private async finalize(
    test: Awaited<ReturnType<TestsService['loadTestWithProblems']>>,
    session: SessionRow,
    studentId: string,
    merged?: ReturnType<TestsService['mergeDrafts']>,
  ) {
    const m = merged ?? {
      answers: asRecord(session.draftAnswers),
      states: asRecord(session.draftStates),
      times: asRecord(session.problemTimes),
      leaveCount: session.leaveCount,
      events: Array.isArray(session.events)
        ? (session.events as unknown[])
        : [],
    };

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
    });
    const choiceOrder = asRecord(session.choiceOrder) as Record<
      string,
      number[]
    >;

    let totalScore = 0;
    // Хариу тодорхойгүй (импортын явцад ANSWER_KEY_MISSING) бодлогыг дүнгийн
    // хуваарьт оруулахгүй — эс тэгвээс сурагч зөв бичсэн ч "буруу" гэж
    // тооцогдож, дүнгийн хувь шударга бус болно.
    const maxScore = test.problems.reduce(
      (s, tp) => (hasKnownAnswer(toGradable(tp)) ? s + tp.points : s),
      0,
    );
    const graded: { problemId: string; correct: boolean; points: number }[] =
      [];
    const attempts: Prisma.AttemptCreateManyInput[] = [];
    const statUpdates: { id: string; correct: boolean }[] = [];
    const occurredOn = todayUB();

    for (const tp of test.problems) {
      const pid = tp.problemId;
      const raw = m.answers[pid];
      const selfState = m.states[pid] as SelfState | undefined;
      const answered =
        raw !== undefined && raw !== null && answerToken(raw) !== '';

      const gradable = toGradable(tp);
      const known = hasKnownAnswer(gradable);
      // canonicalAnswer — сурагчийн сонгосон ЖИНХЭНЭ утга (сонголтын текст
      // эсвэл тоон хариу). Холилтын дараалалаас ҮЛ ХАМААРНА тул дараа нь
      // сессийн choiceOrder байхгүй ч тайлагдана.
      const { correct, canonicalAnswer } = gradeAnswer(
        gradable,
        raw,
        choiceOrder[pid],
      );
      if (answered && correct && known) totalScore += tp.points;
      graded.push({
        problemId: pid,
        correct: answered && correct && known,
        points: tp.points,
      });

      // Attempt зөвхөн бодит үйлдэлтэй бодлогод — хоосон мөрөөр дата бохирдуулахгүй
      if (answered || selfState) {
        attempts.push({
          studentId,
          problemId: pid,
          source: AttemptSource.ONLINE_TEST,
          occurredOn,
          autoCorrect: answered && known ? correct : null,
          // Хариулаагүй бол JsonNull — Prisma-д `undefined` нь «талбарыг
          // алгас» гэсэн утгатай тул тэднийг ялгах ЁСТОЙ (STATUS.md §7 урхи).
          givenAnswer: answered
            ? ((canonicalAnswer ?? Prisma.JsonNull) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          selfState: selfState ?? null,
          timeSpentSec: typeof m.times[pid] === 'number' ? m.times[pid] : null,
          testId: test.id,
          classroomId: enrollment?.classroomId ?? null,
        });
      }
      // Хариу тодорхойгүй бодлогыг Problem.correctRate/attemptCount
      // статистикт оруулахгүй (тухайн бодлогын чанарыг буруу муутгахгүй)
      if (answered && known) statUpdates.push({ id: pid, correct });
    }

    const now = new Date();

    // АТОМИК хэсэг: TestResult, Attempt, Session нэг transaction-д
    const [result] = await this.prisma.$transaction([
      this.prisma.testResult.upsert({
        where: {
          testId_studentId: { testId: test.id, studentId },
        },
        create: {
          testId: test.id,
          studentId,
          totalScore,
          maxScore,
          source: AttemptSource.ONLINE_TEST,
        },
        // Цаасан дүн аль хэдийн орсон бол дарж бичихгүй (өөрчлөлтгүй update)
        update: {},
      }),
      this.prisma.attempt.createMany({ data: attempts }),
      this.prisma.testAttemptSession.update({
        where: { id: session.id },
        data: {
          status: AttemptSessionStatus.SUBMITTED,
          submittedAt: now,
          draftAnswers: m.answers as Prisma.InputJsonValue,
          draftStates: m.states as Prisma.InputJsonValue,
          problemTimes: m.times as Prisma.InputJsonValue,
          leaveCount: m.leaveCount,
          events: m.events as Prisma.InputJsonValue,
        },
      }),
    ]);

    // ТУСДАА: Problem статистик (дүгнэлт хадгалагдсаны дараа).
    // Алдаа гарвал сурагчийн илгээлтийг унагаахгүй, зөвхөн log.
    if (statUpdates.length > 0) {
      try {
        await this.prisma.$executeRaw`
          UPDATE "Problem" AS p
          SET "attemptCount" = p."attemptCount" + 1,
              -- correctRate нь double precision тул ROUND(x, n)-д шууд
              -- өгч болохгүй (тэр функц зөвхөн numeric-д байдаг) —
              -- numeric руу cast хийж бөөрөнхийлөөд буцааж хөрвүүлнэ.
              "correctRate" = ROUND(
                (
                  (
                    (COALESCE(p."correctRate", 0) * p."attemptCount")
                    + v.correct
                  ) / (p."attemptCount" + 1)
                )::numeric,
                3
              )::double precision
          FROM (
            VALUES ${Prisma.join(
              statUpdates.map(
                ({ id, correct }) =>
                  Prisma.sql`(${id}, ${correct ? 1 : 0}::numeric)`,
              ),
            )}
          ) AS v(id, correct)
          WHERE p.id = v.id
        `;
      } catch (error) {
        // Log маш урвалгүй — статистик хадгалагдаагүй ч сурагчийн дүн хэвээр байна
        console.error(
          '[Problem Stats Update Failed]',
          'testId:',
          test.id,
          'studentId:',
          studentId,
          'error:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return { result, graded };
  }
}
