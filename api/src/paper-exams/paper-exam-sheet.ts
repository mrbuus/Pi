import type * as ExcelJS from 'exceljs';
import { cellText, plainValue } from '../exams/gradebook-sheet';
import { normalizeLetter, type SheetAnswer } from './paper-exam-logic';

// Цаасан шалгалтын Excel-ийг унших ЦЭВЭР хэсэг (ӨС-гүй) — paper-exam-sheet.spec.ts.
//
// Эзний одоогийн хэлбэр («Баг 39,40 · Сант.xlsx»), шийт бүр нэг баг:
//   ШМХФС / Баг 27 · Багш: Болор-Эрдэнэ · 15 сурагч        ← гарчиг (сонголттой)
//   № | Шифр | Овог | Нэр | Оноо | Сул агуулга | 1 | 2 | … | 48
//   1 | 2027014 | … | … | 37 | …               | 1 |   | … | 1   ← зөв = 1, буруу = хоосон
//   Гүйцэтгэл % | …                                              ← энд дуусна
//
// Машины гаралт (үсэг A–E) ч мөн энэ хэлбэрээр уншигдана: нүдэнд үсэг байвал
// түлхүүрээр дүгнэнэ, хоосон = хариулаагүй, хоёр үсэг = давхар будсан.

const HEADER_SCAN_ROWS = 15;
const MAX_ROWS_PER_SHEET = 2000;
const MAX_ITEMS = 200;
const MIN_ITEMS = 1;
const STOP_RE = /(гүйцэтгэл|агуулгын төрлөөр|ангийн дундаж|дундаж)/;

export interface ParsedPaperRow {
  sheetName: string;
  rowNumber: number;
  code: string;
  lastName: string;
  firstName: string;
  groupLabel: string;
  groupTeacher: string | null;
  answers: SheetAnswer[];
  /** Файлд бичсэн «Оноо» (тулгалтад), байхгүй бол null */
  fileScore: number | null;
  /** Танигдаагүй утгатай нүдний тоо (анхааруулна) */
  oddCells: number;
  /** V2 файлын «Хувилбар» (A/B…) */
  variant?: string | null;
  /** V2 файлын «Шалгах» шийтийн тэмдэглэл (давхар будсан г.м.) — мэдээлэлд */
  notes?: string[];
  /** Дүнгийн алдаа (машины онооноос зөрсөн) — ийм мөрийг ХАДГАЛАХГҮЙ */
  error?: string | null;
}

export interface ParsedPaperSheet {
  name: string;
  groupLabel: string;
  groupTeacher: string | null;
  itemCount: number;
  rowCount: number;
  mode: 'LETTERS' | 'BINARY';
}

export interface ParsedPaperFile {
  itemCount: number;
  sheets: ParsedPaperSheet[];
  skipped: { name: string; reason: string }[];
  rows: ParsedPaperRow[];
  /** «V2» = машины боловсруулалтын файл (Дүн, Зөв-Буруу, Түлхүүр… шийттэй) */
  format?: 'V2';
  /** V2: бодлого бүрийн оноо «Түлхүүр» шийтээс (1-ээс эхэлсэн дарааллаар) */
  itemPoints?: number[];
  /** V2: бодлого бүрийн нэр, оноо, хувилбар бүрийн түлхүүр */
  v2Items?: V2Item[];
  /** V2: файл доторх ижил сурагчийн ижил мөр (давхар файлаас) — нэг л удаа авна */
  droppedDuplicates?: number;
}

function norm(text: string): string {
  return text
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('mn-MN')
    .replace(/\s+/g, ' ');
}

/** Энгийн утгыг бичвэр болгоно; огноо, объект → «» (шифр/хариу байж болохгүй). */
function scalarText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** Сурагчийн код: зай, цэг хасаад том үсэг. «2027014.0» → «2027014». */
export function normalizeCode(raw: unknown): string {
  const v = raw instanceof Object ? plainValue(raw as ExcelJS.CellValue) : raw;
  if (v === null || v === undefined) return '';
  if (typeof v === 'number')
    return Number.isInteger(v) ? String(v) : String(v).replace(/\.0+$/, '');
  return scalarText(v)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/\.0+$/, '')
    .toUpperCase();
}

