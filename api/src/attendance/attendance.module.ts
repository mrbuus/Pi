import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ScheduleModule } from '../schedule/schedule.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [ScheduleModule],
  controllers: [AttendanceController],
  // Reuse the exported service with its notification dependencies intact.
  providers: [AttendanceService, AuditService],
})
export class AttendanceModule {}
