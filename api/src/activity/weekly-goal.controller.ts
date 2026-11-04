import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { WeeklyGoalDto } from './weekly-goal.dto';
import { WeeklyGoalService } from './weekly-goal.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/** Бие даан суралцах 7 хоногийн зорилго — зөвхөн сурагч өөрийнхөө (userId токеноос). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('study')
export class WeeklyGoalController {
  constructor(private readonly goals: WeeklyGoalService) {}

  @Get('weekly-goal')
  @Roles(Role.STUDENT)
  get(@Req() req: AuthedRequest) {
    return this.goals.get(req.user.userId);
  }

  @Put('weekly-goal')
  @Roles(Role.STUDENT)
  set(@Req() req: AuthedRequest, @Body() dto: WeeklyGoalDto) {
    return this.goals.set(req.user.userId, dto.daysPerWeek);
  }
}