/** Бодлогын дугаарын толгой: 7 эсвэл «7» → 7. */
function itemNumber(value: ExcelJS.CellValue): number | null {
  const v = plainValue(value);
  if (typeof v === 'number')
    return Number.isInteger(v) && v > 0 && v <= MAX_ITEMS ? v : null;
  if (typeof v === 'string' && /^\d{1,3}$/.test(v.trim())) {
    const n = Number(v.trim());
    return n > 0 && n <= MAX_ITEMS ? n : null;
  }
  return null;
}

/** Нүдний утга → хариу. null = хоосон (горимоос хамаарч «» эсвэл «-»). */
export function parseAnswerCell(value: ExcelJS.CellValue): {
  answer: SheetAnswer | null;
  odd: boolean;
} {
  const v = plainValue(value);
  if (v === null || v === undefined) return { answer: null, odd: false };
  if (typeof v === 'number') {
    if (v === 1) return { answer: '+', odd: false };
    if (v === 0) return { answer: '-', odd: false };
    return { answer: '-', odd: true };
  }
  if (typeof v === 'boolean') return { answer: v ? '+' : '-', odd: false };
  const t = scalarText(v).normalize('NFKC').trim();
  if (t === '') return { answer: null, odd: false };
  if (t === '1' || t === '+' || t === '✓' || t.toLowerCase() === 'v')
    return { answer: '+', odd: false };
  if (
    t === '0' ||
    t === '-' ||
    t === '−' ||
    t.toLowerCase() === 'x' ||
    t === '×'
  )
    return { answer: '-', odd: false };
  if (t === '*') return { answer: '*', odd: false };
  const single = normalizeLetter(t);
  if (single) return { answer: single, odd: false };
  // «AC», «A,C» — давхар будсан
  const parts = t.replace(/[\s,;/]+/g, '').split('');
  if (parts.length >= 2 && parts.every((p) => normalizeLetter(p)))
    return { answer: '*', odd: false };
  return { answer: null, odd: true };
}

/** «ШМХФС / Баг 27 · Багш: Болор-Эрдэнэ · 15 сурагч» эсвэл шийтийн нэр «Баг 27 Болор-Эрдэнэ». */
export function groupFrom(
  title: string,
  sheetName: string,
): { label: string; teacher: string | null } {
  const sources = [title, sheetName];
  let label: string | null = null;
  let teacher: string | null = null;
  for (const src of sources) {
    const text = src.normalize('NFKC');
    if (!label) {
      const m = text.match(/баг\s*№?\s*(\d+)/i);
      if (m) label = `Баг ${Number(m[1])}`;
    }
    if (!teacher) {
      const t = text.match(
        /багш\s*[:：]\s*([^·•|/,\n]+?)(?=\s*[·•|/,]|\s+\d+\s*сурагч|$)/i,
      );
      if (t) teacher = t[1].trim();
    }
  }
  if (label && !teacher) {
    // «Баг 27 Болор-Эрдэнэ» — дугаарын ард үлдсэн нэр
    const rest = sheetName
      .normalize('NFKC')
      .replace(/^.*?баг\s*№?\s*\d+\s*/i, '')
      .trim();
    if (rest && /^[\p{L}][\p{L}\s.-]*$/u.test(rest)) teacher = rest;
  }
  return { label: label ?? sheetName.trim(), teacher };
}

interface HeaderLayout {
  row: number;
  code: number | null;
  last: number | null;
  first: number | null;
  full: number | null;
  score: number | null;
  items: number[]; // items[i] = (i+1)-р бодлогын багана
}

