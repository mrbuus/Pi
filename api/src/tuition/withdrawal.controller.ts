import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FinanceCapabilityGuard } from '../payments/finance-capability.guard';
import { Role } from '../generated/prisma/enums';
import { WithdrawalService } from './withdrawal.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class WithdrawStudentDto {
  @IsString()
  studentId!: string;

  @Matches(DATE)
  leftOn!: string;

  @IsOptional()
  @Matches(DATE)
  countFrom?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @Matches(DATE, { each: true })
  exclude?: string[];

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/** Сургалтаас хасах үеийн төлбөрийн тооцоо — Багш+, Админ, санхүүгийн эрх (буцаалттай ижил) */
@Controller('tuition/withdrawal')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
export class WithdrawalController {
  constructor(private readonly withdrawal: WithdrawalService) {}

  @Get('preview')
  preview(
    @Query('studentId') studentId: string,
    @Query('leftOn') leftOn: string,
    @Query('countFrom') countFrom?: string,
    @Query('exclude') exclude?: string,
  ) {
    return this.withdrawal.preview(studentId, {
      leftOn,
      countFrom: countFrom || null,
      exclude: exclude ? exclude.split(',') : [],
    });
  }

  @Post()
  withdraw(@Body() dto: WithdrawStudentDto, @Req() req: AuthedRequest) {
    return this.withdrawal.withdraw(dto.studentId, dto, req.user);
  }

  @Get('student/:id')
  list(@Param('id') id: string) {
    return this.withdrawal.list(id);
  }
}
