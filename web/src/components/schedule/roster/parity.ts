// Сондгой/тэгш 7 хоногийн ээлж — api/src/schedule/week-resolver.ts `weekParityOf`-той ИЖИЛ.
// 1-р (сондгой) 7 хоног = Даваа 2026-08-31-ээс (эзэн 2026-10-11).
export const PARITY_ANCHOR_MONDAY = "2026-08-31";

export function weekParityOf(dateKey: string): 1 | 2 {
  const day = Date.parse(`${dateKey}T00:00:00.000Z`);
  const anchor = Date.parse(`${PARITY_ANCHOR_MONDAY}T00:00:00.000Z`);
  const week = Math.floor(Math.round((day - anchor) / 86_400_000) / 7);
  return ((week % 2) + 2) % 2 === 0 ? 1 : 2;
}

export const PARITY_LABEL: Record<0 | 1 | 2, string> = {
  0: "Тогтмол",
  1: "Сондгой",
  2: "Тэгш",
};
