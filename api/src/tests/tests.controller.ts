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
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseSubjectQuery } from '../common/subject';
import { Role } from '../generated/prisma/enums';
import { CreateTestDto } from './dto/create-test.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { SaveSessionDto, SubmitTestDto } from './dto/submit-test.dto';
import { TestsService } from './tests.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tests')
export class TestsController {
  constructor(private tests: TestsService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateTestDto, @Req() req: AuthedRequest) {
    return this.tests.create(dto, req.user.userId);
  }

  @Get()
  list(@Req() req: AuthedRequest, @Query('subject') subject?: string) {
    return this.tests.list(
      req.user.userId,
      req.user.role,
      parseSubjectQuery(subject),
    );
  }

  @Roles(Role.STUDENT)
  @Get('my-results')
  myResults(@Req() req: AuthedRequest) {
    return this.tests.myResults(req.user.userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.getOne(id, req.user.userId, req.user.role);
  }

  // Шалгалт эхлэх/үргэлжлүүлэх — session үүсгэж бодлогуудыг хөлдсөн дараалалтай буцаана
  // Global throttler одоо userId-аар key хийдэг тул энэ лимит нь
  // СУРАГЧ БҮРД (IP биш) хамаарна — 1 сурагч хуудсаа дахин ачаалах/сүлжээ
  // тасрах зэргээс болж хэдэн удаа дахин дуудахад хангалттай зай үлдээнэ.
  @Roles(Role.STUDENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/start')
  start(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.start(id, req.user.userId);
  }

  // Autosave + анти-чит үйл явдал — HOT PATH. Бодит дээд хурд/сурагч ≈
  // debounce (1/1.2с ≈ 50/мин) + heartbeat (20с тутамд) ≈ 53/мин. 180/мин
  // (userId-аар) нь үүнээс 3+ дахин их тул тогтмол ажиллагаанд огт
  // хүрэхгүй, зөвхөн бодит хэтрүүлэг/чит хийх оролдлогыг барина.
  @Roles(Role.STUDENT)
  @Throttle({ default: { limit: 180, ttl: 60_000 } })
  @Patch(':id/session')
  saveSession(
    @Param('id') id: string,
    @Body() dto: SaveSessionDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tests.saveSession(id, req.user.userId, dto);
  }

  @Roles(Role.STUDENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitTestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tests.submit(id, dto, req.user.userId);
  }

  // Дууссан шалгалтын эргэн харах (өөрийн)
  @Roles(Role.STUDENT)
  @Get(':id/review')
  review(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.review(id, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post(':id/results')
  enterResult(
    @Param('id') id: string,
    @Body() dto: EnterResultDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tests.enterResult(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get(':id/results')
  results(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.results(id, req.user.userId, req.user.role);
  }

  // Тестийг зөөлөн устгах — TestResult/Attempt зэрэг түүхэн бичлэгийг
  // орфон үлдээхгүй.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.remove(id, req.user.userId, req.user.role);
  }
}

// TestsController нь 'tests' prefix-тэй тул /students/:id/test-results
// (attendance/homework-marks-тэй ижил "students/:id/..." хэв маяг) замыг
// тусад нь, prefix-гүй controller-т нэмнэ.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StudentTestResultsController {
  constructor(private tests: TestsService) {}

  // Багш/Админ: тухайн сурагчийн шалгалтын бүх дүн — "Бие даасан явц" таб
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('students/:id/test-results')
  byStudent(@Param('id') studentId: string, @Req() req: AuthedRequest) {
    return this.tests.resultsForStudent(
      studentId,
      req.user.userId,
      req.user.role,
    );
  }
}
