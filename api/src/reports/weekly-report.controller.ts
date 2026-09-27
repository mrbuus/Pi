import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { WeeklyReportQueryDto } from './dto/weekly-report.dto';
import { WeeklyReportService } from './weekly-report.service';

@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WeeklyReportController {
  constructor(private readonly reports: WeeklyReportService) {}

  @Get('weekly-report')
  @Roles(Role.PARENT, Role.ADMIN)
  get(@Query() query: WeeklyReportQueryDto, @Req() req: { user: { userId: string; role: Role } }) {
    return this.reports.get(query.studentId, query.week, req.user);
  }
}
