import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassCoverageService } from './class-coverage.service';
import {
  AddBehaviorFlagDto,
  RemoveBehaviorFlagDto,
  SavePastCoverageDto,
} from './class-dashboard.dto';
import { ClassDashboardService } from './class-dashboard.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * «Анги» самбар (эзэн 2026-10-13). Багш+/Админ — бүх анги; Багш — өөрийн
 * заадаг анги (ангийн/хуваарийн багш, ахлах/туслах). Мөнгөний хэсэг зөвхөн
 * `finance.manage` эрхтэйд. Нэг анги = НЭГ нэгтгэсэн дуудлага (N+1 биш).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('class-dashboard')
export class ClassDashboardController {
  constructor(
    private readonly dashboard: ClassDashboardService,
    private readonly coverage: ClassCoverageService,
  ) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.dashboard.list(req.user.userId);
  }

  @Get('classes/:classroomId')
  detail(@Req() req: AuthedRequest, @Param('classroomId') classroomId: string) {
    return this.dashboard.detail(classroomId, req.user.userId);
  }

  /** Сарын тор: ирц, даалгавар, шалгалт, бие даасан ажил (?month=YYYY-MM) */
  @Get('classes/:classroomId/month')
  month(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Query('month') month?: string,
  ) {
    return this.dashboard.month(classroomId, month, req.user.userId);
  }

  /**
   * «Сэдэв, хөтөлбөр» — ангийн үзсэн сэдвийн мод (эзэн 2026-10-27): ном → бүлэг →
   * тест; тест бүр «өмнө үзсэн» (огноогүй) ба батлагдсан хичээлийн огноотой.
   */
  @Get('classes/:classroomId/coverage')
  coverageTree(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
  ) {
    return this.coverage.tree(classroomId, req.user.userId);
  }

  /** «Өмнө үзсэн сэдэв тэмдэглэх» — бүтэн багцыг нэг удаад хадгална (хасах нь зөөлөн) */
  @Put('classes/:classroomId/coverage/past')
  savePastCoverage(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Body() dto: SavePastCoverageDto,
  ) {
    return this.coverage.savePast(classroomId, dto.testIds, req.user.userId);
  }

  @Get('students/:studentId/competency')
  competency(@Req() req: AuthedRequest, @Param('studentId') studentId: string) {
    return this.dashboard.studentCompetency(studentId, req.user.userId);
  }

  @Get('students/:studentId/flags')
  flags(@Req() req: AuthedRequest, @Param('studentId') studentId: string) {
    return this.dashboard.flagHistory(studentId, req.user.userId);
  }

  @Post('students/:studentId/flags')
  addFlag(
    @Req() req: AuthedRequest,
    @Param('studentId') studentId: string,
    @Body() dto: AddBehaviorFlagDto,
  ) {
    return this.dashboard.addFlag(studentId, dto, req.user.userId);
  }

  @Post('flags/:flagId/remove')
  removeFlag(
    @Req() req: AuthedRequest,
    @Param('flagId') flagId: string,
    @Body() dto: RemoveBehaviorFlagDto,
  ) {
    return this.dashboard.removeFlag(flagId, dto, req.user.userId);
  }
}
