import { Module } from '@nestjs/common';
import { ScheduleModule } from '../schedule/schedule.module';
import { LessonRecordsController } from './lesson-records.controller';
import { LessonRecordsService } from './lesson-records.service';

// ScheduleModule нь ScheduleService-ээ экспортолдог — өдрийн бодит хичээлийг
// (зөөгдсөн/цуцлагдсаныг тооцсон) getWeek()-ээр шийдвэрлэнэ.
@Module({
  imports: [ScheduleModule],
  controllers: [LessonRecordsController],
  providers: [LessonRecordsService],
  exports: [LessonRecordsService],
})
export class LessonRecordsModule {}
