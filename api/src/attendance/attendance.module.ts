import { Module } from '@nestjs/common';
import { ScheduleService } from '../schedule/schedule.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  // ScheduleService-ийг schedule.module.ts-ийг импортлохгүйгээр шууд
  // provider болгож нэмсэн (assignments.module.ts-ийн AuditService-тэй
  // адилхан хэв маяг) — зөвхөн PrismaService (global)-аас хамаардаг тул
  // аюулгүй.
  providers: [AttendanceService, ScheduleService],
})
export class AttendanceModule {}
