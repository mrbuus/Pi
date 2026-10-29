import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import {
  canAccessProblem,
  canAccessVideoChapter,
  internalTeachingRole,
  assertInternalTeachingStaff,
} from '../common/access';
import { Role, Subject, LearningEventType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { safeMediaSource } from './media-policy';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}
  private async target(
    tx: Prisma.TransactionClient,
    chapterId: string,
    problemId: string | null | undefined,
  ) {
    const chapter = await tx.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, deletedAt: true },
    });
    if (!chapter || chapter.deletedAt)
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    if (problemId) {
      const problem = await tx.problem.findUnique({
        where: { id: problemId },
        select: { chapterId: true, deletedAt: true },
      });
      if (!problem || problem.deletedAt || problem.chapterId !== chapterId)
        throw new BadRequestException(
          'Бодлогын ID энэ бүлэг сэдэвт хамаарах ёстой',
        );
    }
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    role: Role,
    action: string,
    id: string,
    before: unknown,
    after: unknown,
  ) {
    const json = (v: unknown) =>
      v == null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
    await tx.auditLog.create({
      data: {
        actorId,
        actorRole: role,
        action,
        entity: 'Video',
        entityId: id,
        before: json(before),
        after: json(after),
      },
    });
  }
  async create(dto: CreateVideoDto, actorId: string, role: Role) {
    role = await assertInternalTeachingStaff(this.prisma, actorId);
    if (role === Role.TEACHER && dto.problemId)
      throw new ForbiddenException('Бодлоготой холбох эрх Багш+/Админд байна');
    const media = safeMediaSource(dto.url);
    return this.prisma.$transaction(async (tx) => {
      await this.target(tx, dto.chapterId, dto.problemId);
      const row = await tx.video.create({
        data: {
          title: dto.title,
          chapterId: dto.chapterId,
          problemId: dto.problemId ?? null,
          createdById: actorId,
          s3Key: media.url,
          duration: dto.duration,
        },
      });
      await this.audit(tx, actorId, role, 'CREATE', row.id, null, row);
      return row;
    });
  }
  async update(id: string, dto: UpdateVideoDto, actorId: string, role: Role) {
    role = await assertInternalTeachingStaff(this.prisma, actorId);
    if (role === Role.TEACHER && dto.problemId !== undefined)
      throw new ForbiddenException('Бодлогын холбоосыг Багш+/Админ засна');
    const media = dto.url === undefined ? null : safeMediaSource(dto.url);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`video:${id}`}))`;
      const video = await tx.video.findUnique({ where: { id } });
      if (!video || video.deletedAt)
        throw new NotFoundException('Бичлэг олдсонгүй');
      if (role === Role.TEACHER && video.createdById !== actorId)
        throw new ForbiddenException('Зөвхөн өөрийн оруулсан бичлэгийг засна');
      const chapterId = dto.chapterId ?? video.chapterId,
        problemId =
          dto.problemId === undefined ? video.problemId : dto.problemId;
      if (!chapterId) throw new BadRequestException('Бүлэг сэдэв сонгоно уу');
      await this.target(tx, chapterId, problemId);
      const row = await tx.video.update({
        where: { id },
        data: {
          ...(dto.title === undefined ? {} : { title: dto.title }),
          ...(media ? { s3Key: media.url } : {}),
          chapterId,
          problemId,
        },
      });
      await this.audit(tx, actorId, role, 'UPDATE', id, video, row);
      return row;
    });
  }
  private publicVideo(video: {
    id: string;
    title: string;
    s3Key: string;
    duration: number | null;
    chapterId: string | null;
    problemId: string | null;
    createdAt: Date;
  }) {
    let media: ReturnType<typeof safeMediaSource> | null = null;
    try {
      media = safeMediaSource(video.s3Key);
    } catch {
      /* legacy unsafe media remains reviewable but never executable */
    }
    return {
      id: video.id,
      title: video.title,
      s3Key: media?.url ?? '',
      duration: video.duration,
      chapterId: video.chapterId,
      problemId: video.problemId,
      createdAt: video.createdAt,
      media,
      unavailable: !media,
    };
  }
  async listByProblem(problemId: string, userId: string, role: Role) {
    if (typeof problemId !== 'string' || !problemId || problemId.length > 200)
      throw new BadRequestException('Бодлогын ID шаардлагатай');
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        chapterId: true,
        deletedAt: true,
        chapter: {
          select: {
            id: true,
            bookId: true,
            freePreview: true,
            deletedAt: true,
          },
        },
      },
    });
    if (
      !problem ||
      problem.deletedAt ||
      !problem.chapter ||
      problem.chapter.deletedAt
    )
      throw new NotFoundException('Бодлого олдсонгүй');
    if (
      !(await canAccessProblem(this.prisma, userId, role, problem, true))
    )
      throw new ForbiddenException('Бичлэг үзэх эрхгүй');
    const rows = await this.prisma.video.findMany({
      where: { problemId, chapterId: problem.chapterId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((v) => ({
      id: v.id,
      title: v.title,
      duration: v.duration,
      chapterId: v.chapterId,
      problemId: v.problemId,
    }));
  }
  async openProblemVideo(
    id: string,
    problemId: string,
    userId: string,
    role: Role,
  ) {
    const rows = await this.listByProblem(problemId, userId, role),
      video = rows.find((v) => v.id === id);
    if (!video) throw new NotFoundException('Бодлогын бичлэг олдсонгүй');
    const full = await this.prisma.video.findUnique({ where: { id } });
    if (
      !full ||
      full.deletedAt ||
      full.problemId !== problemId ||
      full.chapterId !== video.chapterId
    )
      throw new NotFoundException('Бичлэг олдсонгүй');
    const playable = this.publicVideo(full);
    if (!playable.media)
      throw new BadRequestException(
        'Бичлэгийн эх сурвалжийг багш шалгах шаардлагатай',
      );
    if (role === Role.STUDENT || role === Role.BUYER)
      await this.prisma.learningEvent.create({
        data: {
          id: `lab-event-${randomUUID()}`,
          userId,
          type: LearningEventType.HINT_USED,
          problemId,
          videoId: id,
          chapterId: video.chapterId,
          meta: {
            lab: 'v1',
            kind: 'video-solution-open',
            source: 'VIDEOS',
            solutionExposure: true,
          },
        },
      });
    return playable;
  }
  async listByChapter(chapterId: string, userId: string, role: Role) {
    if (typeof chapterId !== 'string' || !chapterId || chapterId.length > 200)
      throw new BadRequestException('Бүлэг сэдэв шаардлагатай');
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, bookId: true, freePreview: true, deletedAt: true },
    });
    if (!chapter || chapter.deletedAt)
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    if (!(await canAccessVideoChapter(this.prisma, userId, role, chapter)))
      throw new ForbiddenException('Энэ бүлгийн бичлэгийг үзэх эрхгүй');
    const staff = !!(await internalTeachingRole(this.prisma, userId));
    const rows = await this.prisma.video.findMany({
      where: {
        chapterId,
        deletedAt: null,
        ...(staff ? {} : { problemId: null }),
      },
      orderBy: { createdAt: 'asc' },
    });
    return staff ? rows : rows.map((v) => this.publicVideo(v));
  }
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
        _count: { select: { videos: { where: { deletedAt: null } } } },
      },
      orderBy: [{ book: { code: 'asc' } }, { order: 'asc' }],
    });
    const allowed = await Promise.all(
      chapters.map((c) => canAccessVideoChapter(this.prisma, userId, role, c)),
    );
    return chapters
      .filter((_c, i) => allowed[i])
      .map((c) => ({
        id: c.id,
        title: c.title,
        book: c.book,
        _count: c._count,
      }));
  }
  async remove(id: string, actorId: string, role: Role) {
    role = await assertInternalTeachingStaff(this.prisma, actorId);
    if (role !== Role.ADMIN && role !== Role.TEACHER_PLUS)
      throw new ForbiddenException('Устгах эрхгүй');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`video:${id}`}))`;
      const video = await tx.video.findUnique({ where: { id } });
      if (!video || video.deletedAt)
        throw new NotFoundException('Бичлэг олдсонгүй');
      const row = await tx.video.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.audit(tx, actorId, role, 'DELETE', id, video, row);
      return { removed: true };
    });
  }
}
