import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

// Эзний «Багшийн анги» Excel-ийн хэлбэр (SHALGALT-TOLOVLOGOO §2):
//   (гарчгийн мөр) · Сурагч | Дүн (авто) | Нэгдүгээр хэсэг | Хоёрдугаар хэсэг
//   № | Овог | Нэр | Бүлэг | Авсан оноо | Хувь | 1 … 36 | 1-1 … 4-3 | (Ирээгүй)
//   Оноо (жин) →            | Нийт | =SUM  | жин …
//   сурагч бүр: ХООСОН = зөв, 0 = буруу
// Excel «2-4» гэх мэт шошгыг огноо болгодог (2026-02-04) — буцааж «2-4» гэж уншина.
// ЦЭВЭР хэсэг (ӨС-гүй) — gradebook-sheet.spec.ts.

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 400;
const HEADER_SCAN_ROWS = 15;
const FOOTER_RE = /^(зөв бодсон|алдаа|алдсан|ангийн дундаж|бодлого|сонголт)/;

export type SheetCell = 'WRONG' | 'CORRECT';

export interface SheetItemColumn {
  col: number;
  label: string;
  weight: number | null;
}

export interface SheetStudentRow {
  rowNumber: number;
  lastName: string;
  firstName: string;
  group: string;
  /** Баганын шошго → төлөв (хоосон нүд = CORRECT) */
  cells: Map<string, SheetCell>;
  /** 0 эсвэл хоосноос өөр утгатай нүд (анхааруулах) */
  odd: { label: string; value: string }[];
  /** Хоосон биш нүдний тоо */
  markedCount: number;
  absent: boolean;
  /** «Авсан оноо» нүд томьёо биш тоо бол (зөвхөн нийт оноотой мөр) */
  totalLiteral: number | null;
}

export interface ParsedGradeSheet {
  sheetName: string;
  headerRow: number;
  weightRow: number | null;
  columns: SheetItemColumn[];
  absentCol: number | null;
  rows: SheetStudentRow[];
}

/** exceljs-ийн нүдний утгыг энгийн утга болгоно (томьёоны үр дүн, rich text …). */
export function plainValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if ('result' in v) return v.result ?? null;
    if ('formula' in v || 'sharedFormula' in v) return null;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[])
        .map((t) => t.text ?? '')
        .join('');
    }
    if ('text' in v) return v.text ?? null;
    if ('error' in v) return null;
    return null;
  }
  return value;
}

function isFormula(value: ExcelJS.CellValue): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    ('formula' in value || 'sharedFormula' in value)
  );
}

export function cellText(value: ExcelJS.CellValue): string {
  const v = plainValue(value);
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function key(text: string): string {
  return text
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('mn-MN')
    .replace(/\s+/g, ' ');
}

/**
 * Баганын шошго: 7 → "7", "1-1" → "1-1", огноо болсон «2-4» (2026-02-04) → "2-4".
 * Бодлого/алхмын шошго биш бол null.
 */
export function normalizeLabel(value: ExcelJS.CellValue): string | null {
  const v = plainValue(value);
  if (v instanceof Date) return `${v.getUTCMonth() + 1}-${v.getUTCDate()}`;
  if (typeof v === 'number') {
    return Number.isInteger(v) && v > 0 && v < 1000 ? String(v) : null;
  }
  if (typeof v !== 'string') return null;
  const text = v.trim();
  if (/^\d{1,3}$/.test(text)) return String(Number(text));
  const m = text.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})$/);
  if (m) return `${Number(m[1])}-${Number(m[2])}`;
  // Бусад шалгалтын олон бодлоготой хувилбар ("37:1-1") — системийн экспорт
  const scoped = text.match(/^(\d{1,3}):(\d{1,2})-(\d{1,2})$/);
  if (scoped)
    return `${Number(scoped[1])}:${Number(scoped[2])}-${Number(scoped[3])}`;
  return null;
}

