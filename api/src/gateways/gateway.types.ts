// Төлбөрийн гарц (payment gateway)-уудын нийтлэг интерфейс. QPay, DigiPay гэх
// мэт өөр өөр провайдерууд нэг адил дуудагдах ёстой тул PaymentsService энэ
// интерфейсээс хамаарна, тодорхой провайдерийн деталиас хамаардаггүй.

export type GatewayName = 'QPAY' | 'DIGIPAY';

export interface CreateInvoiceParams {
  /** Дотоод Payment мөрийн id — sender_invoice_no-г үүнээс гаргана */
  paymentId: string;
  /** Төгрөгөөр, бүхэл тоо (Payment.amount нь Int) */
  amount: number;
  description: string;
  /** Хүлээн авагчийн код (QPay: invoice_receiver_code гэх мэт) */
  receiverCode?: string;
  /**
   * Ижил Payment-д давтан invoice үүсгэх шаардлагатай үед (жишээ нь өмнөх
   * invoice хугацаа дууссан) энэ тоог нэмэгдүүлж дамжуулна. sender_invoice_no
   * ХЭЗЭЭ Ч давхардаж болохгүй тул paymentId дангаараа хангалтгүй бол энэ
   * suffix-ийг ашиглаж ялгана. Анхны оролдлого бол өгөхгүй/0 үлдээнэ.
   */
  attempt?: number;
}

export interface CreateInvoiceResult {
  /** Провайдер дээрх нэхэмжлэхийн id (жишээ нь QPay-ийн invoice_id) */
  providerInvoiceId: string;
  qrText: string;
  qrImage: string;
  /** Банкны апп руу шууд нээх deeplink-үүд */
  deeplinks: { name: string; link: string; logo?: string }[];
}

export interface CheckPaymentResult {
  paid: boolean;
  /** Провайдероос баталгаажсан төлбөрийн дүн (₮) */
  paidAmount: number;
  /** Провайдер дээрх гүйлгээний id (байвал) */
  providerPaymentId?: string;
  /** Провайдерийн түүхий хариу — лог/дебаг зорилгоор, нууц мэдээлэлгүй байх ёстой */
  raw: unknown;
}

export interface PaymentGateway {
  readonly name: GatewayName;
  /** Env-с шаардлагатай тохиргоо бүрэн ирсэн эсэх — ирээгүй бол false */
  isConfigured(): boolean;
  createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult>;
  checkPayment(providerInvoiceId: string): Promise<CheckPaymentResult>;
}
