import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { assertInternalTeachingStaff } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertManageableClass,
  findExamTest,
  manageableClassWhere,
  managesAllClasses,
} from './exam-access';
import {
  buildExamAnalytics,
  percentOf,
  studentBreakdown,
} from './exam-analytics';
import {
  choiceView,
  correctAnswerView,
  EXAM_TEST_SELECT,
  ExamProblemRow,
  loadStudentData,
  PreparedExam,
  prepareExam,
  rosterOf,
  youtubeOf,
} from './exam-data';
import { EXAM_TYPES } from './exams.service';

const TREND_LIMIT = 12;

/** Багшид харагдах бодлогын бүрэн агуулга (зөв хариу, бодолт, бичлэг). */
function staffProblemView(exam: PreparedExam, row: ExamProblemRow) {
  const p = row.problem;
  return {
    problemId: row.problemId,
    order: row.order,
    format: p.format,
    points: row.points,
    statementText: p.statementText,
    imageKey: p.imageKey,
    choices: choiceView(row),
    correctAnswer: correctAnswerView(row),
    solution: p.analysis?.solutionOutline ?? null,
    solutionVerified: p.analysis?.status === 'VERIFIED',
    answerNeedsCheck: p.analysis?.answerKeyStatus === 'REVIEW_REQUIRED',
    youtube: youtubeOf(p.youtubeUrl),
    topics: exam.topicsOf(row.problemId).map((t) => t.name),
  };
}

/**
 * «Тойм», «Бодлого» табын анализ ба сурагчийн задаргаа (SHALGALT-TOLOVLOGOO §3).
 * Эрх: Багш — зөвхөн өөрийн анги; Багш+/Админ — бүх анги; найдвартай байдал
 * (KR-20) зөвхөн Багш+/Админд.
 */
@Injectable()
export class ExamAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ангийн чип: ажилтны хүрээний оноосон анги + цаасан дүн/ирээгүй
   * тэмдэглэгдсэн анги. «Бүгд» = эдгээр бүгд.
   */
  private async classScope(
    testId: string,
    userId: string,
    role: Role,
    classroomId?: string,
  ) {
    const classWhere = manageableClassWhere(role, userId);
    const [classes, access, withData] = await Promise.all([
      this.prisma.classroom.findMany({
        where: classWhere,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.testAccess.findMany({
        where: { testId, classroom: classWhere },
        select: { classroomId: true },
      }),
      this.prisma.enrollment.findMany({
        where: {
          leftAt: null,
          classroom: classWhere,
          student: {
            archivedAt: null,
            OR: [
              { testResults: { some: { testId } } },
              { testAbsences: { some: { testId } } },
            ],
          },
        },
        select: { classroomId: true },
        distinct: ['classroomId'],
      }),
    ]);
    const chipIds = new Set([
      ...access.map((a) => a.classroomId),
      ...withData.map((e) => e.classroomId),
    ]);
    let single: string | null = null;
    if (classroomId && classroomId !== 'all') {
      await assertManageableClass(this.prisma, classroomId, userId, role);
      single = classroomId;
      chipIds.add(classroomId);
    }
    const chips = classes
      .filter((c) => chipIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'mn'));
    return {
      chips,
      single,
      scopeIds: single ? [single] : chips.map((c) => c.id),
    };
  }

  async analytics(testId: string, userId: string, classroomId?: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await findExamTest(
      this.prisma,
      testId,
      userId,
      role,
      EXAM_TEST_SELECT,
    );
    const exam = prepareExam(test);
    const { chips, single, scopeIds } = await this.classScope(
      testId,
      userId,
      role,
      classroomId,
    );
    const roster = await rosterOf(this.prisma, scopeIds);
    const data = await loadStudentData(
      this.prisma,
      exam,
      roster.map((s) => s.id),
    );
    const analytics = buildExamAnalytics({
      items: exam.items,
      problems: exam.meta,
      classes: chips.filter((c) => scopeIds.includes(c.id)),
      withReliability: managesAllClasses(role),
      students: roster.map((s) => {
        const d = data.get(s.id)!;
        return {
          studentId: s.id,
          classroomId: s.classroomId,
          absent: d.absent,
          result: d.result
            ? { total: d.result.totalScore, max: d.result.maxScore }
            : null,
          statuses: d.statuses,
          choices: d.choices,
        };
      }),
    });
    return {
      test: { id: test.id, title: test.title, type: test.type },
      classroomId: single,
      /** Ангийн чип (Бүгд + эдгээр); `classes` нь анги харьцуулалт */
      chips,
      canEditContent: managesAllClasses(role),
      ...analytics,
      problems: test.problems.map((row) => staffProblemView(exam, row)),
    };
  }

  /** Багш — зөвхөн өөрийн ангийн сурагч; Багш+/Админ — бүх сурагч. */
  private async assertStudent(studentId: string, userId: string, role: Role) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    if (!student || student.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
    if (managesAllClasses(role)) return student;
    const own = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        leftAt: null,
        classroom: { teacherId: userId, archived: false },
      },
      select: { id: true },
    });
    if (!own)
      throw new ForbiddenException('Зөвхөн өөрийн ангийн сурагчийг харна');
    return student;
  }

  /**
   * «Дүн» табын сурагчийн мөр: энэ шалгалтын хэсэг/сэдвийн задаргаа, буруу
   * зүйлс, бусад шалгалтын дүнгийн явц (сүүлийн 12).
   */
  async studentSummary(testId: string, studentId: string, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await findExamTest(
      this.prisma,
      testId,
      userId,
      role,
      EXAM_TEST_SELECT,
    );
    const student = await this.assertStudent(studentId, userId, role);
    const exam = prepareExam(test);
    const [data, history] = await Promise.all([
      loadStudentData(this.prisma, exam, [studentId]).then(
        (m) => m.get(studentId)!,
      ),
      this.prisma.testResult.findMany({
        where: {
          studentId,
          maxScore: { gt: 0 },
          test: { deletedAt: null, type: { in: EXAM_TYPES } },
        },
        select: {
          testId: true,
          totalScore: true,
          maxScore: true,
          createdAt: true,
          test: { select: { title: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: TREND_LIMIT,
      }),
    ]);
    const breakdown =
      data.result && !data.absent && data.statuses
        ? studentBreakdown(exam.items, data.statuses, exam.topicsOf)
        : null;
    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      absent: data.absent,
      result:
        data.result && !data.absent
          ? {
              totalScore: data.result.totalScore,
              maxScore: data.result.maxScore,
              percent: Math.round(
                percentOf(data.result.totalScore, data.result.maxScore) ?? 0,
              ),
            }
          : null,
      parts: breakdown
        ? {
            part1: breakdown.part1,
            part1Max: breakdown.part1Max,
            part2: breakdown.part2,
            part2Max: breakdown.part2Max,
          }
        : null,
      topics: breakdown?.topics ?? [],
      wrong: (breakdown?.wrong ?? []).map((w) => ({
        key: w.key,
        label: w.label,
        part: w.part,
        points: w.points,
        status: w.status,
      })),
      trend: history.reverse().map((r) => ({
        testId: r.testId,
        title: r.test.title,
        type: r.test.type,
        at: r.createdAt,
        percent: Math.round(percentOf(r.totalScore, r.maxScore) ?? 0),
        current: r.testId === testId,
      })),
    };
  }
}
