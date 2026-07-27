import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ActivityService } from './activity.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

function resolveYear(year?: string): number {
  const parsed = year ? parseInt(year, 10) : NaN;
  const current = new Date().getUTCFullYear();
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > current + 1) {
    return current;
  }
  return parsed;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity')
export class ActivityController {
  constructor(private activity: ActivityService) {}

  @Roles(Role.STUDENT)
  @Get('me')
  me(@Req() req: AuthedRequest, @Query('year') year?: string) {
    return this.activity.myYearActivity(req.user.userId, resolveYear(year));
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('student/:id')
  student(
    @Param('id') studentId: string,
    @Req() req: AuthedRequest,
    @Query('year') year?: string,
  ) {
    return this.activity.studentYearActivity(
      studentId,
      resolveYear(year),
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.STUDENT)
  @Get('streak')
  streak(@Req() req: AuthedRequest) {
    return this.activity.streak(req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classroom/:id')
  classroom(
    @Param('id') classroomId: string,
    @Req() req: AuthedRequest,
    @Query('year') year?: string,
  ) {
    return this.activity.classroomYearActivity(
      classroomId,
      resolveYear(year),
      req.user.userId,
      req.user.role,
    );
  }
}
