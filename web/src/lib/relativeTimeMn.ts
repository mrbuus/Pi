/**
 * «дөнгөж сая», «5 минутын өмнө», «өнөөдөр 14:05», «өчигдөр 09:12»,
 * «10-р сарын 3, 14:05», «2025.10.03» — Улаанбаатарын цагаар (STATUS §8.9).
 * Хөтчийн mn-MN locale-д найдахгүй (Chromium-д байхгүй — lib/dateMn.ts).
 */

const TZ = "Asia/Ulaanbaatar";

function parts(date: Date) {
  const map: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    map[p.type] = p.value;
  }
  return {
    y: Number(map.year),
    m: Number(map.month),
    d: Number(map.day),
    hm: `${map.hour === "24" ? "00" : map.hour}:${map.minute}`,
  };
}

function dayIndex(p: { y: number; m: number; d: number }): number {
  return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86_400_000);
}

export function relativeTimeMn(value: Date | string | number, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);
  if (diffSec >= 0 && diffSec < 60) return "дөнгөж сая";
  if (diffSec >= 60 && diffSec < 3600) return `${Math.floor(diffSec / 60)} минутын өмнө`;
  const a = parts(date);
  const b = parts(now);
  const days = dayIndex(b) - dayIndex(a);
  if (days === 0) return `өнөөдөр ${a.hm}`;
  if (days === 1) return `өчигдөр ${a.hm}`;
  if (a.y === b.y) return `${a.m}-р сарын ${a.d}, ${a.hm}`;
  return `${a.y}.${String(a.m).padStart(2, "0")}.${String(a.d).padStart(2, "0")}`;
}
