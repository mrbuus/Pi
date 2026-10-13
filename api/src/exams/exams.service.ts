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
  Subject,
  TestGradingMode,
  TestType,
} from '../generated/prisma/enums';
import { assertInternalTeachingStaff } from '../common/access';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { beginRevision, commitRevision } from '../revisions/revision-store';
import { choiceImagesOf, choiceModeOf, choiceTextsOf, hasKnownAnswer } from '../tests/grading';
import {
  effectiveGroups,
  parseScoringGroups,
  slotGroups,
  slotLetters,
} from '../tests/exam-items';
import {
  autoOpenAt,
  effectiveLevel,
  REVIEW_AUTO_DAYS,
} from '../thousand/review-gate';
import {
  assertManageableClass,
  findExamTest,
  manageableClassWhere,
  managesAllClasses,
} from './exam-access';
import {
  AssignExamClassDto,
  SetScoringGroupsDto,
  UpdateExamClassDto,
} from './exams.dto';

export const EXAM_TYPES: TestType[] = [
  TestType.CHAPTER_EXAM,
  TestType.EESH_MOCK,
  TestType.THOUSAND,
];

export type ExamStatus = 'UNASSIGNED' | 'IN_PROGRESS' | 'MISSING' | 'DONE';

/**
 * «Шалгалт» хуудасны хоёр таб: EXAM — шалгалт/сорил (EXAM_TYPES), TEST —
 * сэдвийн дасгал (бусад бүх төрөл). Хоёулаа ижил мөр дэлгэрэх самбартай
 * (эзэн 2026-10-11: «Тест» таб ч мөн адил хялбар байх ёстой).
 */
