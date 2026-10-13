import { Module } from '@nestjs/common';
import { ClassDashboardController } from './class-dashboard.controller';
import { ClassDashboardService } from './class-dashboard.service';

// StaffCapabilityModule нь @Global — мөнгөний эрх (finance.manage) шалгахад.
@Module({
  controllers: [ClassDashboardController],
  providers: [ClassDashboardService],
})
export class ClassDashboardModule {}
