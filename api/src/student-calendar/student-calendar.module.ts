import { Module } from '@nestjs/common';
import { MakeupVisitsModule } from '../makeup-visits/makeup-visits.module';
import { StudentCalendarController } from './student-calendar.controller';
import { StudentCalendarService } from './student-calendar.service';

/** Сурагчийн хичээлийн хуанли + сэдэв хөтөлбөр. Нөхөлтийг MakeupVisitsService.coveredByStudent-ээр уншина. */
@Module({
  imports: [MakeupVisitsModule],
  controllers: [StudentCalendarController],
  providers: [StudentCalendarService],
})
export class StudentCalendarModule {}
