/**
 * CSV татах нэгдсэн туслах (эзэн 2026-10-22): төлбөр, бүртгэл.
 *
 * - UTF-8 BOM: Excel кирилл үсгийг зөв нээнэ.
 * - Мөрийн төгсгөл CRLF, нүд бүр хашилттай; тоо нь хашилтгүй цэвэр цифр.
 * - `= + - @` ба tab/CR-ээр эхэлсэн текст томьёо болохоос `'` залгаж хамгаална.
 * - Огноо YYYY-MM-DD (Улаанбаатар).
 */
export const CSV_BOM = "﻿";

type Cell = string | number | null | undefined;

export function csvCell(value: Cell): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [headers.map(csvCell), ...rows.map((r) => r.map(csvCell))];
  return CSV_BOM + lines.map((l) => l.join(",")).join("\r\n") + "\r\n";
}

/** Улаанбаатарын өнөөдөр «YYYY-MM-DD» */
export function todayUB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(now);
}

/** ISO огноо/цагийг Улаанбаатарын «YYYY-MM-DD» болгоно; хоосон бол "" */
export function dateOnlyUB(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : todayUB(d);
}

/** pimath-tolbor-2026-10-22.csv */
export function csvFilename(topic: string, now: Date = new Date()): string {
  return `pimath-${topic}-${todayUB(now)}.csv`;
}

/** Серверийн CSV (fetch нь BOM-ыг тайрдаг) эсвэл өөрсдийн CSV-г файл болгон татна */
export function downloadCsv(filename: string, csv: string): void {
  const text = csv.startsWith(CSV_BOM) ? csv : CSV_BOM + csv;
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
