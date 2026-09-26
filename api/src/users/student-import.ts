import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

export interface RawStudentImportRow {
  rowNumber: number;
  lastName: string;
  firstName: string;
  phone: string;
  guardianPhone: string;
  classroomLabel: string;
}

const MAX_IMPORT_ROWS = 1000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function headerKey(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('mn-MN')
    .replace(/\s+/g, ' ');
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value && typeof value === 'object' && 'formula' in value) {
    throw new BadRequestException(
      `Excel-ийн ${cell.address} нүдэнд томьёо байна. Утгыг нь текстээр хадгалаад дахин оруулна уу.`,
    );
  }
  return String(cell.text ?? value ?? '').trim();
}

function headerIndex(headers: string[], accepted: string[]): number {
  const normalized = headers.map(headerKey);
  return normalized.findIndex((header) => accepted.includes(header));
}

/** Хавсаргасан xlsx-ийг зөвхөн санах ойд уншиж, анхны хуудсын мөрүүдийг гаргана. */
export async function parseStudentWorkbook(
  buffer: Buffer,
): Promise<RawStudentImportRow[]> {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_FILE_BYTES) {
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
  const sheet = workbook.worksheets[0];
  if (!sheet)
    throw new BadRequestException('Excel файлд унших хуудас алга байна.');

  let headerRowNumber = 0;
  let columns: {
    lastName: number;
    firstName: number;
    phone: number;
    guardianPhone: number;
    classroom: number;
  } | null = null;
  for (
    let rowNumber = 1;
    rowNumber <= Math.min(sheet.rowCount, 10);
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber);
    const headers = Array.from({ length: row.cellCount }, (_, index) =>
      cellText(row.getCell(index + 1)),
    );
    const lastName = headerIndex(headers, [
      'овог',
      'овог нэр',
      'эцэг эхийн овог',
    ]);
    const firstName = headerIndex(headers, [
      'нэр',
      'өөрийн нэр',
      'сурагчийн нэр',
    ]);
    const phone = headerIndex(headers, [
      'утас',
      'сурагчийн утас',
      'утасны дугаар',
    ]);
    if (lastName >= 0 && firstName >= 0 && phone >= 0) {
      columns = {
        lastName: lastName + 1,
        firstName: firstName + 1,
        phone: phone + 1,
        guardianPhone:
          headerIndex(headers, [
            'эцэг эхийн утас',
            'эцэг/эхийн утас',
            'асран хамгаалагчийн утас',
          ]) + 1,
        classroom:
          headerIndex(headers, [
            'анги/түвшин',
            'анги',
            'түвшин',
            'анги / түвшин',
          ]) + 1,
      };
      headerRowNumber = rowNumber;
      break;
    }
  }
  if (!columns) {
    throw new BadRequestException(
      'Овог, Нэр, Утас баганатай гарчгийн мөр олдсонгүй.',
    );
  }

  const rows: RawStudentImportRow[] = [];
  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= sheet.rowCount;
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber);
    if (!row.hasValues) continue;
    const lastName = cellText(row.getCell(columns.lastName));
    const firstName = cellText(row.getCell(columns.firstName));
    const phone = cellText(row.getCell(columns.phone));
    const guardianPhone =
      columns.guardianPhone > 0
        ? cellText(row.getCell(columns.guardianPhone))
        : '';
    const classroomLabel =
      columns.classroom > 0 ? cellText(row.getCell(columns.classroom)) : '';
    if (
      ![lastName, firstName, phone, guardianPhone, classroomLabel].some(Boolean)
    )
      continue;
    rows.push({
      rowNumber,
      lastName,
      firstName,
      phone,
      guardianPhone,
      classroomLabel,
    });
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Нэг файлд ${MAX_IMPORT_ROWS}-аас олон сурагч оруулах боломжгүй.`,
      );
    }
  }
  if (rows.length === 0)
    throw new BadRequestException('Excel файлд сурагчийн мөр алга байна.');
  return rows;
}

/** Импортын legacy 2027NNN кодыг шинэ үед үргэлжлүүлнэ; бусад кодыг өөрчлөхгүй. */
export function nextSevenDigitStudentCode(
  existingCodes: Array<string | null>,
): string {
  let maximum = 2027000;
  for (const code of existingCodes) {
    if (code && /^2027\d{3}$/.test(code))
      maximum = Math.max(maximum, Number(code));
  }
  if (maximum >= 2027999) {
    throw new BadRequestException(
      '2027 оны 7 оронтой сурагчийн код дууссан байна. Кодыг эзэнтэй тохирно уу.',
    );
  }
  return String(maximum + 1);
}

export function parseGrade(value: string): {
  grade: number | null;
  section: string | null;
} {
  const text = value.trim();
  if (!text) return { grade: null, section: null };
  const match = text.match(/^([0-9]{1,2})\s*(?:[-–]\s*([\p{L}\p{N}]+))?$/u);
  if (!match)
    throw new BadRequestException(
      'Анги/түвшинг 1–12 эсвэл 12-2 хэлбэрээр оруулна уу.',
    );
  const grade = Number(match[1]);
  if (grade < 1 || grade > 12)
    throw new BadRequestException('Анги/түвшин 1–12 хооронд байна.');
  return { grade, section: match[2] ? `${grade}-${match[2]}` : null };
}
