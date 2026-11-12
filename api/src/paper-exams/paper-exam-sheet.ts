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

export function parsePaperWorkbook(
  workbook: ExcelJS.Workbook,
): ParsedPaperFile {
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
