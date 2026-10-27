// «2027 оны төлбөрийн мэдээлэл» шийтийг ӨС-ийн сурагч, төлбөр, тэмдэглэл болгон
// задлах ЦЭВЭР логик (I/O-гүй). `prisma/import-payments-2027.cjs`-ийн дүрмийг
// шилжүүлсэн бөгөөд төлбөрийн түлхүүр (`key`) нь яг ижил — тиймээс 2026-10-13-нд
// Excel-ээс орсон 911 гүйлгээ дахин давхардахгүй (stableUuid → clientRequestId).
//
// Хуучин скриптээс ялгаа:
//  - Сарын баганыг гарчгаас нь олно (2-р мөрийн «Төлсөн дүн»). Шийтэд шинэ сар
//    нэмэгдвэл код өөрчлөхгүй уншина. Ижил сарын гарчиг давхардвал өгөгдлийг
//    алдахгүйн тулд баганын үсгээр ялгаж, анхааруулга өгнө.
//  - Гарчиг хүлээгдсэнээс өөр бол тэр хуудсыг ТӨЛБӨРТ ОРУУЛАХГҮЙ (буруу баганаас
//    уншиж мөнгө андуурахаас сэргийлнэ) — «бүтэц өөрчлөгдсөн» алдаа гарна.
//  - Тайланд л үлддэг байсан бүх зөрүүг `issues` болгож буцаана.

import { createHash } from 'node:crypto';
import { Book, Cell, colLetter } from './sheet-book';

export const SHEET = {
  MAIN: 'Суудал баталгаажуулалт',
  FULL: 'Бүтэн жил',
  MONTHLY: 'Сар бүр',
  SOCIAL: 'Нийгэм',
  OVERPAID: 'Илүү төлөлт',
  LEFT: 'гарсан',
} as const;
/** Хичээлийн жил 2026-06 … 2027-05 (шийтийн нэр «2027 оны …»). */
export const SCHOOL_YEAR_START = 2026;
export const IMPORT_TAG = 'Excel 2027';
const KEY_NAMESPACE = 'import-payments-2027';

export type Severity = 'ERROR' | 'WARN' | 'INFO';
export interface PlanIssue {
  kind: string;
  severity: Severity;
  tab?: string;
  row?: number; // шийтийн мөрийн дугаар (1-ээс)
  rowKey?: string;
  studentId?: string;
  title: string;
  detail?: Record<string, unknown>;
  /** Нэг мөрөнд ижил төрлийн хэд хэдэн зөрүү байвал ялгах нэмэлт түлхүүр */
  fp?: string;
}

export interface DbStudent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  plan: string | null;
  tuitionAmount: number | null;
  joinedOn: string | null;
  leftOn: string | null;
  classroomName: string | null;
}

export interface PlannedPayment {
  key: string;
  /** Шийтийн нүд (`main|2026-09`) — урьдчилгаа/үлдэгдэл задарсан ч ижил нүд. */
  cell: string;
  amount: number;
  kind: 'FULL' | 'HALF' | 'MONTH';
  forMonth: string;
  paidOn: string | null;
  receipts: string[];
  label: string;
}
export interface PlannedNote {
  body: string;
  promisedOn: string | null;
}
export interface StudentBucket {
  student: DbStudent;
  payments: PlannedPayment[];
  notes: PlannedNote[];
  plan: string | null;
  start: string | null;
  leftOn: string | null;
  resolvedPlan: string | null;
  resolvedAmount: number | null;
  rowKeys: string[]; // энэ сурагчид тааруулсан шийтийн мөрүүд (`tab|rowKey`)
}
export interface UnmatchedRow {
  tab: string;
  row: number;
  rowKey: string;
  lastName: string;
  firstName: string;
  phone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  section: string | null;
  branch: string | null;
  school: string | null;
  grade: number | null;
  start: string | null;
  form: string | null;
  paidTotal: number;
  conflict?: string;
}
export interface Plan {
  perStudent: Map<string, StudentBucket>;
  issues: PlanIssue[];
  unmatched: UnmatchedRow[];
  /** `tab|rowKey` → сурагчийн id */
  rowMatches: Map<string, { studentId: string; by: string }>;
  skippedTabs: string[];
  /** Шийтийн бүх төлбөрийн нүд (`main|2026-09` …) — хуучин гүйлгээг нүдэнд холбоход */
  cells: string[];
  stats: { rows: Record<string, number>; payments: number; amount: number; notes: number };
}

// ---------- туслах ----------
export const normText = (v: unknown) =>
  v == null ? '' : String(v).normalize('NFC').replace(/\s+/g, ' ').trim();
