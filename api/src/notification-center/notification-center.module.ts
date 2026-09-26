import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterService } from './notification-center.service';

@Module({
  imports: [NotificationsModule],
  controllers: [NotificationCenterController],
  providers: [NotificationCenterService],
  exports: [NotificationCenterService],
})
export class NotificationCenterModule {}
