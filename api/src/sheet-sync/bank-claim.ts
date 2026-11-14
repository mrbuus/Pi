// Шийт ↔ банкны хуулга давхар тоолохоос хамгаална (эзэн 2026-11-06).
//
// Багш+ банкны хуулгаас «Шийтэд бүртгэгдээгүй» төлбөрийг батлахад вэбд `bank_…`
// төлбөр үүснэ. Дараа нь ажилтан тэр төлбөрийг шийтэд гараар бичвэл синк ШИНЭ
// төлбөр нэмж мөнгө давхардана. Иймээс синк шинэ төлбөр бичихээсээ өмнө тэр хүүхдэд
// ижил дүнтэй, ±3 хоногийн, шийтийн нүдтэй холбогдоогүй хуулгын төлбөр байвал
// ШИНЭЭР БИЧИХГҮЙ — тэр төлбөрийг нүдтэй холбоно (хамгийн ойр огноотойг). ЦЭВЭР функц.

export interface PlannedInsert {
  studentId: string;
  cell: string;
  amount: number;
  /** Шийтийн «Баримт» огноо «YYYY-MM-DD» (байхгүй бол null) */
  paidOn: string | null;
  forMonth: string;
}

export interface UnlinkedBankPayment {
  id: string;
  userId: string;
  amount: number;
  /** УБ огноо «YYYY-MM-DD» */
  paidOn: string;
}

const WINDOW_DAYS = 3;
const dayDiff = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;

export function claimBankPayments<T extends PlannedInsert>(
  inserts: T[],
  bank: UnlinkedBankPayment[],
): { keep: T[]; links: { paymentId: string; studentId: string; cell: string }[] } {
  const pool = [...bank];
  const keep: T[] = [];
  const links: { paymentId: string; studentId: string; cell: string }[] = [];
  for (const ins of inserts) {
    // Огноогүй нүдэнд: тэр сарын (forMonth) хуулгын төлбөр
    let best = -1;
    let bestDiff = Infinity;
    pool.forEach((p, i) => {
      if (p.userId !== ins.studentId || p.amount !== ins.amount) return;
      const d = ins.paidOn ? dayDiff(ins.paidOn, p.paidOn) : p.paidOn.startsWith(ins.forMonth) ? 0 : Infinity;
      if (d <= WINDOW_DAYS && d < bestDiff) {
        best = i;
        bestDiff = d;
      }
    });
    if (best < 0) {
      keep.push(ins);
      continue;
    }
    links.push({ paymentId: pool[best].id, studentId: ins.studentId, cell: ins.cell });
    pool.splice(best, 1);
  }
  return { keep, links };
}
