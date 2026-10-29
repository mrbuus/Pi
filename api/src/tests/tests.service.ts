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
  ItemMarkSource,
  Role,
  SelfState,
  Subject,
  TestGradingMode,
  TestType,
} from '../generated/prisma/enums';
import {
  activeClassSubjects,
  blockedSubjects,
  scopeGrantsTest,
  studentTestAccessOr,
  studentTestScope,
  TEACHER_ROLES,
  internalTeachingRole,
  assertInternalTeachingStaff,
} from '../common/access';
import { todayUB } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';
import {
  beginRevision,
  commitRevision,
  recordCreated,
} from '../revisions/revision-store';
import { CreateTestDto } from './dto/create-test.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import {
  CreateTestDraftDto,
  TestDraftStateDto,
  UpdateTestDraftDto,
} from './dto/test-draft.dto';
import { SaveSessionDto } from './dto/submit-test.dto';
import { MistakeCollector } from '../mistakes/mistake-collector.service';
import {
  answerToken,
  buildChoiceOrder,
  choiceImagesOf,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
} from './grading';
import { buildExamItems, ExamItem, gradeProblemItems } from './exam-items';
import {
  manualResultSource,
  overrideError,
  resultLock,
} from './result-policy';

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
    scoringGroups?: unknown;
    attemptCount: number;
    correctRate: number | null;
    choiceOptions: { order: number; text: string; isCorrect: boolean; imageKey?: string | null }[];
    analysis?: { status: string; solutionOutline: string | null } | null;
    chapter: { id: string; title: string };
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

type EditableTest = Prisma.TestGetPayload<{
  include: {
    problems: { select: { problemId: true; order: true; points: true } };
    access: true;
  };
}>;

type TestDatabase = Prisma.TransactionClient | PrismaService;

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

// Ирээдүйд оноосон үед огноотойгоор «удахгүй» гэж харагдах шалгалтын төрлүүд
const UPCOMING_EXAM_TYPES: TestType[] = [
  TestType.CHAPTER_EXAM,
  TestType.EESH_MOCK,
  TestType.THOUSAND,
];

@Injectable()
export class TestsService {
  constructor(
    private prisma: PrismaService,
    private mistakes: MistakeCollector,
  ) {}

  private draftState(dto: TestDraftStateDto): Prisma.InputJsonValue {
    if (
      dto.pointOverrides &&
      Object.values(dto.pointOverrides).some(
        (value) => !Number.isInteger(value) || value < 1,
      )
    ) {
      throw new BadRequestException('Бодлогын оноо эерэг бүхэл тоо байх ёстой');
    }
    return JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue;
  }

  private assertDraftRole(actorRole: Role) {
    // TEACHER_PLUS тест үүсгэж чаддаг тул ноорог ба хуулбарыг ч ашиглана.
    if (
      actorRole !== Role.ADMIN &&
      actorRole !== Role.TEACHER_PLUS &&
      actorRole !== Role.TEACHER
    ) {
      throw new ForbiddenException(
        'Ноорогийг зөвхөн админ эсвэл багш удирдана',
      );
    }
  }

  private async findDraftForActor(
    draftId: string,
    actorId: string,
    actorRole: Role,
  ) {
    await assertInternalTeachingStaff(this.prisma, actorId);
    this.assertDraftRole(actorRole);
    const draft = await this.prisma.testDraft.findUnique({
      where: { id: draftId },
    });
    if (!draft || (actorRole !== Role.ADMIN && draft.ownerId !== actorId)) {
      throw new NotFoundException('Ноорог олдсонгүй');
    }
    return draft;
  }

  async createTestDraft(
    dto: CreateTestDraftDto,
    actorId: string,
    actorRole: Role,
  ) {
    await assertInternalTeachingStaff(this.prisma, actorId);
    this.assertDraftRole(actorRole);
    const state = this.draftState(dto);
    const draft = await this.prisma.testDraft.create({
      data: { ownerId: actorId, state },
      select: { id: true, revision: true, state: true, updatedAt: true },
    });
    return draft;
  }

  async getTestDraft(draftId: string, actorId: string, actorRole: Role) {
    return this.findDraftForActor(draftId, actorId, actorRole);
  }

