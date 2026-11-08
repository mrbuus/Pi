import { Module } from '@nestjs/common';
import { WorkSheetController } from './work-sheet.controller';
import { WorkSheetService } from './work-sheet.service';

// PrismaModule, StaffCapabilityModule нь @Global — импортлох шаардлагагүй.
@Module({
  controllers: [WorkSheetController],
  providers: [WorkSheetService],
})
export class TeacherHoursModule {}
