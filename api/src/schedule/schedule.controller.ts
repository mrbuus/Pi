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
import { CreateCalendarDayDto } from './dto/create-calendar-day.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateCalendarDayDto } from './dto/update-calendar-day.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleService } from './schedule.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Хоёр эх сурвалж нэг модульд: хичээлийн хуваарь (/schedule) ба сургалтын
// хуанли (/calendar) — хоёулаа "бодит хичээлтэй өдөр"-ийг тодорхойлоход
// хамтдаа ашиглагддаг тул нэг ScheduleService дотор нягт холбоотой (SPEC).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ScheduleController {
  constructor(private schedule: ScheduleService) {}

  // ---------- /schedule ----------

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule')
  create(@Body() dto: CreateScheduleDto) {
    return this.schedule.create(dto);
  }

  @Get('schedule')
  findAll(@Query('classroomId') classroomId?: string) {
    return this.schedule.findAll(classroomId);
  }

  @Get('schedule/classroom/:id')
  forClassroom(@Param('id') classroomId: string) {
    return this.schedule.forClassroom(classroomId);
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.TEACHER_PLUS)
  @Get('schedule/me')
  forMe(@Req() req: AuthedRequest) {
    return this.schedule.forMe(req.user.userId, req.user.role);
  }

  // 🎯 Хамгийн чухал endpoint — давтагдах хэв маягийг [from, to]-д задалж,
  // амралт/завсарлагыг хассан БОДИТ хичээлтэй өдрүүдийг буцаана.
  @Get('schedule/days')
  days(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('classroomId') classroomId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.schedule.expandDays(from, to, classroomId, teacherId);
  }

  @Get('schedule/:id')
  findOne(@Param('id') id: string) {
    return this.schedule.findOne(id);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('schedule/:id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedule.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('schedule/:id')
  remove(@Param('id') id: string) {
    return this.schedule.remove(id);
  }

  // ---------- /calendar ----------

  @Roles(Role.ADMIN)
  @Post('calendar')
  createCalendarDay(
    @Body() dto: CreateCalendarDayDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.createCalendarDay(dto, req.user.userId);
  }

  @Get('calendar')
  listCalendarDays(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedule.listCalendarDays(from, to);
  }

  @Get('calendar/:id')
  findCalendarDay(@Param('id') id: string) {
    return this.schedule.findCalendarDay(id);
  }

  @Roles(Role.ADMIN)
  @Patch('calendar/:id')
  updateCalendarDay(@Param('id') id: string, @Body() dto: UpdateCalendarDayDto) {
    return this.schedule.updateCalendarDay(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('calendar/:id')
  removeCalendarDay(@Param('id') id: string) {
    return this.schedule.removeCalendarDay(id);
  }
}
