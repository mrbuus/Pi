import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsManagementService } from './sms-management.service';
import { SmsController } from './sms.controller';
import { EmailService } from './email.service';
import { EmailOtpService } from './email-otp.service';

// Global — SMS болон имэйл илгээх хэрэгцээ auth, users зэрэг олон модульд
// гарах тул модуль бүрт дахин импортлохгүйгээр шууд тарааж өгнө.
@Global()
@Module({
  controllers: [SmsController],
  providers: [SmsService, SmsManagementService, EmailService, EmailOtpService],
  exports: [SmsService, SmsManagementService, EmailService, EmailOtpService],
})
export class NotificationsModule {}
