import { Module } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { TuitionController } from './tuition.controller';
import { ScheduleModule } from '../schedule/schedule.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';

@Module({
  imports: [ScheduleModule, UsersModule, AuditModule],
  providers: [TuitionService, WithdrawalService],
  controllers: [TuitionController, WithdrawalController],
  exports: [TuitionService],
})
export class TuitionModule {}
