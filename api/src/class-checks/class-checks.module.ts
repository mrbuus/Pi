import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClassDashboardModule } from '../class-dashboard/class-dashboard.module';
import { ClassChecksController } from './class-checks.controller';
import { ClassChecksService } from './class-checks.service';

// «Чек» (эзэн 2026-10-22). Ангийн харах эрх = ClassDashboardService.visibleClassIds.
@Module({
  imports: [AuditModule, ClassDashboardModule],
  controllers: [ClassChecksController],
  providers: [ClassChecksService],
})
export class ClassChecksModule {}