export const normKey = (v: unknown) =>
  normText(v).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
export function phone8(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\.0$/, '').replace(/\D/g, '');
  return /^\d{8}$/.test(s) ? s : null;
}
const pad2 = (n: number) => String(n).padStart(2, '0');
/** «Анги» нүд: Google Sheets «12-11»-ийг огноо (12-р сарын 11) болгох нь бий → буцааж «12-11». */
export function sectionText(v: Cell | undefined): string | null {
  const m = isIso(v) ? (v as string).match(/^\d{4}-(\d{2})-(\d{2})$/) : null;
  return m ? `${Number(m[1])}-${Number(m[2])}` : normText(v) || null;
}
const yearFor = (month: number) => (month >= 6 ? SCHOOL_YEAR_START : SCHOOL_YEAR_START + 1);
function mdToIso(m: string | number, d: string | number, yearHint?: number): string | null {
  const month = Number(m);
  const day = Number(d);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  return `${yearHint ?? yearFor(month)}-${pad2(month)}-${pad2(day)}`;
}
const mnt = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;

/** «Баримт» нүд: огноо эсвэл «04/14, 04/17», «2026-08-16, 09/30» → өнгөрсөн огноонууд. */
export function receiptDates(v: Cell | undefined, today: string): string[] {
  if (v == null || v === '') return [];
  if (isIso(v)) return v <= today ? [v] : [];
  const s = String(v);
  const out: string[] = [];
  for (const m of s.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) out.push(`${m[1]}-${m[2]}-${m[3]}`);
  const stripped = s.replace(/\d{4}-\d{2}-\d{2}/g, ' ');
  // Баримтын огноо өнгөрсөнд: эхний он (4-р сарын урьдчилгаа ч 2026)
  for (const m of stripped.matchAll(/(\d{1,2})\/(\d{1,2})/g)) {
    const iso = mdToIso(m[1], m[2], SCHOOL_YEAR_START);
    if (iso) out.push(iso);
  }
  return out.filter((d) => d <= today).sort();
}

/** «Хугацаа» нүд → мөчлөгийн эхлэх сар эсвэл бүтэн/хагас. */
export function parsePeriod(v: Cell | undefined): { kind: 'FULL' | 'HALF' | 'MONTH' | 'TEXT' | null; month?: string; text?: string } {
  const s = normText(v).toLowerCase();
  if (!s) return { kind: null };
  if (/бүтэн/.test(s)) return { kind: 'FULL' };
  if (/хагас/.test(s)) return { kind: 'HALF' };
  const m = s.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
  if (m) return { kind: 'MONTH', month: `${yearFor(Number(m[1]))}-${pad2(Number(m[1]))}`, text: s };
  return { kind: 'TEXT', text: normText(v) };
}

/** «10.7 ноос өмнө», «9/1 өмнө», «12.20 үлд», «10.01 нд» → амласан өдөр. */
export function parsePromise(text: unknown): string | null {
  const s = normText(text);
  if (!s || /дууссан/i.test(s)) return null;
  const m = s.match(/(\d{1,2})\s*[./]\s*(\d{1,2})/);
  return m ? mdToIso(m[1], m[2]) : null;
}

