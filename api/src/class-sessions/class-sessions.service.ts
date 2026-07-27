import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, SelfState, Subject } from '../generated/prisma/enums';
import {
  addDateDays,
  dateKey,
  daysBetweenDateOnly,
  parseDateOnly,
  todayUB,
} from '../common/date';
import { EVENING_MARKING_WINDOW_DAYS } from '../common/marking';
import { PrismaService } from '../prisma/prisma.service';

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
    let date = todayUB();
    if (dateStr) {
      try {
        date = parseDateOnly(dateStr);
      } catch {
        throw new BadRequestException('Огноо буруу байна');
      }
    }

    return this.prisma.classTestSession.upsert({
      where: { classroomId_testId_date: { classroomId, testId, date } },
      create: { classroomId, testId, date, createdById: userId },
      update: {},
    });
  }

  // Багш: ангийн бүртгэсэн тестүүд + бодлогууд (аль нь орсон/хассаныг тэмдэглэх)
  async listForClass(
    classroomId: string,
    userId: string,
    role: Role,
    subject?: Subject,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const sessions = await this.prisma.classTestSession.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
      take: 30,
    });
    const tests = await this.prisma.test.findMany({
      where: {
        id: { in: sessions.map((s) => s.testId) },
        ...(subject ? { chapter: { book: { subject } } } : {}),
      },
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
  async todoForStudent(studentId: string, subject?: Subject) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
      select: { classroomId: true },
    });
    if (!enrollment) return [];

    const today = todayUB();
    const since = addDateDays(today, -(EVENING_MARKING_WINDOW_DAYS - 1));

    const sessions = await this.prisma.classTestSession.findMany({
      where: {
        classroomId: enrollment.classroomId,
        date: { gte: since, lte: today },
      },
      orderBy: { date: 'desc' },
      take: 10,
    });
    if (sessions.length === 0) return [];

    const tests = await this.prisma.test.findMany({
      where: {
        id: { in: sessions.map((s) => s.testId) },
        ...(subject ? { chapter: { book: { subject } } } : {}),
      },
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
        const ageDays = daysBetweenDateOnly(today, s.date);
        return {
          sessionId: s.id,
          date: s.date,
          windowDays: EVENING_MARKING_WINDOW_DAYS,
          daysLeft: Math.max(0, EVENING_MARKING_WINDOW_DAYS - ageDays - 1),
          markingClosesOn: dateKey(
            addDateDays(s.date, EVENING_MARKING_WINDOW_DAYS - 1),
          ),
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
