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
  ReviewLevel,
  Role,
  TestGradingMode,
  TestType,
} from '../generated/prisma/enums';
import { assertInternalTeachingStaff, collectContentScope } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import {
  beginRevision,
  beginRevisions,
  commitRevision,
  commitRevisions,
} from '../revisions/revision-store';
import {
  answerToken,
  choiceImagesOf,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
} from '../tests/grading';
import {
  autoOpenAt,
  canonicalYoutubeUrl,
  effectiveLevel,
  levelAllows,
  maxLevel,
  parseYoutubeId,
  purchaseOnlyLevel,
  ReviewAccessRow,
  ReviewLevelValue,
  youtubeEmbedUrl,
} from './review-gate';
import { buildYoutubeWorkbook, parseYoutubeWorkbook } from './youtube-sheet';

export type ExamStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED';

export interface StudentReviewState {
  level: ReviewLevelValue;
  /** Хаалттай үед хэзээ автоматаар нээгдэх (мэдэгдэж байвал) */
  opensAt: Date | null;
  /** Ангиар эсвэл худалдан авалтаар хамрагдсан эсэх */
  covered: boolean;
}

const ACCESS_REVIEW_SELECT = {
  classroomId: true,
  assignedAt: true,
  reviewLevel: true,
  reviewAutoAt: true,
  reviewOpenedAt: true,
} as const;

type AccessReviewRow = ReviewAccessRow & { classroomId: string };

function letterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Сурагчийн ангиудын TestAccess мөрүүдээс бодит түвшинг гаргана. */
export function resolveStudentReview(
  classRows: AccessReviewRow[],
  fallback: { purchaseOrPass: boolean; submittedAt: Date | null },
  now: Date,
): StudentReviewState {
  if (classRows.length > 0) {
    const level = maxLevel(classRows.map((row) => effectiveLevel(row, now)));
    const pending = classRows
      .filter((row) => !row.reviewOpenedAt)
      .map((row) => autoOpenAt(row))
      .filter((at) => at.getTime() > now.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    return { level, opensAt: level === 'NONE' ? (pending[0] ?? null) : null, covered: true };
  }
  if (fallback.purchaseOrPass) {
    const { level, opensAt } = purchaseOnlyLevel(fallback.submittedAt, now);
    return { level, opensAt: level === 'NONE' ? opensAt : null, covered: true };
  }
  return { level: 'NONE', opensAt: null, covered: false };
}

@Injectable()
export class ThousandService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= Эрхийн туслахууд =================

  private async staffRole(userId: string): Promise<Role> {
    return assertInternalTeachingStaff(this.prisma, userId);
  }

  /** Анги удирдах эрх: ADMIN, TEACHER_PLUS бүх анги; TEACHER зөвхөн өөрийн анги. */
  private async assertClassStaff(classroomId: string, userId: string) {
    const role = await this.staffRole(userId);
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, teacherId: true, archived: true },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');
    if (role === Role.TEACHER && classroom.teacherId !== userId) {
      throw new ForbiddenException('Зөвхөн өөрийн ангийн шалгалтыг удирдана');
    }
    return { role, classroom };
  }

  private async findThousandTest(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: { id: true, title: true, type: true, deletedAt: true, gradingMode: true },
    });
    if (!test || test.deletedAt || test.type !== TestType.THOUSAND) {
      throw new NotFoundException('1000 бодлогын шалгалт олдсонгүй');
    }
    return test;
  }

  // ================= Жагсаалт =================

  async list(userId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS || role === Role.TEACHER) {
      return this.listForStaff(userId);
    }
    return this.listForStudent(userId);
  }

  private async listForStaff(userId: string) {
    const role = await this.staffRole(userId);
    const tests = await this.prisma.test.findMany({
      where: { type: TestType.THOUSAND, deletedAt: null },
      orderBy: [{ groupKey: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        timeLimitMin: true,
        gradingMode: true,
        price: true,
        isDraft: true,
        _count: { select: { problems: true, results: true } },
        access: {
          where: role === Role.TEACHER ? { classroom: { teacherId: userId } } : undefined,
          select: { classroomId: true, classroom: { select: { name: true } } },
        },
      },
    });
    const classrooms = await this.prisma.classroom.findMany({
      where: { archived: false, ...(role === Role.TEACHER ? { teacherId: userId } : {}) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return {
      role: 'STAFF' as const,
      canEditContent: role === Role.ADMIN || role === Role.TEACHER_PLUS,
      classrooms,
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        timeLimitMin: t.timeLimitMin,
        problemCount: t._count.problems,
        submittedCount: t._count.results,
        ready: t.gradingMode === TestGradingMode.AUTO,
        price: t.price,
        classes: t.access.map((a) => ({ id: a.classroomId, name: a.classroom.name })),
      })),
    };
  }

  private async listForStudent(userId: string) {
    const now = new Date();
    const [enrollments, scope] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { classroomId: true, leftAt: true, classroom: { select: { archived: true } } },
      }),
      collectContentScope(this.prisma, userId),
    ]);
    const currentClassIds = enrollments
      .filter((e) => e.leftAt === null && !e.classroom.archived)
      .map((e) => e.classroomId);
    const everClassIds = [...new Set(enrollments.map((e) => e.classroomId))];

    const visibility: Prisma.TestWhereInput[] = [
      { attemptSessions: { some: { studentId: userId } } },
    ];
    if (currentClassIds.length) visibility.push({ access: { some: { classroomId: { in: currentClassIds } } } });
    if (scope.testIds.length) visibility.push({ id: { in: scope.testIds } });
    if (scope.chapterIds.length) visibility.push({ chapterId: { in: scope.chapterIds } });
    if (scope.bookIds.length) visibility.push({ chapter: { bookId: { in: scope.bookIds } } });

    const tests = await this.prisma.test.findMany({
      where: {
        type: TestType.THOUSAND,
        deletedAt: null,
        isDraft: false,
        ...(scope.all ? {} : { OR: visibility }),
      },
      orderBy: [{ groupKey: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        timeLimitMin: true,
        gradingMode: true,
        chapterId: true,
        chapter: { select: { bookId: true } },
        _count: { select: { problems: true } },
        access: {
          where: { classroomId: { in: everClassIds } },
          select: ACCESS_REVIEW_SELECT,
        },
        attemptSessions: {
          where: { studentId: userId },
          select: { status: true, submittedAt: true },
        },
        results: {
          where: { studentId: userId },
          select: { totalScore: true, maxScore: true },
        },
      },
    });

    return {
      role: 'STUDENT' as const,
      tests: tests.map((t) => {
        const session = t.attemptSessions[0] ?? null;
        const result = t.results[0] ?? null;
        const status: ExamStatus =
          session?.status === AttemptSessionStatus.SUBMITTED || result
            ? 'SUBMITTED'
            : session
              ? 'IN_PROGRESS'
              : 'NOT_STARTED';
        const purchaseOrPass =
          scope.all ||
          scope.testIds.includes(t.id) ||
          (!!t.chapterId && scope.chapterIds.includes(t.chapterId)) ||
          (!!t.chapter?.bookId && scope.bookIds.includes(t.chapter.bookId));
        const review =
          status === 'SUBMITTED'
            ? resolveStudentReview(
                t.access,
                { purchaseOrPass, submittedAt: session?.submittedAt ?? null },
                now,
              )
            : null;
        return {
          id: t.id,
          title: t.title,
          timeLimitMin: t.timeLimitMin,
          problemCount: t._count.problems,
          ready: t.gradingMode === TestGradingMode.AUTO,
          status,
          score: result ? { total: result.totalScore, max: result.maxScore } : null,
          review: review ? { level: review.level, opensAt: review.opensAt } : null,
        };
      }),
    };
  }

  // ================= Сурагчийн эргэн харалт (сервер талын хаалт) =================

  async studentReview(testId: string, userId: string, now = new Date()) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        type: true,
        deletedAt: true,
        chapterId: true,
        chapter: { select: { bookId: true } },
        problems: {
          orderBy: { order: 'asc' },
          select: {
            problemId: true,
            order: true,
            points: true,
            problem: {
              select: {
                id: true,
                format: true,
                statementText: true,
                imageKey: true,
                choices: true,
                correctAnswer: true,
                youtubeUrl: true,
                choiceOptions: { select: { order: true, text: true, isCorrect: true, imageKey: true } },
                analysis: { select: { answerKeyStatus: true, solutionOutline: true } },
              },
            },
          },
        },
      },
    });
    if (!test || test.deletedAt || test.type !== TestType.THOUSAND) {
      throw new NotFoundException('1000 бодлогын шалгалт олдсонгүй');
    }
    const session = await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
      select: {
        status: true,
        submittedAt: true,
        draftAnswers: true,
        choiceOrder: true,
      },
    });
    if (!session || session.status !== AttemptSessionStatus.SUBMITTED) {
      throw new ForbiddenException('Шалгалтаа илгээсний дараа эргэн харах боломжтой');
    }

    const [enrollments, scope, result] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { classroomId: true },
      }),
      collectContentScope(this.prisma, userId),
      this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      }),
    ]);
    const classIds = [...new Set(enrollments.map((e) => e.classroomId))];
    const classRows = classIds.length
      ? await this.prisma.testAccess.findMany({
          where: { testId, classroomId: { in: classIds } },
          select: ACCESS_REVIEW_SELECT,
        })
      : [];
    const purchaseOrPass =
      scope.all ||
      scope.testIds.includes(test.id) ||
      (!!test.chapterId && scope.chapterIds.includes(test.chapterId)) ||
      (!!test.chapter?.bookId && scope.bookIds.includes(test.chapter.bookId));
    const state = resolveStudentReview(
      classRows,
      { purchaseOrPass, submittedAt: session.submittedAt },
      now,
    );
    if (!state.covered) {
      throw new ForbiddenException('Энэ шалгалт танай ангид оноогдоогүй байна');
    }

    const base = {
      test: { id: test.id, title: test.title },
      result,
      level: state.level,
      opensAt: state.opensAt,
    };
    if (!levelAllows(state.level, 'PROBLEMS')) return { ...base, items: [] };

    const full = levelAllows(state.level, 'FULL');
    const answers = asRecord(session.draftAnswers);
    const choiceOrder = asRecord(session.choiceOrder) as Record<string, number[]>;

    const items = test.problems.map((tp, index) => {
      const p = tp.problem;
      const g: GradableProblem = {
        id: p.id,
        format: p.format,
        choices: p.choices,
        correctAnswer: p.correctAnswer,
        choiceOptions: p.choiceOptions,
      };
      const mode = choiceModeOf(g);
      const texts = mode ? choiceTextsOf(g) : [];
      const raw = answers[p.id];
      const answered = raw !== undefined && raw !== null && answerToken(raw) !== '';

      // Сурагчийн хариуг КАНОН (холилдоогүй) үсгээр илэрхийлнэ.
      let myAnswer: string | Record<string, string> | null = null;
      if (answered) {
        if (mode === 'TEXT' && typeof raw === 'number') {
          const orig = choiceOrder[p.id] ? choiceOrder[p.id][raw] : raw;
          myAnswer = orig !== undefined && orig >= 0 && orig < texts.length ? letterOf(orig) : null;
        } else if (raw && typeof raw === 'object') {
          myAnswer = Object.fromEntries(
            Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          );
        } else {
          myAnswer = String(raw);
        }
      }

      const item: Record<string, unknown> = {
        n: index + 1,
        problemId: p.id,
        format: p.format,
        points: tp.points,
        statementText: p.statementText,
        imageKey: p.imageKey,
        choices:
          mode === 'TEXT'
            ? texts.map((text, i) => ({ letter: letterOf(i), text, image: choiceImagesOf(g)?.[i] ?? null }))
            : null,
        answered,
        myAnswer,
      };
      if (full) {
        const known = hasKnownAnswer(g);
        const { correct } = gradeAnswer(g, raw, choiceOrder[p.id]);
        let correctAnswer: unknown = null;
        if (known) {
          if (mode === 'TEXT' && p.choiceOptions.length > 0) {
            const sorted = [...p.choiceOptions].sort((a, b) => a.order - b.order);
            const idx = sorted.findIndex((o) => o.isCorrect);
            correctAnswer = idx >= 0 ? letterOf(idx) : null;
          } else {
            correctAnswer = p.correctAnswer;
          }
        }
        const ytId = p.youtubeUrl ? parseYoutubeId(p.youtubeUrl) : null;
        Object.assign(item, {
          answerKnown: known,
          correct: known && answered ? correct : null,
          correctAnswer,
          solution: p.analysis?.solutionOutline ?? null,
          answerNeedsCheck: p.analysis?.answerKeyStatus === 'REVIEW_REQUIRED',
          youtube: ytId ? { url: canonicalYoutubeUrl(ytId), embedUrl: youtubeEmbedUrl(ytId) } : null,
        });
      }
      return item;
    });
    return { ...base, items };
  }

  // ================= Багшийн тестийн бүрэн харагдац =================

  async staffTest(testId: string, userId: string) {
    const role = await this.staffRole(userId);
    await this.findThousandTest(testId);
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        timeLimitMin: true,
        gradingMode: true,
        price: true,
        problems: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            points: true,
            problem: {
              select: {
                id: true,
                token: true,
                format: true,
                statementText: true,
                imageKey: true,
                choices: true,
                correctAnswer: true,
                youtubeUrl: true,
                choiceOptions: { select: { order: true, text: true, isCorrect: true, imageKey: true } },
                analysis: { select: { answerKeyStatus: true, solutionOutline: true } },
              },
            },
          },
        },
      },
    });
    if (!test) throw new NotFoundException('1000 бодлогын шалгалт олдсонгүй');
    return {
      id: test.id,
      title: test.title,
      timeLimitMin: test.timeLimitMin,
      ready: test.gradingMode === TestGradingMode.AUTO,
      price: test.price,
      canEditContent: role === Role.ADMIN || role === Role.TEACHER_PLUS,
      problems: test.problems.map((tp) => {
        const p = tp.problem;
        const g: GradableProblem = {
          id: p.id,
          format: p.format,
          choices: p.choices,
          correctAnswer: p.correctAnswer,
          choiceOptions: p.choiceOptions,
        };
        const mode = choiceModeOf(g);
        return {
          n: tp.order,
          problemId: p.id,
          token: p.token,
          format: p.format,
          points: tp.points,
          statementText: p.statementText,
          imageKey: p.imageKey,
          choices:
            mode === 'TEXT'
              ? choiceTextsOf(g).map((text, i) => ({ letter: letterOf(i), text, image: choiceImagesOf(g)?.[i] ?? null }))
              : null,
          correctAnswer: hasKnownAnswer(g) ? p.correctAnswer : null,
          answerKeyStatus: p.analysis?.answerKeyStatus ?? null,
          solution: p.analysis?.solutionOutline ?? null,
          youtubeUrl: p.youtubeUrl,
        };
      }),
    };
  }

  // ================= Анги: «Өгсөн шалгалт» =================

  async classTests(classroomId: string, userId: string, now = new Date()) {
    const { classroom } = await this.assertClassStaff(classroomId, userId);
    const students = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: { studentId: true },
    });
    const studentIds = [...new Set(students.map((s) => s.studentId))];
    const rows = await this.prisma.testAccess.findMany({
      where: { classroomId, test: { type: TestType.THOUSAND, deletedAt: null } },
      select: {
        ...ACCESS_REVIEW_SELECT,
        reviewOpenedBy: { select: { firstName: true, lastName: true } },
        test: {
          select: {
            id: true,
            title: true,
            timeLimitMin: true,
            _count: { select: { problems: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    const testIds = rows.map((r) => r.test.id);
    const [submitted, inProgress] = studentIds.length && testIds.length
      ? await Promise.all([
          this.prisma.testResult.groupBy({
            by: ['testId'],
            where: { testId: { in: testIds }, studentId: { in: studentIds } },
            _count: { _all: true },
          }),
          this.prisma.testAttemptSession.groupBy({
            by: ['testId'],
            where: {
              testId: { in: testIds },
              studentId: { in: studentIds },
              status: AttemptSessionStatus.IN_PROGRESS,
            },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const submittedBy = new Map(submitted.map((g) => [g.testId, g._count._all]));
    const progressBy = new Map(inProgress.map((g) => [g.testId, g._count._all]));

    const assignable = await this.prisma.test.findMany({
      where: {
        type: TestType.THOUSAND,
        deletedAt: null,
        gradingMode: TestGradingMode.AUTO,
        id: { notIn: testIds },
      },
      select: { id: true, title: true },
      orderBy: [{ groupKey: 'asc' }, { title: 'asc' }],
    });

    return {
      classroom: { id: classroom.id, name: classroom.name },
      studentCount: studentIds.length,
      tests: rows.map((r) => ({
        testId: r.test.id,
        title: r.test.title,
        timeLimitMin: r.test.timeLimitMin,
        problemCount: r.test._count.problems,
        assignedAt: r.assignedAt,
        submittedCount: submittedBy.get(r.test.id) ?? 0,
        inProgressCount: progressBy.get(r.test.id) ?? 0,
        reviewMode: r.reviewOpenedAt ? r.reviewLevel : 'AUTO',
        reviewLevel: effectiveLevel(r, now),
        reviewAutoAt: autoOpenAt(r),
        reviewOpenedAt: r.reviewOpenedAt,
        reviewOpenedBy: r.reviewOpenedBy
          ? `${r.reviewOpenedBy.lastName} ${r.reviewOpenedBy.firstName}`
          : null,
      })),
      assignable,
    };
  }

  async assign(classroomId: string, testId: string, userId: string, reviewAutoAt?: string | null) {
    const { role } = await this.assertClassStaff(classroomId, userId);
    const test = await this.findThousandTest(testId);
    if (test.gradingMode !== TestGradingMode.AUTO) {
      throw new BadRequestException(
        'Энэ шалгалтын хариуны түлхүүр бүрэн бэлэн болоогүй тул ангид оноох боломжгүй',
      );
    }
    const problems = await this.prisma.testProblem.findMany({
      where: { testId },
      select: {
        problem: {
          select: { id: true, format: true, choices: true, correctAnswer: true, choiceOptions: { select: { order: true, text: true, isCorrect: true } } },
        },
      },
    });
    if (problems.length === 0) throw new BadRequestException('Энэ тестэд бодлого алга');
    // Импортер хариугүй бодлоготой тестийг MANUAL болгодог. AUTO тест дотор
    // онлайн нүдээр оруулах боломжгүй цөөн бодлого (жиш: «-» тэмдэгтэй нүд)
    // дүнд тооцогдохгүй — бүгдээрээ ийм бол оноох утгагүй.
    if (!problems.some((row) => hasKnownAnswer(row.problem))) {
      throw new BadRequestException(
        'Энэ тестийн бодлогуудад хариуны түлхүүр алга тул ангид оноох боломжгүй',
      );
    }
    const autoAt = this.parseDate(reviewAutoAt);
    const existing = await this.prisma.testAccess.findUnique({
      where: { testId_classroomId: { testId, classroomId } },
      select: { testId: true },
    });
    if (existing) throw new ConflictException('Энэ шалгалт тус ангид аль хэдийн оноогдсон байна');
    // Анги оноох нь тестийн хувилбар (өөрчлөлтийн түүх) — нэг transaction-д.
    await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'TEST', testId);
      await tx.testAccess.create({
        data: { testId, classroomId, reviewAutoAt: autoAt ?? null },
      });
      await tx.test.update({ where: { id: testId }, data: { isDraft: false } });
      await commitRevision(tx, rev, { actor: { id: userId, role }, action: 'UPDATE' });
    });
    return { assigned: true };
  }

  async unassign(classroomId: string, testId: string, userId: string) {
    const { role } = await this.assertClassStaff(classroomId, userId);
    await this.findThousandTest(testId);
    const students = await this.prisma.enrollment.findMany({
      where: { classroomId },
      select: { studentId: true },
    });
    const started = await this.prisma.testAttemptSession.count({
      where: { testId, studentId: { in: students.map((s) => s.studentId) } },
    });
    if (started > 0) {
      throw new ConflictException('Энэ ангийн сурагч шалгалтыг эхлүүлсэн тул хасах боломжгүй');
    }
    await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'TEST', testId);
      await tx.testAccess.deleteMany({ where: { testId, classroomId } });
      await commitRevision(tx, rev, { actor: { id: userId, role }, action: 'UPDATE' });
    });
    return { removed: true };
  }

  private parseDate(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Огноо буруу байна');
    return date;
  }

  /**
   * reviewLevel: 'AUTO' → гараар тавьсныг цуцалж автомат горимд буцаана.
   * NONE/PROBLEMS/FULL → гараар тавина (автомат нээлт давамгайлахгүй).
   * reviewAutoAt: null → өгөгдмөл (ангид оноосноос 7 хоног).
   */
  async setReview(
    classroomId: string,
    testId: string,
    userId: string,
    dto: { reviewLevel?: 'AUTO' | ReviewLevelValue; reviewAutoAt?: string | null },
  ) {
    await this.assertClassStaff(classroomId, userId);
    await this.findThousandTest(testId);
    const row = await this.prisma.testAccess.findUnique({
      where: { testId_classroomId: { testId, classroomId } },
      select: { testId: true },
    });
    if (!row) throw new NotFoundException('Энэ шалгалт тус ангид оноогдоогүй байна');
    const data: Prisma.TestAccessUncheckedUpdateInput = {};
    if (dto.reviewLevel !== undefined) {
      if (dto.reviewLevel === 'AUTO') {
        data.reviewLevel = ReviewLevel.NONE;
        data.reviewOpenedAt = null;
        data.reviewOpenedById = null;
      } else {
        data.reviewLevel = dto.reviewLevel;
        data.reviewOpenedAt = new Date();
        data.reviewOpenedById = userId;
      }
    }
    const autoAt = this.parseDate(dto.reviewAutoAt);
    if (autoAt !== undefined) data.reviewAutoAt = autoAt;
    if (Object.keys(data).length === 0) throw new BadRequestException('Өөрчлөх утгаа оруулна уу');
    await this.prisma.testAccess.update({
      where: { testId_classroomId: { testId, classroomId } },
      data,
    });
    return this.classTests(classroomId, userId);
  }

  // ================= YouTube холбоос =================

  /** Бодлого заавал 1000 бодлогын тестэд орсон байх ёстой (ерөнхий засварлагч биш). */
  async setYoutube(
    problemId: string,
    url: string | null,
    userId: string,
    expectedVersion?: number,
  ) {
    const role = await this.staffRole(userId);
    if (role !== Role.ADMIN && role !== Role.TEACHER_PLUS) {
      throw new ForbiddenException('YouTube холбоосыг Багш+ эсвэл админ засна');
    }
    const inThousand = await this.prisma.testProblem.findFirst({
      where: { problemId, test: { type: TestType.THOUSAND, deletedAt: null } },
      select: { problemId: true },
    });
    if (!inThousand) throw new NotFoundException('1000 бодлогын бодлого олдсонгүй');
    let value: string | null = null;
    if (url !== null && url.trim() !== '') {
      const id = parseYoutubeId(url);
      if (!id) {
        throw new BadRequestException(
          'YouTube холбоос буруу байна. youtube.com/watch?v=…, youtu.be/… эсвэл youtube.com/shorts/… хэлбэрээр оруулна уу.',
        );
      }
      value = canonicalYoutubeUrl(id);
    }
    // Өөрчлөлтийн түүх: бодлогын хувилбар; expectedVersion зөрвөл 409.
    const { version, mergedWith } = await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'PROBLEM', problemId, { expectedVersion });
      await tx.problem.update({ where: { id: problemId }, data: { youtubeUrl: value } });
      return commitRevision(tx, rev, {
        actor: { id: userId, role },
        action: 'UPDATE',
      });
    });
    return { problemId, youtubeUrl: value, version, mergedWith };
  }

  private async assertContentEditor(userId: string): Promise<Role> {
    const role = await this.staffRole(userId);
    if (role !== Role.ADMIN && role !== Role.TEACHER_PLUS) {
      throw new ForbiddenException('YouTube холбоосыг Багш+ эсвэл админ засна');
    }
    return role;
  }

  private async thousandProblemRows() {
    const tests = await this.prisma.test.findMany({
      where: { type: TestType.THOUSAND, deletedAt: null },
      orderBy: [{ groupKey: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        problems: {
          orderBy: { order: 'asc' },
          select: { order: true, problemId: true, problem: { select: { youtubeUrl: true } } },
        },
      },
    });
    return tests;
  }

  async exportYoutube(userId: string) {
    await this.assertContentEditor(userId);
    const tests = await this.thousandProblemRows();
    const buffer = await buildYoutubeWorkbook(
      tests.flatMap((t) =>
        t.problems.map((tp) => ({ testTitle: t.title, number: tp.order, url: tp.problem.youtubeUrl })),
      ),
    );
    return {
      filename: '1000-bodlogo-youtube.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: buffer.toString('base64'),
    };
  }

  /**
   * Бүгд-эсвэл-юу-ч-үгүй: нэг ч мөр алдаатай бол юу ч өөрчлөхгүй, алдааг мөрөөр
   * буцаана. Холбоос хоосон мөрийг алгасна (устгах бол бодлогын хажуугаас).
   */
  async importYoutube(buffer: Buffer, userId: string) {
    const role = await this.assertContentEditor(userId);
    const rows = await parseYoutubeWorkbook(buffer);
    const tests = await this.thousandProblemRows();
    const byTitle = new Map<string, (typeof tests)[number][]>();
    for (const t of tests) {
      const key = t.title.trim().toLocaleLowerCase('mn-MN');
      byTitle.set(key, [...(byTitle.get(key) ?? []), t]);
    }
    const errors: { row: number; message: string }[] = [];
    const updates = new Map<string, string>();
    let unchanged = 0;
    for (const row of rows) {
      const matches = byTitle.get(row.testTitle.trim().toLocaleLowerCase('mn-MN')) ?? [];
      if (matches.length === 0) {
        errors.push({ row: row.rowNumber, message: `«${row.testTitle}» нэртэй 1000 бодлогын тест олдсонгүй` });
        continue;
      }
      if (matches.length > 1) {
        errors.push({ row: row.rowNumber, message: `«${row.testTitle}» нэртэй тест олон байна` });
        continue;
      }
      const n = Number(row.numberText);
      const tp = Number.isInteger(n) ? matches[0].problems.find((p) => p.order === n) : undefined;
      if (!tp) {
        errors.push({ row: row.rowNumber, message: `Бодлогын дугаар «${row.numberText}» олдсонгүй` });
        continue;
      }
      const id = parseYoutubeId(row.url);
      if (!id) {
        errors.push({ row: row.rowNumber, message: 'YouTube холбоос буруу байна' });
        continue;
      }
      const url = canonicalYoutubeUrl(id);
      if (tp.problem.youtubeUrl === url) unchanged += 1;
      else updates.set(tp.problemId, url);
    }
    if (errors.length > 0) {
      return { applied: false, updated: 0, unchanged, errors };
    }
    if (updates.size > 0) {
      // Бодлого бүр өөрчлөлтийн түүхэд IMPORT хувилбар болно (бүгд-эсвэл-юу-ч-үгүй).
      await this.prisma.$transaction(
        async (tx) => {
          const handles = await beginRevisions(tx, 'PROBLEM', [...updates.keys()]);
          for (const [problemId, youtubeUrl] of updates) {
            await tx.problem.update({ where: { id: problemId }, data: { youtubeUrl } });
          }
          await commitRevisions(tx, handles, {
            actor: { id: userId, role },
            action: 'IMPORT',
            summary: (computed) => `${computed} (Excel)`,
          });
        },
        { timeout: 60_000 },
      );
    }
    return { applied: true, updated: updates.size, unchanged, errors };
  }
}