  async updateTestDraft(
    draftId: string,
    dto: UpdateTestDraftDto,
    actorId: string,
    actorRole: Role,
  ) {
    await this.findDraftForActor(draftId, actorId, actorRole);
    const state = this.draftState(dto);
    const where =
      actorRole !== Role.ADMIN
        ? { id: draftId, ownerId: actorId, revision: dto.expectedRevision }
        : { id: draftId, revision: dto.expectedRevision };
    // The UPDATE holds the row lock until the matching snapshot is read.
    // Returning a snapshot from outside the transaction could pair a later
    // writer's revision with this client's older form contents.
    const saved = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.testDraft.updateMany({
        where,
        data: { state, revision: { increment: 1 } },
      });
      if (changed.count !== 1) return null;
      return tx.testDraft.findUnique({ where: { id: draftId } });
    });
    if (!saved) {
      const latest = await this.findDraftForActor(draftId, actorId, actorRole);
      throw new ConflictException({
        message:
          'Ноорог өөр төхөөрөмжөөс шинэчлэгдсэн байна. Шинэ хувилбарыг ачаална уу.',
        draft: latest,
      });
    }
    return saved;
  }

  async deleteTestDraft(draftId: string, actorId: string, actorRole: Role) {
    await this.findDraftForActor(draftId, actorId, actorRole);
    const where =
      actorRole !== Role.ADMIN
        ? { id: draftId, ownerId: actorId }
        : { id: draftId };
    await this.prisma.testDraft.deleteMany({ where });
    return { deleted: true };
  }

  async duplicateTest(testId: string, actorId: string, actorRole: Role) {
    if (
      actorRole !== Role.ADMIN &&
      actorRole !== Role.TEACHER_PLUS &&
      actorRole !== Role.TEACHER
    ) {
      throw new ForbiddenException('Тест хуулах эрхгүй байна');
    }
    const source = await this.findEditableTest(testId, actorId, actorRole);
    // Access, learner results and attempt sessions are intentionally not copied.
    // A copy remains a private draft until its owner edits and assigns it.
    // Хуулбар + түүхийн хувилбар 0 нэг transaction-д.
    const duplicate = await this.prisma.$transaction(async (tx) => {
      const row = await tx.test.create({
        data: {
          title: `${source.title} (хуулбар)`.slice(0, 200),
          type: source.type,
          gradingMode: source.gradingMode,
          timeLimitMin: source.timeLimitMin,
          chapterId: source.chapterId,
          pdfKey: source.pdfKey,
          price: actorRole === Role.ADMIN ? source.price : null,
          createdById: actorId,
          isDraft: true,
          problems: {
            create: source.problems.map(({ problemId, order, points }) => ({
              problemId,
              order,
              points,
            })),
          },
        },
        include: { problems: { orderBy: { order: 'asc' } }, access: true },
      });
      const rev = await recordCreated(tx, 'TEST', row.id, {
        actor: { id: actorId, role: actorRole },
        action: 'CREATE',
        summary: 'Хуулбараар үүсгэсэн',
      });
      return { ...row, version: rev.version };
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'CREATE',
      'Test',
      duplicate.id,
      null,
      duplicate,
    );
    return { ...duplicate, problems: source.problems.length };
  }

  // TODO(followUp): api/src/audit/audit.service.ts бэлэн болмогц энэ
  // helper-ийг хасаад тэрхүү нэгдсэн AuditService-ийг DI-аар ашиглах.
  private toAuditJson(
    v: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (v === null || v === undefined) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
  }

  private async recordAudit(
    actorId: string,
    actorRole: Role,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
    db: TestDatabase = this.prisma,
    reason?: string,
  ) {
    await db.auditLog.create({
      data: {
        actorId,
        actorRole,
        action,
        entity,
        entityId,
        before: this.toAuditJson(before),
        after: this.toAuditJson(after),
        ...(reason ? { reason: reason.trim().slice(0, 500) } : {}),
      },
    });
  }

  // Багш+/Админ тестийг зөөлөн устгана — TestResult/Attempt зэрэг түүхэн
  // бичлэгүүд орфон үлдэхгүйн тулд hard DELETE хийхгүй.
  async remove(testId: string, actorId: string, actorRole: Role) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    const updated = await this.prisma.test.update({
      where: { id: testId },
      data: { deletedAt: new Date() },
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'Test',
      testId,
      test,
      updated,
    );
    return { deleted: true };
  }

  private async hasBeenTaken(
    testId: string,
    db: TestDatabase = this.prisma,
  ): Promise<boolean> {
    const [resultCount, sessionCount] = await Promise.all([
      db.testResult.count({ where: { testId } }),
      db.testAttemptSession.count({ where: { testId } }),
    ]);
    return resultCount > 0 || sessionCount > 0;
  }

  private async findEditableTest(
    testId: string,
    actorId: string,
    actorRole: Role,
    db: TestDatabase = this.prisma,
  ): Promise<EditableTest> {
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
    const test = await db.test.findUnique({
      where: { id: testId },
      include: {
        problems: { select: { problemId: true, order: true, points: true } },
        access: true,
      },
    });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    if (actorRole === Role.TEACHER && test.createdById !== actorId) {
      throw new ForbiddenException(
        'Та зөвхөн өөрийн үүсгэсэн тестийг засах боломжтой',
      );
    }
    return test;
  }

  /** PATCH болон анхны session үүсгэлт ижил Test мөрөнд цувж орно. */
  private async lockTestRow(
    tx: Prisma.TransactionClient,
    testId: string,
    strength: 'SHARE' | 'UPDATE' = 'UPDATE',
  ) {
    if (strength === 'SHARE') {
      await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "Test" WHERE "id" = ${testId} FOR SHARE`,
      );
    } else {
      await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "Test" WHERE "id" = ${testId} FOR UPDATE`,
      );
    }
  }
  async editInfo(testId: string, actorId: string, actorRole: Role) {
    await this.findEditableTest(testId, actorId, actorRole);
    const taken = await this.hasBeenTaken(testId);
    return {
      mode: taken ? 'LIMITED' : 'FULL',
      reason: taken
        ? 'Сурагч энэ тестийг эхлүүлсэн эсвэл дүнгээ илгээсэн тул зөвхөн нэр, хугацааг өөрчилнө.'
        : 'Сурагч хараахан эхлүүлээгүй тул тестийн бүх хэсгийг засах боломжтой.',
    } as const;
  }

  async updateTest(
    testId: string,
    dto: UpdateTestDto,
    actorId: string,
    actorRole: Role,
  ) {
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
    await this.assertAssignedClassrooms(actorId, dto.classroomIds);
    // expectedVersion, overwrite — зөвхөн зэрэг засварын тохиргоо, өөрчлөх талбар биш.
    const changedFields = Object.keys(dto).filter(
      (field) =>
        field !== 'expectedVersion' &&
        field !== 'overwrite' &&
        dto[field as keyof UpdateTestDto] !== undefined,
    );
    if (changedFields.length === 0) {
      throw new BadRequestException('Өөрчлөх мэдээллээ оруулна уу');
    }

    if (dto.price !== undefined && actorRole !== Role.ADMIN) {
      throw new ForbiddenException('Тестийн төлбөрийг зөвхөн админ өөрчилнө');
    }

    if (dto.problems !== undefined) {
      const ids = dto.problems.map((problem) => problem.problemId);
      const orders = dto.problems.map((problem) => problem.order);
      if (
        new Set(ids).size !== ids.length ||
        new Set(orders).size !== orders.length
      ) {
        throw new BadRequestException(
          'Бодлого бүр давтагдаагүй дугаар, дараалалтай байна',
        );
      }
    }

    const data: Prisma.TestUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.gradingMode !== undefined) data.gradingMode = dto.gradingMode;
    if (dto.chapterId !== undefined) data.chapterId = dto.chapterId;
    if (dto.timeLimitMin !== undefined) data.timeLimitMin = dto.timeLimitMin;
    if (dto.pdfKey !== undefined) data.pdfKey = dto.pdfKey;
    if (dto.groupKey !== undefined) data.groupKey = dto.groupKey;
    if (dto.variantLabel !== undefined) data.variantLabel = dto.variantLabel;
    if (dto.price !== undefined) data.price = dto.price;

    const { updated, answerWarning, version, changed, mergedWith } = await this.prisma.$transaction(
      async (tx) => {
        await this.lockTestRow(tx, testId);
        const test = await this.findEditableTest(
          testId,
          actorId,
          actorRole,
          tx,
        );
        // Өөрчлөлтийн түүх (эрх шалгасны дараа): өмнөх төлөв; expectedVersion
        // зөрвөл 409 — хэн, хэзээ өөрчилснийг хэлнэ.
        const rev = await beginRevision(tx, 'TEST', testId, {
          expectedVersion: dto.expectedVersion,
          overwrite: dto.overwrite,
        });
        if (
          test.type === TestType.THOUSAND &&
          dto.classroomIds !== undefined
        ) {
          // Энгийн засвар TestAccess-ийг бүхэлд нь дахин үүсгэдэг тул ангийн
          // эргэн харалтын тохиргоо (reviewLevel/assignedAt) устна.
          throw new BadRequestException(
            '1000 бодлогын шалгалтыг «Шалгалт» хэсгийн «Тохиргоо» табаас ангид онооно',
          );
        }
        const taken = await this.hasBeenTaken(testId, tx);
        if (
          taken &&
          changedFields.some(
            (field) => field !== 'title' && field !== 'timeLimitMin',
          )
        ) {
          throw new ConflictException(
            'Энэ тестийг сурагчид өгсөн тул зөвхөн нэр, хугацааг засах боломжтой',
          );
        }

        const shortensTime =
          dto.timeLimitMin !== undefined &&
          dto.timeLimitMin !== null &&
          (test.timeLimitMin === null || dto.timeLimitMin < test.timeLimitMin);
        if (shortensTime) {
          const activeSessionCount = await tx.testAttemptSession.count({
            where: { testId, status: AttemptSessionStatus.IN_PROGRESS },
          });
          if (activeSessionCount > 0) {
            throw new ConflictException(
              'Сурагч шалгалт өгч байгаа тул дуусахаас өмнө хугацааг богиносгох боломжгүй',
            );
          }
        }

        const problemIds = dto.problems ?? test.problems;
        const answerWarning = dto.classroomIds?.length
          ? await this.checkAnswerCoverage(problemIds, tx)
          : undefined;
        if (dto.problems !== undefined) {
          await tx.testProblem.deleteMany({ where: { testId } });
          if (dto.problems.length > 0) {
            await tx.testProblem.createMany({
              data: dto.problems.map((problem) => ({
                testId,
                problemId: problem.problemId,
                order: problem.order,
                points: problem.points ?? 1,
              })),
            });
          }
        }
        if (dto.classroomIds !== undefined) {
          await tx.testAccess.deleteMany({ where: { testId } });
          if (dto.classroomIds.length > 0) {
            await tx.testAccess.createMany({
              data: dto.classroomIds.map((classroomId) => ({
                testId,
                classroomId,
              })),
            });
            data.isDraft = false;
          }
        }
        const updated = await tx.test.update({
          where: { id: testId },
          data,
          include: {
            problems: { orderBy: { order: 'asc' } },
            access: true,
          },
        });
        const committed = await commitRevision(tx, rev, {
          actor: { id: actorId, role: actorRole },
          action: 'UPDATE',
        });
        // Бусдын өөрчлөлттэй нэгтгэсэн бол мөр өөрчлөгдсөн — шинэ төлөвийг буцаана
        const fresh = committed.mergedWith
          ? await tx.test.findUniqueOrThrow({
              where: { id: testId },
              include: { problems: { orderBy: { order: 'asc' } }, access: true },
            })
          : updated;
        // Аудит — нэгтгэлийн ДАРААХ (бодитоор хадгалагдсан) төлөв
        await this.recordAudit(
          actorId,
          actorRole,
          'UPDATE',
          'Test',
          testId,
          test,
          fresh,
          tx,
        );
        return {
          updated: fresh,
          answerWarning,
          version: committed.version,
          changed: committed.changed,
          mergedWith: committed.mergedWith,
        };
      },
    );
    const result = { ...updated, version, changed, mergedWith };
    return answerWarning ? { ...result, answerWarning } : result;
  }

  // Ангид оноож байгаа (classroomIds ирсэн) тестийг хариуны түлхүүргүй
  // бодлогоос БҮРЭН бүрдүүлбэл сурагч 0/0 авч будлиантай, шударга бус
  // үр дүн авна (SPEC Fix 1). hasKnownAnswer()-г grading.ts-ээс шууд
  // ашиглана — логик хуулбарлахгүй, нэг эх сурвалжтай байлгана.
  private async checkAnswerCoverage(
    problems: { problemId: string }[],
    db: TestDatabase = this.prisma,
  ): Promise<
    | { withoutAnswerCount: number; totalProblems: number; message: string }
    | undefined
  > {
    const total = problems.length;
    if (total === 0) return undefined;

    const rows = await db.problem.findMany({
      where: { id: { in: problems.map((p) => p.problemId) } },
      select: {
        id: true,
        format: true,
        choices: true,
        correctAnswer: true,
        choiceOptions: {
          select: { order: true, text: true, isCorrect: true },
        },
      },
    });
    // Олдоогүй (устсан/буруу id) бодлогыг ч мөн "хариугүй" гэж тооцно —
    // ийм бодлогыг ч мөн автоматаар дүгнэх боломжгүй.
    const knownCount = rows.filter((p) => hasKnownAnswer(p)).length;
    const withoutAnswerCount = total - knownCount;
    if (withoutAnswerCount === 0) return undefined;

    if (withoutAnswerCount === total) {
      throw new BadRequestException(
        `Энэ тестийн бүх ${total} бодлого хариуны түлхүүргүй тул автоматаар дүгнэх боломжгүй — ийм тестийг ангид оноож болохгүй. Эхлээд наад зах нь нэг бодлогод хариу нэмнэ үү.`,
      );
    }

    return {
      withoutAnswerCount,
      totalProblems: total,
      message: `${withoutAnswerCount} бодлого хариуны түлхүүргүй тул дүнд тооцогдохгүй.`,
    };
  }

  // Багш зөвхөн өөрийн ангид; Багш+/Админ бүх ангид онооно (SHALGALT §8.4).
  private async assertAssignedClassrooms(actorId: string, ids?: string[]) {
    const role = await assertInternalTeachingStaff(this.prisma, actorId);
    if (!ids?.length || role === Role.ADMIN) return;
    const count = await this.prisma.classroom.count({
      where: {
        id: { in: [...new Set(ids)] },
        ...(role === Role.TEACHER_PLUS ? {} : { teacherId: actorId }),
        archived: false,
      },
    });
    if (count !== new Set(ids).size)
      throw new ForbiddenException('Өөрийн ангид шалгалт онооно уу');
  }

  async create(dto: CreateTestDto, userId: string) {
    const actorRole = await assertInternalTeachingStaff(this.prisma, userId);
    await this.assertAssignedClassrooms(userId, dto.classroomIds);
    // Зөвхөн ангид ШУУД оноож байгаа үед л шалгана (TestAccess бичигдэх цорын
    // ганц зам) — эс тэгвээс ангид оноогдоогүй ноорог тестэд саад болно.
    const answerWarning = dto.classroomIds?.length
      ? await this.checkAnswerCoverage(dto.problems ?? [])
      : undefined;

    // Тест + түүхийн хувилбар 0 нэг transaction-д.
    const test = await this.prisma.$transaction(async (tx) => {
      const row = await tx.test.create({
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
      const rev = await recordCreated(tx, 'TEST', row.id, {
        actor: { id: userId, role: actorRole },
        action: 'CREATE',
      });
      return { ...row, version: rev.version };
    });

    return answerWarning ? { ...test, answerWarning } : test;
  }

  // Багш бүгдийг, сурагч ангидаа оноогдсон ЭСВЭЛ хүчинтэй эрхийнхээ (pass)
  // хамрах хүрээнд орсон тестүүдийг харна (Bug 2 fix — SPEC §11)
  // «1000 бодлого» (THOUSAND) — зөвхөн includeThousand үед (/app/tests «Шалгалт»
  // таб, дэлгүүрийн удирдлага); бусад жагсаалтад (тест сонгогч г.м.) орохгүй.
  async list(
    userId: string,
    role: Role,
    subject?: Subject,
    includeThousand = false,
    chapterId?: string,
  ) {
    const subjectFilter: Prisma.TestWhereInput = {
      ...(subject ? { chapter: { book: { subject } } } : {}),
      ...(includeThousand ? {} : { type: { not: TestType.THOUSAND } }),
      ...(chapterId ? { chapterId } : {}),
    };

    if (
      TEACHER_ROLES.includes(role) &&
      (await internalTeachingRole(this.prisma, userId))
    ) {
      const draftOwnerFilter: Prisma.TestWhereInput =
        role === Role.TEACHER
          ? { OR: [{ isDraft: false }, { isDraft: true, createdById: userId }] }
          : {};
      return this.prisma.test.findMany({
        where: { ...subjectFilter, ...draftOwnerFilter, deletedAt: null },
        include: {
          _count: { select: { problems: true, results: true } },
          access: { include: { classroom: { select: { name: true } } } },
          chapter: { select: { book: { select: { code: true, displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    const now = new Date();
    const [enrollments, scope] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          studentId: userId,
          leftAt: null,
          classroom: { archived: false },
        },
        include: { classroom: { select: { subject: true } } },
      }),
      studentTestScope(this.prisma, userId, role),
    ]);

    // Эхлүүлж болох тест л (common/access.ts studentTestAccessOr): ангид
    // оноосон бол assignedAt <= одоо; танхимын сурагчид бүлэг/номын эрх зөвхөн
    // ангид нээгдсэн бүлэгт (эзэн 2026-10-29 — ангийн хийгээгүй сэдвийн тест
    // харагдахгүй)
    let accessFilter: Prisma.TestWhereInput | undefined;
    const accessOr = studentTestAccessOr(scope, now);
    if (accessOr) {
      // Жишиг сорилд бүртгүүлсэн тест — цонх хаагдсан ч дүн, эргэн харалтад үлдэнэ
      accessOr.push({
        mockEvents: {
          some: { published: true, registrations: { some: { userId } } },
        },
      });
      // Өөрийн эхлүүлсэн/дүнтэй тест үргэлж (үргэлжлүүлэх, дүнгээ харах)
      accessOr.push({ attemptSessions: { some: { studentId: userId } } });
      accessFilter = { OR: accessOr };
    }

    // Хичээлээр хаалттай (эзэн 2026-10-18): өөрийн ангид байхгүй хичээлийн
    // (Нийгмийн ухаан г.м.) тест ямар ч эрхээр жагсаалтад орохгүй. Бүлэггүй/
    // номгүй тест = MATH тул NOT шүүлтэд унахгүй.
    const blocked = blockedSubjects(
      enrollments.map((e) => e.classroom.subject ?? Subject.MATH),
    );
    const rows = await this.prisma.test.findMany({
      where: {
        ...subjectFilter,
        ...accessFilter,
        ...(blocked.length
          ? { NOT: { chapter: { book: { subject: { in: blocked } } } } }
          : {}),
        deletedAt: null,
        isDraft: false,
      },
      select: {
        id: true,
        title: true,
        type: true,
        gradingMode: true,
        timeLimitMin: true,
        variantLabel: true,
        groupKey: true, // сэдвээр бүлэглэх UI-д: "Илтгэгч тэгшитгэл 1"
        chapter: { select: { book: { select: { code: true, displayName: true } } } }, // номын өнгө
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
    const listed = rows.map(({ attemptSessions, ...t }) => ({
      ...t,
      sessionStatus: attemptSessions[0]?.status ?? null,
    }));
    // Ирээдүйд оноосон ШАЛГАЛТ — зөвхөн огноотой «удахгүй» мөр (бодлого,
    // эхлэх товчгүй). DAILY/CUSTOM/THEORY дасгал огт харагдахгүй.
    if (!scope.classroomIds.length) return listed;
    const seen = new Set(listed.map((t) => t.id));
    const upcomingTypes = UPCOMING_EXAM_TYPES.filter(
      (t) => includeThousand || t !== TestType.THOUSAND,
    );
    const future = await this.prisma.test.findMany({
      where: {
        ...subjectFilter,
        ...(blocked.length
          ? { NOT: { chapter: { book: { subject: { in: blocked } } } } }
          : {}),
        AND: [{ type: { in: upcomingTypes } }],
        deletedAt: null,
        isDraft: false,
        access: {
          some: {
            classroomId: { in: scope.classroomIds },
            assignedAt: { gt: now },
          },
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        gradingMode: true,
        timeLimitMin: true,
        variantLabel: true,
        groupKey: true,
        chapter: { select: { book: { select: { code: true, displayName: true } } } },
        createdAt: true,
        access: {
          where: { classroomId: { in: scope.classroomIds } },
          select: { assignedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const upcoming = future
      .filter((t) => !seen.has(t.id))
      .map(({ access, ...t }) => ({
        ...t,
        _count: { problems: 0 },
        results: [] as { totalScore: number; maxScore: number }[],
        sessionStatus: null,
        upcoming: true as const,
        assignedAt:
          access
            .map((a) => a.assignedAt)
            .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
      }));
    return [...listed, ...upcoming];
  }

  // GET /tests/:id — багшид бүрэн бүтэц, сурагчид зөвхөн интро мета
  // (бодлогууд ЗӨВХӨН session эхэлсний дараа очно — урьдчилж харах цоорхойг хаана)
  async getOne(testId: string, userId: string, role: Role) {
    if (
      TEACHER_ROLES.includes(role) &&
      (await internalTeachingRole(this.prisma, userId))
    ) {
      const test = await this.prisma.test.findUnique({
        where: { id: testId },
        include: {
          chapter: { select: { book: { select: { subject: true } } } },
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
                  correctAnswer: true,
                  points: true,
                  chapterId: true,
                  // Тест засах блок: агуулгын засварт expectedVersion (зэрэг засвар)
                  version: true,
                  choiceOptions: {
                    orderBy: { order: 'asc' },
                    select: {
                      order: true,
                      text: true,
                      isCorrect: true,
                      label: true,
                      imageKey: true,
                    },
                  },
                  tags: { include: { tag: true } },
                  analysis: {
                    select: {
                      answerKeyStatus: true,
                      topic: true,
                      subtopic: true,
                    },
                  },
                },
              },
            },
          },
          access: true,
        },
      });
      if (!test || test.deletedAt)
        throw new NotFoundException('Тест олдсонгүй');
      if (
        test.isDraft &&
        role === Role.TEACHER &&
        test.createdById !== userId
      ) {
        throw new NotFoundException('Тест олдсонгүй');
      }
      if (role === Role.TEACHER && test.createdById !== userId) {
        const assigned = await this.prisma.testAccess.findFirst({
          where: { testId, classroom: { teacherId: userId, archived: false } },
        });
        if (!assigned)
          throw new ForbiddenException('Энэ шалгалтад хандах эрхгүй');
      }
      return test;
    }

    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        problems: { select: { points: true } },
        access: true,
      },
    });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    await this.assertStudentAccess(test, userId);

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
    let test = await this.loadTestWithProblems(testId);
    if (test.gradingMode === TestGradingMode.MANUAL) {
      throw new BadRequestException(
        'Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөхгүй.',
      );
    }
    if (test.problems.length === 0) {
      throw new BadRequestException('Энэ тестэд бодлого оруулаагүй байна');
    }
    await this.assertStudentAccess(test, userId);

    let session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;

    if (!session) {
      const started = await this.prisma.$transaction(async (tx) => {
        // Багшийн бүрэн засвартай ижил мөр түгжиж, бодлогын жагсаалтыг
        // түгжээ авсны дараа уншина. Ингэснээр session-ийн problemOrder
        // TestProblem шинэчлэлттэй зөрөхгүй.
        await this.lockTestRow(tx, testId, 'SHARE');
        const lockedTest = await this.loadTestWithProblems(testId, tx);
        if (lockedTest.gradingMode === TestGradingMode.MANUAL) {
          throw new BadRequestException(
            'Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөхгүй.',
          );
        }
        if (lockedTest.problems.length === 0) {
          throw new BadRequestException('Энэ тестэд бодлого оруулаагүй байна');
        }
        await this.assertStudentAccess(lockedTest, userId, tx);

        // Өөр төхөөрөмж түгжээг түрүүлж авсан байж болох тул дотор нь дахин шалгана.
        const existingSession = (await tx.testAttemptSession.findUnique({
          where: { testId_studentId: { testId, studentId: userId } },
        })) as SessionRow | null;
        if (existingSession) {
          return { test: lockedTest, session: existingSession, result: null };
        }

        // Цаасан дүн аль хэдийн орсон бол онлайнаар дахин өгөхгүй.
        const existingResult = await tx.testResult.findUnique({
          where: { testId_studentId: { testId, studentId: userId } },
        });
        if (existingResult) {
          return { test: lockedTest, session: null, result: existingResult };
        }

        const seed = randomInt(1, 2 ** 31);
        const gradables = lockedTest.problems.map(toGradable);
        const choiceOrder = buildChoiceOrder(gradables, seed);
        const problemOrder = lockedTest.problems.map((tp) => tp.problemId);
        const now = new Date();
        await tx.testAttemptSession.createMany({
          data: [
            {
              testId,
              studentId: userId,
              seed,
              problemOrder,
              choiceOrder: choiceOrder,
              deadlineAt: lockedTest.timeLimitMin
                ? new Date(now.getTime() + lockedTest.timeLimitMin * 60_000)
                : null,
            },
          ],
          skipDuplicates: true,
        });
        const createdSession = (await tx.testAttemptSession.findUnique({
          where: { testId_studentId: { testId, studentId: userId } },
        })) as SessionRow | null;
        if (!createdSession) {
          throw new ConflictException('Шалгалтын сесс үүсгэж чадсангүй');
        }
        return { test: lockedTest, session: createdSession, result: null };
      });
      test = started.test;
      session = started.session;
      if (started.result) {
        return {
          session: { status: AttemptSessionStatus.SUBMITTED },
          result: {
            totalScore: started.result.totalScore,
            maxScore: started.result.maxScore,
          },
        };
      }
    }

    if (!session) throw new NotFoundException('Шалгалтын сесс олдсонгүй');

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

  // Heartbeat: сурагч "амьд байна" тэмдэглээлдээ (хэрэглэгчийн үйл явдал бүртгэлээд).
  // Бичих үйлдэл хийхгүй, зөвхөн амьдралт статус. Хугацаа хэтэрсэн бол SUBMITTED буцаана.
  async heartbeat(testId: string, userId: string, event?: string) {
    const session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      const result = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      });
      return { status: session.status, result, remainingSec: null };
    }

    // Хугацаа хэтэрсэн бол эцсийн дүгнэлт хийнэ (өөрөөс үүдэлтэй)
    if (this.isExpired(session)) {
      const test = await this.loadTestWithProblems(testId);
      const { result } = await this.finalize(test, session, userId);
      return {
        status: AttemptSessionStatus.SUBMITTED,
        result: { totalScore: result.totalScore, maxScore: result.maxScore },
        remainingSec: null,
      };
    }

    // Үйл явдал log, session өөрчилл БҮҮ (зөвхөн амьдралт)
    if (event) {
      const events = Array.isArray(session.events)
        ? [...(session.events as unknown[])]
        : [];
      events.push({ t: new Date().toISOString(), type: event });
      if (events.length > MAX_EVENTS)
        events.splice(0, events.length - MAX_EVENTS);

      await this.prisma.testAttemptSession.update({
        where: { id: session.id },
        data: { events: events as Prisma.InputJsonValue },
      });
    }

    return {
      status: session.status,
      leaveCount: session.leaveCount,
      remainingSec: this.remainingSec(session.deadlineAt),
    };
  }

  // Autosave: хариулт/тэмдэглэгээ/хугацааг нэгтгэж хадгална, үйл явдал бүртгэнэ.
  // Хугацаа дууссан байвал шууд дүгнэж SUBMITTED буцаана (клиент үр дүн рүү шилжинэ).
  /**
   * ГҮЙЦЭТГЭЛИЙН ГОЛ ЗАМ. Автосэйв нь сурагч тутамд ~1.2 секунд тутам,
   * 100 минутын шалгалтад ~300 удаа дуудагдана. 1000 сурагч зэрэг шалгалт
   * өгвөл энэ нь тогтмол ~50 хүсэлт/сек.
   *
   * Өмнө нь энд loadTestWithProblems() дуудагдаж, ДУУДАЛТ БҮРТ 40 бодлогын
   * бүтэн текст, choices, correctAnswer, бүх choiceOptions, analysis.
   * solutionOutline-ыг DB-ээс татдаг байв — гэтэл үүнийг ЗӨВХӨН бодлогын
   * id-нуудыг шалгахад ашигладаг (mergeDrafts-ээс validIds).
   *
   * Одоо хөнгөн query-гээр problemId болон нүхний түлхүүр баталгаажуулах
   * correctAnswer-г сервер талд татна (клиент рүү буцаахгүй). Бүтэн тест зөвхөн
   * хугацаа дуусаж finalize хийх үед л (сурагч тутамд ХАМГИЙН ИХДЭЭ 1 удаа)
   * ачаалагдана.
   */
  private loadTestProblemIds(testId: string) {
    return this.prisma.testProblem.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      select: {
        problemId: true,
        problem: { select: { format: true, correctAnswer: true } },
      },
    });
  }

  async saveSession(testId: string, userId: string, dto: SaveSessionDto) {
    const [problemRefs, session] = await Promise.all([
      this.loadTestProblemIds(testId),
      this.prisma.testAttemptSession.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
      }) as Promise<SessionRow | null>,
    ]);
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      const result = await this.prisma.testResult.findUnique({
        where: { testId_studentId: { testId, studentId: userId } },
        select: { totalScore: true, maxScore: true },
      });
      return { status: session.status, result };
    }

    const merged = this.mergeDrafts(problemRefs, session, dto);

    if (this.isExpired(session)) {
      // Зөвхөн ЭНД бүтэн тест хэрэгтэй — оноо бодоход хариун түлхүүр шаардлагатай.
      const test = await this.loadTestWithProblems(testId);
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
    await this.assertStudentAccess(test, userId);
    const session = (await this.prisma.testAttemptSession.findUnique({
      where: { testId_studentId: { testId, studentId: userId } },
    })) as SessionRow | null;
    if (!session) throw new NotFoundException('Шалгалт эхлээгүй байна');

    if (session.status === AttemptSessionStatus.SUBMITTED) {
      throw new ConflictException('Та энэ тестийг аль хэдийн өгсөн байна');
    }

    const merged = this.mergeDrafts(test.problems, session, dto);
    const finalized = await this.finalize(test, session, userId, merged);
    // 1000 бодлого: бодлого бүрийн зөв/буруу ч багшийн нээсэн түвшнээр л
    // харагдана — илгээлтийн хариунд задлахгүй.
    return test.type === TestType.THOUSAND
      ? { result: finalized.result }
      : finalized;
  }

  // Дууссан шалгалтын эргэн харах дэлгэц: бодлого бүрийн зөв/буруу төлөв + өөрийн хариулт.
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
    // 1000 бодлогын шалгалт: бодлого бүрийн зөв/буруу ч гэсэн багшийн нээсэн
    // түвшнээр л харагдана — /thousand/tests/:id/review (сервер талын хаалт).
    if (test.type === TestType.THOUSAND) {
      return {
        result,
        items: [],
        leaveCount: session.leaveCount,
        gatedReview: true,
      };
    }

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
        raw !== undefined && raw !== null && answerToken(raw) !== '';
      // Бодолт зөвхөн VERIFIED статустай үед нээгдэнэ — AI/авто ноорог задрахгүй
      const a = tp.problem.analysis;
      return {
        n: i + 1,
        points: tp.points,
        chapterId: tp.problem.chapter.id,
        chapterTitle: tp.problem.chapter.title,
        statementText: tp.problem.statementText,
        imageKey: tp.problem.imageKey,
        answered,
        correct: answered ? correct : false,
        // Импортын явцад хариу тодорхойгүй үлдсэн бодлого (жиш: 300x300,
        // эх docx-д хариуны түлхүүр байгаагүй) — review дэлгэц дээр "буруу"
        // гэж бүү харуул, учир нь бид ч мэдэхгүй.
        answerUnknown: !hasKnownAnswer(g),
        // canonicalAnswer нь gradeAnswer-ийн бүх салбарт string|null (харуулах
        // зориулалттай тул answerToken (жижиг үсэг рүү хөрвүүлдэг) ашиглахгүй)
        myAnswer: answered
          ? typeof canonicalAnswer === 'string'
            ? canonicalAnswer
            : ''
          : null,
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
    role = await assertInternalTeachingStaff(this.prisma, userId);
    if (
      dto.totalScore > dto.maxScore ||
      dto.totalScore < 0 ||
      dto.maxScore <= 0
    )
      throw new BadRequestException('Дүнгийн хязгаар буруу');
    // Багш зөвхөн өөрийн ангийн; Багш+/Админ бүх ангийн сурагчийн дүнг оруулна.
    if (role === Role.TEACHER) {
      const assigned = await this.prisma.testAccess.findFirst({
        where: {
          testId,
          classroom: {
            teacherId: userId,
            archived: false,
            enrollments: { some: { studentId: dto.studentId, leftAt: null } },
          },
        },
      });
      if (!assigned)
        throw new ForbiddenException(
          'Өөрийн ангид оноосон шалгалтын сурагчийн дүнг оруулна уу',
        );
    }
    return this.prisma.$transaction(async (tx) => {
      // Гараар дүн оруулах нь мөн тестийг өгсөн болгож, бүрэн засварын
      // горимыг хаана. Анхны session үүсгэлттэй ижил түгжээ ашиглана.
      await this.lockTestRow(tx, testId, 'SHARE');
      const current = await tx.test.findUnique({ where: { id: testId } });
      if (!current || current.deletedAt)
        throw new NotFoundException('Тест олдсонгүй');
      const where = {
        testId_studentId: { testId, studentId: dto.studentId },
      };
      const [existing, session] = await Promise.all([
        tx.testResult.findUnique({ where }),
        tx.testAttemptSession.findUnique({ where, select: { status: true } }),
      ]);
      // Онлайнаар өгсөн дүнг зөвхөн Багш+/Админ шалтгаантайгаар дарна.
      const lock = resultLock(existing, session);
      const blocked = overrideError(lock, role, dto.reason);
      if (blocked) {
        throw lock === 'IN_PROGRESS'
          ? new ConflictException(blocked)
          : new ForbiddenException(blocked);
      }
      const source =
        existing?.source === AttemptSource.ONLINE_TEST
          ? AttemptSource.ONLINE_TEST
          : manualResultSource(current.type);
      const saved = await tx.testResult.upsert({
        where,
        create: {
          testId,
          studentId: dto.studentId,
          totalScore: dto.totalScore,
          maxScore: dto.maxScore,
          enteredById: userId,
          source,
        },
        update: {
          totalScore: dto.totalScore,
          maxScore: dto.maxScore,
          enteredById: userId,
          source,
          version: { increment: 1 },
          regradeNote: lock
            ? 'Онлайн дүнг Багш+ зассан (нийт оноо)'
            : 'Нийт оноо гараар',
        },
      });
      // Зөвхөн нийт оноо ирсэн тул бодлого бүрийн тэмдэглэгээ хуучирна;
      // дүн орсон сурагч «ирээгүй» байж болохгүй.
      await tx.testItemMark.deleteMany({
        where: { testId, studentId: dto.studentId },
      });
      await tx.testAbsence.deleteMany({
        where: { testId, studentId: dto.studentId },
      });
      if (lock) {
        await this.recordAudit(
          userId,
          role,
          'OVERRIDE_ONLINE_RESULT',
          'TestResult',
          saved.id,
          existing,
          saved,
          tx,
          dto.reason,
        );
      }
      return saved;
    });
  }

  // Багшийн «Шалгалтын дүн» хэсэг (SPEC §8) — тестээр нэгтгэсэн дүнгүүд
  async results(testId: string, userId: string, role: Role) {
    role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await this.prisma.test.findFirst({
      where: { id: testId, deletedAt: null },
    });
    if (!test) throw new NotFoundException('Тест олдсонгүй');
    // Багш зөвхөн өөрийн ангийн сурагчдыг; Багш+/Админ бүгдийг (SHALGALT §8.4).
    const studentScope =
      role === Role.ADMIN || role === Role.TEACHER_PLUS
        ? {}
        : {
            student: {
              enrollments: {
                some: {
                  leftAt: null,
                  classroom: { teacherId: userId, archived: false },
                },
              },
            },
          };
    if (role === Role.TEACHER) {
      const assigned = await this.prisma.testAccess.findFirst({
        where: { testId, classroom: { teacherId: userId, archived: false } },
      });
      if (test.createdById !== userId && !assigned)
        throw new ForbiddenException('Энэ шалгалтын дүнг харах эрхгүй');
    }
    const rows = await this.prisma.testResult.findMany({
      where: { testId, ...studentScope },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { totalScore: 'desc' },
    });
    // Анти-чит: шалгалтын горимоос гарсан тоог багшид харуулна (Шийдвэр 3)
    const sessions = await this.prisma.testAttemptSession.findMany({
      where: { testId, studentId: { in: rows.map((r) => r.studentId) } },
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

  // TEACHER зөвхөн өөрийн ангийн сурагчийг харна; TEACHER_PLUS/ADMIN бүх
  // сурагчийг харна (activity.service.ts-ийн assertStudentAccess-тэй ижил
  // хэв маяг — SPEC §13).
  private async assertStaffStudentAccess(
    studentId: string,
    userId: string,
    role: Role,
  ) {
    role = await assertInternalTeachingStaff(this.prisma, userId);
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return student;
    if (role === Role.TEACHER) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          leftAt: null,
          classroom: { teacherId: userId },
        },
      });
      if (enrollment) return student;
    }
    throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
  }

  // Багш/Админ: тухайн сурагчийн шалгалтын бүх дүн — "Бие даасан явц" таб
  async resultsForStudent(studentId: string, userId: string, role: Role) {
    await this.assertStaffStudentAccess(studentId, userId, role);
    return this.prisma.testResult.findMany({
      where: { studentId },
      include: {
        test: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Дотоод туслахууд ============

  private async loadTestWithProblems(
    testId: string,
    db: TestDatabase = this.prisma,
  ) {
    const test = await db.test.findUnique({
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
                scoringGroups: true,
                attemptCount: true,
                correctRate: true,
                choiceOptions: {
                  select: { order: true, text: true, isCorrect: true, imageKey: true },
                },
                // Бодолт: зөвхөн багш баталгаажуулсныг review-д үзүүлнэ (Шийдвэр Д)
                analysis: {
                  select: { status: true, solutionOutline: true },
                },
                // Сэдвийн задаргаа харуулахын тулд chapter-ийг оруулнэ
                chapter: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
        access: true,
      },
    });
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    return test;
  }

  // Ангийн (Enrollment + TestAccess) ЭСВЭЛ хүчинтэй эрхийн (UserPass.scope,
  // Bug 2 fix) ЭСВЭЛ нэг удаагийн худалдан авалт (Purchase) аль нэгээр
  // нэвтэрсэн байхыг шаардана.
  private async assertStudentAccess(
    test: {
      id: string;
      chapterId: string | null;
      access: { classroomId: string }[];
      isDraft?: boolean;
    },
    userId: string,
    db: TestDatabase = this.prisma,
  ): Promise<void> {
    if (test.isDraft)
      throw new ForbiddenException('Ноорог тестэд сурагч нэвтрэх боломжгүй');
    // Хичээлээр хаалттай (эзэн 2026-10-18): MATH-аас бусад хичээлийн тестийг
    // зөвхөн тухайн хичээлийн идэвхтэй ангийн сурагч бодно
    if (test.chapterId) {
      const owner = await db.chapter.findUnique({
        where: { id: test.chapterId },
        select: { book: { select: { subject: true } } },
      });
      const subject = owner?.book?.subject ?? Subject.MATH;
      if (
        subject !== Subject.MATH &&
        !(await activeClassSubjects(db as PrismaService, userId)).has(subject)
      )
        throw new ForbiddenException(
          'Энэ тест таны ангийн хичээлд хамаарахгүй байна',
        );
    }
    // Ангид оноосон тест — оноосон цаг (assignedAt) нь ирээгүй бол хараахан
    // нээгдэхгүй (эзэн 2026-10-29: ирээдүйн огноотой шалгалтыг урьдчилан эхлүүлдэг байсан)
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: userId,
        leftAt: null,
        classroomId: { in: test.access.map((a) => a.classroomId) },
        classroom: {
          archived: false,
          testAccess: {
            some: { testId: test.id, assignedAt: { lte: new Date() } },
          },
        },
      },
    });
    if (enrollment) {
      return;
    }

    let bookId: string | null = null;
    if (test.chapterId) {
      const chapter = await db.chapter.findUnique({
        where: { id: test.chapterId },
        select: { bookId: true },
      });
      bookId = chapter?.bookId ?? null;
    }
    // Pass / худалдан авалт (common/access.ts scopeGrantsTest): танхимын
    // сурагчид бүлэг/номын эрх зөвхөн ангид нээгдсэн бүлэгт хүрнэ. Өмнө нь
    // эхлүүлчихсэн сесстэй бол дуусгах, илгээх, эргэн харах эрх хэвээр.
    const scope = await studentTestScope(
      db as PrismaService,
      userId,
      Role.STUDENT,
    );
    const target = { id: test.id, chapterId: test.chapterId, bookId };
    if (scopeGrantsTest(scope, target)) return;
    if (
      scope.releasedChapterIds !== null &&
      scopeGrantsTest({ ...scope, releasedChapterIds: null }, target) &&
      (await db.testAttemptSession.findUnique({
        where: { testId_studentId: { testId: test.id, studentId: userId } },
        select: { id: true },
      }))
    )
      return;
    const now = new Date();

    // Жишиг сорил (MockExamEvent): бүртгүүлсэн хэрэглэгч цонхны дотор эхэлнэ;
    // эхэлчихсэн бол (session бий) цонх хаагдсан ч дуусгах, илгээх, эргэн харах эрхтэй.
    const reg = await db.mockExamRegistration.findFirst({
      where: { userId, event: { testId: test.id, published: true, startsAt: { lte: now } } },
      orderBy: { event: { startsAt: 'desc' } },
      select: { event: { select: { endsAt: true } } },
    });
    if (reg) {
      if (reg.event.endsAt >= now) return;
      const session = await db.testAttemptSession.findUnique({
        where: { testId_studentId: { testId: test.id, studentId: userId } },
        select: { id: true },
      });
      if (session) return;
    }

    throw new ForbiddenException(
      'Энэ тестийг худалдаж авууд эсвэл танай ангид оноогдоон байна',
    );
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
      let choiceImages: (string | null)[] | null = null;
      if (mode === 'TEXT') {
        const texts = choiceTextsOf(g);
        const perm = choiceOrder[pid];
        choices = perm ? perm.map((origIdx) => texts[origIdx]) : texts;
        // Зурагтай сонголт: текстийн дараалалтай ижил (shuffle) — нэг ч зураггүй бол null
        const images = choiceImagesOf(g);
        if (images) choiceImages = perm ? perm.map((origIdx) => images[origIdx] ?? null) : images;
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
        choiceImages,
      };
    });
  }

  // dto-г session-ий draft дээр нэгтгэнэ. Зөвхөн тестийн бодлогын түлхүүрүүдийг
  // хүлээн авна (халдлагаар дурын түлхүүр шахахаас хамгаална).
  // ID болон олон нүхний хариуны бүтцийг л ашиглана — ингэснээр
  // автосэйвийн зам бүтэн TestProblemRow ачаалах шаардлагагүй болно.
  private mergeDrafts(
    problems: {
      problemId: string;
      problem?: { format: string; correctAnswer: unknown };
    }[],
    session: SessionRow,
    dto: SaveSessionDto,
  ) {
    const validIds = new Set(problems.map((tp) => tp.problemId));
    const definitions = new Map(
      problems.map((tp) => [tp.problemId, tp.problem]),
    );
    const answers = { ...asRecord(session.draftAnswers) };
    const states = { ...asRecord(session.draftStates) };
    const times = { ...asRecord(session.problemTimes) };

    for (const [pid, v] of Object.entries(dto.answers ?? {})) {
      if (!validIds.has(pid)) continue;
      if (v === null || v === undefined || v === '') delete answers[pid];
      else if (
        (typeof v === 'number' && Number.isFinite(v)) ||
        (typeof v === 'string' && v.length <= 1000)
      )
        answers[pid] = v;
      else if (v && typeof v === 'object' && !Array.isArray(v)) {
        const problem = definitions.get(pid);
        if (problem?.format !== 'FILL_NUMBER') continue;
        const key = asRecord(problem.correctAnswer);
        const allowed = new Set(Object.keys(key));
        const entries = Object.entries(v);
        if (
          !entries.length ||
          entries.length > 32 ||
          entries.some(
            ([slot, value]) =>
              !allowed.has(slot) ||
              ['__proto__', 'constructor', 'prototype'].includes(slot) ||
              !(
                (typeof value === 'string' && value.length <= 1000) ||
                (typeof value === 'number' && Number.isFinite(value))
              ),
          )
        )
          continue;
        answers[pid] = Object.fromEntries(entries);
      }
    }
    const validStates = new Set(Object.values(SelfState));
    for (const [pid, v] of Object.entries(dto.selfStates ?? {})) {
      if (validIds.has(pid) && validStates.has(v as SelfState)) states[pid] = v;
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
      if (events.length > MAX_EVENTS)
        events.splice(0, events.length - MAX_EVENTS);
    }

    return { answers, states, times, leaveCount, events };
  }

  // Эцсийн дүгнэлт: оноо бодох + TestResult + Attempt бичилтүүд + session хөлдөөх.
  //
  // АНХААР: ХОЁР ХЭСЭГТ САНААТАЙГААР ХУВААСАН (2026-08-08, 2000 зэрэг хэрэглэгчийн зорилт):
  //   1. АТОМИК — TestResult + Attempt.createMany + Session нэг $transaction([...])-д.
  //      Массив хэлбэр (interactive callback БИШ) тул Prisma нэг багцаар илгээж,
  //      холболтыг богино хугацаанд барина.
  //   2. ТУСДАА — Problem-ийн статистик нэг bulk UPDATE-ээр, transaction-оос ГАДНА.
  //      Өмнө нь 40+ бодлого × Problem.update() нь transaction-ыг 1-2 секунд барьж,
  //      зэрэг илгээх үед бусад сурагчийн бичилт дараалалд ордог байв.
  //      Статистик хоцорсон ч сурагчийн ДҮН зөв байх нь чухал тул алдааг зөвхөн
  //      log-д бичээд илгээлтийг унагаахгүй.
  private async finalize(
    test: Awaited<ReturnType<TestsService['loadTestWithProblems']>>,
    session: SessionRow,
    studentId: string,
    merged?: ReturnType<TestsService['mergeDrafts']>,
  ) {
    const m = merged ?? {
      answers: asRecord(session.draftAnswers),
      states: asRecord(session.draftStates),
      times: asRecord(session.problemTimes),
      leaveCount: session.leaveCount,
      events: Array.isArray(session.events)
        ? (session.events as unknown[])
        : [],
    };

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
    let maxScore = 0;
    // Дүнгийн хүснэгтийн зүйлс (сонгох бодлого / 2-р хэсгийн алхмын багц) —
    // гар шивэлт, Excel-тэй ИЖИЛ түлхүүрээр TestItemMark бичнэ.
    const itemsByProblem = new Map<string, ExamItem[]>();
    for (const item of buildExamItems(test.problems)) {
      const list = itemsByProblem.get(item.problemId) ?? [];
      list.push(item);
      itemsByProblem.set(item.problemId, list);
    }
    const marks: Prisma.TestItemMarkCreateManyInput[] = [];
    const graded: { problemId: string; correct: boolean; points: number }[] =
      [];
    const attempts: Prisma.AttemptCreateManyInput[] = [];
    const statUpdates: { id: string; correct: boolean }[] = [];
    const occurredOn = todayUB();

    for (const tp of test.problems) {
      const pid = tp.problemId;
      const raw = m.answers[pid];
      const selfState = m.states[pid] as SelfState | undefined;

      // canonicalAnswer — сурагчийн сонгосон ЖИНХЭНЭ утга (сонголтын текст
      // эсвэл тоон хариу). Холилтын дараалалаас ҮЛ ХАМААРНА тул дараа нь
      // сессийн choiceOrder байхгүй ч тайлагдана.
      // 2-р хэсэгт алхмын багц бүр тусдаа: багцын бүх нүд зөв → багцын оноо.
      const problemItems = itemsByProblem.get(pid) ?? [];
      const scored = gradeProblemItems(
        { ...toGradable(tp), statementText: tp.problem.statementText },
        problemItems,
        raw,
        choiceOrder[pid],
      );
      const { known, answered, correct, canonicalAnswer } = scored;
      if (known) {
        for (const item of problemItems) {
          const status = scored.statuses.get(item.key) ?? 'BLANK';
          maxScore += item.points;
          if (status === 'CORRECT') totalScore += item.points;
          marks.push({
            testId: test.id,
            studentId,
            itemKey: item.key,
            status,
            source: ItemMarkSource.ONLINE,
          });
        }
      }
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
          // Хариулаагүй бол JsonNull — Prisma-д `undefined` нь «талбарыг
          // алгас» гэсэн утгатай тул тэднийг ялгах ЁСТОЙ (STATUS.md §7 урхи).
          givenAnswer: answered
            ? (canonicalAnswer ?? Prisma.JsonNull)
            : Prisma.JsonNull,
          selfState: selfState ?? null,
          timeSpentSec: typeof m.times[pid] === 'number' ? m.times[pid] : null,
          testId: test.id,
          classroomId: enrollment?.classroomId ?? null,
          mistakeCollectedAt:
            (answered && known && !correct) ||
            selfState === SelfState.FAILED ||
            selfState === SelfState.FIXED_AFTER_ERROR
              ? null
              : new Date(),
        });
      }
      // Хариу тодорхойгүй бодлогыг Problem.correctRate/attemptCount
      // статистикт оруулахгүй (тухайн бодлогын чанарыг буруу муутгахгүй)
      if (answered && known) statUpdates.push({ id: pid, correct });
    }

    const now = new Date();
    // Цаасан (гар) дүн аль хэдийн орсон бол түүнийг дарахгүй — тэр үед онлайн
    // зүйлсийн тэмдэглэгээг ч бичихгүй (дүн, тэмдэглэгээ зөрөхгүй).
    const priorResult = await this.prisma.testResult.findUnique({
      where: { testId_studentId: { testId: test.id, studentId } },
      select: { id: true },
    });

    // АТОМИК хэсэг: TestResult, Attempt, Session (+ зүйлсийн тэмдэглэгээ) нэг transaction-д
    const [result, createdAttempts] = await this.prisma.$transaction([
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
      this.prisma.attempt.createManyAndReturn({
        data: attempts,
        select: { id: true, mistakeCollectedAt: true },
      }),
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
      ...(priorResult || marks.length === 0
        ? []
        : [
            this.prisma.testItemMark.createMany({
              data: marks,
              skipDuplicates: true,
            }),
          ]),
    ]);

    // Collect only this submission's wrong attempts; failure leaves them pending
    // for the scheduled bounded recovery pass and cannot undo the committed score.
    for (const attempt of createdAttempts) {
      if (attempt.mistakeCollectedAt === null) {
        await this.mistakes.collectAttempt(attempt.id);
      }
    }

    // ТУСДАА: Problem статистик (дүгнэлт хадгалагдсаны дараа).
    // Алдаа гарвал сурагчийн илгээлтийг унагаахгүй, зөвхөн log.
    if (statUpdates.length > 0) {
      try {
        await this.prisma.$executeRaw`
          UPDATE "Problem" AS p
          SET "attemptCount" = p."attemptCount" + 1,
              -- correctRate нь double precision тул ROUND(x, n)-д шууд
              -- өгч болохгүй (тэр функц зөвхөн numeric-д байдаг) —
              -- numeric руу cast хийж бөөрөнхийлөөд буцааж хөрвүүлнэ.
              "correctRate" = ROUND(
                (
                  (
                    (COALESCE(p."correctRate", 0) * p."attemptCount")
                    + v.correct
                  ) / (p."attemptCount" + 1)
                )::numeric,
                3
              )::double precision
          FROM (
            VALUES ${Prisma.join(
              statUpdates.map(
                ({ id, correct }) =>
                  Prisma.sql`(${id}, ${correct ? 1 : 0}::numeric)`,
              ),
            )}
          ) AS v(id, correct)
          WHERE p.id = v.id
        `;
      } catch (error) {
        // Log маш урвалгүй — статистик хадгалагдаагүй ч сурагчийн дүн хэвээр байна
        console.error(
          '[Problem Stats Update Failed]',
          'testId:',
          test.id,
          'studentId:',
          studentId,
          'error:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return { result, graded };
  }
}
