import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { ClearTopicDto } from './dto/clear-topic.dto';
import { CreateCalendarDayDto } from './dto/create-calendar-day.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { PutTeacherWorkDaysDto } from './dto/put-teacher-workdays.dto';
import { TeacherWorkDayExceptionDto } from './dto/teacher-workday-exception.dto';
import { UpdateCalendarDayDto } from './dto/update-calendar-day.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpsertExceptionDto } from './dto/upsert-exception.dto';
import { UpsertTopicDto } from './dto/upsert-topic.dto';
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

  // 🎯 ХАМГИЙН ЧУХАЛ endpoint — тухайн 7 хоногийг НЭГ дуудлагаар бүрэн
  // шийдвэрлэж (cancel/move-той, сэдэвтэй, багшийн ростертой) буцаана.
  @Get('schedule/week')
  week(@Query('start') start: string) {
    return this.schedule.getWeek(start);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/bulk')
  bulkCreate(@Body() dto: BulkCreateScheduleDto) {
    return this.schedule.bulkCreate(dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/:id/exceptions')
  upsertException(
    @Param('id') id: string,
    @Body() dto: UpsertExceptionDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.upsertException(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('schedule/:id/exceptions/:exceptionId')
  removeException(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.removeException(
      id,
      exceptionId,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch('schedule/:id/topic')
  upsertTopic(
    @Param('id') id: string,
    @Body() dto: UpsertTopicDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.upsertTopic(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Delete('schedule/:id/topic')
  clearTopic(
    @Param('id') id: string,
    @Body() dto: ClearTopicDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.clearTopic(id, dto, req.user.userId, req.user.role);
  }

  // Хуваарь зохиох маягтад ХЭРЭГТЭЙ БАГА хэмжээний багшийн жагсаалт.
  // /users/teachers нь зөвхөн ADMIN-д нээлттэй бөгөөд утас, эрх, харьяа
  // ангиудыг буцаадаг тул TEACHER_PLUS-д түүнийг нээх нь хамт ажиллагсдын
  // утасны дугаарыг шаардлагагүйгээр ил гаргана. Тиймээс энд зөвхөн
  // id/нэр буцаах тусдаа маршрут үүсгэв.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('schedule/teachers')
  listTeacherOptions() {
    return this.schedule.listTeacherOptions();
  }

  @Get('schedule/teacher-workdays')
  listTeacherWorkDays(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedule.listTeacherWorkDays(from, to);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('schedule/teacher-workdays')
  putTeacherWorkDays(
    @Body() dto: PutTeacherWorkDaysDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.putTeacherWorkDays(dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/teacher-workdays/exception')
  upsertTeacherWorkException(
    @Body() dto: TeacherWorkDayExceptionDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.upsertTeacherWorkException(
      dto,
      req.user.userId,
      req.user.role,
    );
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
