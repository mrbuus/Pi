import { formatMnDate } from "@/lib/dateMn";

// Нийтлэг цэвэрлэгч (сурагчийн бүх дэлгэц) — хуучин импортыг эвдэхгүй
export { cleanTitle } from "@/lib/studentTitle";

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
