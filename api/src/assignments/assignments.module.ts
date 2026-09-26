import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { NotificationCenterModule } from '../notification-center/notification-center.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { HomeworkMarksController } from './homework-marks.controller';
import { HomeworkMarksService } from './homework-marks.service';

@Module({
  controllers: [AssignmentsController, HomeworkMarksController],
  providers: [AssignmentsService, HomeworkMarksService, AuditService],
  imports: [NotificationCenterModule],
})
export class AssignmentsModule {}
