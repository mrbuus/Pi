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
] as const;

const BOOK_TITLE = new Map<string, string>(BOOKS.map((b) => [b.key, b.title]));

/**
 * Шалгалтын хариултын хуудасны мөнгө (эзэн 2026-11-12) — ном БИШ, гэхдээ яг адил
 * бүртгэгдэнэ. Хоёр төрөл:
 *  - НЭГДСЭН шалгалт (төв даяар бүх анги ижил шалгалт авна): түлхүүр SHEET1, SHEET2 …
 *    — бүх ангид ИЖИЛ. Анги сольсон сурагч өмнөх ангидаа төлсөн бол шинэ ангид
 *    «төлсөн» гэж гарна.
 *  - АНГИЙН шалгалт (анги тус бүр өөрийнхөө): түлхүүр CSHEET1:<classroomId> — анги
 *    бүрт ТУСДАА зүйл. Өөр ангийн «Ангийн шалгалт 1» огт хамаарахгүй.
 * Дугаарыг сервер өгнө: тэр ангийн тухайн төрлийн дараагийнх.
 */
export const SHEET_KIND = 'SHEET';
export const CLASS_SHEET_KIND = 'CSHEET';
export const SHEET_MAX = 99;
const SHEET_RE = /^SHEET([1-9]\d?)$/;
const CLASS_SHEET_RE = /^CSHEET([1-9]\d?):([a-z0-9]{1,36})$/;

/** SHEET3 → 3; нэгдсэн шалгалтын хуудас биш бол null */
export function sheetNumber(key: string): number | null {
  const m = SHEET_RE.exec(key);
  return m ? Number(m[1]) : null;
}

/** CSHEET3:<classroomId> → { n: 3, classroomId }; ангийн шалгалтын хуудас биш бол null */
export function classSheet(
  key: string,
): { n: number; classroomId: string } | null {
  const m = CLASS_SHEET_RE.exec(key);
  return m ? { n: Number(m[1]), classroomId: m[2] } : null;
}

/** Шалгалтын хуудас (аль ч төрөл) — дугаарыг нь клиент өөрөө өгч болохгүй */
export function isSheetKey(key: string): boolean {
  return sheetNumber(key) !== null || classSheet(key) !== null;
}

/** Бүртгэж болох зүйл: ном эсвэл шалгалтын хуудас */
export function isBookKey(raw: unknown): raw is string {
  return typeof raw === 'string' && (BOOK_TITLE.has(raw) || isSheetKey(raw));
}

export function bookTitle(key: string): string {
  const n = sheetNumber(key);
  if (n !== null) return `Нэгдсэн шалгалт ${n}`;
  const c = classSheet(key);
  return c ? `Ангийн шалгалт ${c.n}` : (BOOK_TITLE.get(key) ?? key);
}

/**
 * Тэр ангид өмнө нээсэн (устгасныг оролцуулаад) тухайн төрлийн хуудаснуудын
 * дараагийн дугаар. `classroomId` өгвөл ангийн шалгалт, өгөхгүй бол нэгдсэн.
 */
export function nextSheetKey(
  existingKeys: readonly string[],
  classroomId?: string,
): string | null {
  const num = (k: string) =>
    (classroomId ? classSheet(k)?.n : sheetNumber(k)) ?? 0;
  const max = Math.max(0, ...existingKeys.map(num));
  if (max >= SHEET_MAX) return null;
  return classroomId
    ? `${CLASS_SHEET_KIND}${max + 1}:${classroomId}`
    : `${SHEET_KIND}${max + 1}`;
}

/** Жагсаалтын дараалал: ном (BOOKS-ийн дарааллаар) → нэгдсэн шалгалт → ангийн шалгалт */
export function bookOrder(key: string): number {
  const i = BOOKS.findIndex((b) => b.key === key);
  if (i >= 0) return i;
  const n = sheetNumber(key);
  return n !== null ? 100 + n : 200 + (classSheet(key)?.n ?? 99);
}

/**
 * «Мөнгийг авсан багш» сонгогчийн дараалал (эзэн 2026-11-12): эхлээд эдгээр нэр
 * энэ дарааллаар, үлдсэн нь нэрийн дарааллаар.
 */
export const COLLECTOR_ORDER = [
  'Баасанжав',
  'Дуламсүрэн',
  'Баасансүрэн',
  'Бадрал',
  'Энхсайхан',
  'Ундаръяа',
  'Ганзаяа',
  'Өсөхбаяр',
  'Даариймаа',
  'Болортуяа',
  'Заяа',
] as const;

export function sortCollectors<
  T extends { firstName: string; lastName: string },
>(people: readonly T[]): T[] {
  const rank = (p: T) => {
    const i = (COLLECTOR_ORDER as readonly string[]).indexOf(
      p.firstName.trim(),
    );
    return i < 0 ? COLLECTOR_ORDER.length : i;
  };
  return [...people].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.firstName.localeCompare(b.firstName, 'mn') ||
      a.lastName.localeCompare(b.lastName, 'mn'),
  );
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
  for (const t of by.values())
    t.byBook.sort((a, b) => bookOrder(a.bookKey) - bookOrder(b.bookKey));
  return [...by.values()].sort((a, b) => b.sum - a.sum || b.count - a.count);
}
