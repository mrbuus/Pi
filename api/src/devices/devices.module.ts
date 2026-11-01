import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { FcmPushSender, PUSH_SENDER } from './push-sender';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, { provide: PUSH_SENDER, useClass: FcmPushSender }],
  // Мэдэгдлийн модулиуд DevicesService.sendToUsers-ийг импортолж дуудна (STATUS §8.1б).
  exports: [DevicesService, PUSH_SENDER],
})
export class DevicesModule {}
