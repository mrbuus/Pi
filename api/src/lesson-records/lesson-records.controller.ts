import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ConfirmLessonDto, LessonNoteDto } from './dto/lesson-record.dto';
import { LessonRecordsService } from './lesson-records.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Батлагдсан хичээлийн түүх + багшийн тайлбар (эзэн 2026-10-08).
// Тайлбар зөвхөн ажилтны маршрутаар буцна — сурагчийн /me-д ХЭЗЭЭ Ч орохгүй.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lesson-records')
export class LessonRecordsController {
  constructor(private records: LessonRecordsService) {}

  @Roles(Role.STUDENT)
  @Get('me')
  mine(@Req() req: AuthedRequest, @Query('limit') limit?: string) {
    return this.records.mine(req.user, Number(limit) || 60);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('day')
  day(@Req() req: AuthedRequest, @Query('date') date: string) {
    return this.records.day(req.user, date);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classroom/:classroomId')
  classroom(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Query('limit') limit?: string,
  ) {
    return this.records.classroomHistory(
      req.user,
      classroomId,
      Number(limit) || 60,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('student/:studentId')
  student(
    @Req() req: AuthedRequest,
    @Param('studentId') studentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.records.studentHistory(
      req.user,
      studentId,
      Number(limit) || 60,
    );
  }

  // Батлах/буцаах — Багш+, Админ л (эзэн 2026-10-18)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put(':scheduleId/confirm')
  confirm(
    @Req() req: AuthedRequest,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: ConfirmLessonDto,
  ) {
    return this.records.confirm(req.user, scheduleId, dto.date, dto.tests, {
      topic: dto.topic,
      description: dto.description,
      problemNumbers: dto.problemNumbers,
    });
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete(':scheduleId/confirm')
  unconfirm(
    @Req() req: AuthedRequest,
    @Param('scheduleId') scheduleId: string,
    @Query('date') date: string,
  ) {
    return this.records.unconfirm(req.user, scheduleId, date);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Put(':scheduleId/note')
  note(
    @Req() req: AuthedRequest,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: LessonNoteDto,
  ) {
    return this.records.setNote(req.user, scheduleId, dto.date, dto.body);
  }
}