function findHeader(ws: ExcelJS.Worksheet): HeaderLayout | null {
  const last = Math.min(ws.rowCount, HEADER_SCAN_ROWS);
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    const numbered = new Map<number, number>();
    let code: number | null = null;
    let lastName: number | null = null;
    let firstName: number | null = null;
    let full: number | null = null;
    let score: number | null = null;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const n = itemNumber(cell.value);
      if (n !== null && !numbered.has(n)) numbered.set(n, col);
      const t = norm(cellText(cell.value));
      if (/^(шифр|код|сурагчийн код|id)$/.test(t)) code ??= col;
      else if (t === 'овог') lastName ??= col;
      else if (t === 'нэр') firstName ??= col;
      else if (/^(овог,? нэр|нэр,? овог|сурагч|сурагчийн нэр)$/.test(t))
        full ??= col;
      else if (/^(оноо|нийт оноо|авсан оноо)$/.test(t)) score ??= col;
    });
    if (code === null && firstName === null && full === null) continue;
    // 1-ээс тасралтгүй дугаарлалт, баганууд өсөх дарааллаар
    const items: number[] = [];
    for (let n = 1; numbered.has(n); n++) {
      const col = numbered.get(n)!;
      if (items.length && col <= items[items.length - 1]) break;
      items.push(col);
    }
    if (items.length < MIN_ITEMS) continue;
    return {
      row: r,
      code,
      last: lastName,
      first: firstName,
      full,
      score,
      items,
    };
  }
  return null;
}

function splitFull(text: string): { lastName: string; firstName: string } {
  const t = text.trim().replace(/\s+/g, ' ');
  // «Б.Болор» эсвэл «Батболд Болор» — эхний хэсэг овог
  const m = t.match(/^([^\s.]+)[.\s]+(.+)$/);
  return m
    ? { lastName: m[1], firstName: m[2] }
    : { lastName: '', firstName: t };
}

// ---------------------------------------------------------------------------
// V2 боловсруулалтын файл (эзний машин → «… V2.xlsx», 2026-11-14):
//   Дүн | Хариулт | Оноо | Зөв-Буруу | Түлхүүр | Анализ | Шалгах | Тайлбар
// «Хариулт»: № | ID | Овог | Нэр | Анги | Хувилбар | Нийт | 1 … 36 | 2.1.a … 2.4.h
//   — сурагчийн БИЧСЭН хариу: 1–36-д үсэг (A–E, «*» давхар будсан, хоосон), 2-р хэсэгт нүд бүрийн цифр.
// «Түлхүүр»: Хувилбар | № | Хэсэг | Бодлого / багц | Зөв хариу | Оноо | Багцын оронгийн тоо
//   — хувилбар бүрийн түлхүүр; 2-р хэсгийн багц «2.1.a-d» нь 4 нүд, бүгд зөв бол л оноо.
// Сурагч бүрийг өөрийн хувилбарын түлхүүрээр дүгнэнэ. Бодсон нийт оноо «Нийт»-ээс зөрвөл
// тэр мөрийг алдаатай гэж үзээд ХАДГАЛАХГҮЙ (эзэн: алдаатай дүн хэзээ ч нийтлэгдэхгүй).
//
// Машины шинэ гаралт («13-4.xlsx», 2026-11-15) — мөн адил уншина, хөрвүүлэх шаардлагагүй:
//   «Хариулт»: 1-р мөр өнгөний тайлбар, 2-р мөр толгой — Код | Овог | Нэр | Анги | Хувилбар | Нийт |
//     1 … 36 | 2.1a … 2.4h (цэггүй). Толгой мөрийг эхний хэдэн мөрөөс хайна.
//   «Түлхүүр» өргөн хэлбэр: Асуулт | A хариу | A оноо | B хариу | B оноо | …; багц «2.1 a-d».
//     Мөр нь тухайн хувилбарт хариутай бол л тэр хувилбарын бодлого (хувилбарууд өөр багцтай байж болно).
//   «Шалгах»: № | Код | Асуудал | Хувилбар | Нийт — код нь уншигдаагүй хуудас «Хариулт»-д ордоггүй.
// ---------------------------------------------------------------------------
const V2_SHEETS = { answers: 'хариулт', key: 'түлхүүр', check: 'шалгах' };
const V2_HEADER_SCAN_ROWS = 6;

