import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  CreateClassCheckDto,
  SetClassCheckMarkDto,
  UpdateClassCheckDto,
} from './class-checks.dto';
import { ClassChecksService } from './class-checks.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * «Чек» (эзэн 2026-10-22) — ангийн нэртэй шалгах жагсаалт: «Номны мөнгө
 * 25,000₮». Бүх багш (ADMIN/TEACHER_PLUS/TEACHER) — өөрийн харах ангидаа
 * (ангийн самбарын эрхтэй ижил).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('classrooms/:classroomId/checks')
export class ClassChecksController {
  constructor(private readonly checks: ClassChecksService) {}

  @Get()
  list(@Req() req: AuthedRequest, @Param('classroomId') classroomId: string) {
    return this.checks.list(classroomId, req.user.userId);
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Body() dto: CreateClassCheckDto,
  ) {
    return this.checks.create(classroomId, dto, req.user.userId);
  }

  /** Нэр/дүн засах, хаах (archived=true), сэргээх (archived=false) */
  @Patch(':checkId')
  update(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Param('checkId') checkId: string,
    @Body() dto: UpdateClassCheckDto,
  ) {
    return this.checks.update(classroomId, checkId, dto, req.user.userId);
  }

  /**
   * Устгах (эзэн 2026-10-23) — зөөлөн: deletedAt/deletedById, мөр DB-д үлдэнэ,
   * бүх жагсаалтаас алга болно. Эрх нь бусад чекийн маршруттай ижил.
   */
  @Delete(':checkId')
  remove(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Param('checkId') checkId: string,
  ) {
    return this.checks.remove(classroomId, checkId, req.user.userId);
  }

  @Put(':checkId/students/:studentId')
  setMark(
    @Req() req: AuthedRequest,
    @Param('classroomId') classroomId: string,
    @Param('checkId') checkId: string,
    @Param('studentId') studentId: string,
    @Body() dto: SetClassCheckMarkDto,
  ) {
    return this.checks.setMark(
      classroomId,
      checkId,
      studentId,
      dto,
      req.user.userId,
    );
  }
}
