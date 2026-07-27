import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  canAccessChapter,
  collectPassScope,
  hasActiveClassroomEnrollment,
  TEACHER_ROLES,
} from '../common/access';
import { Prisma } from '../generated/prisma/client';
import { LearningEventType, Role, Subject } from '../generated/prisma/enums';
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
      where: { id: chapterId },
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

    const [theories, videos, tests, progress] = await Promise.all([
      this.prisma.theoryBlock.findMany({
        where: { chapterId },
        select: { id: true, title: true, content: true, imageKeys: true, order: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.video.findMany({
        where: { chapterId },
        select: { id: true, title: true, s3Key: true, duration: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.test.findMany({
        where: { chapterId },
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
        AND: [
          { OR: [{ theories: { some: {} } }, { videos: { some: {} } }] },
          { OR: [{ bookId: null }, { book: { archived: false } }] },
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
        _count: { select: { theories: true, videos: true } },
      },
      orderBy: [{ book: { code: 'asc' } }, { order: 'asc' }],
    });

    let accessible = chapters;
    if (!TEACHER_ROLES.includes(role)) {
      const [enrolled, scope] = await Promise.all([
        hasActiveClassroomEnrollment(this.prisma, userId, role),
        collectPassScope(this.prisma, userId),
      ]);
      accessible = chapters.filter(
        (c) =>
          c.freePreview ||
          enrolled ||
          scope.all ||
          scope.chapterIds.includes(c.id) ||
          (c.bookId !== null && scope.bookIds.includes(c.bookId)),
      );
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

    return accessible.map(({ bookId: _bookId, freePreview: _freePreview, _count, ...c }) => {
      const p = progressByChapter.get(c.id) ?? {
        theoriesRead: 0,
        videosWatched: 0,
      };
      const theoryCount = _count.theories;
      const videoCount = _count.videos;
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
    });
  }

  // Бүлэг сэдэвт нэг онолын блок нэмнэ — TheoryBlock загвар оршдог ч эдүгээ
  // хүртэл ЭНЭ authoring endpoint байгаагүй тул багш нар онол огт бичих
  // боломжгүй байсан (dead model fix).
  async createTheory(chapterId: string, dto: CreateTheoryDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');

    const last = await this.prisma.theoryBlock.aggregate({
      where: { chapterId },
      _max: { order: true },
    });

    return this.prisma.theoryBlock.create({
      data: {
        chapterId,
        title: dto.title,
        content: dto.content,
        imageKeys: dto.imageKeys ?? [],
        order: (last._max.order ?? 0) + 1,
      },
    });
  }

  async updateTheory(id: string, dto: UpdateTheoryDto) {
    const theory = await this.prisma.theoryBlock.findUnique({ where: { id } });
    if (!theory) throw new NotFoundException('Онолын блок олдсонгүй');

    return this.prisma.theoryBlock.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.imageKeys !== undefined ? { imageKeys: dto.imageKeys } : {}),
      },
    });
  }

  async removeTheory(id: string) {
    const theory = await this.prisma.theoryBlock.findUnique({ where: { id } });
    if (!theory) throw new NotFoundException('Онолын блок олдсонгүй');
    await this.prisma.theoryBlock.delete({ where: { id } });
    return { removed: true };
  }

  // Бүтэн жагсаалтыг дахин бичнэ (drag/drop reorder UI). Ирсэн id-ууд тухайн
  // бүлгийн онолын блокуудтай ЯГ ТААРАХ ёстой (хэсэгчилсэн reorder-ыг зөвшөөрөхгүй
  // — эс тэгвээс жагсаалтад ороогүй блок хуучин order-ээ хадгалж давхцал үүснэ).
  async reorderTheory(chapterId: string, ids: string[]) {
    const existing = await this.prisma.theoryBlock.findMany({
      where: { chapterId },
      select: { id: true },
    });
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
  async recordProgress(chapterId: string, userId: string, dto: RecordProgressDto) {
    let type: LearningEventType;
    let videoId: string | undefined;
    let meta: Prisma.InputJsonValue | undefined;

    switch (dto.action) {
      case LessonProgressAction.THEORY_READ:
        if (!dto.theoryId) {
          throw new BadRequestException('THEORY_READ үйлдэлд theoryId шаардлагатай');
        }
        type = LearningEventType.PAGE_VIEW;
        meta = { theoryId: dto.theoryId };
        break;
      case LessonProgressAction.VIDEO_STARTED:
        if (!dto.videoId) {
          throw new BadRequestException('VIDEO_STARTED үйлдэлд videoId шаардлагатай');
        }
        type = LearningEventType.VIDEO_STARTED;
        videoId = dto.videoId;
        break;
      case LessonProgressAction.VIDEO_COMPLETED:
        if (!dto.videoId) {
          throw new BadRequestException('VIDEO_COMPLETED үйлдэлд videoId шаардлагатай');
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
      this.logger.error('Хичээлийн явцын LearningEvent бичихэд алдаа гарлаа', err);
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
      videosWatched: (row?.videos_watched ?? []).filter((id): id is string => !!id),
      problemsAttempted: Number(row?.problems_attempted ?? 0),
    };
  }
}
