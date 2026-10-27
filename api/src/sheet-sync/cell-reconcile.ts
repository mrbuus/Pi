// Нэг сурагчийн шийтийн нүд бүрийн дүнг вэбийн (баталгаажсан) төлбөртэй тулгана.
//
// Ажилтнууд нэмэлт төлбөрийг ИЖИЛ нүдэнд нэмж бичдэг (350,000 → 2,500,000,
// баримт «04/14, 09/30»). Тиймээс түлхүүрээр биш, НҮДЭЭР тулгана:
//   шийтийн нүдний нийт − вэб дэх тэр нүдний нийт = зөрүү
//   зөрүү > 0 → зөрүүг шинэ гүйлгээ болгож нэмнэ (дарж бичихгүй)
//   зөрүү < 0 → автоматаар юу ч хийхгүй, «шалгах» зөрүү (давхар тооцохоос сэргийлж
//              тэр сурагчийн нэмэлтийг ч хүлээлгэнэ — нүд хооронд шилжсэн байж болно)

import { paymentRequestId, PlannedPayment } from './payment-plan';

export interface ExistingCellPayment {
  paymentId: string;
  cell: string;
  amount: number;
}
export interface CellInsert {
  requestId: string;
  cell: string;
  amount: number;
  forMonth: string;
  paidOn: string | null;
  label: string;
}
export interface CellMismatch {
  cell: string;
  sheet: number;
  web: number;
}
export interface StudentReconcile {
  inserts: CellInsert[];
  mismatches: CellMismatch[];
  /** Зөрүү (сөрөг) байсан тул нэмэлтийг хүлээлгэсэн */
  held: CellInsert[];
}

/**
 * Тулгах «сарын үүр»: «Сар бүр» нь эзэн жагсаалтын хуучин хуулбар тул нэг сурагчийн
 * `monthly|2026-09` ба `main|2026-09` нь ижил сар. Хүүхэд жагсаалт хооронд
 * шилжихэд мөнгө давхардах эсвэл «алга болохоос» сэргийлнэ. Нийгэм — тусдаа хичээл.
 */
export const cellSlot = (cell: string) => cell.replace(/^monthly\|/, 'main|');

/** Ашиглагдсан бол `|re1`, `|re2` … нэмж чөлөөтэй түлхүүр олно (буцаасан гүйлгээтэй мөргөлдөхгүй). */
export function freeRequestId(studentId: string, key: string, taken: Set<string>): string {
  let id = paymentRequestId(studentId, key);
  for (let n = 1; taken.has(id); n++) id = paymentRequestId(studentId, `${key}|re${n}`);
  taken.add(id);
  return id;
}

export function reconcileStudent(
  studentId: string,
  planned: PlannedPayment[],
  existing: ExistingCellPayment[],
  taken: Set<string>,
): StudentReconcile {
  const plannedByCell = new Map<string, PlannedPayment[]>();
  for (const p of planned) plannedByCell.set(cellSlot(p.cell), [...(plannedByCell.get(cellSlot(p.cell)) ?? []), p]);
  const webByCell = new Map<string, number>();
  for (const e of existing) webByCell.set(cellSlot(e.cell), (webByCell.get(cellSlot(e.cell)) ?? 0) + e.amount);

  const inserts: CellInsert[] = [];
  const mismatches: CellMismatch[] = [];
  const cells = [...new Set([...plannedByCell.keys(), ...webByCell.keys()])].sort();
  for (const cell of cells) {
    const list = plannedByCell.get(cell) ?? [];
    const sheet = list.reduce((t, p) => t + p.amount, 0);
    const web = webByCell.get(cell) ?? 0;
    if (sheet === web) continue;
    if (sheet < web) {
      mismatches.push({ cell, sheet, web });
      continue;
    }
    if (web === 0) {
      // Шинэ нүд — задаргааг (урьдчилгаа/үлдэгдэл) тус тусад нь, хуучин түлхүүрээр
      for (const p of list)
        inserts.push({ requestId: freeRequestId(studentId, p.key, taken), cell: p.cell, amount: p.amount, forMonth: p.forMonth, paidOn: p.paidOn, label: p.label });
      continue;
    }
    // Нүдэнд нэмэлт төлбөр бичигдсэн — зөрүүг нэг гүйлгээ болгоно
    const last = list[list.length - 1];
    const paidOn = list.map((p) => p.paidOn).filter((d): d is string => !!d).sort().at(-1) ?? null;
    inserts.push({
      requestId: freeRequestId(studentId, `${cell}|+${web}->${sheet}`, taken),
      cell: last.cell,
      amount: sheet - web,
      forMonth: last.forMonth,
      paidOn,
      label: `${last.label} — нэмэлт`,
    });
  }
  if (mismatches.length && inserts.length) return { inserts: [], mismatches, held: inserts };
  return { inserts, mismatches, held: [] };
}