/** Тогтмол UUID (v4 хэлбэр) — idempotency түлхүүр. Хуучин скрипттэй ЯГ ижил. */
export function stableUuid(...parts: string[]): string {
  const h = createHash('sha256').update(parts.join('|')).digest('hex');
  const v = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${v}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export const paymentRequestId = (studentId: string, key: string) => stableUuid(KEY_NAMESPACE, studentId, key);

function hasData(row: Cell[] | undefined, upto = 14): boolean {
  return !!row && row.slice(0, upto).some((v) => v !== null && v !== '');
}

/**
 * Мөрийн тогтмол түлхүүр — шийтийг эрэмбэлэх/шүүхэд мөрийн дугаар өөрчлөгддөг
 * тул нэр + эхний хүчинтэй утсаар (өөрийн → аав → ээж) тодорхойлно. Бүх
 * хуудсанд B=овог, C=нэр, E/F/G=утас байрлалтай.
 */
export function baseRowKey(row: Cell[]): string | null {
  const name = `${normKey(row[1])}|${normKey(row[2])}`;
  if (name === '|') return null;
  const phone = phone8(row[4]) ?? phone8(row[5]) ?? phone8(row[6]) ?? '';
  return `${name}|${phone}`;
}
/** Хуудас доторх давхардсан түлхүүрийг #2, #3 болгож ялгана. */
export function assignRowKeys(rows: Cell[][], firstDataRow: number): Map<number, string> {
  const seen = new Map<string, number>();
  const out = new Map<number, string>();
  rows.forEach((row, i) => {
    if (i < firstDataRow) return;
    const base = baseRowKey(row);
    if (!base) return;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.set(i, n === 1 ? base : `${base}#${n}`);
  });
  return out;
}

// ---------- гарчгийн шалгалт ----------
type HeaderSpec = { row: 0 | 1; col: number; label: string }[];
const STUDENT_COLS: HeaderSpec = [
  { row: 0, col: 1, label: 'Овог' },
  { row: 0, col: 2, label: 'Нэр' },
  { row: 0, col: 4, label: 'Өөрийн утас' },
];
export const HEADER_SPECS: Record<string, HeaderSpec> = {
  [SHEET.MAIN]: [...STUDENT_COLS, { row: 0, col: 8, label: 'Анги' }, { row: 0, col: 10, label: 'Сууж эхэлсэн' }, { row: 0, col: 11, label: 'Урьдчилгаа' }, { row: 0, col: 13, label: 'Хэлбэр' }, { row: 1, col: 14, label: 'Төлсөн дүн' }],
  [SHEET.MONTHLY]: [...STUDENT_COLS, { row: 0, col: 8, label: 'Анги' }, { row: 0, col: 10, label: 'Сууж эхэлсэн' }, { row: 0, col: 13, label: 'Хэлбэр' }, { row: 1, col: 14, label: 'Төлсөн дүн' }],
  [SHEET.SOCIAL]: [...STUDENT_COLS, { row: 0, col: 8, label: 'Сууж эхэлсэн' }, { row: 0, col: 10, label: 'Хэлбэр' }, { row: 1, col: 11, label: 'Төлсөн дүн' }],
  [SHEET.FULL]: [...STUDENT_COLS, { row: 0, col: 9, label: 'Урьдчилгаа' }, { row: 0, col: 11, label: 'Үлдэгдэл' }, { row: 1, col: 9, label: 'Төлсөн дүн' }],
  [SHEET.LEFT]: [{ row: 0, col: 1, label: 'Овог' }, { row: 0, col: 2, label: 'нэр' }, { row: 0, col: 10, label: 'Ирсэн өдөр' }, { row: 0, col: 11, label: 'Гарсан өдөр' }],
  [SHEET.OVERPAID]: [{ row: 0, col: 1, label: 'Овог' }, { row: 0, col: 2, label: 'нэр' }, { row: 0, col: 10, label: 'Төлсөн төлбөр' }, { row: 0, col: 11, label: 'Буцаах төлбөр' }],
};
export function headerProblems(rows: Cell[][] | undefined, spec: HeaderSpec): string[] {
  if (!rows) return ['хуудас олдсонгүй'];
  return spec
    .filter(({ row, col, label }) => !normKey(rows[row]?.[col]).startsWith(normKey(label)))
    .map(({ row, col, label }) => `${colLetter(col)}${row + 1}: «${label}» байх ёстой, «${normText(rows[row]?.[col]) || 'хоосон'}» байна`);
}

/** 2-р мөрийн «Төлсөн дүн»-ээр мөчлөгийн багануудыг олно. Давхардсан сар → баганаар ялгана. */
export function findCycles(rows: Cell[][], tab: string, issues: PlanIssue[]): { month: string; col: number; key: string }[] {
  const out: { month: string; col: number; key: string }[] = [];
  const used = new Set<string>();
  (rows[1] ?? []).forEach((v, col) => {
    if (normKey(v) !== normKey('Төлсөн дүн')) return;
    const label = normText(rows[0]?.[col]);
    const m = label.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
    if (!m) {
      issues.push({ kind: 'HEADER', severity: 'WARN', tab, title: `${colLetter(col)} баганын сарын гарчиг уншигдсангүй`, detail: { label } });
      return;
    }
    const month = `${yearFor(Number(m[1]))}-${pad2(Number(m[1]))}`;
    const dup = used.has(month);
    used.add(month);
    out.push({ month, col, key: dup ? `${month}@${colLetter(col)}` : month });
  });
  return out;
}

// ---------- тааруулах ----------
export interface StudentIndex {
  all: DbStudent[];
  byPhone: Map<string, DbStudent[]>;
  byName: Map<string, DbStudent[]>;
  byParent: Map<string, DbStudent[]>;
}
export function indexStudents(rows: DbStudent[]): StudentIndex {
  const byPhone = new Map<string, DbStudent[]>();
  const byName = new Map<string, DbStudent[]>();
  const byParent = new Map<string, DbStudent[]>();
  const add = (map: Map<string, DbStudent[]>, key: string | null, s: DbStudent) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    if (!list.includes(s)) list.push(s);
    map.set(key, list);
  };
  for (const s of rows) {
    add(byPhone, phone8(s.phone), s);
    add(byName, `${normKey(s.lastName)}|${normKey(s.firstName)}`, s);
    add(byParent, phone8(s.fatherPhone), s);
    add(byParent, phone8(s.motherPhone), s);
  }
  return { all: rows, byPhone, byName, byParent };
}

