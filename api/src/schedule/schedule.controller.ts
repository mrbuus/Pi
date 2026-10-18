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
import { SplitSeriesDto } from './dto/split-series.dto';
import { TeacherWorkDayExceptionDto } from './dto/teacher-workday-exception.dto';
import { PutRosterConfigDto } from './dto/put-roster-config.dto';
import { UpdateCalendarDayDto } from './dto/update-calendar-day.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpsertExceptionDto } from './dto/upsert-exception.dto';
import { UpsertTopicDto } from './dto/upsert-topic.dto';
import { SetStaffingDto } from './dto/set-staffing.dto';
import { ScheduleAccessService } from './schedule-access.service';
import { ScheduleService } from './schedule.service';
import { LessonPlanService } from './lesson-plan.service';
import { PutLessonPlanDto } from './dto/lesson-plan.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Хоёр эх сурвалж нэг модульд: хичээлийн хуваарь (/schedule) ба сургалтын
// хуанли (/calendar) — хоёулаа "бодит хичээлтэй өдөр"-ийг тодорхойлоход
// хамтдаа ашиглагддаг тул нэг ScheduleService дотор нягт холбоотой (SPEC).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ScheduleController {
  constructor(
    private schedule: ScheduleService,
    private access: ScheduleAccessService,
    private plans: LessonPlanService,
  ) {}

  // ---------- /schedule ----------

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule')
  async create(@Body() dto: CreateScheduleDto, @Req() req: AuthedRequest) {
    await this.access.manage(req.user, dto.classroomId);
    return this.schedule.create(dto);
  }

  @Get('schedule')
  async findAll(
    @Req() req: AuthedRequest,
    @Query('classroomId') classroomId?: string,
  ) {
    if (classroomId) await this.access.readClassroom(req.user, classroomId);
    return this.schedule.findAll(
      classroomId,
      await this.access.readableClassrooms(req.user),
    );
  }

  @Get('schedule/classroom/:id')
  async forClassroom(
    @Param('id') classroomId: string,
    @Req() req: AuthedRequest,
  ) {
    await this.access.readClassroom(req.user, classroomId);
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
  async week(@Query('start') start: string, @Req() req: AuthedRequest) {
    return this.schedule.getWeek(
      start,
      await this.access.readableClassrooms(req.user),
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/bulk')
  async bulkCreate(
    @Body() dto: BulkCreateScheduleDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.manage(req.user, dto.classroomId);
    return this.schedule.bulkCreate(dto);
  }

  // "Энэ ба цаашдын бүх хичээл" — заасан огнооноос эхлэн цаг/өдөр/танхим/багш
  // өөрчилнө. Өнгөрсөн түүх хэвээр үлдэнэ (цувралыг хоёр хуваана).
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/:id/split')
  async splitSeries(
    @Param('id') id: string,
    @Body() dto: SplitSeriesDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.manageSchedule(req.user, id);
    return this.schedule.splitSeries(id, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/:id/exceptions')
  async upsertException(
    @Param('id') id: string,
    @Body() dto: UpsertExceptionDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.manageSchedule(req.user, id);
    return this.schedule.upsertException(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('schedule/:id/exceptions/:exceptionId')
  async removeException(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @Req() req: AuthedRequest,
  ) {
    await this.access.manageSchedule(req.user, id);
    return this.schedule.removeException(
      id,
      exceptionId,
      req.user.userId,
      req.user.role,
    );
  }

  // Сэдэв/төлөвлөгөө бичих — Багш+, Админ л (эзэн 2026-10-18)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('schedule/:id/topic')
  async upsertTopic(
    @Param('id') id: string,
    @Body() dto: UpsertTopicDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.topic(req.user, id);
    return this.schedule.upsertTopic(id, dto, req.user.userId, req.user.role);
  }

  // Өдрийн хуваарь нийтлэх — тэр өдөр хичээлтэй багш, сурагчдад мэдэгдэл (эзэн 2026-10-11)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/day/:date/publish')
  publishDay(@Param('date') date: string, @Req() req: AuthedRequest) {
    return this.schedule.publishDay(date, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('schedule/day/:date/publication')
  publication(@Param('date') date: string) {
    return this.schedule.getPublication(date);
  }

  // Өдрийн ахлах/туслах багш оноох — Багш+ үүргээрээ (эзэн 2026-10-08)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('schedule/:id/staffing')
  setStaffing(
    @Param('id') id: string,
    @Body() dto: SetStaffingDto,
    @Req() req: AuthedRequest,
  ) {
    return this.schedule.setStaffing(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('schedule/:id/topic')
  async clearTopic(
    @Param('id') id: string,
    @Body() dto: ClearTopicDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.topic(req.user, id);
    return this.schedule.clearTopic(id, dto, req.user.userId, req.user.role);
  }

  // Хуваарь зохиох маягтад ХЭРЭГТЭЙ БАГА хэмжээний багшийн жагсаалт.
  // /users/teachers нь зөвхөн ADMIN-д нээлттэй бөгөөд утас, эрх, харьяа
  // ангиудыг буцаадаг тул TEACHER_PLUS-д түүнийг нээх нь хамт ажиллагсдын
  // утасны дугаарыг шаардлагагүйгээр ил гаргана. Тиймээс энд зөвхөн
  // id/нэр буцаах тусдаа маршрут үүсгэв.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('schedule/teachers')
  // Багш+ өдрийн хичээлд багш оноодог тул (эзэн 2026-10-08) schedule.manage
  // шаардахгүй — зөвхөн id/нэр буцаана, @Roles нь ADMIN/TEACHER_PLUS.
  listTeacherOptions() {
    return this.schedule.listTeacherOptions();
  }

  @Get('schedule/teacher-workdays')
  async listTeacherWorkDays(
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.access.roster(req.user);
    return this.schedule.listTeacherWorkDays(from, to);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('schedule/teacher-workdays')
  async putTeacherWorkDays(
    @Body() dto: PutTeacherWorkDaysDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.roster(req.user);
    return this.schedule.putTeacherWorkDays(
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  // Хүснэгтийн горим (Тогтмол / Сондгой-Тэгш) ба хүчинтэй хугацаа
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('schedule/teacher-workdays/config')
  async putRosterConfig(
    @Body() dto: PutRosterConfigDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.roster(req.user);
    return this.schedule.putRosterConfig(dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('schedule/teacher-workdays/exception')
  async upsertTeacherWorkException(
    @Body() dto: TeacherWorkDayExceptionDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.roster(req.user);
    return this.schedule.upsertTeacherWorkException(
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  // 🎯 Хамгийн чухал endpoint — давтагдах хэв маягийг [from, to]-д задалж,
  // амралт/завсарлагыг хассан БОДИТ хичээлтэй өдрүүдийг буцаана.
  @Get('schedule/days')
  async days(
    @Req() req: AuthedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('classroomId') classroomId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    if (classroomId) await this.access.readClassroom(req.user, classroomId);
    return this.schedule.expandDays(
      from,
      to,
      classroomId,
      teacherId,
      await this.access.readableClassrooms(req.user),
    );
  }

  // Өдрийн хуваарийн мөр бүрийн төлөвлөгөө, өмнөх/хийсэн тест, тэмдэглэл,
  // батламж — нэг дуудлагаар (эзэн 2026-10-18). Зөвхөн ажилтан.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('schedule/day-plan')
  dayPlan(@Query('date') date: string, @Req() req: AuthedRequest) {
    return this.plans.dayPlan(req.user, date);
  }

  // Батлахад нэмсэн тестийн бодлогын дараалал (хассан дугаар тэмдэглэхэд)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('schedule/plan-tests')
  planTests(@Query('ids') ids: string, @Req() req: AuthedRequest) {
    return this.plans.planTests(req.user, ids);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('schedule/:id/plan')
  async getPlan(
    @Param('id') id: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    await this.access.topic(req.user, id);
    return this.plans.getPlan(req.user, id, date);
  }

  // Хичээлийн төлөвлөгөө: тестүүд (номын дарааллаар), тарах/үлдэх, онолын зураг
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('schedule/:id/plan')
  async putPlan(
    @Param('id') id: string,
    @Body() dto: PutLessonPlanDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.topic(req.user, id);
    return this.plans.putPlan(req.user, id, dto);
  }

  @Get('schedule/:id')
  async findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.access.readSchedule(req.user, id);
    return this.schedule.findOne(id);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('schedule/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.manageSchedule(req.user, id, dto.classroomId);
    return this.schedule.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('schedule/:id')
  async remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.access.manageSchedule(req.user, id);
    return this.schedule.remove(id);
  }

  // ---------- /calendar ----------

  // Онцгой өдөр (амралт/шалгалт) бүртгэх нь хуваарь зохиох эрхтэй хүний
  // (ADMIN, TEACHER_PLUS + schedule.manage) өдөр тутмын ажил.
  private async manageCalendar(actor: AuthedRequest['user'], classroomIds: string[]) {
    if (classroomIds.length === 0) {
      await this.access.manage(actor);
      return;
    }
    for (const id of classroomIds) await this.access.manage(actor, id);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('calendar')
  async createCalendarDay(
    @Body() dto: CreateCalendarDayDto,
    @Req() req: AuthedRequest,
  ) {
    await this.manageCalendar(req.user, dto.classroomIds ?? []);
    return this.schedule.createCalendarDay(dto, req.user.userId);
  }

  @Get('calendar')
  listCalendarDays(@Query('from') from?: string, @Query('to') to?: string) {
    return this.schedule.listCalendarDays(from, to);
  }

  @Get('calendar/:id')
  findCalendarDay(@Param('id') id: string) {
    return this.schedule.findCalendarDay(id);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('calendar/:id')
  async updateCalendarDay(
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDayDto,
    @Req() req: AuthedRequest,
  ) {
    const existing = await this.schedule.findCalendarDay(id);
    await this.manageCalendar(req.user, existing.classroomIds);
    if (dto.classroomIds) await this.manageCalendar(req.user, dto.classroomIds);
    return this.schedule.updateCalendarDay(id, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('calendar/:id')
  async removeCalendarDay(@Param('id') id: string, @Req() req: AuthedRequest) {
    const existing = await this.schedule.findCalendarDay(id);
    await this.manageCalendar(req.user, existing.classroomIds);
    return this.schedule.removeCalendarDay(id);
  }
}