/** Хариултын баганын нэр: «2.1a» / «2.1 a» → «2.1.a» (хуучин, шинэ хэлбэрийг нэг болгоно) */
function v2ColName(raw: string): string {
  return raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/^(\d+\.\d+)[\s.]*([a-h])$/, '$1.$2');
}

/** Түлхүүрийн бодлого/багцын нэр: «2.1 a-d» → «2.1.a-d», «7» → «7» */
function v2Label(raw: string): string {
  return raw
    .normalize('NFKC')
    .trim()
    .replace(/^(\d+\.\d+)[\s.]*([a-h](?:-[a-h])?)$/i, (_m, a: string, b: string) => `${a}.${b.toLowerCase()}`);
}

/** «Хариулт» шийтийн толгой мөр: «Хувилбар» ба код (ID/Код/Шифр) баганатай эхний мөр */
function v2HeaderRow(ws: ExcelJS.Worksheet): number | null {
  for (let r = 1; r <= Math.min(V2_HEADER_SCAN_ROWS, ws.rowCount); r++) {
    const names = new Set<string>();
    ws.getRow(r).eachCell((c) => names.add(v2ColName(cellText(c.value))));
    if (
      names.has('хувилбар') &&
      (names.has('id') || names.has('код') || names.has('шифр'))
    )
      return r;
  }
  return null;
}

function sheetByName(workbook: ExcelJS.Workbook, name: string) {
  return workbook.worksheets.find((w) => norm(w.name) === name);
}

export interface V2Item {
  /** «7» эсвэл «2.1.a-d» */
  label: string;
  points: number;
  /** Багцын нүднүүдийн толгой: ["2.1.a","2.1.b",…]; сонгох бодлогод [«7»] */
  cols: string[];
  /** Хувилбар → зөв хариу */
  keys: Record<string, string>;
}

/** «2.1.a-d» → ["2.1.a","2.1.b","2.1.c","2.1.d"]; «2.2.e» → ["2.2.e"]; «7» → ["7"] */
export function expandLabel(label: string): string[] {
  const m = label.trim().match(/^(\d+\.\d+)\.([a-h])(?:-([a-h]))?$/i);
  if (!m) return [label.trim()];
  const from = m[2].toLowerCase().charCodeAt(0);
  const to = (m[3] ?? m[2]).toLowerCase().charCodeAt(0);
  const out: string[] = [];
  for (let c = from; c <= to; c++)
    out.push(`${m[1]}.${String.fromCharCode(c)}`);
  return out;
}

/**
 * «Түлхүүр» шийтээс бодлогууд. Машины key.ini-д ашиглаагүй хувилбар (ж: C) байж болох тул
 * зөвхөн сурагчдын бөглөсөн хувилбаруудыг (`used`) авна; тэдгээрийн бүтэц (багц, оноо) ижил байх ёстой.
 */
