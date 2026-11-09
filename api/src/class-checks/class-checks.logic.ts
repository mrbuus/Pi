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
