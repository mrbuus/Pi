import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { WorkSheetService } from './work-sheet.service';

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])-[12]$/;
const PERIOD_MSG = 'Үе «YYYY-MM-1» эсвэл «YYYY-MM-2» хэлбэртэй байна';

class PeriodQueryDto {
  @IsOptional() @Matches(PERIOD, { message: PERIOD_MSG }) period?: string;
}
class CellDto {
  @IsString() @Length(1, 150) teacherId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огноо буруу байна' }) date!: string;
  /** «7,5» / «7.5» / «» — сервер уншина (work-sheet.logic parseHoursInput) */
  @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(12) value!: string | null;
}
class AccountDto {
  @IsString() @MaxLength(60) bankName!: string;
  @IsString() @MaxLength(40) accountNumber!: string;
  @IsString() @MaxLength(80) holderName!: string;
}
class RateDto {
  @IsString() @Length(1, 150) teacherId!: string;
  @Matches(PERIOD, { message: PERIOD_MSG }) period!: string;
  @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(1_000_000) ratePerHour!: number | null;
}
interface ActorRequest {
  user: { userId: string; role: string };
}

/**
 * Багшийн ажилласан цагийн хүснэгт (эзэн 2026-11-08). Хуучин
 * «Хуваарийн тооцоолсон цаг» (GET /teacher-hours, /teacher-hours/me) хэвээр.
 *
 * - Хүснэгт, данс: бүх ажилтан харна.
 * - Нүд бөглөх: teacher-hours.edit эрх (Админ үүргээр).
 * - Данс засах: өөрийнхөө — хүн бүр; бусдынх — teacher-hours.edit.
 * - Цагийн хөлс: ЗӨВХӨН pay-rate-owner.ts-д заасан хүн (бусдад 403).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('teacher-hours')
export class WorkSheetController {
  constructor(private readonly sheet: WorkSheetService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('sheet')
  getSheet(@Query() q: PeriodQueryDto, @Req() req: ActorRequest) {
    return this.sheet.sheet(req.user, q.period);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Put('sheet/cell')
  setCell(@Body() body: CellDto, @Req() req: ActorRequest) {
    return this.sheet.setCell(req.user, body);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('accounts/:teacherId')
  getAccount(@Param('teacherId') teacherId: string, @Req() req: ActorRequest) {
    return this.sheet.getAccount(req.user, teacherId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Put('accounts/:teacherId')
  setAccount(@Param('teacherId') teacherId: string, @Body() body: AccountDto, @Req() req: ActorRequest) {
    return this.sheet.setAccount(req.user, teacherId, body);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('pay')
  getPay(@Query() q: PeriodQueryDto, @Req() req: ActorRequest) {
    return this.sheet.pay(req.user, q.period);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Put('pay/rate')
  setRate(@Body() body: RateDto, @Req() req: ActorRequest) {
    return this.sheet.setRate(req.user, body);
  }
}
