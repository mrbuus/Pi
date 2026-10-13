// Онцгой өдрийн UI-д хамтдаа ашиглах төрөл ба туслах функцууд.

import { addDaysToKey, WEEKDAY_LABELS, type CalendarDay } from "../types";

export interface SpecialDay extends CalendarDay {
  /** Хоосон = БҮХ анги */
  classroomIds: string[];
  classrooms: { id: string; name: string }[];
}

export interface ClassroomOption {
  id: string;
  name: string;
}

const NO_BRANCH = "Бусад";

/** "12-1 (Баруун 4)" -> { label: "12-1", branch: "Баруун 4" } */
export function splitClassName(full: string): {
  label: string;
  branch: string;
} {
  const m = full.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { label: m[1], branch: m[2] } : { label: full, branch: NO_BRANCH };
}

const collator = new Intl.Collator("mn", { numeric: true });

/** Салбараар бүлэглэж, нэрийг тоон дарааллаар (12-2 нь 12-10-аас өмнө) эрэмбэлнэ. */
export function groupByBranch(
  classrooms: ClassroomOption[],
): { branch: string; items: (ClassroomOption & { label: string })[] }[] {
  const map = new Map<string, (ClassroomOption & { label: string })[]>();
  for (const c of classrooms) {
    const { label, branch } = splitClassName(c.name);
    const list = map.get(branch) ?? [];
    list.push({ ...c, label });
    map.set(branch, list);
  }
  const rank = (b: string) =>
    b === NO_BRANCH ? 2 : b.startsWith("Баруун") ? 0 : 1;
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || collator.compare(a[0], b[0]))
    .map(([branch, items]) => ({
      branch,
      items: items.sort((x, y) => collator.compare(x.label, y.label)),
    }));
}

/** "2026-10-20" -> "10-р сарын 20, Мягмар" */
export function longDateLabel(key: string): string {
  const d = new Date(`${key.slice(0, 10)}T00:00:00.000Z`);
  return `${d.getUTCMonth() + 1}-р сарын ${d.getUTCDate()}, ${WEEKDAY_LABELS[d.getUTCDay()]}`;
}

/** Хоёр огнооны (оролцуулан) хоорондох бүх өдөр. Хэт урт мужийг таслана. */
export function dateRange(from: string, to: string, max = 62): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < max; k = addDaysToKey(k, 1))
    out.push(k);
  return out;
}

/** Карт дээрх хамрах хүрээний товч тайлбар */
export function scopeText(day: SpecialDay): string {
  if (day.classroomIds.length === 0) return "Бүх анги";
  const labels = day.classrooms.map((c) => splitClassName(c.name).label);
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.slice(0, 3).join(", ")} ба өөр ${labels.length - 3} анги`;
}
