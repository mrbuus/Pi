/** «Чек» — цэвэр туслах функцууд (DB-гүй, jest-ээр шалгана). */

export const CHECK_TITLE_MAX = 80;
/** Нэг сурагчийн дүн — 100 сая ₮-аас их байх учиргүй (алдаатай оруулгаас сэргийлнэ) */
export const CHECK_AMOUNT_MAX = 100_000_000;
/** Нэг ангид зэрэг нээлттэй байж болох чекийн дээд тоо */
export const OPEN_CHECKS_MAX = 40;
/** Жагсаалтад буцаах хаагдсан чекийн дээд тоо (шинэ нь эхэнд) */
export const ARCHIVED_LIST_MAX = 50;

/**
 * Чекийн нэр: хоосон зай шахаж, удирдах тэмдэгт хасаж, 80 тэмдэгтээр таслана.
 * Хоосон бол null.
 */
export function cleanCheckTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s ? s.slice(0, CHECK_TITLE_MAX).trim() : null;
}

/** Дүн: бүхэл, эерэг, хязгаар дотор; null/0 = дүнгүй */
export function cleanCheckAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === 0) return null;
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return NaN;
  if (raw < 0 || raw > CHECK_AMOUNT_MAX) return NaN;
  return raw;
}

export interface MarkLike {
  studentId: string;
  checked: boolean;
}

/**
 * Тоо ба цугларсан мөнгө. `checked/total` нь ОДООГИЙН сурагчдаар; ангиас
 * гарсан ч тэмдэглэгдсэн сурагчийн мөнгө `collected`-д орно (мөнгө багшид бий).
 */
export function checkSummary(
  rosterIds: readonly string[],
  marks: readonly MarkLike[],
  amount: number | null,
): { checked: number; total: number; formerChecked: number; collected: number | null } {
  const roster = new Set(rosterIds);
  let checked = 0;
  let formerChecked = 0;
  for (const m of marks) {
    if (!m.checked) continue;
    if (roster.has(m.studentId)) checked += 1;
    else formerChecked += 1;
  }
  return {
    checked,
    total: roster.size,
    formerChecked,
    collected: amount === null ? null : (checked + formerChecked) * amount,
  };
}

/** Prisma-ийн давхардлын алдаа (P2002) — зэрэг upsert хийхэд гарч болно */
export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === 'P2002';
}