export function matchStudent(
  db: StudentIndex,
  who: { last: Cell | undefined; first: Cell | undefined; phone: Cell | undefined; father: Cell | undefined; mother: Cell | undefined },
): { student: DbStudent; by: string } | { conflict: string } | null {
  const p = phone8(who.phone);
  const nameKey = `${normKey(who.last)}|${normKey(who.first)}`;
  const firstKey = normKey(who.first);
  if (p) {
    const hits = db.byPhone.get(p) ?? [];
    if (hits.length === 1) return { student: hits[0], by: 'phone' };
    if (hits.length > 1) {
      const named = hits.filter((s) => normKey(s.firstName) === firstKey);
      if (named.length === 1) return { student: named[0], by: 'phone+name' };
    }
  }
  const named = db.byName.get(nameKey) ?? [];
  if (named.length === 1) return { student: named[0], by: 'name' };
  if (named.length > 1) return { conflict: `Ижил нэртэй ${named.length} сурагч` };
  for (const pp of [phone8(who.father), phone8(who.mother)]) {
    if (!pp) continue;
    const hits = (db.byParent.get(pp) ?? []).filter((s) => normKey(s.firstName) === firstKey);
    if (hits.length === 1) return { student: hits[0], by: 'parent-phone+name' };
  }
  return null;
}

export const planFromForm = (form: Cell | undefined): string | null => {
  const f = normText(form).toLowerCase().replace(/^c/, 'с'); // латин c → кирилл с
  if (/^бүтэн$/.test(f)) return 'FULL_YEAR';
  if (/^хагас$/.test(f)) return 'INSTALLMENT';
  if (/^(сар бүр|суудал)$/.test(f)) return 'MONTHLY';
  return null;
};

