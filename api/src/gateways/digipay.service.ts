import { Injectable, Logger } from '@nestjs/common';
import {
  CheckPaymentResult,
  CreateInvoiceParams,
  CreateInvoiceResult,
  PaymentGateway,
} from './gateway.types';

// ⚠️ ЧУХАЛ: Монгол улсын "DigiPay" төлбөрийн системийн албан ёсны API
// баримт бичгийг эрэлхийлсэн ч олдсонгүй. Хайлтад олдсон "digipay.guru" нь
// огт өөр, олон улсын white-label платформ; "digipay.my" нь Малайзын үйлчилгээ
// — аль нь ч Монголын DigiPay биш. Тиймээс энд endpoint/талбарын нэр ЗОХИОМЖЛОХ
// нь бодит production дээр чимээгүй эвдэрч, "ажилладаг мэт харагдаад бодит
// байдалд ажилладаггүй" код үүсгэх тул хамгийн муу шийдэл юм.
//
// Иймд энэ адаптер зөвхөн PaymentGateway интерфэйсийг хэрэгжүүлж, дуудагдах
// бүрдээ тодорхой Монгол алдаа шидэх "NOT IMPLEMENTED" walл болно. Бодит
// интеграц хийхэд юу дутуй байгааг README.md-ийн "DigiPay — нээлттэй
// асуултууд" хэсгээс үзнэ үү.
@Injectable()
export class DigipayService implements PaymentGateway {
  readonly name = 'DIGIPAY' as const;
  private readonly logger = new Logger(DigipayService.name);

  isConfigured(): boolean {
    return false;
  }

  private notImplemented(): never {
    const message =
      'DigiPay-ийн API мэдээлэл хараахан тодорхойгүй байна — Монголын ' +
      'DigiPay-ийн албан ёсны нэвтрэлт/invoice/callback баримт бичиг ' +
      'олдоогүй тул интеграц хийгдээгүй болно. README.md-ийн DigiPay хэсгийг ' +
      'үзнэ үү.';
    this.logger.warn(message);
    throw new Error(message);
  }

  createInvoice(_params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
    this.notImplemented();
  }

  checkPayment(_providerInvoiceId: string): Promise<CheckPaymentResult> {
    this.notImplemented();
  }
}