export type ExamListKind = 'EXAM' | 'TEST';
export function parseExamListKind(value?: string): ExamListKind {
  return value === 'TEST' ? 'TEST' : 'EXAM';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Жагсаалтын мөрийн төлөв: Оноогоогүй / Өгч байна / Дүн дутуу / Дууссан.
 * Хүрээ нь ажилтны харах ангиуд (багш — өөрийн анги).
 */
export function examStatus(counts: {
  assignedClasses: number;
  students: number;
  results: number;
  absent: number;
  inProgress: number;
}): ExamStatus {
  if (counts.assignedClasses === 0) return 'UNASSIGNED';
  if (counts.inProgress > 0) return 'IN_PROGRESS';
  if (counts.results + counts.absent < counts.students) return 'MISSING';
  return 'DONE';
}

function letterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ================= «Шалгалт» табын жагсаалт =================

  async overview(
    userId: string,
    subject?: Subject,
    kind: ExamListKind = 'EXAM',
  ) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const all = managesAllClasses(role);
    const classWhere = manageableClassWhere(role, userId);
    const [tests, classes] = await Promise.all([
      this.prisma.test.findMany({
        where: {
          deletedAt: null,
          type: kind === 'TEST' ? { notIn: EXAM_TYPES } : { in: EXAM_TYPES },
          ...(subject ? { chapter: { book: { subject } } } : {}),
          ...(role === Role.TEACHER
            ? { OR: [{ isDraft: false }, { createdById: userId }] }
            : {}),
        },
        select: {
          id: true,
          title: true,
          type: true,
          groupKey: true,
          variantLabel: true,
          gradingMode: true,
          timeLimitMin: true,
          isDraft: true,
          createdById: true,
          createdAt: true,
          chapter: { select: { book: { select: { code: true } } } },
          _count: { select: { problems: true } },
          access: {
            where: { classroom: classWhere },
            select: {
              classroomId: true,
              classroom: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.classroom.findMany({
        where: classWhere,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const classIds = [
      ...new Set(tests.flatMap((t) => t.access.map((a) => a.classroomId))),
    ];
    const enrollments = classIds.length
      ? await this.prisma.enrollment.findMany({
          where: {
            classroomId: { in: classIds },
            leftAt: null,
            student: { archivedAt: null },
          },
          select: { classroomId: true, studentId: true },
        })
      : [];
    const studentsByClass = new Map<string, string[]>();
    for (const e of enrollments) {
      studentsByClass.set(e.classroomId, [
        ...(studentsByClass.get(e.classroomId) ?? []),
        e.studentId,
      ]);
    }
    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    const testIds = tests.filter((t) => t.access.length > 0).map((t) => t.id);
    const scope = { testId: { in: testIds }, studentId: { in: studentIds } };
    const [results, absences, sessions] =
      testIds.length && studentIds.length
        ? await Promise.all([
            this.prisma.testResult.findMany({
              where: scope,
              select: {
                testId: true,
                studentId: true,
                totalScore: true,
                maxScore: true,
              },
            }),
            this.prisma.testAbsence.findMany({
              where: scope,
              select: { testId: true, studentId: true },
            }),
            this.prisma.testAttemptSession.findMany({
              where: { ...scope, status: AttemptSessionStatus.IN_PROGRESS },
              select: { testId: true, studentId: true },
            }),
          ])
        : [[], [], []];
    const byTest = <T extends { testId: string; studentId: string }>(
      rows: T[],
    ) => {
      const map = new Map<string, Map<string, T>>();
      for (const row of rows) {
        const inner = map.get(row.testId) ?? new Map<string, T>();
        inner.set(row.studentId, row);
        map.set(row.testId, inner);
      }
      return map;
    };
    const resultsBy = byTest(results);
    const absentBy = byTest(absences);
    const sessionsBy = byTest(sessions);

    return {
      canEditContent: all,
      manageAllClasses: all,
      classes,
      exams: tests.map((t) => {
        const students = new Set(
          t.access.flatMap((a) => studentsByClass.get(a.classroomId) ?? []),
        );
        const testResults = resultsBy.get(t.id) ?? new Map();
        const testAbsent = absentBy.get(t.id) ?? new Map();
        const testSessions = sessionsBy.get(t.id) ?? new Map();
        let resultCount = 0;
        let absentCount = 0;
        let inProgress = 0;
        const percents: number[] = [];
        for (const id of students) {
          const result = testResults.get(id);
          if (result) {
            resultCount += 1;
            if (result.maxScore > 0)
              percents.push(result.totalScore / result.maxScore);
          } else if (testAbsent.has(id)) absentCount += 1;
          else if (testSessions.has(id)) inProgress += 1;
        }
        return {
          id: t.id,
          title: t.title,
          type: t.type,
          groupKey: t.groupKey,
          variantLabel: t.variantLabel,
          gradingMode: t.gradingMode,
          timeLimitMin: t.timeLimitMin,
          isDraft: t.isDraft,
          createdById: t.createdById,
          bookCode: t.chapter?.book?.code ?? null,
          problemCount: t._count.problems,
          classes: t.access
            .map((a) => ({ id: a.classroomId, name: a.classroom.name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'mn')),
          studentCount: students.size,
          resultCount,
          absentCount,
          inProgressCount: inProgress,
          avgPercent: percents.length
            ? Math.round(
                (percents.reduce((s, p) => s + p, 0) / percents.length) * 100,
              )
            : null,
          status: examStatus({
            assignedClasses: t.access.length,
            students: students.size,
            results: resultCount,
            absent: absentCount,
            inProgress,
          }),
        };
      }),
    };
  }

  // ================= Тохиргоо таб =================

  async settings(testId: string, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await findExamTest(this.prisma, testId, userId, role, {
      id: true,
      title: true,
      type: true,
      gradingMode: true,
      timeLimitMin: true,
      price: true,
      version: true,
      problems: {
        orderBy: { order: 'asc' },
        select: {
          problemId: true,
          order: true,
          points: true,
          problem: {
            select: {
              format: true,
              statementText: true,
              imageKey: true,
              scoringGroups: true,
              version: true,
            },
          },
        },
      },
    });
    const [classes, access, resultCount, sessionCount] = await Promise.all([
      this.prisma.classroom.findMany({
        where: manageableClassWhere(role, userId),
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.testAccess.findMany({
        where: { testId, classroom: manageableClassWhere(role, userId) },
        select: {
          classroomId: true,
          assignedAt: true,
          reviewLevel: true,
          reviewAutoAt: true,
          reviewOpenedAt: true,
          reviewOpenedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.testResult.count({ where: { testId } }),
      this.prisma.testAttemptSession.count({ where: { testId } }),
    ]);
    const assignedIds = access.map((a) => a.classroomId);
    const enrollments = assignedIds.length
      ? await this.prisma.enrollment.findMany({
          where: {
            classroomId: { in: assignedIds },
            leftAt: null,
            student: { archivedAt: null },
          },
          select: { classroomId: true, studentId: true },
        })
      : [];
    const ids = [...new Set(enrollments.map((e) => e.studentId))];
    const [results, sessions] = ids.length
      ? await Promise.all([
          this.prisma.testResult.findMany({
            where: { testId, studentId: { in: ids } },
            select: { studentId: true },
          }),
          this.prisma.testAttemptSession.findMany({
            where: { testId, studentId: { in: ids } },
            select: { studentId: true },
          }),
        ])
      : [[], []];
    const resultSet = new Set(results.map((r) => r.studentId));
    const startedSet = new Set(sessions.map((s) => s.studentId));
    const now = new Date();
    const accessBy = new Map(access.map((a) => [a.classroomId, a]));

    return {
      test: {
        id: test.id,
        title: test.title,
        type: test.type,
        gradingMode: test.gradingMode,
        timeLimitMin: test.timeLimitMin,
        price: role === Role.ADMIN ? test.price : undefined,
        taken: resultCount + sessionCount > 0,
        // Буцаах/түүх: засварлагч expectedVersion болгон илгээнэ (зөрвөл 409)
        version: test.version,
      },
      permissions: {
        canEditContent: managesAllClasses(role),
        canEditTime: managesAllClasses(role) || test.createdById === userId,
        canSetPrice: role === Role.ADMIN,
        manageAllClasses: managesAllClasses(role),
        reviewGate: test.type === TestType.THOUSAND,
      },
      reviewAutoDays: REVIEW_AUTO_DAYS,
      classes: classes.map((c) => {
        const a = accessBy.get(c.id);
        const students = enrollments
          .filter((e) => e.classroomId === c.id)
          .map((e) => e.studentId);
        return {
          id: c.id,
          name: c.name,
          assigned: !!a,
          ...(a
            ? {
                assignedAt: a.assignedAt,
                reviewMode: a.reviewOpenedAt ? a.reviewLevel : 'AUTO',
                reviewLevel: effectiveLevel(a, now),
                reviewAutoAt: autoOpenAt(a),
                reviewOpenedBy: a.reviewOpenedBy
                  ? `${a.reviewOpenedBy.lastName} ${a.reviewOpenedBy.firstName}`
                  : null,
                studentCount: students.length,
                submittedCount: students.filter((id) => resultSet.has(id))
                  .length,
                startedCount: students.filter((id) => startedSet.has(id))
                  .length,
              }
            : {}),
        };
      }),
      problems: test.problems.map((tp) => {
        const fill = tp.problem.format === 'FILL_NUMBER';
        return {
          problemId: tp.problemId,
          order: tp.order,
          format: tp.problem.format,
          points: tp.points,
          version: tp.problem.version,
          ...(fill
            ? {
                letters: slotLetters(tp.problem.statementText),
                groups: parseScoringGroups(tp.problem.scoringGroups),
                effective: !!effectiveGroups(tp.problem, tp.points),
                statementText: tp.problem.statementText,
                imageKey: tp.problem.imageKey,
              }
            : {}),
        };
      }),
    };
  }

  // ================= Анги оноох =================

  private parseDate(value?: string): Date | undefined {
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Огноо буруу байна');
    return date;
  }

  async assignClass(
    testId: string,
    classroomId: string,
    userId: string,
    dto: AssignExamClassDto,
  ) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    await assertManageableClass(this.prisma, classroomId, userId, role);
    const test = await findExamTest(this.prisma, testId, userId, role, {
      id: true,
      type: true,
      gradingMode: true,
    });
    const problems = await this.prisma.testProblem.findMany({
      where: { testId },
      select: {
        problem: {
          select: {
            id: true,
            format: true,
            choices: true,
            correctAnswer: true,
            choiceOptions: {
              select: { order: true, text: true, isCorrect: true },
            },
          },
        },
      },
    });
    if (problems.length === 0)
      throw new BadRequestException('Энэ тестэд бодлого алга');
    if (
      test.type === TestType.THOUSAND &&
      test.gradingMode !== TestGradingMode.AUTO
    ) {
      throw new BadRequestException(
        'Энэ шалгалтын хариуны түлхүүр бүрэн бэлэн болоогүй тул ангид оноох боломжгүй',
      );
    }
    if (
      test.gradingMode === TestGradingMode.AUTO &&
      !problems.some((row) => hasKnownAnswer(row.problem))
    ) {
      throw new BadRequestException(
        'Энэ тестийн бодлогуудад хариуны түлхүүр алга тул ангид оноох боломжгүй',
      );
    }
    const existing = await this.prisma.testAccess.findUnique({
      where: { testId_classroomId: { testId, classroomId } },
      select: { testId: true },
    });
    if (existing)
      throw new ConflictException(
        'Энэ шалгалт тус ангид аль хэдийн оноогдсон байна',
      );
    const assignedAt = this.parseDate(dto.date) ?? new Date();
    const reviewAutoAt =
      dto.reviewAfterDays === undefined || dto.reviewAfterDays === null
        ? null
        : new Date(assignedAt.getTime() + dto.reviewAfterDays * DAY_MS);
    // Анги оноох нь тестийн хувилбар (өөрчлөлтийн түүх) — нэг transaction-д.
    await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'TEST', testId);
      await tx.testAccess.create({
        data: { testId, classroomId, assignedAt, reviewAutoAt },
      });
      await tx.test.update({
        where: { id: testId },
        data: { isDraft: false },
      });
      await commitRevision(tx, rev, {
        actor: { id: userId, role },
        action: 'UPDATE',
      });
    });
    return this.settings(testId, userId);
  }

  async updateClass(
    testId: string,
    classroomId: string,
    userId: string,
    dto: UpdateExamClassDto,
  ) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    await assertManageableClass(this.prisma, classroomId, userId, role);
    await findExamTest(this.prisma, testId, userId, role, { id: true });
    const row = await this.prisma.testAccess.findUnique({
      where: { testId_classroomId: { testId, classroomId } },
      select: { assignedAt: true, reviewAutoAt: true },
    });
    if (!row)
      throw new NotFoundException('Энэ шалгалт тус ангид оноогдоогүй байна');
    const data: Prisma.TestAccessUncheckedUpdateInput = {};
    const assignedAt = this.parseDate(dto.date);
    if (assignedAt) data.assignedAt = assignedAt;
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
    if (dto.reviewAfterDays !== undefined) {
      const base = assignedAt ?? row.assignedAt;
      data.reviewAutoAt =
        dto.reviewAfterDays === null
          ? null
          : new Date(base.getTime() + dto.reviewAfterDays * DAY_MS);
    } else if (assignedAt && row.reviewAutoAt) {
      // Огноо өөрчлөгдвөл «N хоногийн дараа» зай хэвээр үлдэнэ.
      data.reviewAutoAt = new Date(
        assignedAt.getTime() +
          (row.reviewAutoAt.getTime() - row.assignedAt.getTime()),
      );
    }
    if (Object.keys(data).length === 0)
      throw new BadRequestException('Өөрчлөх утгаа оруулна уу');
    await this.prisma.testAccess.update({
      where: { testId_classroomId: { testId, classroomId } },
      data,
    });
    return this.settings(testId, userId);
  }

  async unassignClass(testId: string, classroomId: string, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    await assertManageableClass(this.prisma, classroomId, userId, role);
    await findExamTest(this.prisma, testId, userId, role, { id: true });
    const students = await this.prisma.enrollment.findMany({
      where: { classroomId },
      select: { studentId: true },
    });
    const started = await this.prisma.testAttemptSession.count({
      where: { testId, studentId: { in: students.map((s) => s.studentId) } },
    });
    if (started > 0) {
      throw new ConflictException(
        'Энэ ангийн сурагч шалгалтыг эхлүүлсэн тул хасах боломжгүй',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'TEST', testId);
      await tx.testAccess.deleteMany({ where: { testId, classroomId } });
      await commitRevision(tx, rev, {
        actor: { id: userId, role },
        action: 'UPDATE',
      });
    });
    return this.settings(testId, userId);
  }

  // ================= 2-р хэсгийн алхмын багц =================

  async setScoringGroups(
    testId: string,
    userId: string,
    dto: SetScoringGroupsDto,
  ) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    if (!managesAllClasses(role)) {
      throw new ForbiddenException('Алхмын багцыг Багш+ эсвэл админ засна');
    }
    await findExamTest(this.prisma, testId, userId, role, { id: true });
    const tp = await this.prisma.testProblem.findUnique({
      where: { testId_problemId: { testId, problemId: dto.problemId } },
      select: {
        points: true,
        problem: {
          select: {
            id: true,
            format: true,
            statementText: true,
            scoringGroups: true,
          },
        },
      },
    });
    if (!tp) throw new NotFoundException('Бодлого энэ шалгалтад алга');
    if (tp.problem.format !== 'FILL_NUMBER') {
      throw new BadRequestException(
        'Алхмын багц зөвхөн нөхөх (2-р хэсгийн) бодлогод',
      );
    }
    // Бодлого орсон аль нэг шалгалтыг сурагч өгсөн бол дүнгийн бүтэц өөрчлөгдөхгүй.
    const taken =
      (await this.prisma.testResult.count({
        where: { test: { problems: { some: { problemId: dto.problemId } } } },
      })) +
      (await this.prisma.testAttemptSession.count({
        where: { test: { problems: { some: { problemId: dto.problemId } } } },
      }));
    if (taken > 0) {
      throw new ConflictException(
        'Энэ бодлоготой шалгалтыг сурагч өгсөн тул алхмын багцыг өөрчлөх боломжгүй',
      );
    }
    let value: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    if (dto.groups !== null) {
      const groups = parseScoringGroups(
        dto.groups.map((g) => ({
          label: g.label.trim(),
          boxes: g.boxes,
          points: g.points,
        })),
      );
      if (!groups) {
        throw new BadRequestException(
          'Алхмын шошго давтагдсан эсвэл нүд хоёр багцад орсон байна',
        );
      }
      const letters = slotLetters(tp.problem.statementText);
      const unknown = groups
        .flatMap((g) => g.boxes)
        .filter((b) => !letters.includes(b));
      if (unknown.length) {
        throw new BadRequestException(
          `Бодлогод ${unknown.join(', ')} нүд алга`,
        );
      }
      // [a]… нүдтэй бодлогод багц бүр нүдтэй байна; нүдгүй (Word импорт)
      // бодлогод багц зөвхөн шошго, оноотой (гар/Excel шивэлтэд).
      if (letters.length > 0 && groups.some((g) => g.boxes.length === 0)) {
        throw new BadRequestException('Багц бүрт нүд сонгоно уу');
      }
      const used = new Set(groups.flatMap((g) => g.boxes));
      const missing = letters.filter((l) => !used.has(l));
      if (missing.length) {
        throw new BadRequestException(
          `${missing.join(', ')} нүд аль ч багцад ороогүй байна`,
        );
      }
      const sum = groups.reduce((s, g) => s + g.points, 0);
      if (sum !== tp.points) {
        throw new BadRequestException(
          `Багцын онооны нийлбэр (${sum}) бодлогын оноотой (${tp.points}) тэнцэх ёстой`,
        );
      }
      value = groups as unknown as Prisma.InputJsonValue;
    }
    // Өөрчлөлтийн түүх: бодлогын хувилбар; хуучирсан бол нэгтгэнэ, ижил талбар → 409.
    const committed = await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'PROBLEM', dto.problemId, {
        expectedVersion: dto.expectedVersion,
        overwrite: dto.overwrite,
      });
      await tx.problem.update({
        where: { id: dto.problemId },
        data: { scoringGroups: value },
      });
      return commitRevision(tx, rev, {
        actor: { id: userId, role },
        action: 'UPDATE',
      });
    });
    // Аудит — бодитоор бичигдсэн утга (нэгтгэлийн дараа); өөрчлөлтгүй бол бичихгүй
    if (committed.changed) {
      const saved = await this.prisma.problem.findUnique({
        where: { id: dto.problemId },
        select: { scoringGroups: true },
      });
      await this.audit.record({
        actorId: userId,
        actorRole: role,
        action: 'UPDATE',
        entity: 'Problem.scoringGroups',
        entityId: dto.problemId,
        before: { scoringGroups: tp.problem.scoringGroups ?? null },
        after: { scoringGroups: saved?.scoringGroups ?? null },
      });
    }
    // saved — «Буцаах» мэдэгдэлд: өөрчлөлт бичсэн эсэх, хэнтэй нэгтгэсэн
    return {
      ...(await this.settings(testId, userId)),
      saved: { changed: committed.changed, mergedWith: committed.mergedWith },
    };
  }

  // ================= Сурагчийн харагдац =================

  /** Сурагчид харагдах хэлбэр — зөв хариу, бодлогын код ОГТ ороогүй. */
  async studentView(testId: string, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await findExamTest(this.prisma, testId, userId, role, {
      id: true,
      title: true,
      timeLimitMin: true,
      problems: {
        orderBy: { order: 'asc' },
        select: {
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
              choiceOptions: {
                select: { order: true, text: true, isCorrect: true, imageKey: true },
              },
            },
          },
        },
      },
    });
    return {
      id: test.id,
      title: test.title,
      timeLimitMin: test.timeLimitMin,
      totalPoints: test.problems.reduce((s, tp) => s + tp.points, 0),
      problems: test.problems.map((tp, index) => {
        const p = tp.problem;
        const mode = choiceModeOf(p);
        const texts = mode ? choiceTextsOf(p) : [];
        return {
          n: index + 1,
          format: p.format,
          points: tp.points,
          statementText: p.statementText,
          imageKey: p.imageKey,
          choices:
            mode === 'TEXT'
              ? texts.map((text, i) => ({ letter: letterOf(i), text, image: choiceImagesOf(p)?.[i] ?? null }))
              : mode === 'LETTER'
                ? texts.map((letter) => ({ letter, text: null }))
                : null,
          slots:
            p.format === 'FILL_NUMBER' ? slotGroups(p.statementText) : null,
        };
      }),
    };
  }
}
