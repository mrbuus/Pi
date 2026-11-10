import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ClassSessionsModule } from '../class-sessions/class-sessions.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { MakeupVisitsController } from './makeup-visits.controller';
import { MakeupVisitsService } from './makeup-visits.service';

/**
 * Нөхөлт (эзэн 2026-11-08): өөр ангид суух, 406 өрөө. ScheduleModule нь
 * ScheduleService-ийг экспортлодог (хичээлтэй өдөр эсэх). MakeupVisitsService-ийг
 * экспортолно — сурагчийн хөтөлбөр `coveredByStudent()`-ийг дуудна.
 */
@Module({
  imports: [ScheduleModule, ClassSessionsModule],
  controllers: [MakeupVisitsController],
  providers: [MakeupVisitsService, AuditService],
  exports: [MakeupVisitsService],
})
export class MakeupVisitsModule {}
