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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { AttemptsService } from './attempts.service';
import { EveningReportDto } from './dto/evening-report.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AttemptsController {
  constructor(private attempts: AttemptsService) {}

  @Roles(Role.STUDENT)
  @Post('attempts/evening')
  evening(@Body() dto: EveningReportDto, @Req() req: AuthedRequest) {
    return this.attempts.eveningReport(dto, req.user.userId);
  }

  @Roles(Role.STUDENT)
  @Get('attempts/my')
  my(
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attempts.myAttempts(req.user.userId, from, to);
  }

  @Roles(Role.STUDENT)
  @Get('attempts/my-stats')
  myStats(@Req() req: AuthedRequest) {
    return this.attempts.myStats(req.user.userId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/run-daily-summary')
  runSummary(@Query('date') date?: string) {
    return this.attempts.buildDailySummary(
      date ? new Date(date) : new Date(new Date().toISOString().slice(0, 10)),
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/daily-summary')
  dailySummary(
    @Param('id') classroomId: string,
    @Query('date') date: string,
    @Req() req: AuthedRequest,
  ) {
    return this.attempts.getDailySummary(
      classroomId,
      date,
      req.user.userId,
      req.user.role,
    );
  }
}
