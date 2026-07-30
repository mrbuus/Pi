import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';

// Global — SMS илгээх хэрэгцээ auth, users зэрэг олон модульд гарах тул
// модуль бүрт дахин импортлохгүйгээр шууд тарааж өгнө.
@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class NotificationsModule {}
