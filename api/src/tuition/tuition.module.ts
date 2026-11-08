import { Module } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { TuitionController } from './tuition.controller';
import { ScheduleModule } from '../schedule/schedule.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import {
  RefundEstimateController,
  WithdrawalController,
} from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';

@Module({
  imports: [ScheduleModule, AuditModule, PaymentsModule],
  providers: [TuitionService, WithdrawalService],
  controllers: [
    TuitionController,
    WithdrawalController,
    RefundEstimateController,
  ],
  exports: [TuitionService],
})
export class TuitionModule {}
