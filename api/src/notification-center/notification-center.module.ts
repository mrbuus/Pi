import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterService } from './notification-center.service';

@Module({
  imports: [NotificationsModule, DevicesModule],
  controllers: [NotificationCenterController],
  providers: [NotificationCenterService],
  exports: [NotificationCenterService],
})
export class NotificationCenterModule {}
