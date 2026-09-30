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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ReviewDueQueryDto, SubmitReviewDto } from './formula-review.dto';
import { FormulaReviewService } from './formula-review.service';

@ApiTags('formula-review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.TEACHER_PLUS,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
  Role.BUYER,
)
@Controller('formulas/review')
export class FormulaReviewController {
  constructor(private readonly review: FormulaReviewService) {}
  @Get('due')
  due(
    @Req() req: { user: { userId: string } },
    @Query() query: ReviewDueQueryDto,
  ) {
    return this.review.due(req.user.userId, query.limit);
  }
  @Get('stats')
  stats(@Req() req: { user: { userId: string } }) {
    return this.review.stats(req.user.userId);
  }
  @Post(':slug')
  submit(
    @Req() req: { user: { userId: string } },
    @Param('slug') slug: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.review.submit(req.user.userId, slug, dto);
  }
}
