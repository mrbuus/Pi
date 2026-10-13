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
  Role,
  TestGradingMode,
  TestType,
} from '../generated/prisma/enums';
import { assertInternalTeachingStaff } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { hasKnownAnswer } from '../tests/grading';
import { applyProblemSnapshot } from './revision-apply';
import {
  beginRevision,
  commitRevision,
  RevisionDb,
} from './revision-store';
import {
  diffProblem,
  diffTest,
  parseProblemSnapshot,
  parseTestSnapshot,
  planProblemRestore,
  planTestRestore,
  PROBLEM_GROUP_LABEL,
  ProblemFieldGroup,
  ProblemSnapshot,
  problemView,
  RevisionEntityName,
  shortName,
  TestDiffResolvers,
  testPlanIsEmpty,
  TestSnapshot,
  testView,
} from './revision-snapshot';
import { RestoreRevisionDto } from './revisions.dto';

const PAGE_MAX = 50;

/** Сурагч өгсөн эсэх: бодлого орсон аль нэг шалгалтад дүн эсвэл session байна. */
export async function problemTaken(db: RevisionDb, problemId: string): Promise<boolean> {
  const where = { test: { problems: { some: { problemId } } } };
  const [results, sessions] = await Promise.all([
    db.testResult.count({ where }),
    db.testAttemptSession.count({ where }),
  ]);
  return results + sessions > 0;
}

export async function testTaken(db: RevisionDb, testId: string): Promise<boolean> {
  const [results, sessions] = await Promise.all([
    db.testResult.count({ where: { testId } }),
    db.testAttemptSession.count({ where: { testId } }),
  ]);
  return results + sessions > 0;
}

function staffAll(role: Role): boolean {
  return role === Role.ADMIN || role === Role.TEACHER_PLUS;
}

/**
 * Өөрчлөлтийн түүх: жагсаалт, хувилбарын ялгаа, сэргээх.
 * Эрх: Багш+/Админ — бүгд; Багш — өөрийн үүсгэсэн эсвэл зассан бодлого/тест.
 * Сурагч/эцэг эх маршрутад огт хүрэхгүй (RolesGuard). Хариуд ID харуулахгүй.
 */
@Injectable()
export class RevisionsService {
  constructor(private readonly prisma: PrismaService) {}

  parseEntity(raw: string): RevisionEntityName {
    const value = String(raw ?? '').toUpperCase();
    if (value === 'PROBLEM' || value === 'TEST') return value;
    throw new BadRequestException('Түүхийн төрөл буруу байна');
  }

  private async meta(db: RevisionDb | PrismaService, entity: RevisionEntityName, id: string) {
    const select = {
      createdById: true,
      createdAt: true,
      version: true,
      deletedAt: true,
    } as const;
    const row =
      entity === 'PROBLEM'
        ? await db.problem.findUnique({ where: { id }, select })
        : await db.test.findUnique({ where: { id }, select });
    if (!row || row.deletedAt)
      throw new NotFoundException(entity === 'PROBLEM' ? 'Бодлого олдсонгүй' : 'Тест олдсонгүй');
    return row;
  }

  private async canView(
    db: RevisionDb | PrismaService,
    entity: RevisionEntityName,
    id: string,
    createdById: string,
    userId: string,
    role: Role,
  ): Promise<boolean> {
    if (staffAll(role)) return true;
    if (createdById === userId) return true;
    const mine = await db.contentRevision.findFirst({
      where: { entity, entityId: id, actorId: userId },
      select: { id: true },
    });
    return !!mine;
  }

  private forbiddenView(entity: RevisionEntityName) {
    return new ForbiddenException(
      entity === 'PROBLEM'
        ? 'Та зөвхөн өөрийн үүсгэсэн эсвэл зассан бодлогын түүхийг харна'
        : 'Та зөвхөн өөрийн үүсгэсэн эсвэл зассан тестийн түүхийг харна',
    );
  }

  private async names(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(users.map((u) => [u.id, shortName(u)]));
  }

  // ======================= Жагсаалт =======================

