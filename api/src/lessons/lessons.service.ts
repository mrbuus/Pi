import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  activeClassSubjects,
  canAccessChapter,
  canAccessVideoChapter,
  collectContentScope,
  classroomRelease,
  internalTeachingRole,
  studentTestAccessOr,
  studentTestScope,
  assertInternalTeachingStaff,
} from '../common/access';
import { Prisma } from '../generated/prisma/client';
import {
  LearningEventType,
  Role,
  Subject,
  TestType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTheoryDto, UpdateTheoryDto } from './dto/theory.dto';
import { LessonProgressAction, RecordProgressDto } from './dto/progress.dto';

interface ProgressRow {
  theory_read: (string | null)[] | null;
  videos_watched: (string | null)[] | null;
  problems_attempted: bigint | number | null;
}

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(private prisma: PrismaService) {}

  // 🎯 ГОЛ ENDPOINT: нэг бүлэг сэдвийг судлахад хэрэгтэй БҮХ зүйл — онол,
  // бичлэг, бодлогын тоо, тест, өөрийн явц. Хандах эрхийг common/access.ts-ийн
  // ЯГ ЯГ ЛОГИКООР шалгана (Bug fix: freePreview биш ч, орсон/эрхтэй бол онол
  // ЗААВАЛ харагдана — өмнө нь зөвхөн үнэгүй preview бүлэгт л онол буцдаг байсан).
  async getLesson(chapterId: string, userId: string, role: Role) {
    const chapter = await this.prisma.chapter.findUnique({
      where: {
        id: chapterId,
        deletedAt: null,
        OR: [{ bookId: null }, { book: { deletedAt: null, archived: false } }],
      },
      select: {
        id: true,
        title: true,
        order: true,
        bookId: true,
        freePreview: true,
        book: { select: { code: true, title: true, subject: true } },
        _count: { select: { problems: true } },
      },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');

    const allowed = await canAccessChapter(this.prisma, userId, role, chapter);
    if (!allowed) {
      throw new ForbiddenException(
        'Энэ бүлгийн хичээлийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай',
      );
    }

    const videoAllowed = await canAccessVideoChapter(
      this.prisma,
      userId,
      role,
      chapter,
    );
    // Тестүүд: сурагчид зөвхөн ЭХЛҮҮЛЖ болохыг (common/access.ts
    // studentTestAccessOr — ангид оноосон цаг нь ирсэн, танхимынханд нээгдсэн
    // бүлгийн эрх). 1000 бодлого / ЭЕШ сорил зөвхөн ангид оноосон бол.
    const testAccessWhere = await this.lessonTestWhere(userId, role);
    const [theories, videos, tests, progress] = await Promise.all([
      this.prisma.theoryBlock.findMany({
        where: { chapterId, archivedAt: null },
        select: {
          id: true,
          title: true,
          content: true,
          imageKeys: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      }),
      videoAllowed
        ? this.prisma.video.findMany({
            where: { chapterId, deletedAt: null, problemId: null },
            select: { id: true, title: true, s3Key: true, duration: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve(
            [] as {
              id: string;
              title: string;
              s3Key: string;
              duration: number | null;
            }[],
          ),
      this.prisma.test.findMany({
        where: {
          chapterId,
          isDraft: false,
          deletedAt: null,
          ...testAccessWhere,
        },
        select: {
          id: true,
          title: true,
          type: true,
          _count: { select: { problems: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.getProgress(chapterId, userId),
    ]);

    return {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        book: chapter.book,
      },
      theories,
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.s3Key,
        s3Key: v.s3Key,
        duration: v.duration,
      })),
      problemCount: chapter._count.problems,
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        problemCount: t._count.problems,
      })),
      progress,
    };
  }

  private async lessonTestWhere(
    userId: string,
    role: Role,
  ): Promise<Prisma.TestWhereInput> {
    if (await internalTeachingRole(this.prisma, userId)) return {};
    const scope = await studentTestScope(this.prisma, userId, role);
    const now = new Date();
    const accessOr = studentTestAccessOr(scope, now);
    const assigned: Prisma.TestWhereInput[] = scope.classroomIds.length
      ? [
          {
            access: {
              some: {
                classroomId: { in: scope.classroomIds },
                assignedAt: { lte: now },
              },
            },
          },
        ]
      : [];
    return {
      OR: [
        ...assigned,
        {
          type: { notIn: [TestType.THOUSAND, TestType.EESH_MOCK] },
          ...(accessOr ? { OR: accessOr } : {}),
        },
      ],
    };
  }

  // Онол/бичлэгтэй (агуулгатай) бүлгүүдийг нэг дор жагсаана — сурагчид
  // "дараа юу үзэх вэ" гэдгийг харуулах зорилготой. _count ашиглаж N+1-ээс
  // зайлсхийж, эрхийн шалгалт болон явцын нэгтгэлийг БҮГДИЙГ 1-1 batch query-ээр.
  async listChaptersWithLessons(
    userId: string,
    role: Role,
    subject?: Subject,
    bookId?: string,
  ) {
    const chapters = await this.prisma.chapter.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              { theories: { some: { archivedAt: null } } },
              { videos: { some: { deletedAt: null, problemId: null } } },
            ],
          },
          {
            OR: [
              { bookId: null },
              { book: { archived: false, deletedAt: null } },
            ],
          },
          ...(bookId ? [{ bookId }] : []),
          ...(subject ? [{ book: { subject } }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        order: true,
        grade: true,
        freePreview: true,
        bookId: true,
        book: { select: { code: true, title: true, subject: true } },
        _count: {
          select: {
            theories: { where: { archivedAt: null } },
            videos: { where: { deletedAt: null, problemId: null } },
          },
        },
      },
      orderBy: [{ book: { code: 'asc' } }, { order: 'asc' }],
    });

    let accessible = chapters;
    if (!(await internalTeachingRole(this.prisma, userId))) {
      const [release, scope, own] = await Promise.all([
        classroomRelease(this.prisma, userId, role),
        collectContentScope(this.prisma, userId),
        activeClassSubjects(this.prisma, userId, role),
      ]);
      // common/access.ts chapterGrant-тэй ижил: MATH-аас бусад хичээл зөвхөн
      // тухайн хичээлийн ангид; анги нь зөвхөн өөрийн хичээлийг нээнэ
      accessible = chapters.filter((c) => {
        const subject = c.book?.subject ?? Subject.MATH;
        if (subject !== Subject.MATH && !own.has(subject)) return false;
        return (
          c.freePreview ||
          // Танхимын анги: зөвхөн ангид нээгдсэн тестийн бүлэг (эзэн 2026-10-29)
          (!!release?.chapterIds.has(c.id) && own.has(subject)) ||
          scope.all ||
          scope.chapterIds.includes(c.id) ||
          (c.bookId !== null && scope.bookIds.includes(c.bookId))
        );
      });
    }

    if (accessible.length === 0) return [];

    const chapterIds = accessible.map((c) => c.id);
    const progressRows = await this.prisma.$queryRaw<
      { chapter_id: string; theories_read: bigint; videos_watched: bigint }[]
    >`
      SELECT
        "chapterId" AS chapter_id,
        COUNT(DISTINCT CASE WHEN "type" = 'PAGE_VIEW' AND meta ->> 'theoryId' IS NOT NULL THEN meta ->> 'theoryId' END) AS theories_read,
        COUNT(DISTINCT CASE WHEN "type" = 'VIDEO_COMPLETED' THEN "videoId" END) AS videos_watched
      FROM "LearningEvent"
      WHERE "userId" = ${userId} AND "chapterId" = ANY(${chapterIds})
      GROUP BY "chapterId"
    `;
    const progressByChapter = new Map(
      progressRows.map((r) => [
        r.chapter_id,
        {
          theoriesRead: Number(r.theories_read),
          videosWatched: Number(r.videos_watched),
        },
      ]),
    );

    const mediaAllowed = new Map(
      await Promise.all(
        accessible.map(
          async (chapter) =>
            [
              chapter.id,
              await canAccessVideoChapter(this.prisma, userId, role, chapter),
            ] as const,
        ),
      ),
    );
    return accessible.map(
      ({ bookId: _bookId, freePreview: _freePreview, _count, ...c }) => {
        void _bookId;
        void _freePreview;
        const p = progressByChapter.get(c.id) ?? {
          theoriesRead: 0,
          videosWatched: 0,
        };
        const theoryCount = _count.theories;
        const videoCount = mediaAllowed.get(c.id) ? _count.videos : 0;
        return {
          ...c,
          theoryCount,
          videoCount,
          theoriesRead: p.theoriesRead,
          videosWatched: p.videosWatched,
          completed:
            (theoryCount === 0 || p.theoriesRead >= theoryCount) &&
            (videoCount === 0 || p.videosWatched >= videoCount),
        };
      },
    );
  }

  // Бүлэг сэдэвт нэг онолын блок нэмнэ — TheoryBlock загвар оршдог ч эдүгээ
  // хүртэл ЭНЭ authoring endpoint байгаагүй тул багш нар онол огт бичих
  // боломжгүй байсан (dead model fix).
  private async assertTheoryAttachments(
    keys: string[],
    actorId: string,
    retained: string[] = [],
  ) {
    const added = keys.filter((key) => !retained.includes(key));
    if (!added.length) return;
    const files = await this.prisma.storedFile.findMany({
      where: { key: { in: added } },
      select: { key: true, ownerId: true, mime: true, size: true },
    });
    if (
      added.some(
        (key) =>
          !files.some((file) => file.key === key && file.ownerId === actorId),
      )
    )
      throw new ForbiddenException(
        'Зөвхөн өөрийн байршуулсан зургийг хавсаргана уу.',
      );
    if (
      files.some(
        (file) =>
          ![
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif',
          ].includes(file.mime) || file.size > 25 * 1024 * 1024,
      )
    )
      throw new BadRequestException('25 МБ хүртэлх зураг хавсаргана уу.');
  }

  async createTheory(chapterId: string, dto: CreateTheoryDto, actorId: string) {
    await assertInternalTeachingStaff(this.prisma, actorId);
    const where = dto.clientRequestId
      ? {
          createdById_clientRequestId: {
            createdById: actorId,
            clientRequestId: dto.clientRequestId,
          },
        }
      : null;
    const replay = (existing: {
      chapterId: string;
      title: string;
      content: string;
      imageKeys: string[];
      archivedAt: Date | null;
    }) => {
      if (existing.archivedAt)
        throw new ConflictException(
          'Архивласан хүсэлтийг дахин ашиглах боломжгүй',
        );
      if (
        existing.chapterId !== chapterId ||
        existing.title !== dto.title ||
        existing.content !== dto.content ||
        JSON.stringify(existing.imageKeys) !==
          JSON.stringify(dto.imageKeys ?? [])
      ) {
        throw new ConflictException(
          'Энэ хүсэлтийн дугаараар өөр агуулга хадгалсан байна. Шинэ хүсэлтээр илгээнэ үү.',
        );
      }
      return existing;
    };
    if (where) {
      const existing = await this.prisma.theoryBlock.findUnique({ where });
      if (existing) return replay(existing);
    }
    await this.assertTheoryAttachments(dto.imageKeys ?? [], actorId);
    const chapter = await this.prisma.chapter.findUnique({
      where: {
        id: chapterId,
        deletedAt: null,
        OR: [{ bookId: null }, { book: { deletedAt: null, archived: false } }],
      },
      select: { id: true },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');

    const last = await this.prisma.theoryBlock.aggregate({
      where: { chapterId },
      _max: { order: true },
    });

    try {
      return await this.prisma.theoryBlock.create({
        data: {
          chapterId,
          createdById: actorId,
          clientRequestId: dto.clientRequestId,
          title: dto.title,
          content: dto.content,
          imageKeys: dto.imageKeys ?? [],
          order: (last._max.order ?? 0) + 1,
        },
      });
    } catch (error) {
      if (
        where &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.prisma.theoryBlock.findUnique({ where });
        if (winner) return replay(winner);
      }
      throw error;
    }
  }

  async updateTheory(id: string, dto: UpdateTheoryDto, actorId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, actorId);
    const theory = await this.prisma.theoryBlock.findUnique({ where: { id } });
    if (!theory || theory.archivedAt)
      throw new NotFoundException('Онолын блок олдсонгүй');
    if (role === Role.TEACHER && theory.createdById !== actorId)
      throw new ForbiddenException('Өөрийн онолыг засна уу');
    if (dto.imageKeys !== undefined)
      await this.assertTheoryAttachments(
        dto.imageKeys,
        actorId,
        theory.imageKeys,
      );

    return this.prisma.theoryBlock.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.imageKeys !== undefined ? { imageKeys: dto.imageKeys } : {}),
      },
    });
  }

  async removeTheory(id: string, actorId: string) {
    return this.setTheoryArchive(id, actorId, true);
  }

  async restoreTheory(id: string, actorId: string) {
    return this.setTheoryArchive(id, actorId, false);
  }

  private async setTheoryArchive(
    id: string,
    actorId: string,
    archive: boolean,
  ) {
    const role = await assertInternalTeachingStaff(this.prisma, actorId);
    if (role !== Role.ADMIN && role !== Role.TEACHER_PLUS)
      throw new ForbiddenException('Архивлах эрхгүй');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`theory:${id}`}))`;
      const theory = await tx.theoryBlock.findUnique({ where: { id } });
      if (!theory) throw new NotFoundException('Онолын блок олдсонгүй');
      if (!archive) {
        const chapter = await tx.chapter.findFirst({
          where: {
            id: theory.chapterId,
            deletedAt: null,
            OR: [
              { bookId: null },
              { book: { deletedAt: null, archived: false } },
            ],
          },
        });
        if (!chapter)
          throw new ConflictException(
            'Архивласан бүлэгт онол сэргээх боломжгүй',
          );
      }
      if (!!theory.archivedAt === archive)
        return { removed: archive, archived: archive, id };
      const row = await tx.theoryBlock.update({
        where: { id },
        data: { archivedAt: archive ? new Date() : null },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: role,
          action: archive ? 'ARCHIVE' : 'RESTORE',
          entity: 'TheoryBlock',
          entityId: id,
          before: { archivedAt: theory.archivedAt?.toISOString() ?? null },
          after: { archivedAt: row.archivedAt?.toISOString() ?? null },
        },
      });
      return { removed: archive, archived: archive, id };
    });
  }

  // Бүтэн жагсаалтыг дахин бичнэ (drag/drop reorder UI). Ирсэн id-ууд тухайн
  // бүлгийн онолын блокуудтай ЯГ ТААРАХ ёстой (хэсэгчилсэн reorder-ыг зөвшөөрөхгүй
  // — эс тэгвээс жагсаалтад ороогүй блок хуучин order-ээ хадгалж давхцал үүснэ).
  async reorderTheory(chapterId: string, ids: string[], actorId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, actorId);
    const existing = await this.prisma.theoryBlock.findMany({
      where: { chapterId, archivedAt: null },
      select: { id: true, createdById: true },
    });
    if (
      role === Role.TEACHER &&
      existing.some((t) => t.createdById !== actorId)
    )
      throw new ForbiddenException('Бүлгийн бүх онолыг эрэмбэлэх эрхгүй');
    const existingIds = new Set(existing.map((t) => t.id));
    const incomingIds = new Set(ids);
    if (
      existingIds.size !== incomingIds.size ||
      [...existingIds].some((id) => !incomingIds.has(id))
    ) {
      throw new BadRequestException(
        'ids жагсаалт нь тухайн бүлгийн онолын блокуудтай яг тохирохгүй байна',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.theoryBlock.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
    return { reordered: ids.length };
  }

  // Сурагчийн явцыг LearningEvent-д бичнэ (heatmap/аналитик давхарга үүнийг
  // уншина). ЗААВАЛ 202 буцаана: телеметр бичилт амжилтгүй болсноор сурагчийн
  // судлах явцыг хэзээ ч блоклохгүй.
  async recordProgress(
    chapterId: string,
    userId: string,
    dto: RecordProgressDto,
  ) {
    let type: LearningEventType;
    let videoId: string | undefined;
    let meta: Prisma.InputJsonValue | undefined;

    switch (dto.action) {
      case LessonProgressAction.THEORY_READ:
        if (!dto.theoryId) {
          throw new BadRequestException(
            'THEORY_READ үйлдэлд theoryId шаардлагатай',
          );
        }
        type = LearningEventType.PAGE_VIEW;
        meta = { theoryId: dto.theoryId };
        break;
      case LessonProgressAction.VIDEO_STARTED:
        if (!dto.videoId) {
          throw new BadRequestException(
            'VIDEO_STARTED үйлдэлд videoId шаардлагатай',
          );
        }
        type = LearningEventType.VIDEO_STARTED;
        videoId = dto.videoId;
        break;
      case LessonProgressAction.VIDEO_COMPLETED:
        if (!dto.videoId) {
          throw new BadRequestException(
            'VIDEO_COMPLETED үйлдэлд videoId шаардлагатай',
          );
        }
        type = LearningEventType.VIDEO_COMPLETED;
        videoId = dto.videoId;
        break;
    }

    // Телеметр бичилт амжилтгүй болсон ч сурагчийн үзэж буй хуудсыг хэзээ ч
    // эвдэхгүй: DB алдаа гарвал зөвхөн серверт лог хийж, 202-г үргэлж буцаана.
    try {
      await this.prisma.learningEvent.create({
        data: { userId, type, chapterId, videoId, meta },
      });
    } catch (err) {
      this.logger.error(
        'Хичээлийн явцын LearningEvent бичихэд алдаа гарлаа',
        err,
      );
    }
    return { accepted: true };
  }

  // Нэг бүлгийн хувьд онол/бичлэг/бодлогын явцыг бүхэлд нь SQL дээр нэгтгэнэ —
  // мөр татаж JS-ээр тоолохгүй (том хэрэглэгчийн LearningEvent/Attempt хүснэгтэд
  // хямдгүй байх байсан).
  private async getProgress(chapterId: string, userId: string) {
    const rows = await this.prisma.$queryRaw<ProgressRow[]>`
      SELECT
        (SELECT COALESCE(array_agg(DISTINCT (meta ->> 'theoryId')), '{}')
           FROM "LearningEvent"
          WHERE "userId" = ${userId} AND "chapterId" = ${chapterId}
            AND "type" = 'PAGE_VIEW' AND meta ->> 'theoryId' IS NOT NULL) AS theory_read,
        (SELECT COALESCE(array_agg(DISTINCT "videoId"), '{}')
           FROM "LearningEvent"
          WHERE "userId" = ${userId} AND "chapterId" = ${chapterId}
            AND "type" = 'VIDEO_COMPLETED' AND "videoId" IS NOT NULL) AS videos_watched,
        (SELECT COUNT(DISTINCT a."problemId")
           FROM "Attempt" a
           JOIN "Problem" p ON p.id = a."problemId"
          WHERE a."studentId" = ${userId} AND p."chapterId" = ${chapterId}) AS problems_attempted
    `;
    const row = rows[0];
    return {
      theoryRead: (row?.theory_read ?? []).filter((id): id is string => !!id),
      videosWatched: (row?.videos_watched ?? []).filter(
        (id): id is string => !!id,
      ),
      problemsAttempted: Number(row?.problems_attempted ?? 0),
    };
  }
}
