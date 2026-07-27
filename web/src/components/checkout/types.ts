/**
 * Худалдан авагчийн (сурагч/эцэг эх) төлбөрийн UI-д зориулсан нийтлэг төрлүүд.
 *
 * Эдгээр нь бэкэнд багийн барьж буй `POST /payments` + `GET /payments/:id`
 * гэрээ (contract) дээр тулгуурлана. Бэкэнд хийгдэж дуусаагүй байгаа тул
 * энэ файлыг ганц эх сурвалж болгож, бусад компонентууд бүгд үүнээс
 * import хийнэ — ирээдүйд гэрээ өөрчлөгдвөл нэг л газар засна.
 */

/** Төлбөрийн арга — QPay нь автомат баталгаажилттай, бусад нь гараар */
export type PaymentMethod = "QPAY" | "BANK_TRANSFER" | "CASH";

/** Төлбөрийн бичлэгийн төлөв (`GET /payments/:id`-с ирнэ) */
export type PaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "REVERSED";

/** QPay-ийн буцаадаг банкны апп руу шууд үсрэх линк (deeplink) */
export interface QpayDeeplink {
  /** Банкны нэр — жишээ нь "Khan bank", "Golomt bank" */
  name: string;
  /** Богино тайлбар — ихэвчлэн банкны апп-ын нэртэй адил */
  description: string;
  /** Тухайн банкны аппыг нээх deeplink URL */
  link: string;
  /** Банкны лого — ихэвчлэн URL эсвэл base64 зураг */
  logo: string;
}

/** `POST /payments`-ийн хариунд ирэх QPay нэхэмжлэхийн мэдээлэл */
export interface QpayInvoiceInfo {
  invoiceId: string;
  /** QR-ийн текст утга (fallback — зураг ачаалахгүй бол харуулна) */
  qrText: string;
  /** QR зургийн base64 (data URI угтвартай эсвэл угтваргүй аль ч хэлбэрээр ирж болно) */
  qrImage: string;
  deeplinks: QpayDeeplink[];
}

/** `POST /payments` руу илгээх хүсэлт */
export interface CreatePaymentRequest {
  /** Төгрөгөөр, бүхэл тоо (сая биш, ₮) */
  amount: number;
  method: PaymentMethod;
  description: string;
  /** Сарын төлбөрийн хувьд — аль сарын төлбөр болохыг тэмдэглэнэ (жишээ: "2026-09") */
  forMonth?: string;
}

/** `POST /payments`-ийн хариу */
export interface CreatePaymentResponse {
  id: string;
  status: PaymentStatus;
  /** Зөвхөн method === "QPAY" үед ирнэ */
  qpay?: QpayInvoiceInfo;
}

/** `GET /payments/:id`-ийн хариу */
export interface PaymentDetails {
  id: string;
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
}