/** Нэрийг тулгахад: том/жижиг, зай, цэг, зураас ялгахгүй. */
export function normalizeName(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('mn-MN')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  if (
    !buffer ||
    buffer.byteLength === 0 ||
    buffer.byteLength > MAX_FILE_BYTES
  ) {
    throw new BadRequestException(
      'Excel файл хоосон эсвэл 5 MB-аас том байна.',
    );
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new BadRequestException('Зөвхөн .xlsx Excel файл оруулна уу.');
  }
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw new BadRequestException(
      'Excel файлыг уншиж чадсангүй. Файлыг шалгаад дахин оруулна уу.',
    );
  }
  if (workbook.worksheets.length === 0) {
    throw new BadRequestException('Excel файлд унших хуудас алга байна.');
  }
  return workbook;
}

/**
 * Нэг хуудсыг эзний хэлбэрээр уншина. «№» ба «Нэр» гарчигтай мөр олдохгүй бол null.
 */
export function parseGradeSheet(
  sheet: ExcelJS.Worksheet,
): ParsedGradeSheet | null {
  const colCount = Math.min(sheet.columnCount, 200);
  let headerRow = 0;
  for (let r = 1; r <= Math.min(HEADER_SCAN_ROWS, sheet.rowCount); r += 1) {
    const texts: string[] = [];
    for (let c = 1; c <= colCount; c += 1)
      texts.push(key(cellText(sheet.getRow(r).getCell(c).value)));
    if (
      texts.some((t) => t === '№' || t === 'no' || t === '#') &&
      texts.includes('нэр')
    ) {
      headerRow = r;
      break;
    }
  }
  if (!headerRow) return null;

  const header = sheet.getRow(headerRow);
  let lastCol = 0;
  let firstCol = 0;
  let groupCol = 0;
  let totalCol = 0;
  let absentCol = 0;
  const columns: SheetItemColumn[] = [];
  for (let c = 1; c <= colCount; c += 1) {
    const raw = header.getCell(c).value;
    const text = key(cellText(raw));
    if (text === 'овог') lastCol = c;
    else if (text === 'нэр') firstCol = c;
    else if (text === 'бүлэг' || text === 'анги') groupCol = c;
    else if (text === 'авсан оноо' || text === 'нийт оноо' || text === 'оноо')
      totalCol = c;
    else if (text === 'ирээгүй') absentCol = c;
    else if (firstCol && c > firstCol) {
      const label = normalizeLabel(raw);
      if (label) columns.push({ col: c, label, weight: null });
    }
  }
  if (!firstCol) return null;

  // Жингийн мөр: «Оноо (жин)» эсвэл «Нийт» гэсэн нүдтэй, гарчгийн дараах мөр
  let weightRow: number | null = null;
  const next = sheet.getRow(headerRow + 1);
  const nextTexts = [1, 2, 3, 4, 5].map((c) =>
    key(cellText(next.getCell(c).value)),
  );
  if (
    nextTexts.some(
      (t) => t.includes('жин') || t.startsWith('оноо') || t === 'нийт',
    )
  ) {
    weightRow = headerRow + 1;
    for (const column of columns) {
      const v = plainValue(next.getCell(column.col).value);
      const n =
        typeof v === 'number'
          ? v
          : typeof v === 'string' && v.trim() !== ''
            ? Number(v)
            : NaN;
      column.weight = Number.isFinite(n) ? n : null;
    }
  }

  const rows: SheetStudentRow[] = [];
  let emptyStreak = 0;
  const start = (weightRow ?? headerRow) + 1;
  for (let r = start; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const lead = key(cellText(row.getCell(1).value));
    if (FOOTER_RE.test(lead)) break;
    const lastName = lastCol ? cellText(row.getCell(lastCol).value) : '';
    const firstName = cellText(row.getCell(firstCol).value);
    if (!lastName && !firstName) {
      emptyStreak += 1;
      if (emptyStreak >= 5) break;
      continue;
    }
    emptyStreak = 0;
    if (rows.length >= MAX_ROWS) {
      throw new BadRequestException(
        `Нэг хуудсанд ${MAX_ROWS}-аас олон сурагч байна.`,
      );
    }
    const cells = new Map<string, SheetCell>();
    const odd: { label: string; value: string }[] = [];
    let markedCount = 0;
    for (const column of columns) {
      const v = plainValue(row.getCell(column.col).value);
      const text =
        v === null || v === undefined
          ? ''
          : v instanceof Date
            ? 'огноо'
            : String(v).trim();
      if (text === '') {
        cells.set(column.label, 'CORRECT');
        continue;
      }
      markedCount += 1;
      if (text === '0' || (typeof v === 'number' && v === 0)) {
        cells.set(column.label, 'WRONG');
      } else {
        cells.set(column.label, 'CORRECT');
        odd.push({ label: column.label, value: text.slice(0, 20) });
      }
    }
    const absentText = absentCol
      ? key(cellText(row.getCell(absentCol).value))
      : '';
    const totalRaw = totalCol ? row.getCell(totalCol).value : null;
    const totalPlain = plainValue(totalRaw);
    rows.push({
      rowNumber: r,
      lastName,
      firstName,
      group: groupCol ? cellText(row.getCell(groupCol).value) : '',
      cells,
      odd,
      markedCount,
      absent: absentText !== '' && absentText !== '0' && absentText !== 'үгүй',
      totalLiteral:
        !isFormula(totalRaw) && typeof totalPlain === 'number'
          ? totalPlain
          : null,
    });
  }
  return {
    sheetName: sheet.name,
    headerRow,
    weightRow,
    columns,
    absentCol: absentCol || null,
    rows,
  };
}

