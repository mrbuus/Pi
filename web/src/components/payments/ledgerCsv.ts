import { buildCsv, csvFilename, downloadCsv } from "@/components/registry/csv";
import { TUITION_PLAN_LABEL } from "./paymentHelpers";
import type { LedgerRow, YearView } from "./ledgerTypes";

/**
 * Сарын блокийн (ангийн самбар, «Асуудалтай») мөрүүдийг CSV болгоно.
 * Дэлгэц дээр харагдаж буй, шүүгдсэн мөрүүд яг тэр хэвээр орно. Дүн бүр цэвэр тоо.
 */
export function ledgerRowsToCsv(rows: LedgerRow[], year: YearView): string {
  const headers = [
    "Код",
    "Овог",
    "Нэр",
    "Утас",
    "Анги",
    "Төлбөрийн төрөл",
    "Нийт үнэ (₮)",
    "Төлсөн нийт (₮)",
    "Одоогийн өр (₮)",
    "Өрийн сар",
    "Үлдэгдэл (₮)",
    "Амлалтын огноо",
    ...year.months.map((m) => `${m} төлсөн (₮)`),
  ];
  const body = rows.map((r) => [
    r.code,
    r.lastName,
    r.firstName,
    r.phone,
    r.classroom?.name,
    TUITION_PLAN_LABEL[r.plan.kind] ?? r.plan.kind,
    r.price,
    r.paidTotal,
    r.owedNow,
    r.owedMonths,
    r.remaining,
    r.promise?.on,
    ...year.months.map((_, i) => r.blocks[i]?.paid ?? 0),
  ]);
  return buildCsv(headers, body);
}

export function downloadLedgerCsv(rows: LedgerRow[], year: YearView, topic: string): void {
  downloadCsv(csvFilename(topic), ledgerRowsToCsv(rows, year));
}
