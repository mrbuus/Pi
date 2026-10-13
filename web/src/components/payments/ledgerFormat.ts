import type { BlockState, MonthBlock, PlanKind } from "./ledgerTypes";

/** «2026-10» → 10 */
export const monthNo = (m: string) => Number(m.slice(5, 7));
/** «2026-10» → «10-р сар» */
export const monthName = (m: string) => `${monthNo(m)}-р сар`;

/** 350000 → «350,000₮» */
export function mnt(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")}₮`;
}

/** Блок дээрх товч дүн: 150000 → «150к», 1250000 → «1.25с» (сая) */
export function shortMnt(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}с`;
  if (n >= 1000) return `${Math.round(n / 1000)}к`;
  return String(n);
}

/** Том дүнг сая-аар: 84392324 → «84.4 сая» */
export function millions(n: number): string {
  if (Math.abs(n) < 100_000) return mnt(n);
  return `${(n / 1_000_000).toFixed(1)} сая`;
}

/** «2026-10-07» → «10/07» */
export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

/** ISO хугацааг Улаанбаатарын «MM/DD HH:mm» болгоно */
export function stampLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 3_600_000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Монголын цагаар өнөөдөр «YYYY-MM-DD» */
export function todayUB(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export const PLAN_LABEL: Record<PlanKind, string> = {
  MONTHLY: "Сар бүр",
  FULL_YEAR: "Бүтэн жил",
  INSTALLMENT: "Хагас жил",
};

export const STATE_LABEL: Record<BlockState, string> = {
  PAID: "Төлсөн",
  PARTIAL: "Дутуу",
  OWED: "Өртэй",
  FUTURE: "Хугацаа болоогүй",
  OFF: "Сураагүй",
};

/** Блокийн бүтэн тайлбар — aria-label/title-д */
export function blockLabel(b: MonthBlock): string {
  const head = `${monthName(b.month)}: ${STATE_LABEL[b.state]}`;
  if (b.state === "OFF") return head;
  if (b.state === "PAID") return `${head} ${mnt(b.paid)}`;
  if (b.state === "PARTIAL") return `${head} — ${mnt(b.paid)} / ${mnt(b.due)}`;
  if (b.state === "FUTURE") return `${head} — ${dayLabel(b.dueOn)}-нд ${mnt(b.due)}`;
  return `${head} ${mnt(b.due)}`;
}

/** Дарагдсан сар хүртэлх бүх дутуу — «энд хүртэл төлөх» (API-ийн amountThrough-тэй ижил) */
export function amountThrough(blocks: MonthBlock[], month: string): number {
  let sum = 0;
  for (const b of blocks) {
    if (b.state !== "OFF") sum += b.due - b.paid;
    if (b.month === month) break;
  }
  return sum;
}

/** Дүнг хуучин өрөөс дүүргэвэл аль сарууд бүрэн хаагдахыг тооцно (урьдчилж харуулах) */
export function coverPreview(blocks: MonthBlock[], amount: number): { full: string[]; partial: string | null } {
  let left = Math.max(0, amount);
  const full: string[] = [];
  let partial: string | null = null;
  for (const b of blocks) {
    if (b.state === "OFF") continue;
    const need = b.due - b.paid;
    if (need <= 0) continue;
    if (left >= need) {
      full.push(b.month);
      left -= need;
    } else {
      if (left > 0) partial = b.month;
      break;
    }
  }
  return { full, partial };
}

/** Сарын жагсаалтыг «9–11-р сар» маягаар товчилно */
export function monthsRange(months: string[]): string {
  if (!months.length) return "";
  if (months.length === 1) return monthName(months[0]);
  return `${monthNo(months[0])}–${monthNo(months[months.length - 1])}-р сар`;
}
