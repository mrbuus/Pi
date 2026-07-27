import { TUITION, type TuitionPlan, type TuitionTier } from "@/lib/orgInfo";

export const METHOD_LABEL: Record<string, string> = {
  QPAY: "QPay",
  BANK_TRANSFER: "Данс",
  CASH: "Бэлэн",
};

export const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "⏳ Хүлээгдэж буй", cls: "bg-warning/15 text-warning" },
  CONFIRMED: { text: "✓ Баталгаажсан", cls: "bg-success/15 text-success" },
  REJECTED: { text: "✕ Цуцалсан", cls: "bg-error/15 text-error" },
  REVERSED: { text: "↺ Буцаасан", cls: "bg-error/15 text-error" },
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
