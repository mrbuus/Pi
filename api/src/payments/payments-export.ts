import type { Prisma } from '../generated/prisma/client';
import { PaymentMethod, PaymentStatus } from '../generated/prisma/enums';

/**
 * Төлбөрийн жагсаалт ба CSV экспортын НЭГ шүүлтүүр (эзэн 2026-10-22).
 * `GET /payments` (дэлгэц) ба `GET /payments/export/csv` хоёр ижил шүүлтүүр
 * ашиглана — дэлгэц дээр харсан зүйл CSV-д яг тэр хэвээр орно.
 */
export interface PaymentFilters {
  status?: PaymentStatus;
  /** Аль сарын төлбөр — «YYYY-MM» (Payment.forMonth) */
  month?: string;
  /** Төлсөн огнооны хүрээ «YYYY-MM-DD» (УБ), хоёр захыг оруулна */
  from?: string;
  to?: string;
}

const UB_OFFSET = '+08:00';
const DAY_MS = 24 * 60 * 60 * 1000;

/** «YYYY-MM-DD» УБ-ын өдрийн эхлэл (UTC мөч) */
function ubDayStart(key: string): Date {
  return new Date(`${key}T00:00:00${UB_OFFSET}`);
}

/** Огноо → УБ-ын «YYYY-MM-DD» */
export function ubDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
  }).format(date);
}

/**
 * Төлбөрийн «огноо» = төлсөн (paidAt), байхгүй бол үүссэн (createdAt) өдөр.
 * Prisma-д coalesce байхгүй тул хоёр хувилбарыг OR-оор бичнэ.
 */
export function buildPaymentWhere(
  filters: PaymentFilters,
): Prisma.PaymentWhereInput {
  const and: Prisma.PaymentWhereInput[] = [];
  if (filters.status) and.push({ status: filters.status });
  if (filters.month) and.push({ forMonth: filters.month });
  if (filters.from || filters.to) {
    const range: { gte?: Date; lt?: Date } = {};
    if (filters.from) range.gte = ubDayStart(filters.from);
    if (filters.to)
      range.lt = new Date(ubDayStart(filters.to).getTime() + DAY_MS);
    and.push({
      OR: [{ paidAt: range }, { paidAt: null, createdAt: range }],
    });
  }
  return and.length ? { AND: and } : {};
}

export interface ExportPaymentRow {
  createdAt: Date;
  paidAt: Date | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string | null;
  forMonth: string | null;
  user: {
    firstName: string;
    lastName: string;
    phone: string | null;
    studentCode: string | null;
    enrollments?: { classroom: { name: string } }[];
  };
}

export const METHOD_MN: Record<PaymentMethod, string> = {
  QPAY: 'QPay',
  BANK_TRANSFER: 'Данс',
  CASH: 'Бэлэн',
};
export const STATUS_MN: Record<PaymentStatus, string> = {
  PENDING: 'Хүлээгдэж буй',
  CONFIRMED: 'Баталгаажсан',
  REJECTED: 'Цуцалсан',
  REVERSED: 'Буцаасан',
};

export const PAYMENT_CSV_HEADERS = [
  'Огноо',
  'Сурагчийн код',
  'Овог',
  'Нэр',
  'Утас',
  'Анги',
  'Төлсөн сар',
  'Дүн (₮)',
  'Төлбөрийн арга',
  'Төлөв',
  'Тайлбар',
] as const;

type Cell = string | number | null | undefined;

/**
 * Нэг нүд. Тоо → зөвхөн цифр (Excel тоо гэж танина). Текст → хашилттай;
 * `= + - @` ба tab/CR-ээр эхэлбэл томьёо болохоос сэргийлж `'` залгана
 * (CSV injection).
 */
export function csvCell(value: Cell): string {
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : '';
  const raw = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** UTF-8 BOM + CRLF — Excel кирилл үсгийг зөв нээнэ */
export function toCsv(headers: readonly string[], rows: Cell[][]): string {
  const lines = [headers.map(csvCell), ...rows.map((r) => r.map(csvCell))];
  return '﻿' + lines.map((l) => l.join(',')).join('\r\n') + '\r\n';
}

export function paymentsToCsv(rows: ExportPaymentRow[]): string {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.paidAt ?? a.createdAt).getTime() -
      (b.paidAt ?? b.createdAt).getTime(),
  );
  return toCsv(
    PAYMENT_CSV_HEADERS,
    sorted.map((p) => [
      ubDateKey(p.paidAt ?? p.createdAt),
      p.user.studentCode,
      p.user.lastName,
      p.user.firstName,
      p.user.phone,
      p.user.enrollments?.[0]?.classroom.name,
      p.forMonth,
      p.amount,
      METHOD_MN[p.method] ?? p.method,
      STATUS_MN[p.status] ?? p.status,
      p.description,
    ]),
  );
}

/** pimath-tolbor-2026-10-22.csv */
export function exportFilename(prefix: string, now: Date = new Date()): string {
  return `${prefix}-${ubDateKey(now)}.csv`;
}
