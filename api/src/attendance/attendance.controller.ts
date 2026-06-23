import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('classrooms/:id/attendance')
  mark(
    @Param('id') classroomId: string,
    @Body() dto: MarkAttendanceDto,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.mark(
      classroomId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/attendance')
  byClassAndDate(
    @Param('id') classroomId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.byClassAndDate(
      classroomId,
      date,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.STUDENT)
  @Get('attendance/my')
  my(
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendance.myAttendance(req.user.userId, from, to);
  }
}
