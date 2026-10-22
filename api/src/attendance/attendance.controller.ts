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
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { RiskCriteriaDto } from './dto/risk-criteria.dto';

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

  // 🎯 Сурагч тус бүрийн ХОЦРОЛТ/ТАСАЛСАН тоо тухайн хугацаанд — давтан
  // тасалдаг сурагчийг UI дээр өнгөөр ялгахад ашиглана.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/attendance/history')
  history(
    @Param('id') classroomId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.history(
      classroomId,
      from,
      to,
      req.user.userId,
      req.user.role,
    );
  }

  // Багш/Админ: тухайн сурагчийн ирцийн бүтэн түүх (сурагчийн явцын хуудас)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('students/:id/attendance')
  byStudent(
    @Param('id') studentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.byStudent(
      studentId,
      from,
      to,
      req.user.userId,
      req.user.role,
    );
  }

  /* ───────── Ирц ба даалгаврын самбар (эзэн 2026-10-18) ───────── */

  // Тухайн өдөр хичээлтэй, хэрэглэгчийн тэмдэглэж болох ангиуд (ангийн сонголт)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('attendance/board')
  boardClasses(
    @Query('date') date: string,
    @Req() req: AuthedRequest,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.attendance.boardClasses(
      date,
      req.user.userId,
      req.user.role,
      classroomId,
    );
  }

  // Самбарын бүтэн өгөгдөл: хичээл, сурагчид, тэмдэглэгээ, шалгуур, эрсдэл
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('attendance/classrooms/:id/board')
  board(
    @Param('id') classroomId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.board(
      classroomId,
      date,
      req.user.userId,
      req.user.role,
    );
  }

  // 15 сек тутмын шинэчлэл (хоёр багш зэрэг тэмдэглэх үед)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('attendance/classrooms/:id/marks')
  marks(
    @Param('id') classroomId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.marks(
      classroomId,
      date,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('attendance/classrooms/:id/criteria')
  criteria(
    @Param('id') classroomId: string,
    @Req() req: AuthedRequest,
    @Query('date') date?: string,
  ) {
    return this.attendance.getCriteria(
      classroomId,
      req.user.userId,
      req.user.role,
      date,
    );
  }

  // Шалгуур тавих — Багш+ ба Админ л (эзэн 2026-10-17)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('attendance/classrooms/:id/criteria')
  setCriteria(
    @Param('id') classroomId: string,
    @Body() dto: RiskCriteriaDto,
    @Req() req: AuthedRequest,
  ) {
    return this.attendance.setCriteria(
      classroomId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  // Самбарын сурагчийн drawer (нэр дээр дарахад): утас + бүх ирц/даалгавар,
  // `month=YYYY-MM` — сараар гүйлгэх (эзэн 2026-10-22)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('attendance/classrooms/:id/students/:studentId')
  studentCard(
    @Param('id') classroomId: string,
    @Param('studentId') studentId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
    @Query('month') month?: string,
  ) {
    return this.attendance.studentCard(
      classroomId,
      studentId,
      date,
      req.user.userId,
      req.user.role,
      month,
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
