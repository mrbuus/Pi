import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  AdjustAttemptDto,
  AssignTestDto,
  ResetChapterDto,
} from './dto/adjust-progress.dto';
import { ProgressService } from './progress.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Онлайн сурагчийн явцыг харах/удирдах — SPEC-ийн "невидимэс customers" цоорхойг
// хаах API (ANGID-гүй тул сурагчийн-таб/ирц/дааврын бусад дэлгэцэд ороогүй).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('progress')
export class ProgressController {
  constructor(private progress: ProgressService) {}

  // Энгийн TEACHER ч харах эрхтэй (READ-ONLY) — эрхийн бодит шалгалт service
  // давхаргад (assertReadAccess/assertWriteAccess), эндхийн @Roles зөвхөн
  // "STUDENT/PARENT/BUYER огт орж ирэхгүй" гэсэн эхний давхаргын хамгаалалт.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('online-students')
  onlineStudents(
    @Query('search') search?: string,
    @Query('passStatus') passStatus?: string,
    @Query('activity') activity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.progress.onlineStudentsRoster({
      search,
      passStatus,
      activity,
      page,
      pageSize,
    });
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('student/:id')
  studentDepth(
    @Param('id') studentId: string,
    @Req() req: AuthedRequest,
    @Query('year') year?: string,
  ) {
    return this.progress.getStudentDepth(
      studentId,
      req.user.role,
      year ? Number(year) : undefined,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('student/:id/timeline')
  timeline(
    @Param('id') studentId: string,
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.progress.getTimeline(studentId, req.user.role, from, to);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('student/:id/assign-test')
  assignTest(
    @Param('id') studentId: string,
    @Body() dto: AssignTestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.progress.assignTest(
      studentId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('student/:id/attempt/:attemptId')
  adjustAttempt(
    @Param('id') studentId: string,
    @Param('attemptId') attemptId: string,
    @Body() dto: AdjustAttemptDto,
    @Req() req: AuthedRequest,
  ) {
    return this.progress.adjustAttempt(
      studentId,
      attemptId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('student/:id/attempt/:attemptId')
  deleteAttempt(
    @Param('id') studentId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.progress.deleteAttempt(
      studentId,
      attemptId,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('student/:id/reset-chapter')
  resetChapter(
    @Param('id') studentId: string,
    @Body() dto: ResetChapterDto,
    @Req() req: AuthedRequest,
  ) {
    return this.progress.resetChapter(
      studentId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }
}