// ============ Экспорт — эзний хэлбэрээр ============

export interface ExportItem {
  label: string;
  points: number;
  part: 1 | 2;
}

export interface ExportRow {
  lastName: string;
  firstName: string;
  className: string;
  /** Баганын шошго → төлөв; null = бодлого бүрийн тэмдэглэгээгүй */
  marks: Record<string, 'CORRECT' | 'WRONG' | 'BLANK'> | null;
  /** Зөвхөн нийт оноотой (тэмдэглэгээгүй) мөр */
  totalOnly: number | null;
  absent: boolean;
}

function colName(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

export function safeSheetName(name: string): string {
  const cleaned = name
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'Дүн').slice(0, 31);
}

/** Хоосон = зөв, 0 = буруу; «Авсан оноо», «Хувь» нь эзний томьёо. */
export async function buildGradeWorkbook(input: {
  sheetName: string;
  items: ExportItem[];
  rows: ExportRow[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(safeSheetName(input.sheetName), {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
  });
  const first = 7;
  const last = first + input.items.length - 1;
  const absentCol = last + 1;
  const L = colName(last);
  const weights = `$${colName(first)}$3:$${L}$3`;

  // 1-р мөр: хэсгүүд
  sheet.getCell('A1').value = 'Сурагч';
  sheet.mergeCells('A1:D1');
  sheet.getCell('E1').value = 'Дүн (авто)';
  sheet.mergeCells('E1:F1');
  for (const part of [1, 2] as const) {
    const cols = input.items
      .map((item, i) => (item.part === part ? first + i : 0))
      .filter(Boolean);
    if (cols.length === 0) continue;
    const a = Math.min(...cols);
    const b = Math.max(...cols);
    sheet.getCell(`${colName(a)}1`).value =
      part === 1 ? 'Нэгдүгээр хэсэг' : 'Хоёрдугаар хэсэг';
    if (b > a && b - a + 1 === cols.length)
      sheet.mergeCells(`${colName(a)}1:${colName(b)}1`);
  }

  // 2-р мөр: гарчиг (2-р хэсгийн шошгыг ТЕКСТ болгож бичнэ — огноо болохгүй)
  const header = sheet.getRow(2);
  ['№', 'Овог', 'Нэр', 'Бүлэг', 'Авсан оноо', 'Хувь'].forEach(
    (h, i) => (header.getCell(i + 1).value = h),
  );
  input.items.forEach((item, i) => {
    header.getCell(first + i).value = /^\d+$/.test(item.label)
      ? Number(item.label)
      : item.label;
  });
  header.getCell(absentCol).value = 'Ирээгүй';

  // 3-р мөр: жин
  sheet.getCell('A3').value = 'Оноо (жин) — гараар засна →';
  sheet.mergeCells('A3:D3');
  sheet.getCell('E3').value = 'Нийт';
  sheet.getCell('F3').value = {
    formula: `SUM(${colName(first)}3:${L}3)`,
  } as ExcelJS.CellFormulaValue;
  input.items.forEach(
    (item, i) => (sheet.getRow(3).getCell(first + i).value = item.points),
  );

  input.rows.forEach((data, idx) => {
    const r = 4 + idx;
    const row = sheet.getRow(r);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = data.lastName;
    row.getCell(3).value = data.firstName;
    row.getCell(4).value = data.className;
    input.items.forEach((item, i) => {
      const status = data.marks?.[item.label];
      if (status === 'WRONG' || status === 'BLANK')
        row.getCell(first + i).value = 0;
    });
    if (data.absent) {
      row.getCell(absentCol).value = 'x';
      return;
    }
    const range = `${colName(first)}${r}:${L}${r}`;
    row.getCell(5).value =
      data.totalOnly !== null
        ? data.totalOnly
        : ({
            formula: `SUM(${weights})-SUMPRODUCT((${range}=0)*(${range}<>"")*${weights})`,
          } as ExcelJS.CellFormulaValue);
    row.getCell(6).value = {
      formula: `IFERROR(E${r}/SUM(${weights}),0)`,
    } as ExcelJS.CellFormulaValue;
    row.getCell(6).numFmt = '0%';
  });

  // Хөл: эзний хуудсан дээрх нэгтгэл
  const lastData = 3 + Math.max(input.rows.length, 1);
  const foot = lastData + 1;
  const names = `$C$4:$C$${lastData}`;
  const labels = [
    'Зөв бодсон (хүн)',
    'Алдаа %',
    'Алдсан хүний тоо',
    'Ангийн дундаж →',
  ];
  labels.forEach((label, i) => {
    sheet.getCell(`A${foot + i}`).value = label;
    sheet.mergeCells(`A${foot + i}:D${foot + i}`);
  });
  input.items.forEach((_, i) => {
    const c = colName(first + i);
    const col = `${c}4:${c}${lastData}`;
    sheet.getCell(`${c}${foot}`).value = {
      formula: `COUNTA(${names})-COUNTIF(${col},0)`,
    } as ExcelJS.CellFormulaValue;
    sheet.getCell(`${c}${foot + 1}`).value = {
      formula: `IFERROR(COUNTIF(${col},0)/COUNTA(${names}),0)`,
    } as ExcelJS.CellFormulaValue;
    sheet.getCell(`${c}${foot + 1}`).numFmt = '0%';
    sheet.getCell(`${c}${foot + 2}`).value = {
      formula: `COUNTIF(${col},0)`,
    } as ExcelJS.CellFormulaValue;
  });
  sheet.getCell(`E${foot + 3}`).value = {
    formula: `IFERROR(AVERAGE(E4:E${lastData}),0)`,
  } as ExcelJS.CellFormulaValue;
  sheet.getCell(`F${foot + 3}`).value = {
    formula: `IFERROR(AVERAGE(F4:F${lastData}),0)`,
  } as ExcelJS.CellFormulaValue;
  sheet.getCell(`F${foot + 3}`).numFmt = '0%';

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(2).font = { bold: true };
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 8;
  sheet.getColumn(5).width = 11;
  sheet.getColumn(6).width = 7;
  for (let c = first; c <= absentCol; c += 1)
    sheet.getColumn(c).width = c === absentCol ? 9 : 5;

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