function v2Items(ws: ExcelJS.Worksheet, used: Set<string>): V2Item[] | string {
  const byVariant = new Map<
    string,
    Map<number, { label: string; key: string; points: number }>
  >();
  // Өргөн хэлбэр: «A хариу» | «A оноо» | «B хариу» | … — хувилбар бүр хоёр баганатай
  const wide: { variant: string; keyCol: number; ptsCol: number }[] = [];
  ws.getRow(1).eachCell((c, col) => {
    const m = norm(cellText(c.value)).match(/^([a-z])\s*хариу$/);
    if (m) wide.push({ variant: m[1].toUpperCase(), keyCol: col, ptsCol: col + 1 });
  });
  let ended = false;
  if (wide.length > 0)
    ws.eachRow((row, r) => {
      if (r === 1 || ended) return;
      const raw = cellText(row.getCell(1).value).trim();
      if (!raw) return;
      if (norm(raw) === 'нийт') {
        ended = true;
        return;
      }
      const label = v2Label(raw);
      for (const w of wide) {
        if (used.size > 0 && !used.has(w.variant)) continue;
        const key = cellText(row.getCell(w.keyCol).value).trim().toUpperCase();
        const pts = plainValue(row.getCell(w.ptsCol).value);
        if (!key || typeof pts !== 'number') continue;
        if (!byVariant.has(w.variant)) byVariant.set(w.variant, new Map());
        const own = byVariant.get(w.variant)!;
        own.set(own.size + 1, { label, key, points: pts });
      }
    });
  ws.eachRow((row, r) => {
    if (r === 1 || wide.length > 0) return;
    const variant = cellText(row.getCell(1).value).trim();
    const n = plainValue(row.getCell(2).value);
    const label = cellText(row.getCell(4).value).trim();
    const key = cellText(row.getCell(5).value).trim().toUpperCase();
    const pts = plainValue(row.getCell(6).value);
    if (!variant || typeof n !== 'number' || typeof pts !== 'number' || !label)
      return;
    if (used.size > 0 && !used.has(variant)) return;
    if (!byVariant.has(variant)) byVariant.set(variant, new Map());
    byVariant.get(variant)!.set(n, { label, key, points: pts });
  });
  if (byVariant.size === 0) return '«Түлхүүр» шийтээс бодлого уншигдсангүй';
  const variants = [...byVariant.keys()].sort();
  const first = byVariant.get(variants[0])!;
  const items: V2Item[] = [];
  for (let n = 1; first.has(n); n++) {
    const base = first.get(n)!;
    const keys: Record<string, string> = {};
    for (const v of variants) {
      const it = byVariant.get(v)!.get(n);
      if (!it || it.label !== base.label || it.points !== base.points)
        return `Хувилбаруудын ${n}-р бодлогын бүтэц (багц, оноо) зөрж байна`;
      keys[v] = it.key;
    }
    if (!Number.isInteger(base.points) || base.points < 0 || base.points > 100)
      return `«Түлхүүр»: ${n}-р бодлогын оноо буруу`;
    const cols = expandLabel(base.label);
    if (
      cols.length > 1 &&
      Object.values(keys).some((k) => k.length !== cols.length)
    )
      return `«Түлхүүр»: ${base.label} багцын цифрийн тоо нүдний тоотой таарахгүй`;
    items.push({ label: base.label, points: base.points, cols, keys });
  }
  if (items.length === 0) return '«Түлхүүр» шийтэд 1-р бодлого алга';
  return items;
}

/** «Шалгах» шийт: ID → тэмдэглэлүүд. */
function v2Notes(ws: ExcelJS.Worksheet | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!ws) return out;
  let idCol = 1;
  let noteCol = 7;
  ws.getRow(1).eachCell((c, col) => {
    const t = norm(cellText(c.value));
    if (t === 'id' || t === 'код') idCol = col;
    if (t === 'тэмдэглэл' || t === 'асуудал') noteCol = col;
  });
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const id = normalizeCode(row.getCell(idCol).value);
    const note = cellText(row.getCell(noteCol).value).trim();
    if (id && note) out.set(id, [...(out.get(id) ?? []), note]);
  });
  return out;
}

/**
 * «Шалгах» шийтэд байгаа боловч «Хариулт»-д ороогүй хуудсууд (код нь уншигдаагүй г.м.) —
 * хариу нь файлд байхгүй тул оруулах боломжгүй; ажилтанд гараар оруулахыг сануулна.
 */
