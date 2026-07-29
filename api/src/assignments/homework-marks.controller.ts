import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { SetHomeworkMarkDto } from './dto/set-homework-mark.dto';
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

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch('classrooms/:id/homework-marks/:studentId')
  setMark(
    @Param('id') classroomId: string,
    @Param('studentId') studentId: string,
    @Body() dto: SetHomeworkMarkDto,
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
