// Хаан банкны «Deposit Account Statement» (.xlsx)-ийг задлах ЦЭВЭР функц.
//
// Бодит файлын бүтэц (эзний 2026-11-05-нд өгсөн хуулга, 1,706 мөр):
//   • 1–7-р мөр: «Printed Date: 2026-11-05», «Интервал: 2026-09-01-2026-11-05»,
//     «IBAN: MN…» — нэгтгэсэн нүднүүд
//   • 8-р мөр толгой: Гүйлгээний огноо | Салбар | Эхний үлдэгдэл | Кредит гүйлгээ |
//     Дебит гүйлгээ | Эцсийн үлдэгдэл | Гүйлгээний утга | Харьцсан данс
//   • дүн текстээр ("350000.00"), дебит сөрөг ("-200.00"), огноо УБ цагаар
//   • төгсгөлд «Нийт дүн:» мөр
// ЖУРНАЛЫН ДУГААР БАЙХГҮЙ тул түлхүүрийг мөрийн агуулгаас хэшлэнэ. «Эцсийн
// үлдэгдэл» түлхүүрт орсноор нэг секундэд ижил дүнтэй хоёр шилжүүлэг ч ялгарна;
// давхацсан интервалтай хуулгыг дахин оруулахад ижил мөр ижил түлхүүр өгнө.

import { createHash } from 'node:crypto';
import * as ExcelJS from 'exceljs';

/** .xlsx → энгийн мөрийн хүснэгт (нэгтгэсэн нүд, richText-ийг текст болгоно). */
export async function readXlsxGrid(buffer: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new StatementFormatError('Excel файл хоосон байна');
  const text = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') {
      const o = v as { richText?: { text: string }[]; result?: unknown; text?: string };
      if (o.richText) return o.richText.map((t) => t.text).join('');
      if (o.result !== undefined) return String(o.result);
      if (o.text !== undefined) return String(o.text);
    }
    return String(v);
  };
  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(text(row.getCell(c).value).trim());
    grid.push(cells);
  });
  return grid;
}

export interface StatementRow {
  bankRef: string;
  /** УБ цагаар «YYYY-MM-DD HH:mm:ss» */
  at: string;
  /** УБ огноо «YYYY-MM-DD» */
  date: string;
  bookedAt: Date;
  direction: 'CREDIT' | 'DEBIT';
  /** ₮, үргэлж эерэг */
  amount: number;
  description: string;
  counterparty: string | null;
  closingBalance: string | null;
  raw: string[];
}

export interface StatementInfo {
  /** Хуулгын данс (IBAN) */
  accountNo: string | null;
  /** Хуулгын интервал «YYYY-MM-DD» */
  from: string | null;
  to: string | null;
  /** Хэвлэсэн огноо — интервалын сүүлийн өдөр бүтэн эсэхийг үүгээр мэднэ */
  printedOn: string | null;
}

export class StatementFormatError extends Error {}

const DATE_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

function num(v: string | undefined): number {
  const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function readInfo(head: string[][]): StatementInfo {
  const cells = head.flat().map((c) => String(c ?? '').trim()).filter(Boolean);
  const after = (label: string) => {
    const i = cells.findIndex((c) => c === label);
    return i >= 0 ? (cells[i + 1] ?? null) : null;
  };
  const interval = cells.map((c) => /(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/.exec(c)).find(Boolean);
  const printed = after('Printed Date:');
  return {
    accountNo: after('IBAN:'),
    from: interval?.[1] ?? null,
    to: interval?.[2] ?? null,
    printedOn: printed && /^\d{4}-\d{2}-\d{2}/.test(printed) ? printed.slice(0, 10) : null,
  };
}

export function parseKhanStatement(grid: string[][]): { info: StatementInfo; rows: StatementRow[]; skipped: number } {
  const headerIdx = grid.findIndex((row) => row.some((c) => String(c ?? '').trim() === 'Гүйлгээний огноо'));
  if (headerIdx < 0)
    throw new StatementFormatError(
      'Хуулгын толгой олдсонгүй. Хаан банкны интернэт банкнаас татсан «Дансны хуулга» (.xlsx) байх ёстой',
    );
  const header = grid[headerIdx].map((c) => String(c ?? '').trim());
  const col = (name: string) => header.indexOf(name);
  const c = {
    date: col('Гүйлгээний огноо'),
    credit: col('Кредит гүйлгээ'),
    debit: col('Дебит гүйлгээ'),
    closing: col('Эцсийн үлдэгдэл'),
    desc: col('Гүйлгээний утга'),
    cp: col('Харьцсан данс'),
  };
  if (c.date < 0 || c.credit < 0 || c.desc < 0)
    throw new StatementFormatError('Хуулгын багана дутуу: «Гүйлгээний огноо», «Кредит гүйлгээ», «Гүйлгээний утга» хэрэгтэй');

  const info = readInfo(grid.slice(0, headerIdx));
  const rows: StatementRow[] = [];
  let skipped = 0;
  for (const row of grid.slice(headerIdx + 1)) {
    // Excel огноо нүд (Date) бол exceljs «…T05:19:06.000Z» өгдөг — ханын цаг тул бүсгүйгээр уншина
    const at = String(row[c.date] ?? '')
      .trim()
      .replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d+)?Z$/, '$1 $2');
    if (!DATE_TIME.test(at)) {
      skipped++; // хоосон, «Нийт дүн:» мөр
      continue;
    }
    const credit = Math.round(num(row[c.credit]));
    const debit = c.debit >= 0 ? Math.round(num(row[c.debit])) : 0;
    if (credit <= 0 && debit === 0) {
      skipped++;
      continue;
    }
    const description = String(row[c.desc] ?? '').trim();
    const counterparty = c.cp >= 0 && String(row[c.cp] ?? '').trim() ? String(row[c.cp]).trim() : null;
    const closingBalance = c.closing >= 0 && String(row[c.closing] ?? '').trim() ? String(row[c.closing]).trim() : null;
    const full = at.length === 16 ? `${at}:00` : at;
    const bankRef =
      'KHAN-' +
      createHash('sha256')
        .update([full, credit, debit, description, counterparty ?? '', closingBalance ?? ''].join('|'))
        .digest('hex')
        .slice(0, 24);
    rows.push({
      bankRef,
      at: full,
      date: full.slice(0, 10),
      // УБ цагийн бүсийг ил заана — заахгүй бол серверийн бүсээр 8 цаг зөрнө
      bookedAt: new Date(`${full.replace(' ', 'T')}+08:00`),
      direction: credit > 0 ? 'CREDIT' : 'DEBIT',
      amount: credit > 0 ? credit : Math.abs(debit),
      description,
      counterparty,
      closingBalance,
      raw: row.map((v) => String(v ?? '')),
    });
  }
  return { info, rows, skipped };
}

/** Хуулгын бүтэн хамарсан сүүлийн өдөр: хэвлэсэн өдөр интервалын төгсгөлөөс хойш бол төгсгөл, үгүй бол өмнөх өдөр. */
export function coveredThrough(info: StatementInfo, rows: StatementRow[]): string | null {
  const to = info.to ?? rows.at(-1)?.date ?? null;
  if (!to) return null;
  if (info.printedOn && info.printedOn > to) return to;
  return shiftDay(to, -1);
}

export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
