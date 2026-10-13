import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  AttemptSessionStatus,
  Role,
  StudentType,
  TestType,
} from '../generated/prisma/enums';
import { collectContentScope } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { ItemStatus } from '../tests/exam-items';
import {
  chosenLetter,
  percentOf,
  studentBreakdown,
  StudentBreakdown,
  studentReviewPolicy,
  StudentReviewPolicy,
  TopicMastery,
  visibleTopics,
  weakestTopics,
} from './exam-analytics';
import {
  choiceView,
  correctAnswerView,
  loadExamTest,
  loadStudentData,
  practiceChapters,
  PreparedExam,
  prepareExam,
  StudentExamData,
  studentReviewLevel,
  youtubeOf,
} from './exam-data';
import { EXAM_TYPES } from './exams.service';

const PARENT_WEAK_TOPICS = 3;

function rounded(total: number, max: number): number {
  return Math.round(percentOf(total, max) ?? 0);
}

function topicView(t: TopicMastery) {
  return { name: t.name, percent: t.percent, earned: t.earned, max: t.max };
}

/** Сурагчийн өөрийн онлайн хариу (харуулах хэлбэр): сонгох → канон үсэг. */
function myAnswerOf(
  exam: PreparedExam,
  problemId: string,
  data: StudentExamData,
) {
  if (!data.session) return null;
  const raw = data.session.answers[problemId];
  if (raw === undefined || raw === null || raw === '') return null;
  const meta = exam.meta.get(problemId);
  if (meta?.choice) {
    const letter = chosenLetter(
      exam.gradable.get(problemId)!,
      raw,
      data.session.choiceOrder[problemId],
    );
    return letter || null;
  }
  return raw;
}

/**
 * Сурагч, эцэг эхийн дүнгийн дэлгэц (SHALGALT-TOLOVLOGOO §4). Бодлогын код,
 * ID хэзээ ч буцаахгүй; зөв хариу, бодолт эргэн харалтын хаалтаар.
 */
