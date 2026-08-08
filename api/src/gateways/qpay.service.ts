import { Injectable, Logger } from '@nestjs/common';
import {
  CheckPaymentResult,
  CreateInvoiceParams,
  CreateInvoiceResult,
  PaymentGateway,
} from './gateway.types';

// QPay v2 API — https://developer.qpay.mn (sandbox/production мэдээллийг
// README.md-с үзнэ үү). Энд зөвхөн танилцуулгад баталгаажсан талбаруудыг
// ашиглана; тодорхойгүй талбаруудыг ХЭЗЭЭ Ч зохиомлоор нэмээгүй болно.

interface QpayTokenResponse {
  access_token: string;
  refresh_token: string;
  // Баримт бичигт expires_in заавал ирнэ гэж баталгаажаагүй тул optional.
  expires_in?: number;
  token_type?: string;
}

// ⚠️ ТАЙЛБАР: доорх invoice/check хариултын талбарын нэрс нь QPay v2-ийн
// нийтлэг баримтжуулалтад тулгуурласан ТААМАГЛАЛ — task-ийн даалгаварт
// баталгаажсан зүйл бол зөвхөн "invoice_id, qr_text, qr_image, deeplink URL-
// ууд" болон "төлбөрийн статус + гүйлгээний дэлгэрэнгүй" гэдэг л. Sandbox-
// той бодитоор холбогдож жинхэнэ хариу ирмэгц эдгээр interface-үүдийг
// баталгаажуулж/засварлана уу (README-ийн "Баталгаажуулах зүйлс" хэсгийг үз).
interface QpayInvoiceResponse {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  urls?: { name: string; description?: string; logo?: string; link: string }[];
}

interface QpayPaymentCheckRow {
  payment_id?: string;
  payment_status?: string;
  payment_amount?: string | number;
}

interface QpayPaymentCheckResponse {
  count?: number;
  paid_amount?: string | number;
  rows?: QpayPaymentCheckRow[];
}

const TOKEN_PATH = '/v2/auth/token';
const REFRESH_PATH = '/v2/auth/refresh';
const INVOICE_PATH = '/v2/invoice';
const CHECK_PATH = '/v2/payment/check';

// Хугацаа дуусахаас бага зэрэг эрт (60 сек) сэргээснээр "яг хугацаандаа
// дуусах мөчид" зэрэгцээ хүсэлтүүд хуучин токеноор амжилтгүй болохоос сэргийлнэ.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

// QPay баримт бичигт /v2/auth/token хариунд expires_in талбар гарантитай
// ирнэ гэж тодорхой заагаагүй тул fallback TTL. Sandbox-с бодит хариу авмагц
// баталгаажуулж, шаардлагатай бол QPAY_TOKEN_TTL_FALLBACK_SECONDS-ээр override
// хийж болно.
const DEFAULT_TOKEN_TTL_SECONDS = 3600;

// Нэг ч тохиолдолд hung сүлжээний дуудлага payment хүсэлтийг тэнэг зогсоож
// болохгүй тул тодорхой timeout зааж, AbortSignal.timeout ашиглана.
const REQUEST_TIMEOUT_MS = 15_000;

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

@Injectable()
export class QpayService implements PaymentGateway {
  readonly name = 'QPAY' as const;
  private readonly logger = new Logger(QpayService.name);

  private cache: TokenCache | null = null;

  // Токен сэргээх/шинээр авах хүсэлт зэрэгцээ олон удаа гарахаас сэргийлж
  // (stampede хамгаалалт) — QPay-ийн баримт бичигт "хугацаа дуусахаас өмнө
  // токенийг давтан бүү хүс" гэж тодорхой сануулсан тул зэрэгцээ бүх дуудагч
  // нэг л in-flight Promise-г хүлээж, дундаа хуваалцана.
  private inFlightAuth: Promise<TokenCache> | null = null;

  private get baseUrl(): string | undefined {
    return process.env.QPAY_BASE_URL?.trim() || undefined;
  }
  private get clientId(): string | undefined {
    return process.env.QPAY_CLIENT_ID?.trim() || undefined;
  }
  private get clientSecret(): string | undefined {
    return process.env.QPAY_CLIENT_SECRET?.trim() || undefined;
  }
  private get invoiceCode(): string | undefined {
    return process.env.QPAY_INVOICE_CODE?.trim() || undefined;
  }
  private get callbackUrl(): string | undefined {
    return process.env.QPAY_CALLBACK_URL?.trim() || undefined;
  }
  private get tokenTtlFallbackSeconds(): number {
    const raw = process.env.QPAY_TOKEN_TTL_FALLBACK_SECONDS?.trim();
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_TOKEN_TTL_SECONDS;
  }

  isConfigured(): boolean {
    return !!(
      this.baseUrl &&
      this.clientId &&
      this.clientSecret &&
      this.invoiceCode &&
      this.callbackUrl
    );
  }