function v2Unread(
  ws: ExcelJS.Worksheet | undefined,
  known: Set<string>,
): { name: string; reason: string }[] {
  if (!ws) return [];
  let idCol = 0;
  let noteCol = 0;
  let totalCol = 0;
  ws.getRow(1).eachCell((c, col) => {
    const t = norm(cellText(c.value));
    if (t === 'id' || t === 'код') idCol = col;
    if (t === 'тэмдэглэл' || t === 'асуудал') noteCol = col;
    if (t === 'нийт') totalCol = col;
  });
  if (!idCol) return [];
  const out: { name: string; reason: string }[] = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const shown = cellText(row.getCell(idCol).value).trim();
    if (!shown || known.has(normalizeCode(row.getCell(idCol).value))) return;
    const note = noteCol ? cellText(row.getCell(noteCol).value).trim() : '';
    const total = totalCol ? plainValue(row.getCell(totalCol).value) : null;
    out.push({
      name: `Код ${shown}`,
      reason: [
        note || 'уншигдаагүй хуудас',
        typeof total === 'number' ? `машины оноо ${total}` : null,
        'хариу нь файлд алга, гараар оруулна',
      ]
        .filter(Boolean)
        .join(', '),
    });
  });
  return out;
}

/** Сонгох бодлогын нүд: «A»…«E», «*», «» */
function choiceCell(raw: string): { v: string; odd: boolean } {
  const t = raw.normalize('NFKC').trim();
  if (t === '') return { v: '', odd: false };
  if (t === '*') return { v: '*', odd: false };
  const one = normalizeLetter(t);
  if (one) return { v: one, odd: false };
  const parts = t.replace(/[\s,;/]+/g, '').split('');
  if (parts.length >= 2 && parts.every((x) => normalizeLetter(x)))
    return { v: '*', odd: false };
  return { v: '', odd: true };
}

/** Багцын нэг нүд: цифр, «-» хасах тэмдэг (хуудсан дээр бий), «*» давхар будсан, «_» хоосон */
function digitCell(raw: string): { v: string; odd: boolean } {
  const t = raw.normalize('NFKC').trim();
  if (t === '') return { v: '_', odd: false };
  if (t === '*') return { v: '*', odd: false };
  if (/^\d$/.test(t) || t === '-') return { v: t, odd: false };
  return { v: '_', odd: true };
}

