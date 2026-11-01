import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptSessionStatus, Role, TestType } from '../generated/prisma/enums';
import { collectContentScope } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { choiceModeOf, choiceTextsOf, GradableProblem, hasKnownAnswer } from '../tests/grading';
import {
  canonicalYoutubeUrl,
  parseYoutubeId,
  ReviewAccessRow,
  youtubeEmbedUrl,
} from '../thousand/review-gate';
import { resolveStudentReview } from '../thousand/thousand.service';
import { decideScanAccess, ScanTestRow } from './scan-gate';
import { normalizeScanCode } from './scan-code';

const STAFF: ReadonlySet<Role> = new Set([Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER]);

const ACCESS_REVIEW_SELECT = {
  classroomId: true,
  assignedAt: true,
  reviewLevel: true,
  reviewAutoAt: true,
  reviewOpenedAt: true,
} as const;

type AccessRow = ReviewAccessRow & { testId: string; classroomId: string };

function letterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

@Injectable()
export class ScanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * QR код → бодлого. Бодлогын нөхцөл, ном/бүлгийн нэр үргэлж; хариу, бодолт,
   * YouTube нь зөвхөн scan-gate зөвшөөрвөл. Сурагчид token хэзээ ч буцаахгүй.
   */
  async lookup(rawCode: string, userId: string, role: Role, now = new Date()) {
    const code = normalizeScanCode(rawCode);
    if (!code) throw new NotFoundException('QR код буруу байна');

    const problem = await this.prisma.problem.findFirst({
      where: { scanCode: code, deletedAt: null },
      select: {
        id: true,
        format: true,
        statementText: true,
        imageKey: true,
        choices: true,
        correctAnswer: true,
        youtubeUrl: true,
        page: true,
        number: true,
        chapter: { select: { title: true, book: { select: { title: true } } } },
        choiceOptions: { select: { order: true, text: true, isCorrect: true, imageKey: true } },
        analysis: { select: { status: true, answerKeyStatus: true, solutionOutline: true } },
        testItems: {
          where: { test: { deletedAt: null, isDraft: false } },
          select: {
            test: {
              select: { id: true, type: true, chapterId: true, chapter: { select: { bookId: true } } },
            },
          },
        },
      },
    });
    if (!problem) throw new NotFoundException('Энэ QR кодтой бодлого олдсонгүй');

    const staff = STAFF.has(role);
    const tests = staff ? [] : await this.studentTestRows(problem.testItems.map((i) => i.test), userId, now);
    const solution = problem.analysis?.solutionOutline ?? null;
    const access = decideScanAccess({
      staff,
      hasSolution: !!solution,
      solutionVerified: problem.analysis?.status === 'VERIFIED',
      tests,
    });

    const g: GradableProblem = {
      id: problem.id,
      format: problem.format,
      choices: problem.choices,
      correctAnswer: problem.correctAnswer,
      choiceOptions: problem.choiceOptions,
    };
    const mode = choiceModeOf(g);
    const texts = mode === 'TEXT' ? choiceTextsOf(g) : [];
    const sorted = [...problem.choiceOptions].sort((a, b) => a.order - b.order);

    const base = {
      problemId: problem.id,
      format: problem.format,
      statementText: problem.statementText,
      // Зургийг /files эрх шалгагч тестийг эхлүүлсэн эсвэл бүлгийн эрхтэй үед л
      // өгдөг (storage/file-authorization.service.ts). Хаалттай үед түлхүүрийг
      // илгээвэл хоосон хайрцаг харагдана — оронд нь «номонд байгаа» гэж хэлнэ.
      imageKey: access.kind === 'LOCKED' ? null : problem.imageKey,
      hasImage: !!problem.imageKey,
      choices: texts.map((text, i) => ({
        letter: letterOf(i),
        text,
        image: access.kind === 'LOCKED' ? null : (sorted[i]?.imageKey ?? null),
      })),
      source: {
        book: problem.chapter.book?.title ?? null,
        chapter: problem.chapter.title,
        page: problem.page,
        number: problem.number,
      },
      access: access.kind,
      lockReason: access.kind === 'LOCKED' ? access.reason : null,
      opensAt: access.kind === 'LOCKED' ? access.opensAt : null,
    };
    if (access.kind === 'LOCKED') return base;
    if (access.kind === 'SOLUTION') return { ...base, solution };

    let correctAnswer: unknown = null;
    if (hasKnownAnswer(g)) {
      const idx = sorted.findIndex((o) => o.isCorrect);
      correctAnswer = mode === 'TEXT' && sorted.length > 0 ? (idx >= 0 ? letterOf(idx) : null) : problem.correctAnswer;
    }
    const ytId = problem.youtubeUrl ? parseYoutubeId(problem.youtubeUrl) : null;
    return {
      ...base,
      solution,
      correctAnswer,
      answerNeedsCheck: problem.analysis?.answerKeyStatus === 'REVIEW_REQUIRED',
      youtube: ytId ? { url: canonicalYoutubeUrl(ytId), embedUrl: youtubeEmbedUrl(ytId) } : null,
    };
  }

  /** Бодлого орсон тест бүрд сурагч илгээсэн эсэх, 1000-ын тестэд эргэн харалтын түвшин. */
  private async studentTestRows(
    tests: { id: string; type: TestType; chapterId: string | null; chapter: { bookId: string | null } | null }[],
    userId: string,
    now: Date,
  ): Promise<ScanTestRow[]> {
    if (tests.length === 0) return [];
    const testIds = tests.map((t) => t.id);
    const sessions = await this.prisma.testAttemptSession.findMany({
      where: { studentId: userId, testId: { in: testIds }, status: AttemptSessionStatus.SUBMITTED },
      select: { testId: true, submittedAt: true },
    });
    const submittedAt = new Map(sessions.map((s) => [s.testId, s.submittedAt]));

    const thousandSubmitted = tests.filter((t) => t.type === TestType.THOUSAND && submittedAt.has(t.id));
    let classRows: AccessRow[] = [];
    let scope: Awaited<ReturnType<typeof collectContentScope>> | null = null;
    if (thousandSubmitted.length > 0) {
      [classRows, scope] = await Promise.all([
        this.accessRows(thousandSubmitted.map((t) => t.id), userId),
        collectContentScope(this.prisma, userId),
      ]);
    }

    return tests.map((t): ScanTestRow => {
      const submitted = submittedAt.has(t.id);
      if (t.type !== TestType.THOUSAND) return { kind: 'OTHER', submitted };
      if (!submitted || !scope) return { kind: 'THOUSAND', submitted, review: null };
      const purchaseOrPass =
        scope.all ||
        scope.testIds.includes(t.id) ||
        (!!t.chapterId && scope.chapterIds.includes(t.chapterId)) ||
        (!!t.chapter?.bookId && scope.bookIds.includes(t.chapter.bookId));
      const review = resolveStudentReview(
        classRows.filter((r) => r.testId === t.id),
        { purchaseOrPass, submittedAt: submittedAt.get(t.id) ?? null },
        now,
      );
      return { kind: 'THOUSAND', submitted, review };
    });
  }

  private async accessRows(testIds: string[], userId: string): Promise<AccessRow[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { classroomId: true },
    });
    const classIds = [...new Set(enrollments.map((e) => e.classroomId))];
    if (classIds.length === 0) return [];
    return this.prisma.testAccess.findMany({
      where: { testId: { in: testIds }, classroomId: { in: classIds } },
      select: { testId: true, ...ACCESS_REVIEW_SELECT },
    });
  }
}
