import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { NotificationCenterModule } from '../notification-center/notification-center.module';
import { ScheduleService } from '../schedule/schedule.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  // G39-өөс хойш ScheduleService нь NotificationCenterService-ээс хамаардаг
  // (хуваарь өөрчлөгдөхөд мэдэгдэл). Энэ импортгүй бол апп боохдоо унана —
  // tsc/jest барьдаггүй (STATUS §8.1).
  imports: [NotificationCenterModule],
  controllers: [AttendanceController],
  // ScheduleService-ийг schedule.module.ts-ийг импортлохгүйгээр шууд
  // provider болгож нэмсэн (assignments.module.ts-ийн AuditService-тэй
  // адилхан хэв маяг) — зөвхөн PrismaService (global)-аас хамаардаг тул
  // аюулгүй. AuditService-ийг мөн шууд provider болгож нэмсэн (assignments
  // модультай ижил хэв маяг).
  providers: [AttendanceService, ScheduleService, AuditService],
})
export class AttendanceModule {}
