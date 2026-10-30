// Вэб → шийт (эзэн 2026-10-30): вэбээр бүртгүүлсэн танхимын хүүхэд анх ирсэн
// (ирц PRESENT/LATE) өдрөөрөө «Суудал баталгаажуулалт» хуудсанд автоматаар
// нэмэгдэнэ. ЦЭВЭР логик (I/O-гүй) — сонголт, мөр, нүдний утгыг энд тооцно.
//
// Ажилтнууд хүүхдийг хамгийн доод бөглөсөн мөрийн дараах (A-д дугаар нь урьдчилж
// бичигдсэн) хоосон мөрөнд бичдэг — бид ч яг тэгнэ. Аль нэг нүд хоосон биш мөрөнд
// БИЧИХГҮЙ, юуг ч дарж бичихгүй. Төлбөр, хэлбэр (N) зэргийг ажилтан бөглөнө.

import { parseClassroomLabel } from '../users/student-import';
import { DbStudent, normKey, normText, phone8, SHEET, UnmatchedRow } from './payment-plan';

/** Вэбийн ирц 2026-10-23-ноос (бодит ашиглалт) — өмнөх эхлэлийг ирц мэдэхгүй. */
export const ATTENDANCE_START = '2026-10-23';
/** Багш ирцээ засах хугацаа — анх ирснээс хойш 30 минут хүлээгээд бичнэ. */
export const SETTLE_MS = 30 * 60_000;
export const MAX_APPEND_PER_RUN = 10;
/** Үүнээс олон хүүхэд нэг дор хүлээгдвэл алдаа гэж үзээд нэгийг ч бичихгүй. */
export const APPEND_FLOOD = 25;
/** Эзэн жагсаалтын 1-р мөр гарчиг, 2-р мөр хоосон — өгөгдөл 3-р мөрөөс (0-ээс 2). */
export const MAIN_FIRST_DATA_ROW = 2;

export const COL = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12 } as const;
/** Бичих баганын гарчиг (1-р мөр) — өөр байвал хуудасны бүтэц өөрчлөгдсөн гэж үзэж бичихгүй. */
const WRITE_HEADERS: [number, string][] = [
  [COL.B, 'Овог'],
  [COL.C, 'Нэр'],
  [COL.D, 'Анги'],
  [COL.E, 'Өөрийн утас'],
  [COL.F, 'Аав'],
  [COL.G, 'Ээж'],
  [COL.H, 'Сургууль'],
  [COL.I, 'Анги'],
  [COL.K, 'Сууж эхэлсэн'],
  [COL.L, 'Урьдчилгаа'],
  [COL.M, 'Салбар'],
];

export interface AppendCandidate {
  id: string;
  lastName: string;
  firstName: string;
  phone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  school: string | null;
  grade: number | null;
  joinedOn: string | null;
  firstPresent: string;
  /** Идэвхтэй танхимын ангиуд (архивлаагүй, гараагүй) */
  classrooms: string[];
}
export interface AppendRow {
  section: string;
  branch: string | null;
  start: string;
}
export type Verdict = { ok: true; row: AppendRow } | { ok: false; reason: string };

export interface CellWrite {
  col: number;
  value: { stringValue: string } | { numberValue: number } | { formulaValue: string };
  dateFormat?: string;
  note?: string;
}

const isBlank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '');
const asNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return null;
};

/**
 * Эхэлсэн өдөр = анх ирсэн өдөр. Харин ирц бүртгэж эхлэхээс (2026-10-23) өмнө
 * сууж эхэлсэн нь бүртгэлд нь бичигдсэн бол тэр огноо — ирц үүнийг мэдэхгүй.
 */
export function startDateFor(c: Pick<AppendCandidate, 'joinedOn' | 'firstPresent'>): string {
  if (c.joinedOn && c.joinedOn < ATTENDANCE_START && c.joinedOn < c.firstPresent) return c.joinedOn;
  return c.firstPresent;
}

