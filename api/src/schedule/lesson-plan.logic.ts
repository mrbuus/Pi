// Хичээлийн төлөвлөгөө (эзэн 2026-10-18) — ӨС-гүй цэвэр логик, тесттэй.
import { weekdayOf } from './week-resolver';

/** «DISMISS» = тарах, «STAY» = үлдэнэ — ЗӨВХӨН ажилтанд харагдана. */
export const DISMISS_MODES = ['DISMISS', 'STAY'] as const;
export type DismissMode = (typeof DISMISS_MODES)[number];

export interface OccurrenceSchedule {
  weekday: number;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null;
}
export interface OccurrenceException {
  date: string; // анхны огноо
  kind: 'CANCELLED' | 'MOVED';
  newDate: string | null;
}

/**
 * Хичээлийн тохиолдлын ТҮЛХҮҮР огноо. Төлөвлөгөө (LessonTopic) ба багшийн
 * оноолт (LessonStaffing) нь АНХНЫ огноогоор хадгалагдана — week-resolver-ийн
 * `topicDate`-тэй ижил. Клиент зөөгдсөн хичээлийн харагдаж буй огноог эсвэл
 * анхны огноог аль алийг нь илгээж болно:
 *   1) жирийн (өөрчлөгдөөгүй) тохиолдол → тэр огноо
 *   2) энэ огноо руу ЗӨӨГДСӨН тохиолдол → түүний анхны огноо
 *   3) өөр өдөр рүү зөөгдсөн тохиолдлын анхны огноо → тэр огноо
 */
export function resolveOccurrence(
  schedule: OccurrenceSchedule,
  exceptions: OccurrenceException[],
  date: string,
): { key: string } | { error: 'CANCELLED' | 'NOT_SCHEDULED' } {
  const natural =
    weekdayOf(date) === schedule.weekday &&
    schedule.effectiveFrom <= date &&
    (!schedule.effectiveTo || schedule.effectiveTo >= date);
  const own = exceptions.find((e) => e.date === date);
  if (natural && !own) return { key: date };
  const movedIn = exceptions.find(
    (e) => e.kind === 'MOVED' && (e.newDate ?? e.date) === date,
  );
  if (movedIn) return { key: movedIn.date };
  if (natural && own?.kind === 'MOVED') return { key: date };
  if (natural && own?.kind === 'CANCELLED') return { error: 'CANCELLED' };
  return { error: 'NOT_SCHEDULED' };
}

/** Төлөвлөгөөний гарчиг = тестүүдийн богино нэр («Урвуу функц 1, Урвуу функц 2»). */
export function planTitle(shortNames: string[]): string {
  return shortNames.filter(Boolean).join(', ');
}

/**
 * Онолын зураг илгээх дараагийн сурагч: хэзээ ч илгээгээгүй нь эхэнд (сүүлд
 * илгээсэн хүнээс хойшхи дарааллаар), бүгд илгээсэн бол хамгийн эрт илгээсэн нь.
 * `roster` — нэрийн дарааллаар; `history` — өмнөх хичээлүүдийн оноолт.
 */
export function suggestPhotoStudent(
  roster: string[],
  history: { studentId: string; date: string }[],
): string | null {
  if (!roster.length) return null;
  const last = new Map<string, string>();
  for (const h of history) {
    const prev = last.get(h.studentId);
    if (!prev || prev < h.date) last.set(h.studentId, h.date);
  }
  const latest = [...last.entries()].sort((a, b) => b[1].localeCompare(a[1]))[0];
  const start = latest ? roster.indexOf(latest[0]) + 1 : 0;
  const rotated = [...roster.slice(start), ...roster.slice(0, start)];
  const fresh = rotated.find((id) => !last.has(id));
  if (fresh) return fresh;
  return [...rotated].sort((a, b) =>
    (last.get(a) ?? '').localeCompare(last.get(b) ?? ''),
  )[0];
}

/** Номын дараалал: 100V3 → 200V3 → бусад; дотроо бүлгийн order, хувилбар. */
export function bookOrderKey(t: {
  bookCode: string | null;
  chapterOrder: number | null;
  variantLabel: string | null;
}): [number, number, string] {
  const ranks = ['100V3', '200V3'];
  const r = t.bookCode ? ranks.indexOf(t.bookCode) : -1;
  return [
    r === -1 ? ranks.length : r,
    t.chapterOrder ?? Number.MAX_SAFE_INTEGER,
    t.variantLabel ?? '~',
  ];
}

export function compareBookOrder(
  a: Parameters<typeof bookOrderKey>[0],
  b: Parameters<typeof bookOrderKey>[0],
): number {
  const x = bookOrderKey(a);
  const y = bookOrderKey(b);
  return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
}