@Injectable()
export class ExamResultsService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= «Шалгалт»: Өгөх / Өгсөн =================

  async myExams(userId: string) {
    const [enrollments, scope] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          studentId: userId,
          leftAt: null,
          classroom: { archived: false },
        },
        select: { classroomId: true },
      }),
      collectContentScope(this.prisma, userId),
    ]);
    const classIds = enrollments.map((e) => e.classroomId);
    // Өөрийн дүн/ирээгүй/сесстэй шалгалт үргэлж харагдана (цаасан дүнг
    // оноогоогүй ангид оруулсан ч сурагч дүнгээ харна).
    const visibility: Prisma.TestWhereInput[] = [
      { results: { some: { studentId: userId } } },
      { absences: { some: { studentId: userId } } },
      { attemptSessions: { some: { studentId: userId } } },
    ];
    if (classIds.length)
      visibility.push({ access: { some: { classroomId: { in: classIds } } } });
    if (scope.testIds.length) visibility.push({ id: { in: scope.testIds } });
    if (scope.chapterIds.length)
      visibility.push({ chapterId: { in: scope.chapterIds } });
    if (scope.bookIds.length)
      visibility.push({ chapter: { bookId: { in: scope.bookIds } } });

    const tests = await this.prisma.test.findMany({
      where: {
        deletedAt: null,
        isDraft: false,
        type: { in: EXAM_TYPES },
        ...(scope.all ? {} : { OR: visibility }),
      },
      select: {
        id: true,
        title: true,
        type: true,
        gradingMode: true,
        timeLimitMin: true,
        variantLabel: true,
        groupKey: true,
        chapter: { select: { book: { select: { code: true } } } },
        _count: { select: { problems: true } },
        access: {
          where: { classroomId: { in: classIds } },
          select: { assignedAt: true },
        },
        results: {
          where: { studentId: userId },
          select: { totalScore: true, maxScore: true, createdAt: true },
        },
        absences: { where: { studentId: userId }, select: { createdAt: true } },
        attemptSessions: {
          where: { studentId: userId },
          select: { status: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      exams: tests.map((t) => {
        const result = t.results[0] ?? null;
        const session = t.attemptSessions[0] ?? null;
        const assigned = t.access
          .map((a) => a.assignedAt.getTime())
          .sort((a, b) => a - b);
        return {
          id: t.id,
          title: t.title,
          type: t.type,
          gradingMode: t.gradingMode,
          timeLimitMin: t.timeLimitMin,
          variantLabel: t.variantLabel,
          groupKey: t.groupKey,
          chapter: t.chapter,
          _count: t._count,
          results: result
            ? [{ totalScore: result.totalScore, maxScore: result.maxScore }]
            : [],
          percent: result ? rounded(result.totalScore, result.maxScore) : null,
          sessionStatus: session?.status ?? null,
          assignedAt: assigned.length ? new Date(assigned[0]) : null,
          takenAt:
            result?.createdAt ??
            (session?.status === AttemptSessionStatus.SUBMITTED
              ? session.submittedAt
              : null),
          absent: t.absences.length > 0 && !result,
        };
      }),
    };
  }

  // ================= Дүнгийн дэлгэц (1 хуудас) =================

  private wrongList(
    exam: PreparedExam,
    breakdown: StudentBreakdown,
    data: StudentExamData,
    policy: StudentReviewPolicy,
  ) {
    const byProblem = new Map<
      string,
      { label: string; status: ItemStatus; points: number }[]
    >();
    for (const w of breakdown.wrong) {
      byProblem.set(w.problemId, [
        ...(byProblem.get(w.problemId) ?? []),
        { label: w.label, status: w.status, points: w.points },
      ]);
    }
    return [...byProblem.entries()].map(([problemId, items]) => {
      const row = exam.rowBy.get(problemId)!;
      const p = row.problem;
      const analysis = p.analysis;
      const solution =
        policy.solutions === 'ALL' ||
        (policy.solutions === 'VERIFIED' && analysis?.status === 'VERIFIED')
          ? (analysis?.solutionOutline ?? null)
          : null;
      return {
        n: row.order,
        part: p.format === 'FILL_NUMBER' ? 2 : 1,
        items,
        lost: items.reduce((s, i) => s + i.points, 0),
        problem: policy.problems
          ? {
              format: p.format,
              statementText: p.statementText,
              imageKey: p.imageKey,
              choices: choiceView(row),
              myAnswer: myAnswerOf(exam, problemId, data),
              correctAnswer: policy.correctAnswer
                ? correctAnswerView(row)
                : null,
              solution,
              answerNeedsCheck:
                policy.correctAnswer &&
                analysis?.answerKeyStatus === 'REVIEW_REQUIRED',
              youtube: policy.youtube ? youtubeOf(p.youtubeUrl) : null,
            }
          : null,
      };
    });
  }

  async myResult(testId: string, userId: string, role: Role) {
    const test = await loadExamTest(this.prisma, testId);
    const exam = prepareExam(test);
    const data = (await loadStudentData(this.prisma, exam, [userId])).get(
      userId,
    )!;
    const head = { id: test.id, title: test.title, type: test.type };
    if (!data.result) {
      if (data.absent) {
        return {
          test: head,
          absent: true,
          result: null,
          parts: null,
          review: null,
          topics: [],
          wrong: null,
          practice: null,
        };
      }
      throw new NotFoundException('Энэ шалгалтын дүн хараахан гараагүй байна');
    }
    const gate = await studentReviewLevel(this.prisma, test, userId, data);
    const policy = studentReviewPolicy(test.type, gate.level);
    const breakdown = data.statuses
      ? studentBreakdown(exam.items, data.statuses, exam.topicsOf)
      : null;
    const topics = breakdown
      ? visibleTopics(breakdown.topics, policy.open)
      : [];
    const weak = weakestTopics(topics, 1)[0] ?? null;
    const chapterIds = weak
      ? await practiceChapters(
          this.prisma,
          weak,
          test.problems.map((p) => p.problemId),
          userId,
          role,
        )
      : [];
    return {
      test: head,
      absent: false,
      result: {
        totalScore: data.result.totalScore,
        maxScore: data.result.maxScore,
        percent: rounded(data.result.totalScore, data.result.maxScore),
      },
      parts: breakdown
        ? {
            part1: breakdown.part1,
            part1Max: breakdown.part1Max,
            part2: breakdown.part2,
            part2Max: breakdown.part2Max,
          }
        : null,
      review: {
        level: gate.level,
        opensAt: gate.opensAt,
        open: policy.open,
        // 1000 бодлого: бүх бодлогыг түвшнээр нь харах хуудас (/review)
        fullReview:
          test.type === TestType.THOUSAND &&
          gate.level !== 'NONE' &&
          !!data.session,
      },
      topics: topics.map(topicView),
      wrong:
        policy.open && breakdown
          ? this.wrongList(exam, breakdown, data, policy)
          : null,
      practice: weak ? { topic: weak.name, chapterIds } : null,
    };
  }

  // ================= Эцэг эхийн дүнгийн карт =================

  async parentCard(testResultId: string, parentId: string) {
    const result = await this.prisma.testResult.findUnique({
      where: { id: testResultId },
      select: {
        id: true,
        testId: true,
        studentId: true,
        createdAt: true,
        student: { select: { studentProfile: { select: { type: true } } } },
        acknowledgements: {
          where: { parentId },
          select: { verifiedAt: true },
        },
      },
    });
    if (!result) throw new NotFoundException('Шалгалтын дүн олдсонгүй');
    const link = await this.prisma.parentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId: result.studentId },
      },
      select: { verifiedAt: true },
    });
    if (!link?.verifiedAt)
      throw new ForbiddenException('Хүүхэдтэй холболт баталгаажаагүй байна.');
    const test = await loadExamTest(this.prisma, result.testId);
    const exam = prepareExam(test);
    const data = (
      await loadStudentData(this.prisma, exam, [result.studentId])
    ).get(result.studentId)!;
    if (!data.result) throw new NotFoundException('Шалгалтын дүн олдсонгүй');
    const gate = await studentReviewLevel(
      this.prisma,
      test,
      result.studentId,
      data,
    );
    const policy = studentReviewPolicy(test.type, gate.level);
    const breakdown = data.statuses
      ? studentBreakdown(exam.items, data.statuses, exam.topicsOf)
      : null;
    const topics = breakdown
      ? visibleTopics(breakdown.topics, policy.open)
      : [];
    return {
      testResultId: result.id,
      test: { title: test.title, type: test.type },
      totalScore: data.result.totalScore,
      maxScore: data.result.maxScore,
      percent: rounded(data.result.totalScore, data.result.maxScore),
      parts: breakdown
        ? {
            part1: breakdown.part1,
            part1Max: breakdown.part1Max,
            part2: breakdown.part2,
            part2Max: breakdown.part2Max,
          }
        : null,
      // Ганц сэдэв = бүх шалгалт (ж: 1000 бодлого) — нэмэлт мэдээлэлгүй тул харуулахгүй
      weakTopics:
        topics.length > 1
          ? weakestTopics(topics, PARENT_WEAK_TOPICS).map((t) => ({
              name: t.name,
              percent: t.percent,
            }))
          : [],
      takenAt: result.createdAt,
      acknowledgedAt: result.acknowledgements[0]?.verifiedAt ?? null,
      canAcknowledge:
        result.student.studentProfile?.type === StudentType.CLASSROOM,
    };
  }
}
