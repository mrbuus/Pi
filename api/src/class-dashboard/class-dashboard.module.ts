import { Module } from '@nestjs/common';
import { ClassCoverageService } from './class-coverage.service';
import { ClassDashboardController } from './class-dashboard.controller';
import { ClassDashboardService } from './class-dashboard.service';

// StaffCapabilityModule нь @Global — мөнгөний эрх (finance.manage) шалгахад.
@Module({
  controllers: [ClassDashboardController],
  providers: [ClassDashboardService, ClassCoverageService],
  // «Чек» (class-checks) ангийн харагдах эрхийг эндээс авна
  exports: [ClassDashboardService],
})
export class ClassDashboardModule {}