// ---------- төлөвлөгөө ----------
export function buildPlan(book: Book, students: DbStudent[], today: string): Plan {
  const db = indexStudents(students);
  const issues: PlanIssue[] = [];
  const unmatched: UnmatchedRow[] = [];
  const rowMatches = new Map<string, { studentId: string; by: string }>();
  const skippedTabs: string[] = [];
  const cells: string[] = [];
  const stats = { rows: {} as Record<string, number>, payments: 0, amount: 0, notes: 0 };
  const perStudent = new Map<string, StudentBucket>();

  const bucket = (s: DbStudent): StudentBucket => {
    let b = perStudent.get(s.id);
    if (!b) {
      b = { student: s, payments: [], notes: [], plan: null, start: null, leftOn: null, resolvedPlan: null, resolvedAmount: null, rowKeys: [] };
      perStudent.set(s.id, b);
    }
    return b;
  };
  const addNote = (b: StudentBucket, body: string, promisedOn: string | null, sheet: string) => {
    const text = `${IMPORT_TAG} (${sheet}): ${body}`.slice(0, 4000);
    if (!b.notes.some((n) => n.body === text)) b.notes.push({ body: text, promisedOn });
  };
  const usable = (tab: string): Cell[][] | null => {
    const rows = book[tab];
    const problems = headerProblems(rows, HEADER_SPECS[tab]);
    if (problems.length) {
      skippedTabs.push(tab);
      issues.push({
        kind: 'HEADER',
        severity: 'ERROR',
        tab,
        title: rows ? `«${tab}» хуудасны бүтэц өөрчлөгдсөн тул төлбөрт оруулсангүй` : `«${tab}» хуудас олдсонгүй`,
        detail: { problems },
      });
      return null;
    }
    return rows!;
  };
  const resolve = (tab: string, row: Cell[], idx: number, rowKey: string | undefined) => {
    if (!rowKey) return null;
    const who = { last: row[1], first: row[2], phone: row[4], father: row[5], mother: row[6] };
    const label = `${normText(who.last)} ${normText(who.first)}`.trim();
    const ownRaw = normText(row[4]);
    if (ownRaw && !phone8(row[4]))
      issues.push({ kind: 'BAD_PHONE', severity: 'WARN', tab, row: idx + 1, rowKey, title: `${label}: өөрийн утас «${ownRaw}» 8 оронтой биш` });
    const m = matchStudent(db, who);
    if (!m || 'conflict' in m) {
      return { unmatched: { conflict: m && 'conflict' in m ? m.conflict : undefined, label } };
    }
    rowMatches.set(`${tab}|${rowKey}`, { studentId: m.student.id, by: m.by });
    return { student: m.student };
  };
  const pushUnmatched = (tab: string, row: Cell[], idx: number, rowKey: string, conflict: string | undefined, paidTotal: number, cols: { section?: number; start?: number; form?: number; branch?: number }) => {
    unmatched.push({
      tab,
      row: idx + 1,
      rowKey,
      lastName: normText(row[1]),
      firstName: normText(row[2]),
      phone: phone8(row[4]),
      fatherPhone: phone8(row[5]),
      motherPhone: phone8(row[6]),
      school: normText(row[7]) || null,
      grade: Number(String(row[3] ?? '').match(/\d+/)?.[0]) || null,
      section: cols.section != null ? sectionText(row[cols.section]) : null,
      branch: cols.branch != null ? normText(row[cols.branch]) || null : null,
      start: cols.start != null && isIso(row[cols.start]) ? (row[cols.start] as string) : null,
      form: cols.form != null ? normText(row[cols.form]) || null : null,
      paidTotal,
      conflict,
    });
  };

  // 1) Мөчлөгтэй хуудсууд: эзэн жагсаалт, «Сар бүр» (зөвхөн эзэнд байхгүй), «Нийгэм»
  const SHEET_LABEL: Record<string, string> = { main: SHEET.MAIN, monthly: SHEET.MONTHLY, social: SHEET.SOCIAL };
  const monthLabel = (m: string) => `${Number(m.slice(5, 7))}-р сарын төлбөр`;
  const cycleSum = (row: Cell[], cycles: { col: number }[]) => cycles.reduce((t, { col }) => t + (isNum(row[col]) && row[col] > 0 ? (row[col] as number) : 0), 0);
  const cyclesOf = (row: Cell[], cycles: { month: string; col: number; key: string }[], b: StudentBucket, sheet: string, rowIdx: number, rowKey: string) => {
    const where = SHEET_LABEL[sheet] ?? sheet;
    for (const { month, col, key } of cycles) {
      const amount = row[col];
      const period = parsePeriod(row[col + 1]);
      const receipts = receiptDates(row[col + 2], today);
      if (isNum(amount) && amount > 0) {
        const kind = period.kind === 'FULL' ? 'FULL' : period.kind === 'HALF' ? 'HALF' : 'MONTH';
        const forMonth = period.kind === 'MONTH' ? period.month! : month;
        b.payments.push({
          key: `${sheet}|${key}`,
          cell: `${sheet}|${key}`,
          amount: Math.round(amount),
          kind,
          forMonth,
          paidOn: receipts.length ? receipts[receipts.length - 1] : null,
          receipts,
          label: kind === 'FULL' ? 'бүтэн жил' : kind === 'HALF' ? 'хагас жил' : `${monthLabel(forMonth)}${period.text ? ` (${period.text})` : ''}`,
        });
        if (period.kind === 'TEXT') addNote(b, `${monthLabel(month)} — ${period.text}`, parsePromise(period.text), where);
      } else if (amount != null && String(amount).trim() !== '') {
        const text = normText(amount);
        if (/^бүтэн$/i.test(text)) continue; // «бүтэн жил хамарсан» тэмдэг, гүйлгээ биш
        addNote(b, `${monthLabel(month)} — ${text}`, parsePromise(text), where);
      } else if (period.kind === 'TEXT') {
        addNote(b, `${monthLabel(month)} — ${period.text}`, parsePromise(period.text), where);
      } else if (period.kind === 'HALF') {
        addNote(b, `${monthLabel(month)} — хагас`, null, where);
      }
      if (isNum(amount) && amount > 0 && row[col + 2] != null && receipts.length === 0)
        issues.push({
          kind: 'RECEIPT_UNREAD',
          fp: month,
          severity: 'WARN',
          tab: where,
          row: rowIdx + 1,
          rowKey,
          studentId: b.student.id,
          title: `${b.student.lastName} ${b.student.firstName}: ${monthLabel(month)}-ийн баримтын огноо «${normText(row[col + 2])}» уншигдсангүй`,
        });
    }
  };

  const mainIds = new Set<string>();
  const mainRows = usable(SHEET.MAIN);
  if (mainRows) {
    const cycles = findCycles(mainRows, SHEET.MAIN, issues);
    cells.push(...cycles.map((c) => `main|${c.key}`));
    const keys = assignRowKeys(mainRows, 2);
    stats.rows[SHEET.MAIN] = 0;
    mainRows.forEach((row, i) => {
      if (i < 2 || !hasData(row)) return;
      const rowKey = keys.get(i);
      if (!rowKey) return; // зөвхөн № — сурагч биш
      stats.rows[SHEET.MAIN]++;
      const paid = cycleSum(row, cycles);
      if (isNum(row[11]) && row[11] !== paid)
        issues.push({ kind: 'TOTAL_MISMATCH', severity: 'ERROR', tab: SHEET.MAIN, row: i + 1, rowKey, title: `${normText(row[1])} ${normText(row[2])}: «Урьдчилгаа» ${mnt(row[11] as number)} ч сарын төлбөрүүдийн нийлбэр ${mnt(paid)}` });
      const r = resolve(SHEET.MAIN, row, i, rowKey);
      if (!r) return;
      if ('unmatched' in r) {
        pushUnmatched(SHEET.MAIN, row, i, rowKey, r.unmatched!.conflict, paid, { section: 8, start: 10, form: 13, branch: 12 });
        return;
      }
      const s = r.student!;
      if (mainIds.has(s.id)) {
        issues.push({ kind: 'DUPLICATE_ROW', severity: 'ERROR', tab: SHEET.MAIN, row: i + 1, rowKey, studentId: s.id, title: `${s.lastName} ${s.firstName} эзэн жагсаалтад давхар мөртэй — хоёр дахь мөрийг оруулсангүй` });
        return;
      }
      mainIds.add(s.id);
      const b = bucket(s);
      b.rowKeys.push(`${SHEET.MAIN}|${rowKey}`);
      b.plan = planFromForm(row[13]);
      if (!b.plan && normText(row[13])) {
        const t = normText(row[13]);
        if (/ярьсан|өмнө|\d+\/\d+/.test(t)) addNote(b, `Хэлбэр — ${t}`, parsePromise(t), SHEET.MAIN);
        else issues.push({ kind: 'FORM_UNKNOWN', severity: 'INFO', tab: SHEET.MAIN, row: i + 1, rowKey, studentId: s.id, title: `${s.lastName} ${s.firstName}: «Хэлбэр» = «${t}» танигдсангүй` });
      }
      if (isIso(row[10])) b.start = row[10];
      cyclesOf(row, cycles, b, 'main', i, rowKey);
    });
  }

  const monthlyRows = usable(SHEET.MONTHLY);
  if (monthlyRows) {
    const cycles = findCycles(monthlyRows, SHEET.MONTHLY, issues);
    cells.push(...cycles.map((c) => `monthly|${c.key}`));
    const keys = assignRowKeys(monthlyRows, 2);
    stats.rows[SHEET.MONTHLY] = 0;
    monthlyRows.forEach((row, i) => {
      if (i < 2 || !hasData(row)) return;
      const rowKey = keys.get(i);
      if (!rowKey) return;
      stats.rows[SHEET.MONTHLY]++;
      const r = resolve(SHEET.MONTHLY, row, i, rowKey);
      if (!r) return;
      if ('unmatched' in r) {
        pushUnmatched(SHEET.MONTHLY, row, i, rowKey, r.unmatched!.conflict, cycleSum(row, cycles), { section: 8, start: 10, form: 13, branch: 12 });
        return;
      }
      const s = r.student!;
      if (mainIds.has(s.id)) return; // эзэн жагсаалт илүү шинэ
      const b = bucket(s);
      b.rowKeys.push(`${SHEET.MONTHLY}|${rowKey}`);
      b.plan = b.plan ?? planFromForm(row[13]) ?? 'MONTHLY';
      if (isIso(row[10])) b.start = b.start ?? row[10];
      cyclesOf(row, cycles, b, 'monthly', i, rowKey);
    });
  }

  const socialRows = usable(SHEET.SOCIAL);
  if (socialRows) {
    const cycles = findCycles(socialRows, SHEET.SOCIAL, issues);
    cells.push(...cycles.map((c) => `social|${c.key}`));
    const keys = assignRowKeys(socialRows, 2);
    stats.rows[SHEET.SOCIAL] = 0;
    socialRows.forEach((row, i) => {
      if (i < 2 || !hasData(row, 11)) return;
      const rowKey = keys.get(i);
      if (!rowKey) return;
      stats.rows[SHEET.SOCIAL]++;
      const r = resolve(SHEET.SOCIAL, row, i, rowKey);
      if (!r) return;
      if ('unmatched' in r) {
        pushUnmatched(SHEET.SOCIAL, row, i, rowKey, r.unmatched!.conflict, cycleSum(row, cycles), { start: 8, form: 10 });
        return;
      }
      const s = r.student!;
      const inSocialClass = /нийгэм/i.test(s.classroomName ?? '');
      if (perStudent.has(s.id) || !inSocialClass) {
        // Нэг сурагч хоёр хичээлд: ӨС-д нэг багц, нэг ангитай тул нийгмийн
        // төлбөрийг математикийн дансанд холихгүй — эзэн шийднэ.
        const amounts = cycles.map(({ col }) => row[col]).filter(isNum);
        issues.push({
          kind: 'DUAL_COURSE',
          severity: 'WARN',
          tab: SHEET.SOCIAL,
          row: i + 1,
          rowKey,
          studentId: s.id,
          title: `${s.lastName} ${s.firstName}: «Нийгэм»-ийн төлбөр (${amounts.map(mnt).join(', ') || 'дүнгүй'}) вэбийн төлбөрт ороогүй — өөр ангитай`,
          detail: { classroom: s.classroomName, amounts },
        });
        rowMatches.set(`${SHEET.SOCIAL}|${rowKey}`, { studentId: s.id, by: 'dual-course' });
        return;
      }
      const b = bucket(s);
      b.rowKeys.push(`${SHEET.SOCIAL}|${rowKey}`);
      b.plan = planFromForm(row[10]);
      if (isIso(row[8])) b.start = row[8];
      cyclesOf(row, cycles, b, 'social', i, rowKey);
    });
  }

  // 2) «Бүтэн жил» — урьдчилгаа/үлдэгдлийн задаргаа
  const fullRows = usable(SHEET.FULL);
  if (fullRows) {
    const keys = assignRowKeys(fullRows, 2);
    stats.rows[SHEET.FULL] = 0;
    fullRows.forEach((row, i) => {
      if (i < 2 || !hasData(row)) return;
      const rowKey = keys.get(i);
      if (!rowKey) return;
      stats.rows[SHEET.FULL]++;
      const r = resolve(SHEET.FULL, row, i, rowKey);
      if (!r) return;
      if ('unmatched' in r) {
        pushUnmatched(SHEET.FULL, row, i, rowKey, r.unmatched!.conflict, 0, {});
        return;
      }
      const s = r.student!;
      const b = perStudent.get(s.id);
      if (!b) {
        issues.push({ kind: 'NOT_IN_MAIN', severity: 'WARN', tab: SHEET.FULL, row: i + 1, rowKey, studentId: s.id, title: `${s.lastName} ${s.firstName} «Бүтэн жил»-д байгаа ч эзэн жагсаалтад алга` });
        return;
      }
      b.rowKeys.push(`${SHEET.FULL}|${rowKey}`);
      if (b.plan !== 'INSTALLMENT') b.plan = 'FULL_YEAR';
      const dep = isNum(row[9]) ? row[9] : null;
      const bal = isNum(row[11]) ? row[11] : null;
      const depDates = receiptDates(row[10], today);
      const balDates = receiptDates(row[12], today);
      if (isIso(row[11]) && !bal) addNote(b, `бүтэн жилийн үлдэгдэл төлөх өдөр ${row[11]}`, row[11], SHEET.FULL);
      const fulls = b.payments.filter((p) => p.kind === 'FULL' || p.kind === 'HALF');
      const target = fulls.length === 1 ? fulls[0] : null;
      if (target && dep && bal && dep + bal === target.amount) {
        b.payments = b.payments.filter((p) => p !== target);
        b.payments.push(
          { ...target, key: `${target.key}|dep`, amount: dep, paidOn: depDates.at(-1) ?? target.paidOn, label: `${target.label} — урьдчилгаа` },
          { ...target, key: `${target.key}|bal`, amount: bal, paidOn: balDates.at(-1) ?? target.paidOn, label: `${target.label} — үлдэгдэл` },
        );
      } else if (target && dep === target.amount && depDates.length) {
        target.paidOn = depDates.at(-1)!;
      } else if (target || dep || bal) {
        issues.push({
          kind: 'FULL_SPLIT',
          severity: 'INFO',
          tab: SHEET.FULL,
          row: i + 1,
          rowKey,
          studentId: s.id,
          title: `${s.lastName} ${s.firstName}: «Бүтэн жил»-ийн задаргаа эзэн жагсаалтын дүнтэй таарахгүй — эзэн жагсаалтын дүнгээр орсон`,
          detail: { main: fulls.map((p) => p.amount), deposit: row[9] ?? null, balance: row[11] ?? null, total: row[13] ?? null },
        });
      }
    });
  }

  // 3) Илүү төлөлт — тэмдэглэл (дансны дугаарыг ТЭМДЭГЛЭЛД оруулахгүй)
  const overRows = usable(SHEET.OVERPAID);
  if (overRows) {
    const keys = assignRowKeys(overRows, 1);
    stats.rows[SHEET.OVERPAID] = 0;
    overRows.forEach((row, i) => {
      if (i < 1 || !hasData(row, 12) || !isNum(row[10])) return;
      const rowKey = keys.get(i);
      if (!rowKey) return;
      stats.rows[SHEET.OVERPAID]++;
      const r = resolve(SHEET.OVERPAID, row, i, rowKey);
      if (!r || 'unmatched' in r) {
        if (r && 'unmatched' in r) pushUnmatched(SHEET.OVERPAID, row, i, rowKey, r.unmatched!.conflict, 0, {});
        return;
      }
      const s = r.student!;
      const b = bucket(s);
      b.rowKeys.push(`${SHEET.OVERPAID}|${rowKey}`);
      const refund = isNum(row[11]) ? row[11] : null;
      const when = isIso(row[14]) ? `, огноо ${row[14]}` : '';
      addNote(b, `нийт ${(row[10] as number).toLocaleString('en-US')}₮ төлсөн${refund ? `, буцаах ${refund.toLocaleString('en-US')}₮` : ''}${when}`, null, SHEET.OVERPAID);
    });
  }

  // 4) Гарсан сурагчид
  const leftRows = usable(SHEET.LEFT);
  if (leftRows) {
    const keys = assignRowKeys(leftRows, 1);
    stats.rows[SHEET.LEFT] = 0;
    leftRows.forEach((row, i) => {
      if (i < 1 || !hasData(row, 12)) return;
      const rowKey = keys.get(i);
      if (!rowKey) return;
      stats.rows[SHEET.LEFT]++;
      const r = resolve(SHEET.LEFT, row, i, rowKey);
      if (!r || 'unmatched' in r) {
        if (r && 'unmatched' in r) pushUnmatched(SHEET.LEFT, row, i, rowKey, r.unmatched!.conflict, 0, {});
        return;
      }
      const s = r.student!;
      const leftOn = isIso(row[11]) && isIso(row[10]) ? (row[11] as string) : null;
      const note = normText(row[8]);
      const b = bucket(s);
      b.rowKeys.push(`${SHEET.LEFT}|${rowKey}`);
      if (note) addNote(b, `гарсан — ${note}`, null, SHEET.LEFT);
      if (s.classroomName)
        issues.push({ kind: 'LEFT_BUT_ACTIVE', severity: 'WARN', tab: SHEET.LEFT, row: i + 1, rowKey, studentId: s.id, title: `${s.lastName} ${s.firstName} «гарсан» хуудсанд байгаа ч вэбд ${s.classroomName} ангид идэвхтэй` });
      if (leftOn && !s.leftOn && !b.payments.some((p) => p.forMonth > leftOn.slice(0, 7))) b.leftOn = leftOn;
    });
  }

  // 5) Багц ба дүн
  for (const b of perStudent.values()) {
    const hasFull = b.payments.some((p) => p.kind === 'FULL');
    const hasHalf = b.payments.some((p) => p.kind === 'HALF');
    let plan = b.plan;
    if (plan !== 'INSTALLMENT' && hasFull) plan = 'FULL_YEAR';
    if (!plan && hasHalf) plan = 'INSTALLMENT';
    if (!plan && b.payments.length) plan = 'MONTHLY';
    let amount: number | null = null;
    if (plan === 'FULL_YEAR') {
      const sum = b.payments.filter((p) => p.kind === 'FULL').reduce((t, p) => t + p.amount, 0);
      amount = sum >= 800000 ? sum : null;
    } else if (plan === 'MONTHLY') {
      const counts = new Map<number, number>();
      for (const p of b.payments)
        if (p.kind === 'MONTH' && p.amount >= 100000 && p.amount < 800000 && p.forMonth >= `${SCHOOL_YEAR_START}-09`)
          counts.set(p.amount, (counts.get(p.amount) ?? 0) + 1);
      amount = [...counts.entries()].sort((a, z) => z[1] - a[1] || z[0] - a[0])[0]?.[0] ?? null;
    }
    b.resolvedPlan = plan;
    b.resolvedAmount = amount;
    for (const p of b.payments) {
      stats.payments++;
      stats.amount += p.amount;
    }
    stats.notes += b.notes.length;
  }

  return { perStudent, issues, unmatched, rowMatches, skippedTabs, cells, stats };
}
