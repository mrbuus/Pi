import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationCenterModule } from '../notification-center/notification-center.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { SheetSyncController } from './sheet-sync.controller';
import { SheetSyncService } from './sheet-sync.service';

@Module({
  imports: [PrismaModule, AuditModule, PaymentsModule, UsersModule, NotificationCenterModule],
  controllers: [SheetSyncController],
  providers: [SheetSyncService],
})
export class SheetSyncModule {}
