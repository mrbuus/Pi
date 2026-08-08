import { Controller, Get, Query, UseGuards, StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { InsightsService } from './insights.service';
import { Readable } from 'stream';

@Controller('insights')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  /**
   * Хүүхэлтийн шинжилгээ (буруу сонголт статистик)
   * Багшид "энэ бодлогод 12 сурагч B сонгосон" гэсэн дүгнэлт өгнө
   */
  @Get('distractor-analysis')
  @Roles(Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN)
  async getDistractorAnalysis(
    @Query('problemIds') problemIds?: string,
    @Query('limit') limit?: string,
  ) {
    const ids = problemIds ? problemIds.split(',') : undefined;
    const safeLimit = Math.min(Math.max(parseInt(limit || '100') || 100, 1), 500);
    return this.service.getDistractorAnalysis(ids, safeLimit);
  }

  /**
   * Бодлогын чанар: difficulty (p-value) ба discrimination (point-biserial)
   * Discrimination сөрөл бол АНХААРУУЛ: сайн сурагч буруу, муу нь зөв
   */
  @Get('problem-quality')
  @Roles(Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN)
  async getProblemQuality(@Query('limit') limit?: string) {
    const safeLimit = Math.min(Math.max(parseInt(limit || '100') || 100, 1), 1000);
    const qualities = await this.service.getProblemQuality(safeLimit);

    // Эвдэрсэн бодлогуудыг (discrimination < 0) АНХААРУУЛ
    const defective = qualities.filter((q) => q.isDefective);
    if (defective.length > 0) {
      console.warn(
        `Анхаар: ${defective.length} бодлого эвдэрсэн (discrimination < 0)`,
        defective.map((d) => d.problemToken),
      );
    }

    return qualities;
  }

  /**
   * Сэдвийн эзэмшил матриц: ангийн дүр зураг
   */
  @Get('topic-mastery')
  @Roles(Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN)
  async getTopicMastery(
    @Query('classroomId') classroomId?: string,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(Math.max(parseInt(limit || '50') || 50, 1), 500);
    return this.service.getTopicMastery(classroomId, safeLimit);
  }

  /**
   * ML сургалтын өгөгдлийн экспорт (нууцлалтай)
   * ЗӨВХӨН ADMIN! studentId-г хэшлэсэн, дахин холбох боломжгүй
   * JSONL хэлбэрээр streaming буцаана
   */
  @Get('ml-export')
  @Roles(Role.ADMIN)
  async getMlExport(
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<StreamableFile> {
    const safeOffset = Math.max(parseInt(offset || '0') || 0, 0);
    const safeLimit = Math.min(Math.max(parseInt(limit || '10000') || 10000, 1), 50000);

    // Streaming хүргүүлэнэ: үнэмлэхүй 2.2M+ мөр хадгалахгүй
    const dataPoints = await this.service.getMLExportData(safeOffset, safeLimit);

    // JSONL хэлбэрээр хуулна
    const readable = Readable.from(
      dataPoints.map((dp) => JSON.stringify(dp) + '\n'),
    );

    return new StreamableFile(readable, {
      type: 'application/x-ndjson',
      disposition: 'attachment; filename="ml-export.jsonl"',
    });
  }

  /**
   * ML экспортын нийт мөрүүдийн тоо
   * Пагинацион тооцоо
   */
  @Get('ml-export-count')
  @Roles(Role.ADMIN)
  async getMlExportCount() {
    const total = await this.service.getMLExportCount();
    return { total };
  }
}
