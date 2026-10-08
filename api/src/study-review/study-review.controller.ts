import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { StudyReviewService } from './study-review.service';
interface Request {
  user: { userId: string; role: Role };
}
@Controller('study-review')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.BUYER)
export class StudyReviewController {
  constructor(private readonly service: StudyReviewService) {}
  @Get('options') options(@Req() req: Request) {
    return this.service.options(req.user.userId, req.user.role);
  }
  @Post() create(
    @Req() req: Request,
    @Body() body: Parameters<StudyReviewService['create']>[2],
  ) {
    return this.service.create(req.user.userId, req.user.role, body);
  }
  @Get('history') history(
    @Req() req: Request,
    @Query() query: { year?: string; take?: string; cursor?: string },
  ) {
    return this.service.history(req.user.userId, req.user.role, query);
  }
  @Roles(Role.PARENT)
  @Get('children/:childId/history')
  childHistory(
    @Req() req: Request,
    @Param('childId') childId: string,
    @Query() query: { year?: string; take?: string; cursor?: string },
  ) {
    return this.service.childHistory(
      req.user.userId,
      childId,
      req.user.role,
      query,
    );
  }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) {
    return this.service.get(req.user.userId, req.user.role, id);
  }
  @Post(':id/submit') submit(@Req() req: Request, @Param('id') id: string) {
    return this.service.submit(req.user.userId, req.user.role, id);
  }
  @Post(':id/items/:itemId/response') response(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: Parameters<StudyReviewService['response']>[4],
  ) {
    return this.service.response(
      req.user.userId,
      req.user.role,
      id,
      itemId,
      body,
    );
  }
}
