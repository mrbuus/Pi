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
  TestGradingMode,
} from '../generated/prisma/enums';
import { todayUB } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { SaveSessionDto } from './dto/submit-test.dto';
import {
  buildChoiceOrder,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
} from './grading';

const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

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

  async create(dto: CreateTestDto, userId: string) {
    return this.prisma.test.create({
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
  }

  // Багш бүгдийг, сурагч зөвхөн ангидаа оноогдсон тестүүдийг харна
  async list(userId: string, role: Role) {
    if (TEACHER_ROLES.includes(role)) {
      return this.prisma.test.findMany({
        include: {
          _count: { select: { problems: true, results: true } },
          access: { include: { classroom: { select: { name: true } } } },
          chapter: { select: { book: { select: { code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: userId, leftAt: null },
    });
    if (!enrollment) return [];
    const rows = await this.prisma.test.findMany({
      where: {
        access: { some: { classroomId: enrollment.classroomId } },
      },
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
      if (!test) throw new NotFoundException('Тест олдсонгүй');
      return test;
    }

    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        problems: { select: { points: true } },
        access: true,
      },
    });
    if (!test) throw new NotFoundException('Тест олдсонгүй');
    await this.assertStudentAccess(testId, userId, test.access);

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
    await this.assertStudentAccess(testId, userId, test.access);

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

  // Autosave: хариулт/тэмдэглэгээ/хугацааг нэгтгэж хадгална, үйл явдал бүртгэнэ.
  // Хугацаа дууссан байвал шууд дүгнэж SUBMITTED буцаана (клиент үр дүн рүү шилжинэ).
  async saveSession(testId: string, userId: string, dto: SaveSessionDto) {
    const test = await this.loadTestWithProblems(testId);
    const session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      const result = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      });
      return { status: session.status, result };
    }

    const merged = this.mergeDrafts(test.problems, session, dto);

    if (this.isExpired(session)) {
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
        raw !== undefined && raw !== null && String(raw) !== '';
      // Бодолт зөвхөн VERIFIED статустай үед нээгдэнэ — AI/авто ноорог задрахгүй
      const a = tp.problem.analysis;
      return {
        n: i + 1,
        points: tp.points,
        statementText: tp.problem.statementText,
        imageKey: tp.problem.imageKey,
        answered,
        correct: answered ? correct : false,
        // Импортын явцад хариу тодорхойгүй үлдсэн бодлого (жиш: 300x300,
        // эх docx-д хариуны түлхүүр байгаагүй) — review дэлгэц дээр "буруу"
        // гэж бүү харуул, учир нь бид ч мэдэхгүй.
        answerUnknown: !hasKnownAnswer(g),
        myAnswer: answered ? String(canonicalAnswer ?? '') : null,
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
              },
            },
          },
        },
        access: true,
      },
    });
    if (!test) throw new NotFoundException('Тест олдсонгүй');
    return test;
  }

  private async assertStudentAccess(
    testId: string,
    userId: string,
    access: { classroomId: string }[],
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: userId, leftAt: null },
    });
    const allowed =
      enrollment &&
      access.some((a) => a.classroomId === enrollment.classroomId);
    if (!allowed) {
      throw new ForbiddenException('Энэ тест танай ангид оноогдоогүй байна');
    }
    return enrollment;
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
  private mergeDrafts(
    problems: TestProblemRow[],
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
      else if (typeof v === 'number' || typeof v === 'string')
        answers[pid] = v;
    }
    const validStates = new Set(Object.values(SelfState));
    for (const [pid, v] of Object.entries(dto.selfStates ?? {})) {
      if (validIds.has(pid) && validStates.has(v as SelfState))
        states[pid] = v;
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
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    }

    return { answers, states, times, leaveCount, events };
  }

  // Эцсийн дүгнэлт: оноо бодох + TestResult + Attempt бичилтүүд + бодлогын
  // статистик + session хөлдөөх — бүгд нэг transaction-д.
  private async finalize(
    test: Awaited<ReturnType<TestsService['loadTestWithProblems']>>,
    session: SessionRow,
    studentId: string,
    merged?: ReturnType<TestsService['mergeDrafts']>,
  ) {
    const m =
      merged ??
      ({
        answers: asRecord(session.draftAnswers),
        states: asRecord(session.draftStates),
        times: asRecord(session.problemTimes),
        leaveCount: session.leaveCount,
        events: Array.isArray(session.events)
          ? (session.events as unknown[])
          : [],
      } as ReturnType<TestsService['mergeDrafts']>);

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
      const answered = raw !== undefined && raw !== null && String(raw) !== '';

      const gradable = toGradable(tp);
      const known = hasKnownAnswer(gradable);
      const { correct } = gradeAnswer(gradable, raw, choiceOrder[pid]);
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
          selfState: selfState ?? null,
          timeSpentSec:
            typeof m.times[pid] === 'number' ? (m.times[pid] as number) : null,
          testId: test.id,
          classroomId: enrollment?.classroomId ?? null,
        });
      }
      // Хариу тодорхойгүй бодлогыг Problem.correctRate/attemptCount
      // статистикт оруулахгүй (тухайн бодлогын чанарыг буруу муутгахгүй)
      if (answered && known) statUpdates.push({ id: pid, correct });
    }

    const byId = new Map(test.problems.map((tp) => [tp.problemId, tp.problem]));
    const now = new Date();

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
      // Бодлогын статистик: attemptCount + correctRate датанаас шинэчлэгдэнэ (SPEC §9.3)
      ...statUpdates.map(({ id, correct }) => {
        const p = byId.get(id)!;
        const oldCount = p.attemptCount;
        const oldRate = p.correctRate ?? 0;
        const newRate =
          (oldRate * oldCount + (correct ? 1 : 0)) / (oldCount + 1);
        return this.prisma.problem.update({
          where: { id },
          data: {
            attemptCount: { increment: 1 },
            correctRate: Math.round(newRate * 1000) / 1000,
          },
        });
      }),
    ]);

    return { result, graded };
  }
}
