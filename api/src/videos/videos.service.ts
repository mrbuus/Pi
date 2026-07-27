import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  canAccessChapter,
  collectPassScope,
  hasActiveClassroomEnrollment,
  TEACHER_ROLES,
} from '../common/access';
import { Role, Subject } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  // TODO(followUp): api/src/audit/audit.service.ts бэлэн болмогц энэ
  // helper-ийг хасаад тэрхүү нэгдсэн AuditService-ийг DI-аар ашиглах.
  private toAuditJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
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
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action,
        entity,
        entityId,
        before: this.toAuditJson(before),
        after: this.toAuditJson(after),
      },
    });
  }

  async create(dto: CreateVideoDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
      select: { id: true, deletedAt: true },
    });
    if (!chapter || chapter.deletedAt) {
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    }
    return this.prisma.video.create({
      data: {
        title: dto.title,
        chapterId: dto.chapterId,
        s3Key: dto.url,
        duration: dto.duration,
      },
    });
  }

  // Гарчиг/холбоос/бүлэг сэдвийг засах (SPEC-ийн эрхийн матрицаар TEACHER-д
  // ч нээлттэй — багш өөрийн орууулсан бичлэгийн алдаатай холбоосыг засна).
  async update(
    id: string,
    dto: UpdateVideoDto,
    actorId: string,
    actorRole: Role,
  ) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video || video.deletedAt) {
      throw new NotFoundException('Бичлэг олдсонгүй');
    }

    if (dto.chapterId !== undefined) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: dto.chapterId },
        select: { id: true, deletedAt: true },
      });
      if (!chapter || chapter.deletedAt) {
        throw new BadRequestException('Заасан бүлэг сэдэв олдсонгүй');
      }
    }

    const data: Prisma.VideoUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.url !== undefined) data.s3Key = dto.url;
    if (dto.chapterId !== undefined) {
      data.chapter = { connect: { id: dto.chapterId } };
    }

    const updated = await this.prisma.video.update({ where: { id }, data });
    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'Video',
      id,
      video,
      updated,
    );
    return updated;
  }

  // Сэдвийн (chapter) бичлэгүүд — бодлогын chapter-той ЯГ ижил дүрмээр хаагдана
  // (Bug 3 fix): багш нар бүгдийг; нээлттэй бүлгийг хэн ч; танхимын идэвхтэй
  // сурагч бүгдийг; бусад нь хүчинтэй эрхийнхээ (pass) хамрах хүрээгээр (SPEC §11)
  async listByChapter(chapterId: string, userId: string, role: Role) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, bookId: true, freePreview: true, deletedAt: true },
    });
    if (!chapter || chapter.deletedAt) {
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    }

    const allowed = await canAccessChapter(this.prisma, userId, role, chapter);
    if (!allowed) {
      throw new ForbiddenException(
        'Энэ бүлгийн бичлэгийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай',
      );
    }

    return this.prisma.video.findMany({
      where: { chapterId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Ном тус бүрийн бичлэгтэй бүлэг сэдвүүд — "Онлайн хичээл" хуудсанд ном/сэдэв
  // сонгох мод харуулахад хэрэглэгдэнэ. Эрхгүй бүлгийг мод-оос нуух (Bug 3 fix).
  async listChaptersWithVideos(userId: string, role: Role, subject?: Subject) {
    const chapters = await this.prisma.chapter.findMany({
      where: {
        videos: { some: { deletedAt: null } },
        deletedAt: null,
        ...(subject ? { book: { subject } } : {}),
      },
      select: {
        id: true,
        title: true,
        bookId: true,
        freePreview: true,
        book: { select: { code: true, title: true } },
        _count: { select: { videos: true } },
      },
      orderBy: [{ book: { code: 'asc' } }, { order: 'asc' }],
    });

    if (TEACHER_ROLES.includes(role)) {
      return chapters.map(({ bookId, freePreview, ...c }) => c);
    }

    const [enrolled, scope] = await Promise.all([
      hasActiveClassroomEnrollment(this.prisma, userId, role),
      collectPassScope(this.prisma, userId),
    ]);

    return chapters
      .filter(
        (c) =>
          c.freePreview ||
          enrolled ||
          scope.all ||
          scope.chapterIds.includes(c.id) ||
          (c.bookId !== null && scope.bookIds.includes(c.bookId)),
      )
      .map(({ bookId, freePreview, ...c }) => c);
  }

  // Зөөлөн устгал: hard DELETE хийвэл холбогдох LearningEvent зэрэг түүхэн
  // лог орфон үлдэнэ.
  async remove(id: string, actorId: string, actorRole: Role) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video || video.deletedAt) {
      throw new NotFoundException('Бичлэг олдсонгүй');
    }
    const updated = await this.prisma.video.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'Video',
      id,
      video,
      updated,
    );
    return { removed: true };
  }
}
