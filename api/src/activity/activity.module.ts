import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { WeeklyGoalController } from './weekly-goal.controller';
import { WeeklyGoalService } from './weekly-goal.service';

@Module({
  controllers: [ActivityController, WeeklyGoalController],
  providers: [ActivityService, WeeklyGoalService],
})
export class ActivityModule {}