  // App boot-г огт саатуулахгүй — тохиргоо дутуу бол зөвхөн дуудагдах үед
  // Монгол алдаа шиднэ, аппликейшн асахад нөлөөлөхгүй.
  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(
        'QPay тохиргоо дутуу байна: QPAY_BASE_URL, QPAY_CLIENT_ID, ' +
          'QPAY_CLIENT_SECRET, QPAY_INVOICE_CODE, QPAY_CALLBACK_URL орчны ' +
          'хувьсагчдыг бүрэн тохируулна уу.',
      );
    }
  }

  // sender_invoice_no ХЭЗЭЭ Ч давхардаж, дахин ашиглагдаж болохгүй (QPay
  // баримт бичгийн шаардлага) — учир нь давхардвал QPay өөр гүйлгээг ижил
  // invoice-той андуурч, буруу Payment мөр баталгаажих эрсдэлтэй. Тиймээс
  // дотоод Payment.id-аас deterministic байдлаар гаргаж, зөвхөн давтан
  // оролдлого (attempt) үед л ялгаатай утга үүсгэнэ.
  private buildSenderInvoiceNo(paymentId: string, attempt?: number): string {
    const base = `pimn-${paymentId}`;
    return attempt && attempt > 0 ? `${base}-r${attempt}` : base;
  }

  private async rawFetch<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');

    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // client_secret/access_token-ийг лог руу хэзээ ч бичихгүй — зөвхөн
      // path болон алдааны мессежийг лог хийнэ.
      this.logger.error(
        `QPay ${path} хүсэлт амжилтгүй (сүлжээ/timeout): ${(err as Error).message}`,
      );
      throw new Error('QPay сервертэй холбогдож чадсангүй.');
    }

    if (!res.ok) {
      this.logger.error(`QPay ${path} → HTTP ${res.status}`);
      throw new Error(`QPay хүсэлт амжилтгүй (HTTP ${res.status}).`);
    }
    return (await res.json()) as T;
  }

  private toCache(token: QpayTokenResponse): TokenCache {
    const ttlSeconds = token.expires_in ?? this.tokenTtlFallbackSeconds;
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
  }

  private async authenticateWithBasic(): Promise<TokenCache> {
    const basic = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const data = await this.rawFetch<QpayTokenResponse>(TOKEN_PATH, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}` },
    });
    this.logger.log('QPay: шинэ access_token авлаа (auth/token)');
    return this.toCache(data);
  }

  private async refreshWithToken(refreshToken: string): Promise<TokenCache> {
    const data = await this.rawFetch<QpayTokenResponse>(REFRESH_PATH, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    this.logger.log('QPay: access_token сэргээлээ (auth/refresh)');
    return this.toCache(data);
  }

  private async refreshOrAuthenticate(): Promise<TokenCache> {
    const existingRefreshToken = this.cache?.refreshToken;
    if (existingRefreshToken) {
      try {
        return await this.refreshWithToken(existingRefreshToken);
      } catch (err) {
        this.logger.warn(
          `QPay refresh амжилтгүй, шинээр нэвтэрнэ: ${(err as Error).message}`,
        );
      }
    }
    return this.authenticateWithBasic();
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt - EXPIRY_SAFETY_MARGIN_MS > now) {
      return this.cache.accessToken;
    }
    if (!this.inFlightAuth) {
      this.inFlightAuth = this.refreshOrAuthenticate()
        .then((cache) => {
          this.cache = cache;
          return cache;
        })
        .finally(() => {
          this.inFlightAuth = null;
        });
    }
    const cache = await this.inFlightAuth;
    return cache.accessToken;
  }

  async createInvoice(
    params: CreateInvoiceParams,
  ): Promise<CreateInvoiceResult> {
    this.assertConfigured();
    const senderInvoiceNo = this.buildSenderInvoiceNo(
      params.paymentId,
      params.attempt,
    );
    const token = await this.getAccessToken();
    const data = await this.rawFetch<QpayInvoiceResponse>(INVOICE_PATH, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        invoice_code: this.invoiceCode,
        sender_invoice_no: senderInvoiceNo,
        invoice_receiver_code: params.receiverCode ?? 'terminal',
        invoice_description: params.description,
        amount: params.amount,
        callback_url: this.callbackUrl,
      }),
    });
    this.logger.log(`QPay: invoice үүслээ (invoice_id=${data.invoice_id})`);
    return {
      providerInvoiceId: data.invoice_id,
      qrText: data.qr_text,
      qrImage: data.qr_image,
      deeplinks: (data.urls ?? []).map((u) => ({
        name: u.name,
        link: u.link,
        logo: u.logo,
      })),
    };
  }

  async checkPayment(providerInvoiceId: string): Promise<CheckPaymentResult> {
    this.assertConfigured();
    const token = await this.getAccessToken();
    const data = await this.rawFetch<QpayPaymentCheckResponse>(CHECK_PATH, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invoice_id: providerInvoiceId }),
    });

    // 🛡️ ХАМГААЛАЛТТАЙ ЗАДЛАЛТ: Талбар байхгүй үед унахгүй байхаар
    // optional chaining + өгөгдмөл утга ашигла
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const paidRow = rows.find((r) => r?.payment_status === 'PAID');
    const paid = !!paidRow || (Number(data?.count) ?? 0) > 0;

    // Дүн: нэг нь гарж ирмэгц эхнийхийг ашигла (гүйлгээ → опция, гүйлгээ байхгүй → нийт)
    let paidAmount = 0;
    if (typeof data?.paid_amount === 'string' || typeof data?.paid_amount === 'number') {
      const amt = Number(data.paid_amount);
      paidAmount = Number.isFinite(amt) ? amt : 0;
    } else if (paidRow?.payment_amount != null) {
      const amt = Number(paidRow.payment_amount);
      paidAmount = Number.isFinite(amt) ? amt : 0;
    }

    // провайдер гүйлгээний ID (нийгүүлэгч тодорхойгүй бол undefined)
    const providerPaymentId =
      typeof paidRow?.payment_id === 'string' ? paidRow.payment_id.trim() || undefined : undefined;

    this.logger.log(
      `QPay: төлбөр шалгалаа (invoice_id=${providerInvoiceId}, paid=${paid})`,
    );

    return {
      paid,
      paidAmount,
      providerPaymentId,
      raw: data,
    };
  }
}
