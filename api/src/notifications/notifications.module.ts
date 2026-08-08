import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsManagementService } from './sms-management.service';
import { SmsController } from './sms.controller';

// Global — SMS илгээх хэрэгцээ auth, users зэрэг олон модульд гарах тул
// модуль бүрт дахин импортлохгүйгээр шууд тарааж өгнө.
@Global()
@Module({
  controllers: [SmsController],
  providers: [SmsService, SmsManagementService],
  exports: [SmsService, SmsManagementService],
})
export class NotificationsModule {}
