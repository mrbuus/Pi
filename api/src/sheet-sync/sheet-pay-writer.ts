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

/** Хичээлийн үнэ: математик (4 өдөр 350 мянга / 2.5 сая), нийгэм (300 мянга / 1.5 сая). */
export interface WriterPrices {
  fullMin: number;
  fullPrice: number;
  monthMax: number;
  /** Хамгийн бага сарын төлбөр — нэг нүдэнд хэдэн сарынх бичигдсэнийг тооцоход */
  monthMin: number;
  topUpMax: number;
  /**
   * Нийгэм: сар төлсний дараа үлдэгдлээ төлбөл ажилтан хичээлийн жилийн эхний нүдэнд нийлүүлж
   * «бүтэн» болгодог (300,000 + 1,200,000 = 1,500,000; 700,000 + 800,000)
   */
  mergeYear?: boolean;
}
export const MATH_PRICES: WriterPrices = { fullMin: FULL_YEAR_MIN, fullPrice: FULL_YEAR_PRICE, monthMax: MONTH_MAX, monthMin: 300_000, topUpMax: TOP_UP_MAX };
export const SOCIAL_PRICES: WriterPrices = { fullMin: 700_000, fullPrice: 1_500_000, monthMax: 300_000, monthMin: 300_000, topUpMax: TOP_UP_MAX, mergeYear: true };
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
 * Өмнө нь төлөгдөөгүй үлдсэн сар (эзэн 2026-11-12): 10-р сараа төлөөгүй хүүхэд 11-р сард
 * төлбөл мөнгө 10-р сард орно. Сүүлийн бөглөсөн сараас ӨМНӨХ, хичээлийн жилийн, сууж
 * эхэлснээс хойших, цэнхэр биш (суусан), хоосон хамгийн эхний сар. Бүтэн жилийн мөрөнд үгүй;
 * нэг нүдэнд хэдэн сарынх бичигдсэн (10-р сард 700,000 = 9, 10-р сар) бол нийт дүн хүрч байвал үгүй.
 */
export function owedGap(state: RowState, last: number, prices: WriterPrices = MATH_PRICES): number {
  if (last < 0 || state.cycles.some((c) => filled(c) && (isFull(c) || c.amount >= prices.fullMin))) return -1;
  const floor = [SCHOOL_START, state.start?.slice(0, 7) ?? ''].sort().at(-1)!;
  const span = state.cycles.filter((c, i) => i <= last && c.month >= floor && !c.skip);
  const paid = span.reduce((t, c) => t + c.amount, 0);
  if (paid >= span.length * prices.monthMin) return -1;
  return state.cycles.findIndex((c, i) => i < last && c.month >= floor && !c.skip && !filled(c));
}

/**
 * Нэг төлбөрийг мөрийн төлөвт бичнэ (төлөвийг өөрчилнө).
 * - Сүүлийн бөглөсөн сар «бүтэн» бөгөөд 2.5 саяас бага → үлдэгдэл түүнд нэмэгдэнэ.
 * - 1 саяас их төлбөр, сүүлийн сар урьдчилгаа (хугацаагүй, эсвэл хичээлийн жилийнх бөгөөд
 *   «Хэлбэр» бүтэн/хагас) → нэмээд «бүтэн».
 * - Дутуу сар (нийлбэр нь 350 мянгаас хэтрэхгүй, эсвэл 100 мянгаас бага төлбөр) → нэмнэ.
 * - Бусад үед сүүлийн бөглөсөн сарын дараах цэнхэр биш (суусан) сар.
 * Давхардсан нүдэнд дүнг нэмж, баримтын огноог «, MM/DD» гэж залгана.
 */
export function writeTuition(state: RowState, pay: { amount: number; date: string }, prices: WriterPrices = MATH_PRICES): { idx: number; mode: WriteMode } {
  const receipt = pay.date.slice(5).replace('-', '/');
  let last = -1;
  state.cycles.forEach((c, i) => filled(c) && (last = i));
  const L = last >= 0 ? state.cycles[last] : null;
  const year = state.cycles.map((c, i) => ({ c, i })).filter(({ c }) => c.month >= SCHOOL_START && filled(c));
  const yearSum = year.reduce((t, { c }) => t + c.amount, 0);
  let mode: WriteMode = 'NEW';
  let idx = -1;
  const gap = owedGap(state, last, prices);
  if (L && isFull(L) && L.amount < prices.fullPrice) mode = 'FULL_MERGE';
  else if (prices.mergeYear && year.length && pay.amount >= prices.fullMin && yearSum + pay.amount <= prices.fullPrice) {
    mode = 'FULL_MERGE';
    last = year[0].i;
  } else if (L && pay.amount >= prices.fullMin && L.amount < prices.fullMin && (!L.period || (L.month >= SCHOOL_START && /бүтэн|хагас/i.test(state.form ?? '')))) mode = 'FULL_MERGE';
  else if (gap >= 0 && pay.amount < prices.fullMin) {
    // Өртэй сар нөхнө: тэр сарын дутууг (эсвэл бүтэн сарыг) — үлдсэн нь ч мөн тэнд (ажилтан засна)
    const c = state.cycles[gap];
    c.period = nextPeriod(state, gap, pay.date);
    c.amount += pay.amount;
    c.receipts.push(receipt);
    return { idx: gap, mode: 'NEW' };
  } else if (L && L.amount > 0 && !isFull(L) && pay.amount < prices.fullMin && (pay.amount < prices.topUpMax || L.amount + pay.amount <= prices.monthMax)) mode = 'TOP_UP';
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
    c.period = pay.amount >= prices.fullMin && (!L || L.month < SCHOOL_START) ? 'бүтэн' : nextPeriod(state, idx, pay.date);
  c.amount += pay.amount;
  c.receipts.push(receipt);
  return { idx, mode };
}
