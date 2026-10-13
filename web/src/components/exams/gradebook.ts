/* ============================================================================
 * Дүн шивэх торны цэвэр логик (эзний Excel-ийн дүрэм): ХООСОН = зөв, 0 = буруу.
 * Нийт = бүх жин − 0 тавьсан нүдний жин. Сервер ижил дүрмээр дахин бодно
 * (api/src/tests/exam-items.ts) — энд зөвхөн шууд харуулахад.
 * ========================================================================== */

import type { GradebookItem, GradebookRow } from "./types";

export interface RowDraft {
  /** 0 (буруу/хариулаагүй) тавьсан зүйлсийн түлхүүр */
  wrong: Set<string>;
  absent: boolean;
  /** Excel-ээс буулгасан бол EXCEL эх сурвалжаар хадгална */
  fromExcel?: boolean;
  /**
   * Энэ ноорог аль төлөв дээр үндэслэсэн бэ — анх засахад хадгална. Хадгалахад
   * сервер үүнийг base болгож зөвхөн өөрчилсөн нүдийг бичнэ (тор дахин ачаалсны
   * дараа ч ноорог өөрийн суурьтайгаа үлдэнэ — бусдын нүдийг «хассан» гэж үзэхгүй).
   */
  loaded?: { wrong: string[]; absent: boolean };
}

/** Хадгалсан мөрөөс шинэ ноорог — ачаалсан төлвийг нь хамт хадгална. */
export function draftFromBase(base: RowDraft): RowDraft {
  return {
    ...base,
    wrong: new Set(base.wrong),
    loaded: base.loaded ?? { wrong: [...base.wrong], absent: base.absent },
  };
}

/** Серверийн мөрөөс эхний төлөв (онлайн «хариулаагүй» нь 0 гэж харагдана). */
export function draftFromRow(row: GradebookRow): RowDraft {
  const wrong = new Set<string>();
  for (const [key, status] of Object.entries(row.marks ?? {})) {
    if (status !== "CORRECT") wrong.add(key);
  }
  return { wrong, absent: row.absent };
}

/**
 * Энэ мөрөнд дүгнэгдэх зүйлс. Онлайнаар өгсөн мөрөнд онлайнаар дүгнэгдээгүй
 * (хариугүй) зүйл дүнгээс гадуур хэвээр — сервертэй ижил.
 */
export function scopedItems(row: GradebookRow, items: GradebookItem[]): GradebookItem[] {
  if (row.lock === "ONLINE" && row.marks && Object.keys(row.marks).length > 0) {
    return items.filter((item) => row.marks![item.key] !== undefined);
  }
  return items;
}

export function totalsOf(items: GradebookItem[], wrong: Set<string>) {
  let total = 0;
  let max = 0;
  let part1 = 0;
  let part2 = 0;
  for (const item of items) {
    max += item.points;
    if (wrong.has(item.key)) continue;
    total += item.points;
    if (item.part === 1) part1 += item.points;
    else part2 += item.points;
  }
  return { total, max, part1, part2 };
}

export function sameDraft(a: RowDraft, b: RowDraft): boolean {
  if (a.absent !== b.absent || a.wrong.size !== b.wrong.size) return false;
  for (const key of a.wrong) if (!b.wrong.has(key)) return false;
  return true;
}

/** Excel/Sheets-ээс хуулсан блок: мөр = \n, нүд = \t. Сүүлийн хоосон мөрийг хасна. */
export function parsePaste(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("\t"));
}

/** «0» → буруу, бусад (хоосон) → зөв. */
export function isZero(cell: string): boolean {
  return cell.trim() === "0";
}

export function fullName(row: { firstName: string; lastName: string }): string {
  return `${row.lastName} ${row.firstName}`.trim();
}
