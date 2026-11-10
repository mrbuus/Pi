// Жилийн сургалтын төлбөрөө бүрэн төлсөн хүүхдийг сургалтын төлбөрийн саналаас
// хасна (эзэн 2026-11-08): бүтэн жилийн 2.5/2 саяа төлчихсөн хүүхэд дахин
// «сонгох» жагсаалтад гарч төөрөгдүүлэхгүй. ЦЭВЭР логик.
//
// Анхаар: тухайн гүйлгээ ӨӨРӨӨ төлбөрийг бүрэн болгосон байж болно (10/18-ны
// 2,150,000₮ үлдэгдэл). Тиймээс гүйлгээнээс 3+ хоногийн ӨМНӨ бүрэн болсныг л хасна.

import type { DateKey, LedgerResult } from '../payments/ledger';
import { shiftDay } from './khan-statement';
import type { RowSuggestion } from './reconcile.service';

export const PAID_UP_GRACE_DAYS = 3;
/** Гараар «бүтэн жил» гэж тооцсон, эсвэл бүрэн төлөгдсөн өдөр тодорхойгүй */
const LONG_AGO = '0000-01-01';

/** Жилийн төлбөр бүрэн болсон өдөр — бүрэн биш бол null. */
export function paidUpOn(r: Pick<LedgerResult, 'blocks' | 'remaining' | 'plan'>): DateKey | null {
  const active = r.blocks.filter((b) => b.state !== 'OFF');
  if (!active.length || r.remaining > 0 || active.some((b) => b.state !== 'PAID')) return null;
  if (r.plan.settled) return LONG_AGO;
  const days = active.map((b) => b.paidOn).filter((d): d is string => !!d).sort();
  return days.at(-1) ?? LONG_AGO;
}

/**
 * Сургалтын төлбөрийн саналаас гүйлгээний өмнө бүрэн төлсөн хүүхдийг хасна. Хамгийн
 * итгэлтэй хүүхэд хасагдвал автоматаар оноохгүй (хүн сонгоно). Ном, хариултын хуудас
 * зэрэг бусад зориулалтад хамаарахгүй.
 *
 * `recorded` — ажилтан шийтэд тэр хүүхдэд ±3 хоногт төлбөр бүртгэсэн бол бүрэн төлсөн ч
 * хасахгүй: илүү төлөлт, дахин төлөлт байж болох ч ажилтны бүртгэл нотолгоо (11-05-ны
 * хуулгад 629-өөс 3 ийм).
 */
export function dropPaidUp(s: RowSuggestion, txDay: DateKey, paidUp: Map<string, DateKey>, recorded: (studentId: string) => boolean = () => false): RowSuggestion {
  if (s.kind !== 'TUITION' || s.split?.length) return s;
  const cutoff = shiftDay(txDay, -PAID_UP_GRACE_DAYS);
  const kept = s.candidates.filter((c) => {
    const on = paidUp.get(c.studentId);
    return !on || on > cutoff || recorded(c.studentId);
  });
  const hidden = s.candidates.length - kept.length;
  if (!hidden) return s;
  const topLost = kept[0]?.studentId !== s.candidates[0]?.studentId;
  const decision: RowSuggestion['decision'] = !kept.length
    ? 'NONE'
    : s.decision === 'SPLIT' && kept.length < 2
      ? 'CHOOSE'
      : (s.decision === 'AUTO' || s.decision === 'SUGGEST') && topLost
        ? 'CHOOSE'
        : s.decision;
  return { ...s, candidates: kept, decision, confident: decision === s.decision && s.confident, hiddenPaidUp: hidden };
}
