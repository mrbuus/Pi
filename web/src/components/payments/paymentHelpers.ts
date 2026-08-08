import { Check, Clock, Undo2, X, type LucideIcon } from "lucide-react";
import { TUITION, type TuitionPlan, type TuitionTier } from "@/lib/orgInfo";

export const METHOD_LABEL: Record<string, string> = {
  QPAY: "QPay",
  BANK_TRANSFER: "Данс",
  CASH: "Бэлэн",
};

export interface PaymentStatusLabel {
  icon: LucideIcon;
  text: string;
  cls: string;
}

/**
 * Төлбөрийн төлөв — НЭГ эх сурвалж.
 *
 * Өмнө нь энэ жагсаалт ГУРВАН газар давхардаж (энд, StudentDetail.tsx,
 * student/payments/StudentPaymentsClient.tsx), тус бүр өөр өөр үг, өөр өөр
 * төлөвийн багцтай байв — REVERSED зарим газарт огт байхгүй. Нэг төлбөр
 * хаанаас харснаас хамаараад өөр нэртэй харагдах эрсдэлтэй байсан.
 *
 * Мөн энд өмнө нь текст дотор глиф бичигдсэн байсан (⏳ ✓ ✕ ↺) — эзний
 * 2-р дүрмийн зөрчил. Одоо lucide дүрс болсон: дүрс нь `icon` талбарт,
 * текст нь цэвэр үг. Ингэснээр дэлгэц уншигч глифийг «чагт» гэж дуудахаа
 * болино, дүрсний хэмжээ/өнгө нь бусад UI-тай нийцнэ.
 */
export const STATUS_LABEL: Record<string, PaymentStatusLabel> = {
  PENDING: { icon: Clock, text: "Хүлээгдэж буй", cls: "bg-warning/15 text-warning" },
  CONFIRMED: { icon: Check, text: "Баталгаажсан", cls: "bg-success/15 text-success" },
  REJECTED: { icon: X, text: "Цуцалсан", cls: "bg-error/15 text-error" },
  REVERSED: { icon: Undo2, text: "Буцаасан", cls: "bg-ink/10 text-ink-dim" },
};

// Prisma-гийн TuitionPlan enum-тэй тааруулж харуулах монгол нэр
// (UNKNOWN нь StudentProfile импортоос ирсэн, багцгүй сурагчид)
export const TUITION_PLAN_LABEL: Record<string, string> = {
  FULL_YEAR: "Бүтэн жилийн багц",
  INSTALLMENT: "Хуваан төлөх багц",
  MONTHLY: "Сар бүрийн багц",
  UNKNOWN: "Тодорхойгүй багц",
};

/** API алдааг хэрэглэгчид харуулах эвтэй мессеж болгоно. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/** Төлбөрийн дүнг мэдэгдэж буй сургалтын төлбөрийн багцтай тааруулж үзнэ. */
export function matchTuitionPlan(
  amount: number,
): { tier: TuitionTier; plan: TuitionPlan } | null {
  for (const tier of TUITION) {
    for (const plan of tier.plans) {
      if (plan.amount === amount) return { tier, plan };
    }
  }
  return null;
}
