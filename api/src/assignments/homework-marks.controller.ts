import {
  Body,
  Controller,
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
  BulkHomeworkMarksDto,
  PatchHomeworkMarkDto,
} from './homework-marks.dto';
import { HomeworkMarksService } from './homework-marks.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class HomeworkMarksController {
  constructor(private homeworkMarks: HomeworkMarksService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/homework-marks')
  byClassAndDate(
    @Param('id') classroomId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    return this.homeworkMarks.listForClass(
      classroomId,
      date,
      req.user.userId,
      req.user.role,
    );
  }

  // Тухайн хичээлийн гэрийн даалгаврын онлайн дүн: өмнөх хичээлд ангид хийсэн
  // тестийн нөгөө хувилбар (A → B) — самбарын «Онлайн» нүд (эзэн 2026-10-18)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/homework-marks/online')
  online(
    @Param('id') classroomId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    return this.homeworkMarks.online(
      classroomId,
      date,
      req.user.userId,
      req.user.role,
    );
  }

  // «Бүгд хийсэн» / «Буцаах» — зөвхөн өөрчлөх нүд, нөхцөлтэй (onlyIf)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('classrooms/:id/homework-marks/bulk')
  bulk(
    @Param('id') classroomId: string,
    @Body() dto: BulkHomeworkMarksDto,
    @Req() req: AuthedRequest,
  ) {
    return this.homeworkMarks.bulk(
      classroomId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  // Сурагч: өөрийн сүүлийн 14 хоногийн тэмдэглэгээ (танхимын анги)
  @Roles(Role.STUDENT)
  @Get('homework-marks/my')
  mine(@Req() req: AuthedRequest, @Query('year') year?: string) {
    return year
      ? this.homeworkMarks.mineYear(req.user.userId, year)
      : this.homeworkMarks.mine(req.user.userId);
  }

  // Багш/Админ: тухайн сурагчийн гэрийн даалгаврын тэмдэглэгээний бүтэн түүх
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('students/:id/homework-marks')
  byStudent(
    @Param('id') studentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: AuthedRequest,
  ) {
    return this.homeworkMarks.byStudent(
      studentId,
      from,
      to,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch('classrooms/:id/homework-marks/:studentId')
  setMark(
    @Param('id') classroomId: string,
    @Param('studentId') studentId: string,
    @Body() dto: PatchHomeworkMarkDto,
    @Req() req: AuthedRequest,
  ) {
    return this.homeworkMarks.setMark(
      classroomId,
      studentId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }
}
