import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { DigipayService } from './digipay.service';
import { QpayService } from './qpay.service';

// QPay callback body-той адилхан төрхийн ямар ч JSON бидэнд ирж болно —
// доор ганцхан invoice id-г л уншиж авна, бусад бүх талбарыг ХЭЗЭЭ Ч
// итгэмжлэхгүй.
interface QpayCallbackBody {
  invoice_id?: unknown;
  object_id?: unknown;
  payment_id?: unknown;
}

interface GatewayCallbackResult {
  providerInvoiceId: string;
  /** QPay-ийн /v2/payment/check-ээс БАТАЛГААЖСАН төлөв — callback body биш */
  confirmedPaid: boolean;
  confirmedAmount: number;
  matchedPaymentId?: string;
  expectedAmount?: number;
  /** true = баталгаажсан дүн хүлээгдэж буй дүнтэй тэнцүү/илүү (доогуур төлбөр биш) */
  amountOk?: boolean;
  /** PaymentsService.confirmQpayPayment()-ийн үр дүн (зөвхөн paid үед дуудагдана) */
  applied?: { handled: boolean; reason?: string };
}

@Controller('gateways')
export class GatewaysController {
  private readonly logger = new Logger(GatewaysController.name);

  constructor(
    private qpay: QpayService,
    private digipay: DigipayService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private payments: PaymentsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('status')
  status() {
    // Нууц утга (client_secret, access_token) ХЭЗЭЭ Ч энд гарахгүй — зөвхөн
    // тохируулагдсан эсэх boolean.
    return {
      qpay: this.qpay.isConfigured(),
      digipay: this.digipay.isConfigured(),
    };
  }

  // QPay сервэрээс дуудагдах endpoint тул нэвтрэлтгүй байх ЗАЙЛШГҮЙ
  // шаардлагатай (QPay өөрөө JWT дамжуулахгүй). Нийтэд нээлттэй тул
  // @Throttle-оор spoof/spam хүсэлтээс хамгаална.
  //
  // 🔒 АЮУЛГҮЙ БАЙДЛЫН ГОЛ ДҮРЭМ: callback-ийн body-д ЮУГ Ч ИТГЭХГҮЙ.
  // Хэн ч "paid: true" гэсэн хуурамч POST илгээж болно тул эндээс зөвхөн
  // invoice id-г л задалж авч, тэрхүү id-гаар QPay руу өөрөө буцаж
  // /v2/payment/check дуудаж баталгаажуулна. Зөвхөн ТУХАЙН хариу дээр
  // тулгуурлан шийднэ — ингэснээр хуурамч callback ямар ч ашиггүй болно.
  // Энэ бол QPay-ийн баримт бичгийн зөвлөмж (server-to-server verify).
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('qpay/callback')
  async qpayCallback(
    @Body() body: QpayCallbackBody,
  ): Promise<{ received: true }> {
    try {
      const result = await this.handleQpayCallback(body);
      this.logger.log(
        `QPay callback боловсрууллаа: invoice_id=${result.providerInvoiceId}, ` +
          `confirmedPaid=${result.confirmedPaid}, amountOk=${result.amountOk}`,
      );
    } catch (err) {
      // QPay дахин дахин давтан дуудахгүйн тулд алдаа гарсан ч ГЭХДЭЭ
      // 200 буцаана — гэхдээ дотооддоо чанга (loud) лог хийж, анзаарагдах
      // ёстой.
      this.logger.error(
        `QPay callback боловсруулахад алдаа гарлаа: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
    // QPay-д үргэлж хурдан 200 буцаана — эс тэгвээс QPay дахин дахин
    // callback давтан илгээх болно.
    return { received: true };
  }

  private extractInvoiceId(body: QpayCallbackBody): string | null {
    const raw = body?.invoice_id ?? body?.object_id ?? body?.payment_id;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }

  private async handleQpayCallback(
    body: QpayCallbackBody,
  ): Promise<GatewayCallbackResult> {
    const invoiceId = this.extractInvoiceId(body);
    if (!invoiceId) {
      throw new Error('Callback body-с invoice id задлан авч чадсангүй');
    }

    // Body-г бус, QPay-ээс өөрөөс нь баталгаажсан хариуг ашиглана.
    const confirmed = await this.qpay.checkPayment(invoiceId);

    const matched = await this.prisma.payment.findFirst({
      where: { qpayInvoiceId: invoiceId },
      select: { id: true, amount: true, status: true },
    });

    const amountOk = matched
      ? confirmed.paidAmount >= matched.amount
      : undefined;

    if (matched && confirmed.paid && !amountOk) {
      // Дутуу төлөлт — юу ч нээгдэх ёсгүй.
      this.logger.warn(
        `QPay: доогуур төлбөр илэрлээ! paymentId=${matched.id}, ` +
          `expected=${matched.amount}, confirmed=${confirmed.paidAmount}`,
      );
    }

    // ✅ QPay БАТАЛГААЖУУЛСАН тохиолдолд л PaymentsService рүү дамжуулна.
    // Дүн шалгах, эрх олгох, аудит бичих зэрэг бүх бизнес логик тэнд байна —
    // энэ controller нь зөвхөн "QPay юу гэж хэлснийг" тодорхойлох үүрэгтэй.
    let applied: { handled: boolean; reason?: string } | undefined;
    if (confirmed.paid) {
      applied = await this.payments.confirmQpayPayment({
        qpayInvoiceId: invoiceId,
        paidAmount: confirmed.paidAmount,
        providerPaymentId: confirmed.providerPaymentId,
      });
    }

    return {
      providerInvoiceId: invoiceId,
      confirmedPaid: confirmed.paid,
      confirmedAmount: confirmed.paidAmount,
      matchedPaymentId: matched?.id,
      expectedAmount: matched?.amount,
      amountOk,
      applied,
    };
  }
}
