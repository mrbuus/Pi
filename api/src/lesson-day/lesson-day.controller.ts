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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import { ImageKeysDto, MakeupDecisionDto } from './lesson-day.dto';
import { LessonDayService } from './lesson-day.service';

const STAFF = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] as const;

/**
 * Нөхөх хичээл (/makeup/*) ба онолын зураг (/lesson-day/*) — эзэн 2026-10-18.
 * Гэрээ: docs/v2/UDRIIN-HICHEEL-REWORK.md «API гэрээ» (Агент 4).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class LessonDayController {
  constructor(private readonly lessonDay: LessonDayService) {}

  // ───── Нөхөх хичээл ─────

  @Roles(...STAFF)
  @Get('makeup/classrooms/:classroomId')
  classroomMakeups(
    @Req() req: RequestWithUser,
    @Param('classroomId') classroomId: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.lessonDay.classroomMakeups(req.user, classroomId, { date, from, to });
  }

  @Roles(Role.STUDENT)
  @Get('makeup/me')
  myMakeups(@Req() req: RequestWithUser) {
    return this.lessonDay.myMakeups(req.user.userId);
  }

  @Roles(Role.STUDENT)
  @Post('makeup/me/:classroomId/:date/photos')
  makeupPhotos(
    @Req() req: RequestWithUser,
    @Param('classroomId') classroomId: string,
    @Param('date') date: string,
    @Body() dto: ImageKeysDto,
  ) {
    return this.lessonDay.submitMakeupPhotos(req.user.userId, classroomId, date, dto.imageKeys);
  }

  /** Нөхөх тестийг шалгалтын горимоор нээх (ангид оноогдоогүй бол онооно) */
  @Roles(Role.STUDENT)
  @Post('makeup/me/:classroomId/:date/tests/:testId/open')
  openMakeupTest(
    @Req() req: RequestWithUser,
    @Param('classroomId') classroomId: string,
    @Param('date') date: string,
    @Param('testId') testId: string,
  ) {
    return this.lessonDay.openMakeupTest(req.user, classroomId, date, testId);
  }

  @Roles(...STAFF)
  @Put('makeup/:classroomId/:studentId/:date')
  decide(
    @Req() req: RequestWithUser,
    @Param('classroomId') classroomId: string,
    @Param('studentId') studentId: string,
    @Param('date') date: string,
    @Body() dto: MakeupDecisionDto,
  ) {
    return this.lessonDay.decide(req.user, classroomId, studentId, date, dto.action, dto.note);
  }

  // ───── Онолын зураг ─────

  @Roles(Role.STUDENT)
  @Get('lesson-day/me/photos')
  myPhotos(
    @Req() req: RequestWithUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.lessonDay.myPhotos(req.user.userId, from, to);
  }

  @Roles(...STAFF, Role.STUDENT)
  @Get('lesson-day/:classroomId/:date/photos')
  dayPhotos(
    @Req() req: RequestWithUser,
    @Param('classroomId') classroomId: string,
    @Param('date') date: string,
  ) {
    return this.lessonDay.dayPhotos(req.user, classroomId, date);
  }

  @Roles(...STAFF, Role.STUDENT)
  @Post('lesson-day/:classroomId/:date/photos')
  uploadDayPhotos(
    @Req() req: RequestWithUser,
    @Param('classroomId') classroomId: string,
    @Param('date') date: string,
    @Body() dto: ImageKeysDto,
  ) {
    return this.lessonDay.uploadDayPhotos(req.user, classroomId, date, dto.imageKeys);
  }
}