const SECTION_RE = /^\d{1,2}-\d{1,2}$/;
/** Эзэн жагсаалтын «Анги» (I) — «12-4» хэлбэрийн ганц анги байх ёстой. */
export function sectionFor(classrooms: string[]): { section: string; branch: string | null } | { error: string } {
  const bySection = new Map<string, string | null>();
  for (const name of classrooms) {
    const { section, branch } = parseClassroomLabel(name);
    if (section && SECTION_RE.test(section) && !bySection.has(section)) bySection.set(section, branch);
  }
  if (bySection.size === 1) {
    const [[section, branch]] = [...bySection];
    return { section, branch };
  }
  if (bySection.size > 1) return { error: `${bySection.size} ангид зэрэг сурч байна (${[...bySection.keys()].join(', ')})` };
  return { error: classrooms.length ? `«${classrooms.join(', ')}» анги эзэн жагсаалтын ангийн хэлбэрт (жишээ нь 12-4) таарахгүй` : 'идэвхтэй анги алга' };
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const PAYMENT_TABS = new Set<string>([SHEET.MAIN, SHEET.MONTHLY, SHEET.FULL, SHEET.SOCIAL]);
/**
 * Вэбтэй холбогдоогүй шийтийн мөрөөс энэ хүүхэд байж болзошгүйг хайна (нэр нь
 * үсгийн алдаатай, утас нь өөр гэх мэт). Олдвол давхар мөр нэмэхгүй — хүн шалгана.
 * Гарсан/илүү төлөлтийн хуудсанд ах дүү нь байж болох тул тэнд утас дангаараа хангалтгүй.
 */
export function lookalikeRow(c: AppendCandidate, unmatched: UnmatchedRow[]): UnmatchedRow | null {
  const phones = new Set([c.phone, c.fatherPhone, c.motherPhone].map(phone8).filter((p): p is string => !!p));
  const first = normKey(c.firstName);
  const last = normKey(c.lastName);
  for (const r of unmatched) {
    const firstGap = editDistance(first, normKey(r.firstName));
    if (firstGap <= 1 && editDistance(last, normKey(r.lastName)) <= 2) return r;
    const phoneHit = [r.phone, r.fatherPhone, r.motherPhone].some((p) => !!p && phones.has(p));
    if (phoneHit && (PAYMENT_TABS.has(r.tab) || firstGap <= 2)) return r;
  }
  return null;
}

/** Шийттэй холбогдсон өөр сурагч яг ижил овог нэртэй бол вэбд давхар бүртгэл байж магадгүй. */
export function twinInSheet(c: AppendCandidate, students: DbStudent[], matched: Set<string>): DbStudent | null {
  const key = `${normKey(c.lastName)}|${normKey(c.firstName)}`;
  return students.find((s) => s.id !== c.id && matched.has(s.id) && `${normKey(s.lastName)}|${normKey(s.firstName)}` === key) ?? null;
}

export function judge(
  c: AppendCandidate,
  ctx: { today: string; unmatched: UnmatchedRow[]; students: DbStudent[]; matched: Set<string> },
): Verdict {
  if (!normText(c.lastName) || !normText(c.firstName)) return { ok: false, reason: 'овог, нэр хоёулаа бөглөгдсөн байх ёстой — вэбд нөхвөл дараа нь өөрөө нэмэгдэнэ' };
  if (!phone8(c.phone)) return { ok: false, reason: 'өөрийн 8 оронтой утас алга' };
  const section = sectionFor(c.classrooms);
  if ('error' in section) return { ok: false, reason: section.error };
  const start = startDateFor(c);
  if (start > ctx.today) return { ok: false, reason: `эхэлсэн өдөр (${start}) ирээдүйд байна` };
  const twin = twinInSheet(c, ctx.students, ctx.matched);
  if (twin) return { ok: false, reason: `ижил овог нэртэй өөр сурагч шийтэд байна — вэбд давхар бүртгэл эсэхийг шалгана уу` };
  const look = lookalikeRow(c, ctx.unmatched);
  if (look)
    return {
      ok: false,
      reason: `шийтийн «${look.tab}» хуудасны ${look.row}-р мөрөнд төстэй «${`${look.lastName} ${look.firstName}`.trim()}» байна — нэр, утсыг нь тулгаж засна уу`,
    };
  return { ok: true, row: { section: section.section, branch: section.branch, start } };
}

/** Бичих баганын гарчиг таарахгүй бол бичихгүй. */
export function writeHeaderProblems(header: unknown[] | undefined): string[] {
  return WRITE_HEADERS.filter(([col, label]) => !normKey(header?.[col]).startsWith(normKey(label))).map(
    ([col, label]) => `${String.fromCharCode(65 + col)}1: «${label}» байх ёстой, «${normText(header?.[col]) || 'хоосон'}» байна`,
  );
}

/** A-аас бусад нүд нь хоосон, A нь хоосон эсвэл зөвхөн дугаар. */
export function rowIsFree(row: unknown[] | undefined): boolean {
  const r = row ?? [];
  return (isBlank(r[0]) || asNumber(r[0]) != null) && r.slice(1).every(isBlank);
}

export interface FreeSlot {
  /** Шийтийн мөрийн дугаар (1-ээс) */
  row: number;
  /** A хоосон бол бичих дугаар; урьдчилж дугаарласан бол null (хэвээр үлдээнэ) */
  number: number | null;
}
/**
 * Овог/нэртэй хамгийн доод мөрийн дараах сул мөрүүд. Дунд нь агуулгатай (нэргүй)
 * мөр тааралдвал зогсоно — нийлбэр, тайлбарын мөрийн доор бичихгүй.
 */
export function freeRows(grid: unknown[][], count: number, rowCount: number): FreeSlot[] {
  let last = MAIN_FIRST_DATA_ROW - 1;
  grid.forEach((r, i) => {
    if (i >= MAIN_FIRST_DATA_ROW && (!isBlank(r?.[COL.B]) || !isBlank(r?.[COL.C]))) last = i;
  });
  const out: FreeSlot[] = [];
  let prevNo = asNumber(grid[last]?.[COL.A]);
  for (let i = last + 1; out.length < count && i < rowCount; i++) {
    const r = grid[i];
    if (!rowIsFree(r)) break;
    const own = asNumber(r?.[COL.A]);
    out.push({ row: i + 1, number: own == null && prevNo != null ? prevNo + 1 : null });
    prevNo = own ?? (prevNo != null ? prevNo + 1 : null);
  }
  return out;
}

/** «=sum(O696,R696,…)» → шинэ мөрийн дугаартай. Зөвхөн нэг мөрийн нүднүүдийн нийлбэрийг хуулна. */
export function sumFormulaFor(source: unknown, sourceRow: number, row: number): string | null {
  if (typeof source !== 'string') return null;
  const m = /^=\s*sum\s*\((.+)\)\s*$/i.exec(source.trim());
  if (!m) return null;
  const refs = m[1].split(',').map((s) => s.trim());
  const sameRow = new RegExp(`^[A-Z]{1,3}${sourceRow}$`);
  if (!refs.every((r) => sameRow.test(r))) return null;
  return `=sum(${refs.map((r) => r.replace(/\d+$/, String(row))).join(',')})`;
}
/** Доод талын бөглөсөн мөрүүдээс «Урьдчилгаа»-гийн нийлбэрийн томьёог олно. */
export function findSumFormula(grid: unknown[][]): { row: number; formula: string } | null {
  for (let i = grid.length - 1, looked = 0; i >= MAIN_FIRST_DATA_ROW && looked < 30; i--) {
    if (isBlank(grid[i]?.[COL.B]) && isBlank(grid[i]?.[COL.C])) continue;
    looked++;
    const f = grid[i]?.[COL.L];
    if (sumFormulaFor(f, i + 1, i + 1)) return { row: i + 1, formula: f as string };
  }
  return null;
}

export function isoToSerial(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

/** «Баруун 4» → «баруун» (шийтийн «Салбар» багана жижиг үсгээр). */
const branchText = (branch: string | null) => {
  const w = normText(branch).split(' ')[0]?.toLowerCase();
  return w === 'баруун' || w === 'зүүн' ? w : null;
};

export function rowWrites(
  c: AppendCandidate,
  row: AppendRow,
  slot: FreeSlot,
  opts: { today: string; formula: string | null },
): CellWrite[] {
  const text = (col: number, v: string | null | undefined): CellWrite[] => (normText(v) ? [{ col, value: { stringValue: normText(v) } }] : []);
  const phone = (col: number, v: string | null): CellWrite[] => {
    const p = phone8(v);
    return p ? [{ col, value: { numberValue: Number(p) } }] : [];
  };
  return [
    ...(slot.number != null ? [{ col: COL.A, value: { numberValue: slot.number } }] : []),
    { col: COL.B, value: { stringValue: normText(c.lastName) }, note: `pimath.mn вэбээс автоматаар нэмэв (${opts.today}) — анх ирсэн өдөр ${row.start}` },
    { col: COL.C, value: { stringValue: normText(c.firstName) } },
    ...(c.grade && c.grade >= 1 && c.grade <= 12 ? text(COL.D, `${c.grade}-р анги`) : []),
    ...phone(COL.E, c.phone),
    ...phone(COL.F, c.fatherPhone),
    ...phone(COL.G, c.motherPhone),
    ...text(COL.H, c.school),
    // «12-4» гэж огноо болгочихгүйн тулд текстээр
    { col: COL.I, value: { stringValue: row.section } },
    { col: COL.J, value: { stringValue: 'Шинэ' } },
    { col: COL.K, value: { numberValue: isoToSerial(row.start) }, dateFormat: 'mm/dd' },
    ...(opts.formula ? [{ col: COL.L, value: { formulaValue: opts.formula } }] : []),
    ...text(COL.M, branchText(row.branch)),
  ];
}

/** Нүд бүрийг тусад нь (зөвхөн тэр нүдний талбарыг) — нэг batchUpdate дотор бүгд эсвэл юу ч биш. */
export function toRequests(sheetId: number, row: number, writes: CellWrite[]) {
  return writes.map((w) => {
    const cell: Record<string, unknown> = { userEnteredValue: w.value };
    const fields = ['userEnteredValue'];
    if (w.dateFormat) {
      cell.userEnteredFormat = { numberFormat: { type: 'DATE', pattern: w.dateFormat } };
      fields.push('userEnteredFormat.numberFormat');
    }
    if (w.note) {
      cell.note = w.note;
      fields.push('note');
    }
    return {
      updateCells: {
        range: { sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: w.col, endColumnIndex: w.col + 1 },
        rows: [{ values: [cell] }],
        fields: fields.join(','),
      },
    };
  });
}

/** Бичсэний дараа буцааж уншаад (A…K, UNFORMATTED) овог, нэр, утас, огноо таарч буйг шалгана. */
export function verifyWritten(values: unknown[] | undefined, c: AppendCandidate, row: AppendRow): boolean {
  const v = values ?? [];
  return (
    normKey(v[COL.B]) === normKey(c.lastName) &&
    normKey(v[COL.C]) === normKey(c.firstName) &&
    phone8(v[COL.E]) === phone8(c.phone) &&
    normText(v[COL.I]) === row.section &&
    asNumber(v[COL.K]) === isoToSerial(row.start)
  );
}
