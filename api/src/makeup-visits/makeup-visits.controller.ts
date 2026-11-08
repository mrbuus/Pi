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
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import { CreateMakeupVisitsDto, SetMakeupTestsDto, UpdateMakeupVisitDto } from './makeup-visits.dto';
import { MakeupVisitsService } from './makeup-visits.service';

const STAFF = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] as const;

/**
 * Нөхөлт (эзэн 2026-11-08): өөр ангид суусан, 406 өрөөнд нөхсөн сурагч.
 * Гэрээ: makeup-visits.service.ts (MakeupHistoryItem, VisitView).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MakeupVisitsController {
  constructor(private readonly visits: MakeupVisitsService) {}

  // Нэрээр хайх: овог нэр + анги
  @Roles(...STAFF)
  @Get('makeup-visits/students/search')
  search(@Req() req: RequestWithUser, @Query('q') q?: string) {
    return this.visits.search(req.user, q);
  }

  // 406: ангиар нэмэх — төвийн ангиуд
  @Roles(...STAFF)
  @Get('makeup-visits/classrooms')
  classrooms(@Req() req: RequestWithUser) {
    return this.visits.classrooms(req.user);
  }

  // 406: нэг ангийн сурагчид (овог, нэр, анги л)
  @Roles(...STAFF)
  @Get('makeup-visits/classrooms/:classroomId/students')
  classroomStudents(@Req() req: RequestWithUser, @Param('classroomId') classroomId: string) {
    return this.visits.classroomStudents(req.user, classroomId);
  }

  // 406: тест сонгох — сурагчийн ангийн замын зураг (ямар ч багш, зөвхөн унших)
  @Roles(...STAFF)
  @Get('makeup-visits/roadmap')
  roadmap(@Req() req: RequestWithUser, @Query('classroomId') classroomId?: string, @Query('date') date?: string) {
    return this.visits.roadmap(req.user, classroomId, date);
  }

  // Самбар: тэр өдөр тэр газарт (ангийн id эсвэл «406») нөхсөн сурагчид
  @Roles(...STAFF)
  @Get('makeup-visits')
  list(@Req() req: RequestWithUser, @Query('date') date?: string, @Query('place') place?: string) {
    return this.visits.list(req.user, date, place);
  }

  // Өөрийн ангийн самбар: «12-6 ангид нөхөж суусан» шошго
  @Roles(...STAFF)
  @Get('makeup-visits/home')
  home(@Req() req: RequestWithUser, @Query('classroomId') classroomId: string, @Query('date') date?: string) {
    return this.visits.homeBadges(req.user, classroomId, date);
  }

  @Roles(...STAFF)
  @Post('makeup-visits')
  create(@Req() req: RequestWithUser, @Body() dto: CreateMakeupVisitsDto) {
    return this.visits.create(req.user, dto);
  }

  // 406: нэг/олон сурагчид ижил тест, сэдэв
  @Roles(...STAFF)
  @Put('makeup-visits/tests')
  setTests(@Req() req: RequestWithUser, @Body() dto: SetMakeupTestsDto) {
    return this.visits.setTests(req.user, dto);
  }

  @Roles(...STAFF)
  @Patch('makeup-visits/:id')
  update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateMakeupVisitDto) {
    return this.visits.update(req.user, id, dto);
  }

  // Зөөлөн устгал (түүх үлдэнэ)
  @Roles(...STAFF)
  @Delete('makeup-visits/:id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.visits.remove(req.user, id);
  }

  // Сурагчийн нөхөлтийн түүх — ажилтан бүгдийг, сурагч өөрийнхийг
  @Roles(...STAFF, Role.STUDENT)
  @Get('students/:id/makeup-visits')
  history(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.visits.studentHistory(req.user, id, from, to);
  }
}
