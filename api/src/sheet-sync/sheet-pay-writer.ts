// Банкны хуулгаас оноосон сургалтын төлбөрийг «Суудал баталгаажуулалт» хуудасны
// сарын бүлэгт (Төлсөн дүн / Хугацаа / Баримт) ажилтны адил бичих ЦЭВЭР логик.
// Дүрмийг 11-08-ны шийтийн 09/01–11/05-ны бичилтийг давтан тулгаж гаргасан
// (prisma/reports/sheet-replay.ts, docs/TOLBOR-SHEET-LOGIC.md §6).

import { Cell } from './sheet-book';

export interface CycleState {
  /** 'YYYY-MM' — бүлгийн сар */
  month: string;
  amount: number;
  /** Дүнгийн нүдэнд тооны оронд бичсэн үг («бүтэн», «ярьсан») */
  text: string | null;
  period: string | null;
  /** 'MM/DD' — бичсэн дарааллаар */
  receipts: string[];
  /** Цэнхэр дэвсгэр — ажилтан «суугаагүй сар» гэж тэмдэглэсэн, төлбөр бичихгүй */
  skip?: boolean;
}
export interface RowState {
  /** K «Сууж эхэлсэн» — 'YYYY-MM-DD' */
  start: string | null;
  /** N «Хэлбэр» */
  form: string | null;
  cycles: CycleState[];
}

/** Хичээлийн жилийн эхний сар — зуны дараа хугацаа 09/01-ээс шинээр эхэлдэг. */
export const SCHOOL_START = '2026-09';
export const FULL_YEAR_MIN = 1_000_000;
/** Бүтэн жилийн хамгийн их үнэ — «бүтэн» нүд үүнээс бага бол үлдэгдлийг нэмнэ. */
export const FULL_YEAR_PRICE = 2_500_000;
/** Нэг сарын хамгийн их төлбөр — үүнээс хэтрэхгүй бол дутуу сард нэмнэ. */
export const MONTH_MAX = 350_000;
/** Үүнээс бага төлбөр бол үргэлж өмнөх сарын нэмэлт. */
export const TOP_UP_MAX = 100_000;
const pad2 = (n: number) => String(n).padStart(2, '0');
const PERIOD = /^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/;

/** «Баримт» нүд → 'MM/DD' жагсаалт (огноо эсвэл «09/01, 9/30» текст). */
export function receiptTokens(v: Cell | undefined): string[] {
  if (v == null || v === '') return [];
  const s = String(v);
  const out: string[] = [];
  for (const m of s.matchAll(/(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})/g))
    out.push(m[1] ? `${m[2]}/${m[3]}` : `${pad2(Number(m[4]))}/${pad2(Number(m[5]))}`);
  return out;
}

/** Хугацаа «MM/DD-MM/DD» — эхлэх сар, өдрөөс нэг сар. */
export function periodText(month: number, day: number): string {
  return `${pad2(month)}/${pad2(day)}-${pad2((month % 12) + 1)}/${pad2(day)}`;
}

const isFull = (c: CycleState) => /бүтэн/i.test(c.period ?? '');
const filled = (c: CycleState) => c.amount > 0 || !!c.text;

/**
 * Шинэ сарын хугацаа:
 * - Хичээлийн жил (9-р сар) зунаас үргэлжилж байвал 09/01-ээс шинээр эхэлнэ.
 * - Өмнөх сарын хугацаа энэ сард дууссан бол үргэлжлүүлнэ («09/14-10/14» → «10/14-11/14»).
 * - Үгүй бол сууж эхэлсэн өдрөөр.
 */
function nextPeriod(state: RowState, idx: number, payDate: string): string {
  const month = Number(state.cycles[idx].month.slice(5, 7));
  if (state.cycles[idx].month === SCHOOL_START && state.start && state.start < `${SCHOOL_START}-01`) return periodText(month, 1);
  for (let i = idx - 1; i >= 0; i--) {
    const c = state.cycles[i];
    if (!filled(c)) continue;
    const m = (c.period ?? '').match(PERIOD);
    if (m && Number(m[3]) === month) return periodText(month, Number(m[4]));
    break;
  }
  return periodText(month, Number((state.start ?? payDate).slice(8, 10)));
}

export type WriteMode = 'NEW' | 'TOP_UP' | 'FULL_MERGE';

/**
 * Нэг төлбөрийг мөрийн төлөвт бичнэ (төлөвийг өөрчилнө).
 * - Сүүлийн бөглөсөн сар «бүтэн» бөгөөд 2.5 саяас бага → үлдэгдэл түүнд нэмэгдэнэ.
 * - 1 саяас их төлбөр, сүүлийн сар урьдчилгаа (хугацаагүй, эсвэл хичээлийн жилийнх бөгөөд
 *   «Хэлбэр» бүтэн/хагас) → нэмээд «бүтэн».
 * - Дутуу сар (нийлбэр нь 350 мянгаас хэтрэхгүй, эсвэл 100 мянгаас бага төлбөр) → нэмнэ.
 * - Бусад үед сүүлийн бөглөсөн сарын дараах цэнхэр биш (суусан) сар.
 * Давхардсан нүдэнд дүнг нэмж, баримтын огноог «, MM/DD» гэж залгана.
 */
export function writeTuition(state: RowState, pay: { amount: number; date: string }): { idx: number; mode: WriteMode } {
  const receipt = pay.date.slice(5).replace('-', '/');
  let last = -1;
  state.cycles.forEach((c, i) => filled(c) && (last = i));
  const L = last >= 0 ? state.cycles[last] : null;
  let mode: WriteMode = 'NEW';
  let idx = -1;
  if (L && isFull(L) && L.amount < FULL_YEAR_PRICE) mode = 'FULL_MERGE';
  else if (L && pay.amount >= FULL_YEAR_MIN && L.amount < FULL_YEAR_MIN && (!L.period || (L.month >= SCHOOL_START && /бүтэн|хагас/i.test(state.form ?? '')))) mode = 'FULL_MERGE';
  else if (L && L.amount > 0 && !isFull(L) && pay.amount < FULL_YEAR_MIN && (pay.amount < TOP_UP_MAX || L.amount + pay.amount <= MONTH_MAX)) mode = 'TOP_UP';
  if (mode !== 'NEW') idx = last;
  else {
    const from = last >= 0 ? last + 1 : 0;
    const startMonth = last >= 0 ? '' : (state.start?.slice(0, 7) ?? '');
    idx = state.cycles.findIndex((c, i) => i >= from && !c.skip && !filled(c) && c.month >= startMonth);
    if (idx < 0) idx = state.cycles.findIndex((c, i) => i >= from && !filled(c));
    if (idx < 0) idx = state.cycles.length - 1;
  }
  const c = state.cycles[idx];
  if (mode === 'FULL_MERGE') c.period = 'бүтэн';
  else if (mode === 'NEW')
    // Бүтэн жилийн төлбөр шинэ нүдэнд: хичээлийн жилийн эхэнд «бүтэн», харин 9-р сарыг
    // сараар төлсний дараах үлдэгдэл бол дараагийн сарын хугацаатай (ажилтны бичлэгээр)
    c.period = pay.amount >= FULL_YEAR_MIN && (!L || L.month < SCHOOL_START) ? 'бүтэн' : nextPeriod(state, idx, pay.date);
  c.amount += pay.amount;
  c.receipts.push(receipt);
  return { idx, mode };
}
