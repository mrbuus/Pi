import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { TeacherHoursQueryDto } from './dto/teacher-hours-query.dto';
import { TeacherHoursService } from './teacher-hours.service';

/** Багшийн ажилласан цаг (хуваариас). Цалингийн тооцоонд. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher-hours')
export class TeacherHoursController {
  constructor(private hours: TeacherHoursService) {}

  /** Бүх багшийн цаг — удирдлагад. */
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get()
  all(@Query() q: TeacherHoursQueryDto) {
    return this.hours.forMonth(q.month);
  }

  /** Багш өөрийн цагийг л харна. */
  @Roles(Role.TEACHER, Role.TEACHER_PLUS)
  @Get('me')
  mine(@Query() q: TeacherHoursQueryDto, @Req() req: { user: { userId: string } }) {
    return this.hours.forMonth(q.month, req.user.userId);
  }
}
