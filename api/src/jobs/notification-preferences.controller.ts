import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';

@Controller('notifications/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationPreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER)
  async get(@Req() req: { user: { userId: string } }) {
    const setting = await this.prisma.notificationPreference.findUnique({ where: { userId: req.user.userId } });
    return setting ?? { userId: req.user.userId, emailWeekly: true, emailReminders: true };
  }

  @Patch()
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER)
  async update(@Req() req: { user: { userId: string } }, @Body() dto: NotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({ where: { userId: req.user.userId }, create: { userId: req.user.userId, ...dto }, update: dto });
  }
}
