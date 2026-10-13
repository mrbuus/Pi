import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PassesModule } from '../passes/passes.module';
import { PaymentsLedgerController } from './ledger.controller';
import { PaymentsLedgerService } from './ledger.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  // GatewaysModule нь QpayService-ийг export хийдэг — QPAY төлбөр үүсэхэд
  // нэхэмжлэх үүсгэхэд ашиглана.
  imports: [PassesModule, AuditModule, forwardRef(() => GatewaysModule)],
  controllers: [PaymentsController, PaymentsLedgerController],
  providers: [PaymentsService, PaymentsLedgerService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
