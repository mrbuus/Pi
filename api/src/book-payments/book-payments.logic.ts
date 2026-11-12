/** «Номын мөнгө» — цэвэр функцууд (DB-гүй, jest-ээр шалгана). */

/**
 * Сургалтын төвөөс сурагчдад албан ёсоор зардаг номууд (эзэн 2026-11-12).
 * Түлхүүр нь DB-д хадгалагдана — ӨӨРЧЛӨХГҮЙ; шинэ ном нэмэхдээ мөр нэмнэ.
 */
export const BOOKS = [
  { key: 'E1', title: 'E-1' },
  { key: 'E2', title: 'E-2' },
  { key: 'E3', title: 'E-3' },
  { key: 'HAVTGAI1', title: 'Хавтгай-1' },
  { key: 'HAVTGAI2', title: 'Хавтгай-2' },
  { key: 'OGTORGUI', title: 'Огторгуй' },
  { key: 'PITEST', title: 'Pi test' },
  { key: 'SHALGALT1', title: 'Шалгалт-1' },
] as const;

export type BookKey = (typeof BOOKS)[number]['key'];

const BOOK_TITLE = new Map<string, string>(BOOKS.map((b) => [b.key, b.title]));

export function isBookKey(raw: unknown): raw is BookKey {
  return typeof raw === 'string' && BOOK_TITLE.has(raw);
}

export function bookTitle(key: string): string {
  return BOOK_TITLE.get(key) ?? key;
}

export const BOOK_NOTE_MAX = 200;
/** Нэг номын дүн — 1 сая ₮-аас их байх учиргүй (илүү тэг дарсан алдаанаас сэргийлнэ) */
export const BOOK_AMOUNT_MAX = 1_000_000;

export type BookStatus = 'PAID' | 'SKIPPED';

/** Тайлбар: зай шахаж, 200 тэмдэгтээр таслана; хоосон бол null */
export function cleanBookNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s ? s.slice(0, BOOK_NOTE_MAX).trim() : null;
}

/** Дүн: бүхэл, 0-ээс багагүй, хязгаар дотор. undefined/null = өгөөгүй (null), буруу бол NaN */
export function cleanBookAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return NaN;
  if (raw < 0 || raw > BOOK_AMOUNT_MAX) return NaN;
  return raw;
}

/** Идэвхтэй (хүчинтэй) мөрийн харьцуулалтад хэрэгтэй талбарууд */
export interface PaymentLike {
  studentId: string;
  status: string;
  amount: number | null;
  classroomId: string | null;
  collectedById: string | null;
  note?: string | null;
}

/** Шинээр бичих утга */
export interface PaymentValue {
  status: BookStatus;
  amount: number | null;
  classroomId: string | null;
  collectedById: string | null;
  note: string | null;
}

/** Хоёр мөр агуулгаараа ижил эсэх — ижил бол дахин бичихгүй (түүх бохирдохгүй) */
export function samePayment(a: PaymentLike, b: PaymentValue): boolean {
  return (
    a.status === b.status &&
    a.amount === b.amount &&
    a.classroomId === b.classroomId &&
    a.collectedById === b.collectedById &&
    (a.note ?? null) === b.note
  );
}

/**
 * Ангийн чекээс тэмдэглэх үед өөр ангид төлсөн мөнгийг хөндөж болохгүй:
 * тэр мөнгө тухайн ангийн, тухайн багшийн тооцоонд байгаа. Засах бол сурагчийн
 * хуудаснаас. «Авахгүй» (SKIPPED) мөрийг аль ч ангиас сольж болно.
 */
export function lockedElsewhere(
  active: PaymentLike | null,
  classroomId: string,
): boolean {
  return (
    !!active && active.status === 'PAID' && active.classroomId !== classroomId
  );
}

export interface ClassBookSummary {
  /** Одоогийн сурагчид */
  total: number;
  /** Энэ ангид байхдаа төлсөн (одоогийн сурагч) */
  paidHere: number;
  /** Өөр ангид байхдаа аль хэдийн төлсөн (одоогийн сурагч) */
  paidElsewhere: number;
  /** Энэ номыг авахгүй */
  skipped: number;
  /** Төлөөгүй үлдсэн = total − paidHere − paidElsewhere − skipped */
  left: number;
  /** Энэ ангид төлөөд дараа нь гарсан/шилжсэн сурагч */
  formerPaid: number;
  /** Энэ ангид цугларсан мөнгө (одоогийн + гарсан), дүнгүй мөр 0-ээр */
  collected: number;
}

/**
 * Нэг анги × нэг номын тоо. `payments` = идэвхтэй мөрүүд (одоогийн сурагчдын
 * бүх мөр + энэ ангид төлсөн бүх мөр; давхардсан байж болохгүй).
 */
export function classBookSummary(
  rosterIds: readonly string[],
  payments: readonly PaymentLike[],
  classroomId: string,
): ClassBookSummary {
  const roster = new Set(rosterIds);
  const out: ClassBookSummary = {
    total: roster.size,
    paidHere: 0,
    paidElsewhere: 0,
    skipped: 0,
    left: 0,
    formerPaid: 0,
    collected: 0,
  };
  for (const p of payments) {
    const here = p.classroomId === classroomId;
    const inRoster = roster.has(p.studentId);
    if (p.status === 'PAID') {
      if (here) {
        out.collected += p.amount ?? 0;
        if (inRoster) out.paidHere += 1;
        else out.formerPaid += 1;
      } else if (inRoster) out.paidElsewhere += 1;
    } else if (p.status === 'SKIPPED' && inRoster) out.skipped += 1;
  }
  out.left = out.total - out.paidHere - out.paidElsewhere - out.skipped;
  return out;
}

export interface CollectorTotal {
  collectedById: string;
  count: number;
  sum: number;
  byBook: { bookKey: string; count: number; sum: number }[];
}

/** Багш тус бүрийн хураасан мөнгө (номоор задалсан) — их дүнтэй нь эхэнд */
export function collectorTotals(
  payments: readonly (PaymentLike & { bookKey: string })[],
): CollectorTotal[] {
  const by = new Map<string, CollectorTotal>();
  for (const p of payments) {
    if (p.status !== 'PAID' || !p.collectedById) continue;
    let t = by.get(p.collectedById);
    if (!t) {
      t = { collectedById: p.collectedById, count: 0, sum: 0, byBook: [] };
      by.set(p.collectedById, t);
    }
    t.count += 1;
    t.sum += p.amount ?? 0;
    let b = t.byBook.find((x) => x.bookKey === p.bookKey);
    if (!b) {
      b = { bookKey: p.bookKey, count: 0, sum: 0 };
      t.byBook.push(b);
    }
    b.count += 1;
    b.sum += p.amount ?? 0;
  }
  const order = new Map<string, number>(BOOKS.map((b, i) => [b.key, i]));
  for (const t of by.values())
    t.byBook.sort(
      (a, b) => (order.get(a.bookKey) ?? 99) - (order.get(b.bookKey) ?? 99),
    );
  return [...by.values()].sort((a, b) => b.sum - a.sum || b.count - a.count);
}
