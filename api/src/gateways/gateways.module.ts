import { Module, forwardRef } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { DigipayService } from './digipay.service';
import { GatewaysController } from './gateways.controller';
import { QpayService } from './qpay.service';

// PrismaService нь PrismaModule-оор @Global тул энд дахин import хийх
// шаардлагагүй.
//
// ⚠️ ДУГУЙ ХАМААРАЛ: PaymentsModule нь QpayService-г (нэхэмжлэх үүсгэхэд)
// хэрэглэдэг, GatewaysModule нь PaymentsService-г (callback баталгаажуулахад)
// хэрэглэдэг. Энэ нь бодит хоёр талын хамаарал тул forwardRef ашиглана —
// хоёр тал нэг циклд орсон нь дизайны алдаа биш, төлбөрийн урсгалын мөн чанар:
// төлбөр үүсгэх (payments → gateway) ба төлбөр баталгаажих (gateway → payments).
@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [GatewaysController],
  providers: [QpayService, DigipayService],
  // PaymentsModule эндээс QpayService-г дуудаж invoice үүсгэнэ.
  exports: [QpayService, DigipayService],
})
export class GatewaysModule {}
