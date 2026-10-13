import { computeLedger, PRICE_TIERS, type LedgerInput } from '../payments/ledger';
import { computePlanRefund, contractRange } from './plan-refund';

// Даваа, Лхагва, Баасан, Бямба (JS: 1,3,5,6) — 12-р анги 7 хоногт 4 өдөр
function lessonDays(from: string, to: string, weekdays = [1, 3, 5, 6]): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    const d = new Date(t);
    if (weekdays.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
const YEAR_DAYS = lessonDays('2026-09-01', '2027-05-31');
const ledgerOf = (over: Partial<LedgerInput>) =>
  computeLedger({
    plan: 'MONTHLY',
    tuitionAmount: 350_000,
    tier: PRICE_TIERS.g12,
    startDate: '2026-09-01',
    leftOn: null,
    payments: [],
    today: '2026-11-10',
    ...over,
  });

describe('computePlanRefund', () => {
  it('сар бүр 350 000₮, 4 өдөр/7 хоног: 11-р сарын 17 хичээлээс 5 суусан', () => {
    const ledger = ledgerOf({
      payments: [
        { amount: 350_000, forMonth: '2026-09', paidOn: null },
        { amount: 350_000, forMonth: '2026-10', paidOn: null },
        { amount: 350_000, forMonth: '2026-11', paidOn: null },
      ],
    });
    const r = computePlanRefund({ ledger, cycleDay: 1, lessonDays: YEAR_DAYS, leftOn: '2026-11-10' });
    expect(r.totalLessonDays).toBe(17);
    expect(r.attendedLessonDays).toBe(5);
    expect(r.owed).toBe(700_000 + 102_941); // floor — сурагчийн талд
    expect(r.refundAmount).toBe(247_059);
    expect(r.shortfall).toBe(0);
    expect(r.breakdown.join('\n')).toContain('17 хичээлээс 5 суусан');
  });

  it('сар бүр: урьдчилж төлсөн дараагийн сар бүтнээрээ буцна', () => {
    const ledger = ledgerOf({ payments: [{ amount: 4 * 350_000, forMonth: '2026-09', paidOn: null }] });
    const r = computePlanRefund({ ledger, cycleDay: 1, lessonDays: YEAR_DAYS, leftOn: '2026-11-10' });
    expect(r.refundAmount).toBe(350_000 + 247_059);
  });

  it('сар бүр: төлөөгүй бол дутуу (shortfall)', () => {
    const ledger = ledgerOf({ payments: [{ amount: 350_000, forMonth: '2026-09', paidOn: null }] });
    const r = computePlanRefund({ ledger, cycleDay: 1, lessonDays: YEAR_DAYS, leftOn: '2026-11-10' });
    expect(r.refundAmount).toBe(0);
    expect(r.shortfall).toBe(350_000 + 102_941);
  });

  it('мөчлөг 9/28-нд эхэлдэг бол 10-р сарын мөчлөг 10/28 – 11/27', () => {
    const ledger = ledgerOf({
      startDate: '2026-09-28',
      payments: [{ amount: 700_000, forMonth: '2026-09', paidOn: null }],
    });
    const r = computePlanRefund({ ledger, cycleDay: 28, lessonDays: YEAR_DAYS, leftOn: '2026-11-01' });
    // 9-р сарын мөчлөг (9/28–10/27) бүтэн, 10-р сарын мөчлөгт 10/28–11/01 хооронд суусан
    expect(r.breakdown[1]).toContain('9-р сар');
    expect(r.attendedLessonDays).toBe(lessonDays('2026-10-28', '2026-11-01').length);
  });

  it('бүтэн жил: жилийн гэрээ хичээлийн өдрөөр хуваагдана', () => {
    const ledger = ledgerOf({
      plan: 'FULL_YEAR',
      tuitionAmount: 2_500_000,
      payments: [{ amount: 2_500_000, forMonth: '2026-09', paidOn: null }],
    });
    const r = computePlanRefund({ ledger, cycleDay: 1, lessonDays: YEAR_DAYS, leftOn: '2026-11-10' });
    const total = YEAR_DAYS.length;
    const attended = YEAR_DAYS.filter((d) => d <= '2026-11-10').length;
    expect(r.totalLessonDays).toBe(total);
    expect(r.attendedLessonDays).toBe(attended);
    expect(r.owed).toBe(Math.floor((2_500_000 * attended) / total));
    expect(r.refundAmount).toBe(2_500_000 - r.owed);
    expect(r.warnings).not.toContain('JOINED_BEFORE_FIRST_LESSON');
  });

  it('гэрээ эхлэхээс өмнө гарсан бол бүх төлбөр буцна', () => {
    const ledger = ledgerOf({
      startDate: '2026-10-01',
      payments: [{ amount: 350_000, forMonth: '2026-10', paidOn: null }],
    });
    const r = computePlanRefund({ ledger, cycleDay: 1, lessonDays: YEAR_DAYS, leftOn: '2026-09-20' });
    expect(r.refundAmount).toBe(350_000);
  });

  it('contractRange: 9/1-ээс 5-р сарын сүүл хүртэл', () => {
    expect(contractRange(ledgerOf({}), 1)).toEqual({ start: '2026-09-01', end: '2027-05-31' });
    expect(contractRange(ledgerOf({ startDate: '2026-09-07' }), 7)).toEqual({ start: '2026-09-07', end: '2027-06-06' });
  });
});
