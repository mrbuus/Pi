import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, SelfState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

function todayUB(): Date {
  return new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(
      new Date(),
    ),
  );
}

/**
 * Анги тухайн өдөр ямар тест хийснийг багш бүртгэдэг, сурагч түүнийгээ оройн
 * тэмдэглэгээндээ token мэдэхгүйгээр шууд хардаг урсгалыг хариуцна.
 */
@Injectable()
export class ClassSessionsService {
  constructor(private prisma: PrismaService) {}

  private async assertClassAccess(
    classroomId: string,
    userId: string,
    role: Role,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return;
    if (role === Role.TEACHER && classroom.teacherId === userId) return;
    throw new ForbiddenException('Энэ ангид хандах эрхгүй');
  }

  // Багш: "энэ анги өнөөдөр энэ тестийг хийсэн"
  async recordDidTest(
    classroomId: string,
    testId: string,
    dateStr: string | undefined,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Тест олдсонгүй');
    const date = dateStr ? new Date(dateStr) : todayUB();

    return this.prisma.classTestSession.upsert({
      where: { classroomId_testId_date: { classroomId, testId, date } },
      create: { classroomId, testId, date, createdById: userId },
      update: {},
    });
  }

  // Багш: ангийн бүртгэсэн тестүүд + бодлогууд (аль нь орсон/хассаныг тэмдэглэх)
  async listForClass(classroomId: string, userId: string, role: Role) {
    await this.assertClassAccess(classroomId, userId, role);
    const sessions = await this.prisma.classTestSession.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
      take: 30,
    });
    const tests = await this.prisma.test.findMany({
      where: { id: { in: sessions.map((s) => s.testId) } },
      include: {
        problems: {
          orderBy: { order: 'asc' },
          include: {
            problem: { select: { id: true, token: true } },
          },
        },
      },
    });
    const byId = new Map(tests.map((t) => [t.id, t]));
    return sessions.map((s) => {
      const test = byId.get(s.testId);
      const excluded = new Set(s.excludedProblemIds);
      return {
        id: s.id,
        date: s.date,
        excludedProblemIds: s.excludedProblemIds,
        test: test
          ? {
              id: test.id,
              title: test.title,
              problems: test.problems.map((tp, i) => ({
                index: i + 1,
                problemId: tp.problemId,
                token: tp.problem.token,
                included: !excluded.has(tp.problemId),
              })),
            }
          : null,
      };
    });
  }

  // Багш: тухайн сессэд аль бодлогуудыг ХАССАНЫГ тэмдэглэнэ (excluded жагсаалт)
  async setExcluded(
    sessionId: string,
    excludedProblemIds: string[],
    userId: string,
    role: Role,
  ) {
    const session = await this.prisma.classTestSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Бүртгэл олдсонгүй');
    await this.assertClassAccess(session.classroomId, userId, role);
    return this.prisma.classTestSession.update({
      where: { id: sessionId },
      data: { excludedProblemIds },
    });
  }

  async remove(sessionId: string, userId: string, role: Role) {
    const session = await this.prisma.classTestSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Бүртгэл олдсонгүй');
    await this.assertClassAccess(session.classroomId, userId, role);
    await this.prisma.classTestSession.delete({ where: { id: sessionId } });
    return { removed: true };
  }

  // Сурагч: сүүлийн өдрүүдэд ангид хийсэн тестүүд + бодлогууд + миний тэмдэглэгээ.
  // Token мэдэх шаардлагагүй — хүүхэд цаасаа хараад бодлого бүрийг тэмдэглэнэ.
  async todoForStudent(studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
      select: { classroomId: true },
    });
    if (!enrollment) return [];

    // Сүүлийн 5 хоногийн тест сессүүд
    const since = todayUB();
    since.setDate(since.getDate() - 5);

    const sessions = await this.prisma.classTestSession.findMany({
      where: { classroomId: enrollment.classroomId, date: { gte: since } },
      orderBy: { date: 'desc' },
      take: 10,
    });
    if (sessions.length === 0) return [];

    const tests = await this.prisma.test.findMany({
      where: { id: { in: sessions.map((s) => s.testId) } },
      include: {
        problems: {
          orderBy: { order: 'asc' },
          include: {
            problem: {
              select: {
                id: true,
                token: true,
                statementText: true,
                imageKey: true,
              },
            },
          },
        },
      },
    });
    const testById = new Map(tests.map((t) => [t.id, t]));

    // Миний өмнө тэмдэглэсэн selfState-ууд
    const problemIds = tests.flatMap((t) => t.problems.map((p) => p.problemId));
    const myAttempts = await this.prisma.attempt.findMany({
      where: { studentId, problemId: { in: problemIds } },
      select: { problemId: true, selfState: true, occurredOn: true },
    });
    const stateKey = (pid: string, d: Date) =>
      `${pid}|${d.toISOString().slice(0, 10)}`;
    const myState = new Map<string, SelfState | null>(
      myAttempts.map((a) => [stateKey(a.problemId, a.occurredOn), a.selfState]),
    );

    return sessions
      .map((s) => {
        const test = testById.get(s.testId);
        if (!test) return null;
        // Багшийн хассан бодлогуудыг сурагчид харуулахгүй (дахин дугаарлана)
        const excluded = new Set(s.excludedProblemIds);
        const included = test.problems.filter(
          (tp) => !excluded.has(tp.problemId),
        );
        if (included.length === 0) return null;
        return {
          sessionId: s.id,
          date: s.date,
          test: { id: test.id, title: test.title },
          problems: included.map((tp, i) => ({
            index: i + 1,
            problemId: tp.problemId,
            token: tp.problem.token,
            statementText: tp.problem.statementText,
            imageKey: tp.problem.imageKey,
            myState: myState.get(stateKey(tp.problemId, s.date)) ?? null,
          })),
        };
      })
      .filter(Boolean);
  }
}
