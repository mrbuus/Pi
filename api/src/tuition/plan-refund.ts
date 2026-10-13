// Багцаас хамаарсан буцаалтын ЦЭВЭР тооцоо — proration.ts-ийг багц бүрт зөв
// гэрээний хугацаатай дуудна.
//
// ⚠️ Өмнөх алдаа (2026-10-13 засав): previewRefund хичээлийн өдрийг ЗӨВХӨН
// орсон → гарсан хооронд авдаг байсан тул «нийт» = «суусан» болж, буцаалт
// хэзээ ч өдрөөр хуваагдахгүй (төлсөн − бүтэн гэрээ) гардаг байв.
//
//  - Сар бүр: өмнөх мөчлөгүүд бүтэн, гарсан мөчлөг нь ХИЧЭЭЛИЙН өдрөөр
//    (350 000₮, 4 өдөр/7 хоног → 17 хичээлээс 5 суусан бол 102 941₮),
//    дараагийн мөчлөг 0. Урьдчилж төлсөн сарууд бүтнээрээ буцна.
//  - Бүтэн жил / хуваан төлөх: жилийн гэрээ (ногдох нийт дүн) бүхэлдээ
//    хичээлийн өдрөөр хуваагдана.
// Дугуйруулалт proration.ts-ийнх (Math.floor — сурагчийн талд).

import type { DateKey, LedgerResult, MonthKey } from '../payments/ledger';
import {
  prorateTuition,
  type ProrationResult,
  type ProrationWarning,
} from './proration';

export interface PlanRefundInput {
  /** leftOn-гүйгээр (бүтэн гэрээгээр) тооцсон ledger */
  ledger: LedgerResult;
  /** Мөчлөгийн эхлэх өдөр (1–28) */
  cycleDay: number;
  /** Гэрээний эхнээс төгсгөл хүртэлх ангийн хичээлийн өдрүүд */
  lessonDays: DateKey[];
  leftOn: DateKey;
}

export interface PlanRefundResult extends ProrationResult {
  breakdown: string[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const mnt = (n: number) => `${n.toLocaleString('en-US')}₮`;
const monthNo = (m: MonthKey) => Number(m.slice(5, 7));

function nextMonth(m: MonthKey): MonthKey {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${pad2(mo + 1)}`;
}

function prevDay(d: DateKey): DateKey {
  return new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Гэрээний хүрээ: эхний идэвхтэй мөчлөгийн эхлэлээс сүүлийнхийн төгсгөл хүртэл. */
export function contractRange(
  ledger: LedgerResult,
  cycleDay: number,
): { start: DateKey; end: DateKey } | null {
  const active = ledger.blocks.filter((b) => b.state !== 'OFF');
  if (!active.length) return null;
  const dd = pad2(cycleDay);
  const last = active[active.length - 1].month;
  return {
    start: `${active[0].month}-${dd}`,
    end: prevDay(`${nextMonth(last)}-${dd}`),
  };
}

// Мөчлөг сарын 1-нээс эхэлдэг бол эхний хичээл түүнээс хойш байх нь ХЭВИЙН.
const NOISE: ProrationWarning[] = ['JOINED_BEFORE_FIRST_LESSON'];

export function computePlanRefund(input: PlanRefundInput): PlanRefundResult {
  const { ledger, leftOn } = input;
  const days = [...new Set(input.lessonDays)].sort();
  const range = contractRange(ledger, input.cycleDay);
  const paid = ledger.paidTotal;
  const clean = (w: ProrationWarning[]) => w.filter((x) => !NOISE.includes(x));

  if (!range || leftOn < range.start) {
    return {
      totalLessonDays: 0,
      attendedLessonDays: 0,
      dailyRate: 0,
      owed: 0,
      totalPaid: paid,
      refundAmount: paid,
      shortfall: 0,
      warnings: range ? [] : ['NO_LESSON_DAYS'],
      breakdown: [`Гэрээ эхлэхээс өмнө гарсан — төлсөн ${mnt(paid)} бүтнээрээ буцна`],
    };
  }

  if (ledger.plan.kind !== 'MONTHLY') {
    const inContract = days.filter((d) => d >= range.start && d <= range.end);
    const r = prorateTuition({
      lessonDays: inContract,
      totalTuition: ledger.price,
      joinedOn: range.start,
      leftOn,
      totalPaid: paid,
    });
    const label = ledger.plan.kind === 'FULL_YEAR' ? 'Бүтэн жилийн гэрээ' : 'Хуваан төлөх гэрээ';
    return {
      ...r,
      warnings: clean(r.warnings),
      breakdown: [
        `${label}: ${mnt(ledger.price)}, ${r.totalLessonDays} хичээл`,
        `Суусан: ${r.attendedLessonDays} хичээл → ${mnt(r.owed)}`,
        `Төлсөн: ${mnt(paid)}`,
        r.refundAmount > 0
          ? `Буцаах: ${mnt(r.refundAmount)}`
          : r.shortfall > 0
            ? `Дутуу: ${mnt(r.shortfall)}`
            : 'Тооцоо тэнцсэн',
      ],
    };
  }

  // Сар бүр: мөчлөг бүрийн хүрээ
  const dd = pad2(input.cycleDay);
  let owed = 0;
  const fullMonths: MonthKey[] = [];
  let leaving: ProrationResult | null = null;
  let leavingMonth: MonthKey | null = null;
  for (const b of ledger.blocks) {
    if (b.state === 'OFF') continue;
    const start = `${b.month}-${dd}`;
    const end = prevDay(`${nextMonth(b.month)}-${dd}`);
    if (end < leftOn) {
      owed += b.due;
      fullMonths.push(b.month);
    } else if (start <= leftOn) {
      leaving = prorateTuition({
        lessonDays: days.filter((d) => d >= start && d <= end),
        totalTuition: b.due,
        joinedOn: start,
        leftOn,
        totalPaid: 0,
      });
      leavingMonth = b.month;
      owed += leaving.owed;
    }
  }
  const diff = paid - owed;
  const lines = [`Сарын төлбөр: ${mnt(ledger.plan.fee)}`];
  if (fullMonths.length)
    lines.push(
      `Бүтэн сар: ${fullMonths.map((m) => `${monthNo(m)}`).join(', ')}-р сар → ${mnt(
        fullMonths.length * ledger.plan.fee,
      )}`,
    );
  if (leaving && leavingMonth)
    lines.push(
      `${monthNo(leavingMonth)}-р сар: ${leaving.totalLessonDays} хичээлээс ${leaving.attendedLessonDays} суусан → ${mnt(leaving.owed)}`,
    );
  lines.push(`Төлөх ёстой: ${mnt(owed)}`, `Төлсөн: ${mnt(paid)}`);
  lines.push(
    diff > 0 ? `Буцаах: ${mnt(diff)}` : diff < 0 ? `Дутуу: ${mnt(-diff)}` : 'Тооцоо тэнцсэн',
  );
  return {
    totalLessonDays: leaving?.totalLessonDays ?? 0,
    attendedLessonDays: leaving?.attendedLessonDays ?? 0,
    dailyRate: leaving?.dailyRate ?? 0,
    owed,
    totalPaid: paid,
    refundAmount: Math.max(0, diff),
    shortfall: Math.max(0, -diff),
    warnings: clean(leaving?.warnings ?? []),
    breakdown: lines,
  };
}