function parseV2(workbook: ExcelJS.Workbook): ParsedPaperFile | null {
  const answersWs = sheetByName(workbook, V2_SHEETS.answers);
  const keyWs = sheetByName(workbook, V2_SHEETS.key);
  if (!answersWs || !keyWs) return null;
  const fail = (name: string, reason: string): ParsedPaperFile => ({
    itemCount: 0,
    sheets: [],
    skipped: [{ name, reason }],
    rows: [],
    format: 'V2',
  });

  // Толгой мөр: нэр → багана
  const headerRow = v2HeaderRow(answersWs);
  if (headerRow === null)
    return fail(
      answersWs.name,
      '«ID» эсвэл «Код», «Хувилбар» баганатай толгой мөр олдсонгүй',
    );
  const header = new Map<string, number>();
  answersWs.getRow(headerRow).eachCell((c, col) => {
    const t = v2ColName(cellText(c.value));
    if (t && !header.has(t)) header.set(t, col);
  });
  const col = (name: string) => header.get(name) ?? null;
  const idCol = col('id') ?? col('код') ?? col('шифр');
  const lastCol = col('овог');
  const firstCol = col('нэр');
  const classCol = col('анги');
  const variantCol = col('хувилбар');
  const totalCol = col('нийт') ?? col('оноо');
  if (idCol === null || variantCol === null)
    return fail(
      answersWs.name,
      '«ID», «Хувилбар» баганатай толгой мөр олдсонгүй',
    );

  const used = new Set<string>();
  for (let r = headerRow + 1; r <= answersWs.rowCount; r++) {
    const v = cellText(answersWs.getRow(r).getCell(variantCol).value).trim();
    if (v) used.add(v);
  }
  const items = v2Items(keyWs, used);
  if (typeof items === 'string') return fail(keyWs.name, items);
  const missing = items
    .flatMap((it) => it.cols)
    .filter((c) => !header.has(c.toLowerCase()));
  if (missing.length)
    return fail(
      answersWs.name,
      `Хариултын багана олдсонгүй: ${missing.slice(0, 6).join(', ')}`,
    );
  const notes = v2Notes(sheetByName(workbook, V2_SHEETS.check));

  const rows: ParsedPaperRow[] = [];
  const seen = new Set<string>();
  let droppedDuplicates = 0;
  for (let r = headerRow + 1; r <= answersWs.rowCount; r++) {
    const row = answersWs.getRow(r);
    const text = (c: number | null) =>
      c === null ? '' : cellText(row.getCell(c).value).trim();
    const code = normalizeCode(row.getCell(idCol).value);
    const lastName = text(lastCol);
    const firstName = text(firstCol);
    if (!code && !firstName && !lastName) continue;
    const variant = text(variantCol) || null;
    let odd = 0;
    const answers = items.map((it) => {
      if (it.cols.length === 1 && !/\./.test(it.cols[0])) {
        const c = choiceCell(text(header.get(it.cols[0].toLowerCase())!));
        if (c.odd) odd += 1;
        return c.v;
      }
      return it.cols
        .map((h) => {
          const c = digitCell(text(header.get(h.toLowerCase())!));
          if (c.odd) odd += 1;
          return c.v;
        })
        .join('');
    });
    const totalValue =
      totalCol === null ? null : plainValue(row.getCell(totalCol).value);
    const fileScore =
      typeof totalValue === 'number' && Number.isFinite(totalValue)
        ? totalValue
        : null;
    let total = 0;
    let unknownVariant = false;
    items.forEach((it, i) => {
      const key = variant ? it.keys[variant] : undefined;
      if (key === undefined) unknownVariant = true;
      else if (answers[i] === key) total += it.points;
    });
    let error: string | null = null;
    if (unknownVariant) error = `«${variant ?? ''}» хувилбарын түлхүүр алга`;
    else if (fileScore === null) error = 'Файлд «Нийт» оноо байхгүй';
    else if (fileScore !== total)
      error = `Машины оноо ${fileScore}, хариунаас бодсон ${total} — зөрж байна`;
    if (odd) error ??= `${odd} нүдний утга танигдсангүй`;
    const sig = `${code}|${lastName}|${firstName}|${variant}|${answers.join(',')}`;
    if (code && seen.has(sig)) {
      droppedDuplicates += 1;
      continue;
    }
    seen.add(sig);
    rows.push({
      sheetName: answersWs.name,
      rowNumber: r,
      code,
      lastName,
      firstName,
      groupLabel: text(classCol) || 'Ангигүй',
      groupTeacher: null,
      answers,
      fileScore,
      oddCells: odd,
      variant,
      notes: code ? (notes.get(code) ?? []) : [],
      error,
    });
  }
  const groups = [...new Set(rows.map((r) => r.groupLabel))];
  return {
    itemCount: items.length,
    sheets: groups.map((g) => ({
      name: g,
      groupLabel: g,
      groupTeacher: null,
      itemCount: items.length,
      rowCount: rows.filter((r) => r.groupLabel === g).length,
      mode: 'LETTERS' as const,
    })),
    skipped: v2Unread(
      sheetByName(workbook, V2_SHEETS.check),
      new Set(rows.map((r) => r.code).filter(Boolean)),
    ),
    rows,
    format: 'V2',
    itemPoints: items.map((it) => it.points),
    v2Items: items,
    droppedDuplicates,
  };
}

