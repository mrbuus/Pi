import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { RankingService } from './ranking.service';
@Controller('test-rankings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RankingController {
  constructor(private readonly rankings: RankingService) {}
  @Get(':id')
  @Roles(Role.STUDENT, Role.BUYER)
  own(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.rankings.ownRanking(id, req.user.userId);
  }
}
