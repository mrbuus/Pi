import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import type { RequestWithUser } from '../auth/request.interface';
import { CreateFeedbackDto, TriageFeedbackDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';
@Controller('feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}
  @Post() create(@Req() req: RequestWithUser, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(req.user.userId, dto);
  }
  @Get() list(@Req() req: RequestWithUser, @Query('cursor') cursor?: string) {
    return this.feedback.list(req.user.userId, cursor);
  }
  @Get('admin') @Roles(Role.ADMIN) all(
    @Req() req: RequestWithUser,
    @Query('cursor') cursor?: string,
  ) {
    return this.feedback.listAll(req.user.role, cursor);
  }
  @Get(':id') detail(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.feedback.detail(id, req.user.userId, req.user.role);
  }
  @Patch(':id') @Roles(Role.ADMIN) triage(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: TriageFeedbackDto,
  ) {
    return this.feedback.triage(id, req.user.userId, req.user.role, dto);
  }
}