export function parsePaperWorkbook(
  workbook: ExcelJS.Workbook,
): ParsedPaperFile {
  const v2 = parseV2(workbook);
  if (v2) return v2;
  const sheets: ParsedPaperSheet[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const rows: ParsedPaperRow[] = [];

  for (const ws of workbook.worksheets) {
    if (ws.state && ws.state !== 'visible') continue;
    const layout = findHeader(ws);
    if (!layout) {
      if (ws.actualRowCount > 0)
        skipped.push({
          name: ws.name,
          reason: 'Шифр/Нэр болон 1, 2, 3… дугаартай толгой мөр олдсонгүй',
        });
      continue;
    }
    const titleParts: string[] = [];
    for (let r = 1; r < layout.row; r++) {
      ws.getRow(r).eachCell({ includeEmpty: false }, (c) => {
        const t = cellText(c.value);
        if (t) titleParts.push(t);
      });
    }
    const group = groupFrom(titleParts.join(' · '), ws.name);

    const raw: (Omit<ParsedPaperRow, 'answers'> & {
      cells: (SheetAnswer | null)[];
    })[] = [];
    let letterCells = 0;
    let binaryCells = 0;
    const end = Math.min(ws.rowCount, layout.row + MAX_ROWS_PER_SHEET);
    for (let r = layout.row + 1; r <= end; r++) {
      const row = ws.getRow(r);
      const text = (col: number | null) =>
        col === null ? '' : cellText(row.getCell(col).value);
      const headCols = [
        1,
        2,
        3,
        4,
        layout.code,
        layout.last,
        layout.first,
        layout.full,
      ].filter((c): c is number => c !== null);
      const head = headCols
        .map((c) => norm(cellText(row.getCell(c).value)))
        .join(' ');
      if (STOP_RE.test(head)) break;
      const code =
        layout.code === null
          ? ''
          : normalizeCode(row.getCell(layout.code).value);
      let lastName = text(layout.last);
      let firstName = text(layout.first);
      if (!firstName && layout.full !== null)
        ({ lastName, firstName } = splitFull(text(layout.full)));
      if (!code && !firstName && !lastName) continue;
      let odd = 0;
      const cells = layout.items.map((col) => {
        const p = parseAnswerCell(row.getCell(col).value);
        if (p.odd) odd += 1;
        if (p.answer && /^[A-E*]$/.test(p.answer)) letterCells += 1;
        else if (p.answer === '+' || p.answer === '-') binaryCells += 1;
        return p.answer;
      });
      const scoreValue =
        layout.score === null
          ? null
          : plainValue(row.getCell(layout.score).value);
      raw.push({
        sheetName: ws.name,
        rowNumber: r,
        code,
        lastName,
        firstName,
        groupLabel: group.label,
        groupTeacher: group.teacher,
        fileScore:
          typeof scoreValue === 'number' && Number.isFinite(scoreValue)
            ? scoreValue
            : null,
        oddCells: odd,
        cells,
      });
    }
    if (raw.length === 0) {
      skipped.push({ name: ws.name, reason: 'Сурагчийн мөр алга' });
      continue;
    }
    // Горимыг олонхоор: үсэгтэй (машин) бол хоосон = хариулаагүй; 1/хоосон (эзний
    // Excel) бол хоосон = буруу. Ганц санамсаргүй үсэг бүх шийтийн горимыг солихгүй —
    // 1/хоосон шийт дэх үсгийг буруу гэж аваад анхааруулна.
    const letters = letterCells > binaryCells;
    for (const { cells, ...rest } of raw) {
      let odd = rest.oddCells;
      const answers = cells.map((c) => {
        if (c === null) return letters ? '' : '-';
        if (!letters && /^[A-E*]$/.test(c)) {
          odd += 1;
          return '-';
        }
        return c;
      });
      rows.push({ ...rest, oddCells: odd, answers });
    }
    sheets.push({
      name: ws.name,
      groupLabel: group.label,
      groupTeacher: group.teacher,
      itemCount: layout.items.length,
      rowCount: raw.length,
      mode: letters ? 'LETTERS' : 'BINARY',
    });
  }

  const counts = [...new Set(sheets.map((s) => s.itemCount))];
  const itemCount = counts.length ? Math.max(...counts) : 0;
  return { itemCount, sheets, skipped, rows };
}
