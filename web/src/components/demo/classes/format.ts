import { WEEKDAYS_SHORT, fromKey, fromMin, mondayIndex, nowMinute, todayKey, type DemoClass } from "../world";

/** Ангийн хуваарийг цагаар нь бүлэглэнэ: «Да Лх Ба 15:00–17:30» */
export interface SlotGroup {
  dayIdx: number[];
  days: string;
  start: string;
  end: string;
  room: string;
}

export function slotGroups(cls: DemoClass, byRoom = true): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  for (const s of cls.slots) {
    const key = byRoom ? `${s.start}|${s.end}|${s.room}` : `${s.start}|${s.end}`;
    const g = map.get(key);
    if (g) {
      g.dayIdx.push(s.day);
      if (!g.room.split(", ").includes(s.room)) g.room += `, ${s.room}`;
    } else {
      map.set(key, { dayIdx: [s.day], days: "", start: s.start, end: s.end, room: s.room });
    }
  }
  const list = [...map.values()];
  for (const g of list) {
    g.dayIdx.sort((a, b) => a - b);
    g.days = g.dayIdx.map((d) => WEEKDAYS_SHORT[d]).join(" ");
  }
  return list.sort((a, b) => a.dayIdx[0] - b.dayIdx[0]);
}

/** «Да Лх Ба 15:00, Бя 10:00» */
export function scheduleSummary(cls: DemoClass): string {
  return slotGroups(cls, false)
    .map((g) => `${g.days} ${g.start}`)
    .join(", ");
}

/** «503» эсвэл «403, 503» */
export function roomsOf(cls: DemoClass): string {
  return [...new Set(cls.slots.map((s) => s.room))].join(", ");
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/**
 * Сайтад сүүлд орсон: «өнөөдөр 14:05», «өчигдөр 21:16», «3 хоногийн өмнө».
 * Өнөөдрийн цаг одоогоос хойш байвал (зохиомол өгөгдөл) одоогийн цагаар хязгаарлана.
 */
export function seenLabel(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Нэвтэрч үзээгүй";
  const [date, time] = lastSeenAt.split("T");
  const n = daysBetween(date, todayKey());
  if (n <= 0) {
    const now = fromMin(nowMinute());
    return `өнөөдөр ${time > now ? now : time}`;
  }
  if (n === 1) return `өчигдөр ${time}`;
  return `${n} хоногийн өмнө`;
}

/** «2026-09-03» → «2026.09.03» */
export const dotDate = (k: string): string => k.split("-").join(".");

/** «10-р сарын 15, Пү» */
export function shortDay(k: string): string {
  const d = fromKey(k);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS_SHORT[mondayIndex(d)]}`;
}

/** «10-р сарын 15» */
export function dayMonth(k: string): string {
  const d = fromKey(k);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}

/** «2026-10-14T21:16» → «10-р сарын 14, 21:16» */
export function stampLabel(s: string): string {
  const [date, time] = s.split("T");
  return `${dayMonth(date)}, ${time}`;
}

/**
 * Ирц ба даалгаврын самбар руу тухайн анги, өдрөөр нь шууд нээх холбоос.
 * Самбарын page.tsx query-г серверээс уншиж `key`-ээр шинэчилдэг тул `<Link>`-ээр зөөлөн шилжиж болно.
 */
export function boardHref(classId: string, dateKey: string): string {
  return `/demo/teacher?class=${classId}&date=${dateKey}`;
}
