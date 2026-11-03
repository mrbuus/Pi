import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { RetryMistakeDto } from './dto/mistake.dto';
import { ProblemReviewService } from './problem-review.service';

interface RequestWithUser {
  user: { userId: string; role: Role };
}

/** Алдсан бодлогын хугацаатай давталт — зөвхөн сурагч өөрийнхөө (userId токеноос). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('review/problems')
export class ProblemReviewController {
  constructor(private readonly reviews: ProblemReviewService) {}

  @Get('due')
  @Roles(Role.STUDENT)
  due(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    return this.reviews.due(req.user.userId, limit);
  }

  @Post(':id/answer')
  @Roles(Role.STUDENT)
  answer(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: RetryMistakeDto) {
    return this.reviews.answer(req.user.userId, id, dto.answer);
  }
}
