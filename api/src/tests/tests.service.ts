import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  AttemptSource,
  Role,
  TestGradingMode,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { SubmitTestDto } from './dto/submit-test.dto';

const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

// Хариу харьцуулалт: CHOICE — стринг (A–E), FILL_NUMBER — string эсвэл объект.
function answerToken(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value).trim().toLowerCase();
  }
  return JSON.stringify(value).trim().toLowerCase();
}

// Тоон хариуг канон хэлбэрт оруулна (аравтын тэг, сөрөг тэмдгийг жигдрүүлнэ):
// "4" == "4.0", "-3.50" == "-3.5", "+5" == "5". Тоо биш бол null.
function asNumber(token: string): number | null {
  if (token === '' || !/^[-+]?\d*\.?\d+$/.test(token)) return null;
  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

// Нэг утга тэнцэх эсэх: эхлээд тоон, дараа нь стринг харьцуулалт.
function tokensMatch(correct: unknown, given: unknown): boolean {
  const a = answerToken(correct);
  const b = answerToken(given);
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null && nb !== null) return na === nb; // decimal/сөрөг тоог тоогоор
  return a === b;
}

function answersEqual(correct: unknown, given: unknown): boolean {
  // Хариу түлхүүр байхгүй бол авто оноо өгөхгүй (хуурамч хариу зохиохгүй).
  if (correct === null || correct === undefined || correct === '') return false;
  if (given === null || given === undefined) return false;
  if (typeof correct === 'object' && typeof given === 'object') {
    const c = correct as Record<string, unknown>;
    const g = given as Record<string, unknown>;
    const keys = Object.keys(c);
    if (keys.length === 0) return false;
    return keys.every((k) => tokensMatch(c[k], g[k]));
  }
  return tokensMatch(correct, given);
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
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: userId, leftAt: null },
    });
    if (!enrollment) return [];
    return this.prisma.test.findMany({
      where: {
        access: { some: { classroomId: enrollment.classroomId } },
      },
      select: {
        id: true,
        title: true,
        type: true,
        gradingMode: true,
        timeLimitMin: true,
        pdfKey: true,
        variantLabel: true,
        createdAt: true,
        _count: { select: { problems: true } },
        results: {
          where: { studentId: userId },
          select: { totalScore: true, maxScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Сурагч тест ажиллахаар нээнэ — хариунууд нуугдана
  async getForTaking(testId: string, userId: string, role: Role) {
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

    if (!TEACHER_ROLES.includes(role)) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: userId, leftAt: null },
      });
      const allowed =
        enrollment &&
        test.access.some((a) => a.classroomId === enrollment.classroomId);
      if (!allowed) {
        throw new ForbiddenException('Энэ тест танай ангид оноогдоогүй байна');
      }
    }
    return {
      id: test.id,
      title: test.title,
      type: test.type,
      gradingMode: test.gradingMode,
      chapterId: test.chapterId,
      timeLimitMin: test.timeLimitMin,
      pdfKey: test.pdfKey,
      price: test.price,
      groupKey: test.groupKey,
      variantLabel: test.variantLabel,
      createdById: test.createdById,
      createdAt: test.createdAt,
      problems: test.problems,
    };
  }

  // Онлайн тест илгээх: авто дүн + Attempt бичилт (аналитикийн 2-р суваг, SPEC §9.2)
  async submit(testId: string, dto: SubmitTestDto, userId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { problems: { include: { problem: true } }, access: true },
    });
    if (!test) throw new NotFoundException('Тест олдсонгүй');

    if (test.gradingMode === TestGradingMode.MANUAL) {
      throw new BadRequestException(
        'Энэ тестийн хариу баталгаажаагүй тул авто оноо бодохгүй. Багш дүнг гараар оруулна.',
      );
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: userId, leftAt: null },
    });
    const allowed =
      enrollment &&
      test.access.some((a) => a.classroomId === enrollment.classroomId);
    if (!allowed) {
      throw new ForbiddenException('Энэ тест танай ангид оноогдоогүй байна');
    }

    const existing = await this.prisma.testResult.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    });
    if (existing) {
      throw new ConflictException('Та энэ тестийг аль хэдийн өгсөн байна');
    }

    const byProblem = new Map(test.problems.map((tp) => [tp.problemId, tp]));
    let totalScore = 0;
    const maxScore = test.problems.reduce((s, tp) => s + tp.points, 0);
    const today = new Date(new Date().toISOString().slice(0, 10));

    const attempts: Prisma.AttemptCreateManyInput[] = [];
    const graded: { problemId: string; correct: boolean; points: number }[] =
      [];

    for (const ans of dto.answers) {
      const tp = byProblem.get(ans.problemId);
      if (!tp) {
        throw new BadRequestException(
          `Бодлого ${ans.problemId} энэ тестэд байхгүй`,
        );
      }
      const correct = answersEqual(tp.problem.correctAnswer, ans.answer);
      if (correct) totalScore += tp.points;
      graded.push({ problemId: ans.problemId, correct, points: tp.points });
      attempts.push({
        studentId: userId,
        problemId: ans.problemId,
        source: AttemptSource.ONLINE_TEST,
        occurredOn: today,
        autoCorrect: correct,
        selfState: ans.selfState,
        timeSpentSec: ans.timeSpentSec,
        testId,
        classroomId: enrollment.classroomId,
      });
    }

    const [result] = await this.prisma.$transaction([
      this.prisma.testResult.create({
        data: {
          testId,
          studentId: userId,
          totalScore,
          maxScore,
          source: AttemptSource.ONLINE_TEST,
        },
      }),
      this.prisma.attempt.createMany({ data: attempts }),
      // Бодлогын статистик шинэчлэгдэнэ — хүндийн зэрэг датанаас тодорно (SPEC §9.3)
      ...graded.map((g) =>
        this.prisma.problem.update({
          where: { id: g.problemId },
          data: { attemptCount: { increment: 1 } },
        }),
      ),
    ]);

    return { result, graded };
  }

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
    return this.prisma.testResult.findMany({
      where: { testId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { totalScore: 'desc' },
    });
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
}
