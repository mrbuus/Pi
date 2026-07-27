import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { AnalyticsService } from './analytics.service';

// Аналитикийн самбар зөвхөн ADMIN/TEACHER_PLUS-д зориулагдсан (SPEC-ийн S1
// шат) — TEACHER бие даасан ангийнхаа идэвхийг activity/ модулиар харна.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.overview(from, to);
  }

  @Get('engagement')
  engagement(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.engagement(from, to);
  }

  @Get('classrooms')
  classrooms(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.classroomBreakdown(from, to);
  }

  @Get('topics')
  topics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.topicBreakdown(from, to);
  }

  @Get('at-risk')
  atRisk(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : undefined;
    return this.analytics.atRisk(Number.isFinite(parsed) ? parsed : undefined);
  }
}
