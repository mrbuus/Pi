import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PassesModule } from '../passes/passes.module';
import { PaymentsLedgerController } from './ledger.controller';
import { PaymentsLedgerService } from './ledger.service';
import { PaymentsController } from './payments.controller';
import { PaymentsExportController } from './payments-export.controller';
import { PaymentsExportService } from './payments-export.service';
import { PaymentsService } from './payments.service';
import { DemoSheetService } from '../reconcile/demo-sheet.service';

@Module({
  // GatewaysModule нь QpayService-ийг export хийдэг — QPAY төлбөр үүсэхэд
  // нэхэмжлэх үүсгэхэд ашиглана.
  imports: [PassesModule, AuditModule, forwardRef(() => GatewaysModule)],
  controllers: [
    PaymentsController,
    PaymentsLedgerController,
    PaymentsExportController,
  ],
  // Шийтэд бичигч (төлбөр, хугацаа) — ReconcileModule ч эндээс авна (нэг клиент)
  providers: [PaymentsService, PaymentsLedgerService, PaymentsExportService, DemoSheetService],
  exports: [PaymentsService, PaymentsLedgerService, DemoSheetService],
})
export class PaymentsModule {}
