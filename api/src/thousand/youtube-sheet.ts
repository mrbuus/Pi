import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

// «1000 бодлого»-ын YouTube холбоосын Excel: Тест | Бодлогын дугаар | YouTube холбоос.
// Цэвэр (ӨС-гүй) хэсэг — тесттэй.

export const SHEET_HEADERS = ['Тест', 'Бодлогын дугаар', 'YouTube холбоос'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

export interface YoutubeSheetRow {
  testTitle: string;
  number: number;
  url: string | null;
}

export interface ParsedYoutubeRow {
  rowNumber: number;
  testTitle: string;
  numberText: string;
  url: string;
}

export async function buildYoutubeWorkbook(rows: YoutubeSheetRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('YouTube');
  sheet.columns = [
    { header: SHEET_HEADERS[0], key: 'test', width: 28 },
    { header: SHEET_HEADERS[1], key: 'number', width: 16 },
    { header: SHEET_HEADERS[2], key: 'url', width: 48 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({ test: row.testTitle, number: row.number, url: row.url ?? '' });
  }
  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value as unknown;
  if (value && typeof value === 'object') {
    if ('formula' in value) {
      throw new BadRequestException(
        `Excel-ийн ${cell.address} нүдэнд томьёо байна. Утгыг нь текстээр хадгална уу.`,
      );
    }
    // Excel холбоосыг автоматаар hyperlink болгодог: { text, hyperlink }
    if ('hyperlink' in value && typeof (value as { hyperlink: unknown }).hyperlink === 'string') {
      return (value as { hyperlink: string }).hyperlink.trim();
    }
  }
  return String(cell.text ?? value ?? '').trim();
}

function headerKey(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('mn-MN').replace(/\s+/g, ' ');
}

/** Эхний хуудсыг уншина. Холбоос нь хоосон мөрийг алгасна (өөрчлөхгүй). */
export async function parseYoutubeWorkbook(buffer: Buffer): Promise<ParsedYoutubeRow[]> {
  if (!buffer || buffer.byteLength === 0 || buffer.byteLength > MAX_FILE_BYTES) {
    throw new BadRequestException('Excel файл хоосон эсвэл 5 MB-аас том байна.');
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new BadRequestException('Зөвхөн .xlsx Excel файл оруулна уу.');
  }
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new BadRequestException('Excel файлыг уншиж чадсангүй. Файлыг шалгаад дахин оруулна уу.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('Excel файлд унших хуудас алга байна.');
  const header = sheet.getRow(1);
  const got = [1, 2, 3].map((i) => headerKey(cellText(header.getCell(i))));
  const want = SHEET_HEADERS.map(headerKey);
  if (got.some((h, i) => h !== want[i])) {
    throw new BadRequestException(
      `Эхний мөр «${SHEET_HEADERS.join(' | ')}» гэсэн гарчигтай байх ёстой. Татаж авсан загварыг ашиглана уу.`,
    );
  }
  if (sheet.rowCount - 1 > MAX_ROWS) {
    throw new BadRequestException(`Нэг удаад ${MAX_ROWS}-аас олон мөр оруулахгүй.`);
  }
  const rows: ParsedYoutubeRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const testTitle = cellText(row.getCell(1));
    const numberText = cellText(row.getCell(2));
    const url = cellText(row.getCell(3));
    if (!testTitle && !numberText && !url) continue;
    if (!url) continue;
    rows.push({ rowNumber: r, testTitle, numberText, url });
  }
  return rows;
}
