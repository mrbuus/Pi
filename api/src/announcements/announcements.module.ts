import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { NotificationCenterModule } from '../notification-center/notification-center.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [PrismaModule, NotificationCenterModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AuditService],
})
export class AnnouncementsModule {}
