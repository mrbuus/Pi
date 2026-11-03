import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { RecordUsageDto } from './dto/record-usage.dto';
import { UsageService } from './usage.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usage')
export class UsageController {
  constructor(private usage: UsageService) {}

  // Нэвтэрсэн бүх хүн бичнэ (өөрийнхөө үйлдлийг л). Клиент 20 секундэд нэг удаа багцалдаг.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post()
  record(@Body() dto: RecordUsageDto, @Req() req: AuthedRequest) {
    return this.usage.record(req.user.userId, req.user.role, dto);
  }

  @Roles(Role.ADMIN)
  @Get('summary')
  summary(@Query('days') days?: string) {
    return this.usage.summary(days);
  }
}
