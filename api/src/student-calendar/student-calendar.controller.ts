import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import { StudentCalendarService } from './student-calendar.service';

/**
 * Сурагчийн бүтэн хуудас (эзэн 2026-11-08): «Хичээлийн түүх» хуанли ба «Сэдэв хөтөлбөр».
 * Зөвхөн ажилтан (Багш — өөрийн ангийн сурагч). Сурагч/эцэг эхэд одоохондоо нээгээгүй.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StudentCalendarController {
  constructor(private calendar: StudentCalendarService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('students/:id/lesson-days')
  lessonDays(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendar.lessonDays(req.user, id, from, to);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('students/:id/syllabus')
  syllabus(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.calendar.syllabus(req.user, id);
  }
}
