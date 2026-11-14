import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { RecommendService } from './recommend.service';
import type { EvidenceRecommendation } from './recommend.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/** `?chapterId=a,b` эсвэл давтагдсан `?chapterId=a&chapterId=b` — сонголттой. */
export function parseChapterIds(raw?: string | string[]): string[] | undefined {
  if (raw === undefined) return undefined;
  const list = (Array.isArray(raw) ? raw : [raw])
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recommend')
export class RecommendController {
  constructor(private recommend: RecommendService) {}

  /**
   * Сурагчийн дараагийн бодлогуудыг санал болгоно.
   *
   * Гүйцэтгэл: 1-2 сек (DB үзүүлэлт 100-200 бодлого таран хайна)
   *
   * @query limit - хэдэн бодлого санал болгох (өгөгдмөл 10)
   * @query chapterId - сонголттой: зөвхөн эдгээр бүлгээс (сэдвээр дасгал, таслалаар 12 хүртэл)
   * @returns Recommendation[] - { problemId, topicId, score, reason }
   */
  @Roles(Role.STUDENT, Role.BUYER)
  @Get('next')
  async next(
    @Req() req: AuthedRequest,
    @Query('limit') limitStr?: string,
    @Query('chapterId') chapterId?: string | string[],
  ): Promise<EvidenceRecommendation[]> {
    if (!req.user.userId) throw new NotFoundException('Сурагч олдсонгүй');
    const limit =
      limitStr === undefined
        ? 10
        : /^\d{1,2}$/.test(limitStr)
          ? Number(limitStr)
          : NaN;
    return this.recommend.getNextProblems(
      req.user.userId,
      limit,
      req.user.role,
      parseChapterIds(chapterId),
    );
  }

  /**
   * Хичээлийн чөлөөт сэдвийг бүлэгтэй тааруулна (яг/хэвшүүлсэн гарчиг; эргэлзээтэй бол null).
   * @returns { chapterId: string | null, chapterIds: string[], title: string | null }
   */
  @Roles(Role.STUDENT, Role.BUYER)
  @Get('chapter-match')
  chapterMatch(@Req() req: AuthedRequest, @Query('topic') topic?: string) {
    return this.recommend.matchLessonTopic(req.user.userId, topic, req.user.role);
  }

  /**
   * Бодлого бодосны дараа үр дүнг бөглөнө (ONLINE_PRACTICE).
   *
   * @body problemId - бодлогын ID
   * @body givenAnswer - сурагчийн хариулт (тоо, текст, index гэх мэт)
   * @body autoCorrect - зөв бодсон эсэх (авто үнэлгээ)
   */
  @Roles(Role.STUDENT, Role.BUYER)
  @Post('attempt')
  async submitAttempt(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      problemId: string;
      givenAnswer?: unknown;
      autoCorrect?: boolean;
      selfState?: string;
    },
  ) {
    if (!req.user.userId) throw new NotFoundException('Сурагч олдсонгүй');
    return this.recommend.createAttempt(
      req.user.userId,
      body.problemId,
      body.givenAnswer,
      body.autoCorrect,
      body.selfState,
      req.user.role,
    );
  }
}
