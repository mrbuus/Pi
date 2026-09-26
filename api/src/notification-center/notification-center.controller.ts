import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { NotificationCenterService } from './notification-center.service';

interface AuthedRequest {
  user: { userId: string };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.TEACHER_PLUS,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
  Role.BUYER,
)
@Controller('notifications')
export class NotificationCenterController {
  constructor(private readonly notifications: NotificationCenterService) {}

  @Get('my')
  mine(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.listMine(req.user.userId, cursor, limit);
  }

  @Get(['my/unread-count', 'unread-count'])
  unreadCount(@Req() req: AuthedRequest) {
    return this.notifications.unreadCount(req.user.userId);
  }

  @Post('read-all')
  markAllRead(@Req() req: AuthedRequest) {
    return this.notifications.markAllRead(req.user.userId);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notifications.markRead(req.user.userId, id);
  }
}
