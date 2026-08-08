import { Module } from '@nestjs/common';
import { ReconcileService } from './reconcile.service';
import { ReconcileController } from './reconcile.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuditModule, PaymentsModule],
  controllers: [ReconcileController],
  providers: [ReconcileService],
})
export class ReconcileModule {}
