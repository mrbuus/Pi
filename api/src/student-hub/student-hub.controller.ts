import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import { StudentHubService } from './student-hub.service';

/**
 * Танхимын сурагчийн V2 самбар — зөвхөн STUDENT, зөвхөн өөрийн мэдээлэл.
 * Гэрээ: docs/v2/SURAGCH-V2-GEREE.md «API».
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('student-hub')
export class StudentHubController {
  constructor(private readonly hub: StudentHubService) {}

  @Get('overview')
  overview(@Req() req: RequestWithUser) {
    return this.hub.overview(req.user.userId);
  }

  @Get('days')
  days(@Req() req: RequestWithUser, @Query('month') month?: string) {
    return this.hub.days(
      req.user.userId,
      typeof month === 'string' ? month : undefined,
    );
  }

  @Get('tests')
  tests(@Req() req: RequestWithUser, @Query('q') q?: string) {
    return this.hub.tests(
      req.user.userId,
      typeof q === 'string' ? q : undefined,
    );
  }

  @Get('tests/:testId')
  testDetail(@Req() req: RequestWithUser, @Param('testId') testId: string) {
    return this.hub.testDetail(req.user.userId, testId);
  }

  @Get('theory')
  theory(
    @Req() req: RequestWithUser,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
    return this.hub.theory(req.user.userId, str(q), str(from), str(to));
  }
}