  async list(rawEntity: string, id: string, userId: string, page = 1, pageSize = 20) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const entity = this.parseEntity(rawEntity);
    const meta = await this.meta(this.prisma, entity, id);
    if (!(await this.canView(this.prisma, entity, id, meta.createdById, userId, role)))
      throw this.forbiddenView(entity);
    const size = Math.min(PAGE_MAX, Math.max(1, Math.trunc(pageSize) || 20));
    const current = Math.max(1, Math.trunc(page) || 1);
    const where = { entity, entityId: id };
    const [total, rows] = await Promise.all([
      this.prisma.contentRevision.count({ where }),
      this.prisma.contentRevision.findMany({
        where,
        orderBy: { version: 'desc' },
        skip: (current - 1) * size,
        take: size,
        select: {
          version: true,
          action: true,
          summary: true,
          actorId: true,
          createdAt: true,
          reason: true,
        },
      }),
    ]);
    const names = await this.names([meta.createdById, ...rows.map((r) => r.actorId)]);
    return {
      entity,
      currentVersion: meta.version,
      total,
      page: current,
      pageSize: size,
      createdBy: names.get(meta.createdById) ?? null,
      createdAt: meta.createdAt,
      canRestore:
        entity === 'TEST' ? role !== Role.TEACHER || meta.createdById === userId : true,
      items: rows.map((r) => ({
        version: r.version,
        action: r.action,
        summary: r.summary,
        actorName: names.get(r.actorId) ?? 'Тодорхойгүй хэрэглэгч',
        createdAt: r.createdAt,
        reason: r.reason,
        current: r.version === meta.version,
      })),
    };
  }

  // ======================= Нэг хувилбар + ялгаа =======================

  private async testResolvers(
    snapshots: TestSnapshot[],
    role: Role,
  ): Promise<TestDiffResolvers> {
    const classIds = [...new Set(snapshots.flatMap((s) => s.classroomIds))];
    const chapterIds = [
      ...new Set(snapshots.map((s) => s.chapterId).filter((v): v is string => !!v)),
    ];
    const problemIds = [...new Set(snapshots.flatMap((s) => s.problems.map((p) => p.problemId)))];
    const [classes, chapters, problems] = await Promise.all([
      this.prisma.classroom.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true },
      }),
      this.prisma.chapter.findMany({
        where: { id: { in: chapterIds } },
        select: { id: true, title: true },
      }),
      this.prisma.problem.findMany({
        where: { id: { in: problemIds } },
        select: { id: true, statementText: true },
      }),
    ]);
    return {
      classNames: new Map<string, string>(classes.map((c) => [c.id, c.name])),
      chapterTitles: new Map<string, string>(chapters.map((c) => [c.id, c.title])),
      problemStatements: new Map<string, string | null>(
        problems.map((p) => [p.id, p.statementText]),
      ),
      showPrice: role === Role.ADMIN,
    };
  }

  async detail(rawEntity: string, id: string, version: number, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const entity = this.parseEntity(rawEntity);
    const meta = await this.meta(this.prisma, entity, id);
    if (!(await this.canView(this.prisma, entity, id, meta.createdById, userId, role)))
      throw this.forbiddenView(entity);
    const rev = await this.prisma.contentRevision.findUnique({
      where: { entity_entityId_version: { entity, entityId: id, version } },
    });
    if (!rev) throw new NotFoundException('Хувилбар олдсонгүй');
    const prev = await this.prisma.contentRevision.findFirst({
      where: { entity, entityId: id, version: { lt: version } },
      orderBy: { version: 'desc' },
      select: { snapshot: true, version: true },
    });
    const names = await this.names([rev.actorId]);
    const base = {
      entity,
      version: rev.version,
      previousVersion: prev?.version ?? null,
      action: rev.action,
      summary: rev.summary,
      actorName: names.get(rev.actorId) ?? 'Тодорхойгүй хэрэглэгч',
      createdAt: rev.createdAt,
      reason: rev.reason,
      current: rev.version === meta.version,
    };
    if (entity === 'PROBLEM') {
      const snap = parseProblemSnapshot(rev.snapshot);
      const before = prev ? parseProblemSnapshot(prev.snapshot) : null;
      return { ...base, changes: diffProblem(before, snap), snapshot: problemView(snap) };
    }
    const snap = parseTestSnapshot(rev.snapshot);
    const before = prev ? parseTestSnapshot(prev.snapshot) : null;
    const resolvers = await this.testResolvers(before ? [snap, before] : [snap], role);
    return { ...base, changes: diffTest(before, snap, resolvers), snapshot: testView(snap, resolvers) };
  }

  // ======================= Сэргээх =======================

  async restore(
    rawEntity: string,
    id: string,
    version: number,
    userId: string,
    dto: RestoreRevisionDto,
  ) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const entity = this.parseEntity(rawEntity);
    const target = await this.prisma.contentRevision.findUnique({
      where: { entity_entityId_version: { entity, entityId: id, version } },
      select: { version: true, snapshot: true },
    });
    if (!target) throw new NotFoundException('Хувилбар олдсонгүй');
    return entity === 'PROBLEM'
      ? this.restoreProblem(id, target, userId, role, dto)
      : this.restoreTest(id, target, userId, role, dto);
  }

  private restoreProblem(
    id: string,
    target: { version: number; snapshot: unknown },
    userId: string,
    role: Role,
    dto: RestoreRevisionDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const handle = await beginRevision(tx, 'PROBLEM', id, {
          expectedVersion: dto.expectedVersion,
          merge: false, // сэргээх = «яг тэр хувилбар» — тэр хооронд өөрчлөгдсөн бол асууна
        });
        if (handle.deletedAt) throw new NotFoundException('Бодлого олдсонгүй');
        if (!(await this.canView(tx, 'PROBLEM', id, handle.createdById, userId, role)))
          throw this.forbiddenView('PROBLEM');
        const current = handle.before as ProblemSnapshot;
        const snap = parseProblemSnapshot(target.snapshot);
        const plan = planProblemRestore(current, snap, {
          taken: await problemTaken(tx, id),
          contentEditor: staffAll(role),
        });
        if (plan.forbidden.length > 0) {
          throw new ForbiddenException(
            `Энэ хувилбарыг сэргээхэд Багш+ эрх хэрэгтэй (${plan.forbidden
              .map((g) => PROBLEM_GROUP_LABEL[g])
              .join(', ')})`,
          );
        }
        if (plan.answerChanges && dto.confirm !== true) {
          throw new ConflictException({
            statusCode: 409,
            code: 'CONFIRM_REQUIRED',
            message:
              'Энэ бодлоготой шалгалтыг сурагч өгсөн. Хариуг сэргээвэл өмнөх дүн дахин бодогдохгүй.',
          });
        }
        if (plan.groups.length === 0) {
          throw new BadRequestException(
            plan.skipped.length
              ? `Сэргээх боломжтой өөрчлөлт алга: ${plan.skipped.join(', ')} түгжээтэй`
              : 'Энэ хувилбар одоогийнхтой ижил байна',
          );
        }
        await applyProblemSnapshot(tx, id, snap, plan.groups);
        const result = await commitRevision(tx, handle, {
          actor: { id: userId, role },
          action: 'RESTORE',
          reason: dto.reason,
          summary: restoreSummary(target.version, plan.skipped),
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            actorRole: role,
            action: 'RESTORE',
            entity: 'Problem',
            entityId: id,
            before: { version: handle.version, snapshot: toAuditJson(current) },
            after: {
              version: result.version,
              restoredFrom: target.version,
              skipped: plan.skipped,
            },
            ...(dto.reason?.trim() ? { reason: dto.reason.trim().slice(0, 500) } : {}),
          },
        });
        return {
          entity: 'PROBLEM' as const,
          version: result.version,
          restoredFrom: target.version,
          skipped: plan.skipped,
          summary: result.summary,
          mergedWith: result.mergedWith,
        };
      },
      { timeout: 20_000 },
    );
  }

  private restoreTest(
    id: string,
    target: { version: number; snapshot: unknown },
    userId: string,
    role: Role,
    dto: RestoreRevisionDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const handle = await beginRevision(tx, 'TEST', id, {
          expectedVersion: dto.expectedVersion,
          merge: false, // сэргээх = «яг тэр хувилбар» — тэр хооронд өөрчлөгдсөн бол асууна
        });
        if (handle.deletedAt) throw new NotFoundException('Тест олдсонгүй');
        // Засах эрхтэй ижил: багш зөвхөн өөрийн үүсгэсэн тестийг (tests.service findEditableTest)
        if (role === Role.TEACHER && handle.createdById !== userId) {
          throw new ForbiddenException('Та зөвхөн өөрийн үүсгэсэн тестийг сэргээнэ');
        }
        const current = handle.before as TestSnapshot;
        const snap = parseTestSnapshot(target.snapshot);
        const manageable =
          role === Role.TEACHER
            ? new Set(
                (
                  await tx.classroom.findMany({
                    where: { teacherId: userId, archived: false },
                    select: { id: true },
                  })
                ).map((c) => c.id),
              )
            : null;
        const plan = planTestRestore(current, snap, {
          taken: await testTaken(tx, id),
          isAdmin: role === Role.ADMIN,
          manageableClassIds: manageable,
        });
        if (testPlanIsEmpty(plan)) {
          throw new BadRequestException(
            plan.skipped.length
              ? `Сэргээх боломжтой өөрчлөлт алга: сурагч өгсөн тул ${plan.skipped.join(', ')} түгжээтэй`
              : 'Энэ хувилбар одоогийнхтой ижил байна',
          );
        }
        const nextLimit = plan.data.timeLimitMin;
        if (
          nextLimit !== undefined &&
          nextLimit !== null &&
          (current.timeLimitMin === null || nextLimit < current.timeLimitMin)
        ) {
          const active = await tx.testAttemptSession.count({
            where: { testId: id, status: AttemptSessionStatus.IN_PROGRESS },
          });
          if (active > 0)
            throw new ConflictException(
              'Сурагч шалгалт өгч байгаа тул дуусахаас өмнө хугацааг богиносгох боломжгүй',
            );
        }
        if (plan.addClassIds.length > 0) {
          await assertAssignable(tx, plan.problems ?? current.problems, plan.data.gradingMode ?? current.gradingMode);
        }

        const data: Prisma.TestUncheckedUpdateInput = {};
        if (plan.data.title !== undefined) data.title = plan.data.title;
        if (plan.data.timeLimitMin !== undefined) data.timeLimitMin = plan.data.timeLimitMin;
        if (plan.data.type !== undefined) data.type = plan.data.type as TestType;
        if (plan.data.gradingMode !== undefined)
          data.gradingMode = plan.data.gradingMode as TestGradingMode;
        if (plan.data.price !== undefined) data.price = plan.data.price;
        if (plan.data.chapterId !== undefined) data.chapterId = plan.data.chapterId;
        if (plan.data.pdfKey !== undefined) data.pdfKey = plan.data.pdfKey;
        if (plan.data.groupKey !== undefined) data.groupKey = plan.data.groupKey;
        if (plan.data.variantLabel !== undefined) data.variantLabel = plan.data.variantLabel;
        if (plan.problems) {
          await tx.testProblem.deleteMany({ where: { testId: id } });
          if (plan.problems.length > 0)
            await tx.testProblem.createMany({
              data: plan.problems.map((p) => ({
                testId: id,
                problemId: p.problemId,
                order: p.order,
                points: p.points,
              })),
            });
        }
        // Ангийг бүхэлд нь дахин үүсгэхгүй — үлдэх ангийн эргэн харалтын тохиргоо хадгалагдана
        if (plan.removeClassIds.length > 0)
          await tx.testAccess.deleteMany({
            where: { testId: id, classroomId: { in: plan.removeClassIds } },
          });
        if (plan.addClassIds.length > 0) {
          await tx.testAccess.createMany({
            data: plan.addClassIds.map((classroomId) => ({ testId: id, classroomId })),
            skipDuplicates: true,
          });
          data.isDraft = false;
        }
        if (Object.keys(data).length > 0) await tx.test.update({ where: { id }, data });
        const result = await commitRevision(tx, handle, {
          actor: { id: userId, role },
          action: 'RESTORE',
          reason: dto.reason,
          summary: restoreSummary(target.version, plan.skipped),
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            actorRole: role,
            action: 'RESTORE',
            entity: 'Test',
            entityId: id,
            before: { version: handle.version, snapshot: toAuditJson(current) },
            after: {
              version: result.version,
              restoredFrom: target.version,
              skipped: plan.skipped,
            },
            ...(dto.reason?.trim() ? { reason: dto.reason.trim().slice(0, 500) } : {}),
          },
        });
        return {
          entity: 'TEST' as const,
          version: result.version,
          restoredFrom: target.version,
          skipped: plan.skipped,
          summary: result.summary,
          mergedWith: result.mergedWith,
        };
      },
      { timeout: 20_000 },
    );
  }
}

function restoreSummary(version: number, skipped: string[]): string {
  return skipped.length
    ? `${version}-р хувилбар руу буцаасан (${skipped.join(', ')} түгжээтэй тул хэвээр)`
    : `${version}-р хувилбар руу буцаасан`;
}

function toAuditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

/** Ангид оноохын өмнөх доод шалгалт (tests.service checkAnswerCoverage-тэй ижил санаа). */
async function assertAssignable(
  tx: RevisionDb,
  problems: { problemId: string }[],
  gradingMode: string,
) {
  if (problems.length === 0) throw new BadRequestException('Энэ тестэд бодлого алга');
  if (gradingMode !== TestGradingMode.AUTO) return;
  const rows = await tx.problem.findMany({
    where: { id: { in: problems.map((p) => p.problemId) } },
    select: {
      id: true,
      format: true,
      choices: true,
      correctAnswer: true,
      choiceOptions: { select: { order: true, text: true, isCorrect: true } },
    },
  });
  if (!rows.some((p) => hasKnownAnswer(p)))
    throw new BadRequestException(
      'Энэ тестийн бодлогуудад хариуны түлхүүр алга тул ангид оноох боломжгүй',
    );
}
