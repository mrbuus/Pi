import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseSubjectQuery } from '../common/subject';
import { Role } from '../generated/prisma/enums';
import {
  AssignExamClassDto,
  SaveGradebookDto,
  SetScoringGroupsDto,
  UpdateExamClassDto,
} from './exams.dto';
import { ClassOverviewService } from './class-overview.service';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamsService, parseExamListKind } from './exams.service';
import { GradebookService } from './gradebook.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

const STAFF = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] as const;
const CONTENT = [Role.ADMIN, Role.TEACHER_PLUS] as const;

// «Шалгалт» хэсэг (SHALGALT-TOLOVLOGOO): жагсаалт, мөр дэлгэрэхэд Дүн /
// Тохиргоо таб. Шалгалт өгөх нь /tests/:id/start|session|submit хэвээр.
// Бүх маршрут зөвхөн ажилтанд; багш — өөрийн анги, Багш+/Админ — бүх анги.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly gradebook: GradebookService,
    private readonly analytics: ExamAnalyticsService,
    private readonly classes: ClassOverviewService,
  ) {}

  // «Анги» таб: ангийн бүх шалгалтын нэгтгэл, ирц, даалгавар (Багш — өөрийн анги)
  @Roles(...STAFF)
  @Get('classes/:classroomId')
  classOverview(
    @Param('classroomId') classroomId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.classes.overview(classroomId, req.user.userId);
  }

  @Roles(...STAFF)
  @Get('classes/:classroomId/students/:studentId')
  classStudent(
    @Param('classroomId') classroomId: string,
    @Param('studentId') studentId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.classes.student(classroomId, studentId, req.user.userId);
  }

  @Roles(...STAFF)
  @Get()
  overview(
    @Req() req: AuthedRequest,
    @Query('subject') subject?: string,
    @Query('kind') kind?: string,
  ) {
    return this.exams.overview(
      req.user.userId,
      parseSubjectQuery(subject),
      parseExamListKind(kind),
    );
  }

  @Roles(...STAFF)
  @Get(':testId/settings')
  settings(@Param('testId') testId: string, @Req() req: AuthedRequest) {
    return this.exams.settings(testId, req.user.userId);
  }

  @Roles(...STAFF)
  @Get(':testId/student-view')
  studentView(@Param('testId') testId: string, @Req() req: AuthedRequest) {
    return this.exams.studentView(testId, req.user.userId);
  }

  @Roles(...STAFF)
  @Post(':testId/classes/:classroomId')
  assignClass(
    @Param('testId') testId: string,
    @Param('classroomId') classroomId: string,
    @Body() dto: AssignExamClassDto,
    @Req() req: AuthedRequest,
  ) {
    return this.exams.assignClass(
      testId,
      classroomId,
      req.user.userId,
      dto ?? {},
    );
  }

  @Roles(...STAFF)
  @Patch(':testId/classes/:classroomId')
  updateClass(
    @Param('testId') testId: string,
    @Param('classroomId') classroomId: string,
    @Body() dto: UpdateExamClassDto,
    @Req() req: AuthedRequest,
  ) {
    return this.exams.updateClass(testId, classroomId, req.user.userId, dto);
  }

  @Roles(...STAFF)
  @Delete(':testId/classes/:classroomId')
  unassignClass(
    @Param('testId') testId: string,
    @Param('classroomId') classroomId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.exams.unassignClass(testId, classroomId, req.user.userId);
  }

  @Roles(...CONTENT)
  @Patch(':testId/scoring-groups')
  setScoringGroups(
    @Param('testId') testId: string,
    @Body() dto: SetScoringGroupsDto,
    @Req() req: AuthedRequest,
  ) {
    return this.exams.setScoringGroups(testId, req.user.userId, dto);
  }

  // Тойм + Бодлого таб — нэг дуудлага (ангиар шүүсэн, Багш — өөрийн анги)
  @Roles(...STAFF)
  @Get(':testId/analytics')
  analyticsRead(
    @Param('testId') testId: string,
    @Req() req: AuthedRequest,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.analytics.analytics(testId, req.user.userId, classroomId);
  }

  // Дүн таб: сурагчийн мөр — хэсэг/сэдвийн задаргаа, бусад шалгалтын явц
  @Roles(...STAFF)
  @Get(':testId/students/:studentId')
  studentSummary(
    @Param('testId') testId: string,
    @Param('studentId') studentId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.analytics.studentSummary(testId, studentId, req.user.userId);
  }

  @Roles(...STAFF)
  @Get(':testId/gradebook')
  gradebookRead(
    @Param('testId') testId: string,
    @Req() req: AuthedRequest,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.gradebook.read(testId, req.user.userId, classroomId);
  }

  @Roles(...STAFF)
  @Put(':testId/gradebook')
  gradebookSave(
    @Param('testId') testId: string,
    @Body() dto: SaveGradebookDto,
    @Req() req: AuthedRequest,
  ) {
    return this.gradebook.save(testId, req.user.userId, dto);
  }

  @Roles(...STAFF)
  @Get(':testId/gradebook/excel')
  gradebookExport(
    @Param('testId') testId: string,
    @Req() req: AuthedRequest,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.gradebook.exportExcel(testId, req.user.userId, classroomId);
  }

  @Roles(...STAFF)
  @Post(':testId/gradebook/excel')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  gradebookImportPreview(
    @Param('testId') testId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthedRequest,
    @Query('classroomId') classroomId?: string,
    @Query('sheet') sheet?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('Excel файл сонгоно уу.');
    return this.gradebook.previewExcel(
      testId,
      req.user.userId,
      classroomId ?? '',
      file.buffer,
      sheet || undefined,
    );
  }
}
