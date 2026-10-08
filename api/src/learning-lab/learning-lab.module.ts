import { Module } from '@nestjs/common';
import { DismissalController } from './dismissal.controller';
import { DismissalService } from './dismissal.service';
import { LearningLabController } from './learning-lab.controller';
import { LearningLabService } from './learning-lab.service';
@Module({
  controllers: [LearningLabController, DismissalController],
  providers: [LearningLabService, DismissalService],
})
export class LearningLabModule {}
