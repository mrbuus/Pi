import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertInternalTeachingStaff } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { loadClassCoverage, loadCoverageCatalog } from './class-coverage.data';
import { MAX_PAST_TESTS, planPastSave } from './class-coverage.logic';
import { ClassDashboardService } from './class-dashboard.service';

/**
 * «Өмнө үзсэн сэдэв тэмдэглэх» (эзэн 2026-10-27). Систем эхлэхээс өмнө анги
 * үзсэн тестийг огноогүйгээр тэмдэглэнэ (ClassCoveredTest). Огноотой хичээл нь
 * ClassTestSession-д хэвээр — уншихдаа хоёуланг нэгтгэнэ (class-coverage.data).
 *
 * Эрх: ангийн самбартай ИЖИЛ — төвийн багш (Админ, Багш+, Багш), анги харагдах
 * ёстой (ClassDashboardService.visibleClassIds; «Чек»-ийн адил).
 * Хасах нь ЗӨӨЛӨН (removedAt), хадгалалт бүр AuditLog-д.
 */
@Injectable()
export class ClassCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: ClassDashboardService,
  ) {}

  private async access(classroomId: string, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, archived: true, subject: true },
    });
    if (!classroom || classroom.archived)
      throw new NotFoundException('Анги олдсонгүй');
    const visible = await this.dashboard.visibleClassIds({ userId, role });
    if (visible !== 'ALL' && !visible.includes(classroomId))
      throw new ForbiddenException('Энэ ангийн хөтөлбөрийг засах эрхгүй');
    return { role, classroom };
  }

  /** Сонгогчийн мод: ном → бүлэг → тест, тест бүр past + lessonDates-тэй. */
  async tree(classroomId: string, userId: string) {
    const { classroom } = await this.access(classroomId, userId);
    const { books } = await loadClassCoverage(
      this.prisma,
      classroomId,
      classroom.subject,
    );
    return { classroomId, books };
  }

  /**
   * Өмнө үзсэн тестийн БҮТЭН багцыг хадгална (нэг удаад). Шинэ → үүсгэнэ,
   * өмнө хассан → сэргээнэ, сонголтоос гарсан → зөөлөн хасна. Хасах нь зөвхөн
   * сонгогчид харагдах (ангийн хичээлийн, архивлаагүй ном) тестэд хамаарна —
   * сонгогчид харагдаагүй тэмдэглэгээ санамсаргүй арилахгүй. Давтан хадгалбал
   * юу ч өөрчлөхгүй (AuditLog ч бичихгүй).
   */
  async savePast(classroomId: string, testIds: string[], userId: string) {
    const { role, classroom } = await this.access(classroomId, userId);
    const desired = [
      ...new Set((testIds ?? []).filter((t) => typeof t === 'string' && t)),
    ];
    if (desired.length > MAX_PAST_TESTS)
      throw new BadRequestException('Хэт олон тест сонгосон байна');

    const catalog = await loadCoverageCatalog(this.prisma, classroom.subject);
    const chapterOf = new Map(catalog.tests.map((t) => [t.id, t.chapterId]));
    const unknown = desired.filter((id) => !chapterOf.has(id));
    if (unknown.length)
      throw new BadRequestException('Сонгосон тестийн зарим нь олдсонгүй');

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.classCoveredTest.findMany({
        where: { classroomId, testId: { in: [...chapterOf.keys()] } },
        select: { testId: true, removedAt: true },
      });
      const plan = planPastSave(rows, desired);
      const now = new Date();
      if (plan.create.length)
        await tx.classCoveredTest.createMany({
          data: plan.create.map((testId) => ({
            classroomId,
            testId,
            chapterId: chapterOf.get(testId) ?? null,
            source: 'PAST',
            createdById: userId,
          })),
          skipDuplicates: true,
        });
      if (plan.restore.length)
        await tx.classCoveredTest.updateMany({
          where: {
            classroomId,
            testId: { in: plan.restore },
            removedAt: { not: null },
          },
          data: {
            removedAt: null,
            removedById: null,
            updatedAt: now,
            updatedById: userId,
          },
        });
      if (plan.remove.length)
        await tx.classCoveredTest.updateMany({
          where: { classroomId, testId: { in: plan.remove }, removedAt: null },
          data: {
            removedAt: now,
            removedById: userId,
            updatedAt: now,
            updatedById: userId,
          },
        });
      const changed =
        plan.create.length + plan.restore.length + plan.remove.length;
      if (changed)
        await tx.auditLog.create({
          data: {
            actorId: userId,
            actorRole: role,
            action: 'UPDATE',
            entity: 'ClassCoveredTest',
            entityId: classroomId,
            before: {
              active: rows
                .filter((r) => !r.removedAt)
                .map((r) => r.testId)
                .sort(),
            },
            after: {
              active: [...plan.keep, ...plan.create, ...plan.restore].sort(),
              added: plan.create,
              restored: plan.restore,
              removed: plan.remove,
            },
          },
        });
      return {
        classroomId,
        added: plan.create.length,
        restored: plan.restore.length,
        removed: plan.remove.length,
        unchanged: plan.keep.length,
        total: desired.length,
      };
    });
  }
}
