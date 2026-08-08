import { Module } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { TuitionController } from './tuition.controller';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [ScheduleModule],
  providers: [TuitionService],
  controllers: [TuitionController],
  exports: [TuitionService],
})
export class TuitionModule {}
