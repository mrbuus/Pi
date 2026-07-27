import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EnrollmentWindowsController } from './enrollment-windows.controller';
import { EnrollmentWindowsService } from './enrollment-windows.service';

@Module({
  imports: [AuditModule],
  controllers: [EnrollmentWindowsController],
  providers: [EnrollmentWindowsService],
  // Leads модуль нь тухайн хичээлийн статус OPEN эсэхийг энэ сервисээр
  // шалгах тул export хийнэ (сервер талын жинхэнэ хаалт — Шийдвэр CLAUDE.md).
  exports: [EnrollmentWindowsService],
})
export class EnrollmentWindowsModule {}
