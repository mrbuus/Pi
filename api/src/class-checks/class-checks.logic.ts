/** «Чек» — цэвэр туслах функцууд (DB-гүй, jest-ээр шалгана). */

import {
  BOOKS,
  bookTitle,
  classSheet,
  isBookKey,
  nextSheetKey,
  sheetNumber,
} from '../book-payments/book-payments.logic';

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
): {
  checked: number;
  total: number;
  formerChecked: number;
  collected: number | null;
} {
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

// ───────────── Сурагчийн товч мэдээлэл (Чекийн жагсаалтаас нэр дарахад) ─────────────

export type ContactKind = 'student' | 'father' | 'mother' | 'parent';

export interface StudentContact {
  kind: ContactKind;
  /** Утасны дугаар — хадгалсан хэлбэрээр нь (зай, +976 хэвээр) */
  phone: string;
  /** Аппад холбогдсон эцэг эхийн нэр (kind=parent, эсвэл аав/ээжийн дугаар аппынхтай таарвал) */
  name?: string;
  /** Энэ дугаар аппад эцэг эхийн бүртгэлтэй холбогдсон эсэх */
  appLinked?: boolean;
}

/**
 * Дугаарыг харьцуулах түлхүүр: зөвхөн цифр, урдах 976-г хасна (8 оронтой үлдвэл).
 * Хоосон/цифргүй бол null.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('976')) d = d.slice(3);
  return d || null;
}

/**
 * Утасны жагсаалт: сурагч → аав → ээж → аппын эцэг эх. Ижил дугаар (зай/+976
 * ялгаагүй) нэг л удаа гарна — аппын эцэг эхийн дугаар аав/ээжийнхтэй таарвал
 * тэр мөрөнд «аппад холбогдсон» гэж нэмэгдэнэ, тусдаа мөр болохгүй.
 */
export function studentContacts(input: {
  studentPhone?: string | null;
  fatherPhone?: string | null;
  motherPhone?: string | null;
  parents?: readonly { name: string; phone: string | null }[];
}): StudentContact[] {
  const out: StudentContact[] = [];
  const byKey = new Map<string, StudentContact>();
  const add = (
    kind: ContactKind,
    raw: string | null | undefined,
    name?: string,
  ) => {
    const phone = raw?.trim();
    const key = phoneKey(phone);
    if (!phone || !key) return;
    const existing = byKey.get(key);
    if (existing) {
      // Сурагчийн өөрийн дугаараар эцэг эх нэвтэрсэн бол сурагчийн мөрөнд юу ч нэмэхгүй
      if (kind === 'parent' && existing.kind !== 'student') {
        existing.appLinked = true;
        existing.name ??= name;
      }
      return;
    }
    const c: StudentContact =
      kind === 'parent'
        ? { kind, phone, name, appLinked: true }
        : { kind, phone };
    byKey.set(key, c);
    out.push(c);
  };
  add('student', input.studentPhone);
  add('father', input.fatherPhone);
  add('mother', input.motherPhone);
  for (const p of input.parents ?? []) add('parent', p.phone, p.name);
  return out;
}

// ───────────── Энгийн чекийг ном/шалгалтын хуудасны чек болгох (эзэн 2026-11-18) ─────────────

export type ConvertKind = 'SHEET' | 'CSHEET' | 'BOOK';

export interface ConvertTarget {
  kind: ConvertKind;
  /** BookPayment/ClassCheck-ийн түлхүүр — клиент өөрөө зохиохгүй, эндээс сонгоно */
  key: string;
  title: string;
  /** SHEET/CSHEET-ийн дугаар */
  n: number | null;
  /** Шинэ дугаар (төвд/ангид одоогоор байхгүй) */
  isNew: boolean;
  /** Энэ ангид энэ түлхүүртэй чек: нээлттэй (нэгтгэнэ), нуусан (эхлээд гаргана), байхгүй */
  here: 'open' | 'archived' | null;
}

/**
 * Энгийн чекийг хөрвүүлэх сонголтууд. Нэгдсэн шалгалт — төвийн аль нэг ангид
 * нээлттэй/нуусан (устгаагүй) дугаарууд + дараагийн шинэ (устгасныг оролцуулан
 * хамгийн их + 1). Ангийн шалгалт — энэ ангийн устгаагүй дугаарууд + дараагийнх.
 * Ном — BOOKS бүгд.
 */
export function convertTargets(input: {
  classroomId: string;
  /** Төвийн бүх ангийн SHEET* чек (устгасныг оролцуулан) */
  centreSheets: readonly { bookKey: string; deleted: boolean }[];
  /** Энэ ангийн CSHEET* чек (устгасныг оролцуулан) */
  classSheets: readonly { bookKey: string; deleted: boolean }[];
  /** Энэ ангийн устгаагүй түлхүүртэй чекүүд */
  here: readonly { bookKey: string; archived: boolean }[];
}): ConvertTarget[] {
  const hereOf = (key: string): ConvertTarget['here'] => {
    const c = input.here.find((h) => h.bookKey === key);
    return c ? (c.archived ? 'archived' : 'open') : null;
  };
  const out: ConvertTarget[] = [];
  const live = (rows: readonly { bookKey: string; deleted: boolean }[]) =>
    [...new Set(rows.filter((r) => !r.deleted).map((r) => r.bookKey))].filter(
      isBookKey,
    );

  const sheetKeys = live(input.centreSheets)
    .filter((k) => sheetNumber(k) !== null)
    .sort((a, b) => sheetNumber(a)! - sheetNumber(b)!);
  const nextSheet = nextSheetKey(input.centreSheets.map((r) => r.bookKey));
  for (const key of nextSheet ? [...sheetKeys, nextSheet] : sheetKeys)
    out.push({
      kind: 'SHEET',
      key,
      title: bookTitle(key),
      n: sheetNumber(key),
      isNew: key === nextSheet,
      here: hereOf(key),
    });

  const own = input.classSheets.filter(
    (r) => classSheet(r.bookKey)?.classroomId === input.classroomId,
  );
  const classKeys = live(own).sort(
    (a, b) => classSheet(a)!.n - classSheet(b)!.n,
  );
  const nextClass = nextSheetKey(
    own.map((r) => r.bookKey),
    input.classroomId,
  );
  for (const key of nextClass ? [...classKeys, nextClass] : classKeys)
    out.push({
      kind: 'CSHEET',
      key,
      title: bookTitle(key),
      n: classSheet(key)?.n ?? null,
      isNew: key === nextClass,
      here: hereOf(key),
    });

  for (const b of BOOKS)
    out.push({
      kind: 'BOOK',
      key: b.key,
      title: b.title,
      n: null,
      isNew: false,
      here: hereOf(b.key),
    });
  return out;
}
