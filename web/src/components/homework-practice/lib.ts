import { formatMnDate } from "@/lib/dateMn";

/**
 * Сурагчид номын дотоод нэр («100x100», «200×200», «V2», «V3») ХЭЗЭЭ Ч харуулахгүй
 * (эзэн 2026-10-29, шийдвэр 6), хувилбарын үсгийг ч гарчигт давтахгүй — даалгавар
 * нь үргэлж B хувилбар тул «Даалгавар» гэж л нэрлэнэ.
 */
export function cleanTitle(title: string, variantLabel?: string | null): string {
  let t = title
    // «100x100», «200 × 200», кирилл «х»
    .replace(/\b\d{2,4}\s*[xX×хХ]\s*\d{2,4}\b/g, " ")
    // «V2», «V3» гэх мэт хувилбарын код
    .replace(/(^|[\s·—–:-])V\d\b/g, "$1")
    .replace(/\s+·\s+/g, " · ");
  if (variantLabel) {
    const v = variantLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Төгсгөлийн «-B», « B», «(B)», «B хувилбар»
    t = t.replace(new RegExp(`[\\s(-]*${v}\\)?(\\s*хувилбар)?\\s*$`, "i"), "");
  }
  t = t
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·—–:,-]+|[\s·—–:,-]+$/g, "")
    .trim();
  return t || "Даалгавар";
}

/** Улаанбаатарын өнөөдөр «YYYY-MM-DD» */
export function todayKeyUB(): string {
  return formatMnDate(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\./g, "-");
}

export function isBlankAnswer(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "" || /^_+$/.test(v.trim());
  return false;
}

/** Өнгөрсөн хугацаа: «4:07» эсвэл «1:04:07» */
export function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function solveHref(testId: string, date: string, classroomId: string): string {
  const q = new URLSearchParams({ date, classroomId });
  return `/app/homework/${encodeURIComponent(testId)}?${q.toString()}`;
}
