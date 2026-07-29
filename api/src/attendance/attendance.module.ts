import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ScheduleService } from '../schedule/schedule.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  // ScheduleService-ийг schedule.module.ts-ийг импортлохгүйгээр шууд
  // provider болгож нэмсэн (assignments.module.ts-ийн AuditService-тэй
  // адилхан хэв маяг) — зөвхөн PrismaService (global)-аас хамаардаг тул
  // аюулгүй. AuditService-ийг мөн шууд provider болгож нэмсэн (assignments
  // модультай ижил хэв маяг).
  providers: [AttendanceService, ScheduleService, AuditService],
})
export class AttendanceModule {}
