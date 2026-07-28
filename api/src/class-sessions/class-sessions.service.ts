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
  /**
   * Ангид хийсэн тестийг бүртгэнэ. ХОЁР горим:
   *   1) Бодлогын сангийн тест — testId өгнө.
   *   2) ГААРААР бичсэн (гаднын) тест — testId байхгүй, зөвхөн manualTitle.
   *      Сурагчид заримдаа манай санд ОГТ байхгүй бодлого бодох тул багш
   *      тестийн НЭРИЙГ нь бичээд бүртгэнэ. Жинхэнэ Test бичлэг үүсгэхгүй —
   *      зөвхөн "ангид ийм нэртэй тест хийсэн" гэдгийг тэмдэглэнэ.
   */
  async recordDidTest(
    classroomId: string,
    testId: string | undefined,
    dateStr: string | undefined,
    userId: string,
    role: Role,
    manual?: { title?: string; problemCount?: number },
  ) {
    await this.assertClassAccess(classroomId, userId, role);

    const manualTitle = manual?.title?.trim();
    if (!testId && !manualTitle) {
      throw new BadRequestException(
        'Тест сонгох эсвэл тестийн нэрийг гараар бичнэ үү',
      );
    }
    if (testId) {
      const test = await this.prisma.test.findUnique({ where: { id: testId } });
      if (!test) throw new NotFoundException('Тест олдсонгүй');
    }

    let date = todayUB();
    if (dateStr) {
      try {
        date = parseDateOnly(dateStr);
      } catch {
        throw new BadRequestException('Огноо буруу байна');
      }
    }

    // Гараар бичсэн бол давхардлын түлхүүр байхгүй (testId = null) тул шууд
    // үүсгэнэ — нэг өдөр хэд хэдэн гаднын тест бүртгэж болно.
    if (!testId) {
      return this.prisma.classTestSession.create({
        data: {
          classroomId,
          testId: null,
          manualTitle,
          manualProblemCount: manual?.problemCount ?? null,
          date,
          createdById: userId,
        },
      });
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
        // Гараар бичсэн session-д testId = null тул шүүж хасна.
        id: { in: sessions.flatMap((s) => (s.testId ? [s.testId] : [])) },
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
      const test = s.testId ? byId.get(s.testId) : undefined;
      const excluded = new Set(s.excludedProblemIds);
      return {
        id: s.id,
        date: s.date,
        excludedProblemIds: s.excludedProblemIds,
        // Гараар бичсэн тест: жинхэнэ Problem мөр байхгүй тул дугаараар нь
        // синтетик жагсаалт үүсгэнэ. Сурагч эдгээрийг адилхан тэмдэглэнэ.
        manualTitle: s.manualTitle,
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
          : s.manualTitle
            ? {
                id: null,
                title: s.manualTitle,
                problems: Array.from(
                  { length: s.manualProblemCount ?? 0 },
                  (_, i) => ({
                    index: i + 1,
                    problemId: `manual:${s.id}:${i + 1}`,
                    token: String(i + 1),
                    included: !excluded.has(`manual:${s.id}:${i + 1}`),
                  }),
                ),
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
        // Гараар бичсэн session-д testId = null тул шүүж хасна.
        id: { in: sessions.flatMap((s) => (s.testId ? [s.testId] : [])) },
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
        const excluded = new Set(s.excludedProblemIds);

        // ГААРААР бичсэн тест: жинхэнэ Problem мөр байхгүй тул зөвхөн дугаараар
        // синтетик бодлого үүсгэнэ. Сурагч цаасаа хараад адилхан тэмдэглэнэ —
        // энэ нь "манай санд байхгүй гаднын бодлого"-ыг бүртгэх цорын ганц зам.
        const manualProblems = s.testId
          ? null
          : Array.from({ length: s.manualProblemCount ?? 0 }, (_, i) => ({
              problemId: `manual:${s.id}:${i + 1}`,
              problem: {
                token: String(i + 1),
                statementText: null as string | null,
                imageKey: null as string | null,
              },
            }));

        const test = s.testId ? testById.get(s.testId) : undefined;
        const source = test
          ? { id: test.id as string | null, title: test.title, problems: test.problems }
          : manualProblems && s.manualTitle
            ? { id: null, title: s.manualTitle, problems: manualProblems }
            : null;
        if (!source) return null;

        // Багшийн хассан бодлогуудыг сурагчид харуулахгүй (дахин дугаарлана)
        const included = source.problems.filter(
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
          test: { id: source.id, title: source.title },
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
