import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CalendarIcsService } from './calendar-ics.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

const CALENDAR_ROLES = [Role.STUDENT, Role.TEACHER, Role.TEACHER_PLUS] as const;

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedule/me')
export class CalendarIcsAuthController {
  constructor(private readonly calendars: CalendarIcsService) {}

  @Roles(...CALENDAR_ROLES)
  @Post('calendar-token')
  issueOrResetToken(@Req() req: AuthedRequest) {
    return this.calendars.issueToken(req.user.userId);
  }

  /** Authenticated fallback for a one-time .ics file download. */
  @Roles(...CALENDAR_ROLES)
  @Get('ics')
  exportForMe(
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendars.exportForUser(
      req.user.userId,
      req.user.role,
      from,
      to,
    );
  }
}
