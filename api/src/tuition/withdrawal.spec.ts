import {
  addMonths,
  computeWithdrawal,
  lessonsPerMonthFor,
  type DateKey,
} from './withdrawal';

/** Да, Мя, Пү, Ба (7 хоногт 4 өдөр) хичээлийн өдрүүд [from, to] */
function days4(from: DateKey, to: DateKey, skip: DateKey[] = []): DateKey[] {
  const out: DateKey[] = [];
  for (
    let t = Date.parse(`${from}T00:00:00Z`);
    t <= Date.parse(`${to}T00:00:00Z`);
    t += 86_400_000
  ) {
    const d = new Date(t);
    if ([1, 2, 4, 6].includes(d.getUTCDay()))
      out.push(d.toISOString().slice(0, 10));
  }
  return out.filter((d) => !skip.includes(d));
}

const base = {
  monthlyFee: 350_000,
  lessonsPerMonth: 16,
  countFrom: '2026-09-01',
  excusedDays: [] as DateKey[],
  extraExcluded: [] as DateKey[],
};

describe('Сургалтаас хасах — гэрээний тооцоо (эзэн 2026-11-03)', () => {
  it('бүтэн сар бүр 350 000₮, гарсан сар л хичээлээр (21 875₮ × суусан)', () => {
    // 9/1-ээс 11/10 хүртэл: 9, 10-р сарын мөчлөг бүтэн, 11/1–11/10 хичээлээр
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-11-10',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: 2_500_000,
    });
    expect(r.fullMonths).toBe(2);
    const last = r.cycles[2];
    expect(last).toMatchObject({ start: '2026-11-01', full: false });
    // 11/2 Да, 11/3 Мя, 11/5 Пү, 11/7 Ба, 11/9 Да, 11/10 Мя = 6
    expect(last.counted).toBe(6);
    expect(last.charge).toBe(131_250);
    expect(r.owed).toBe(700_000 + 131_250);
    expect(r.refund).toBe(2_500_000 - 831_250);
    expect(r.perLesson).toBe(21_875);
  });

  it('5-р сард гарвал ногдох дүн 2.5 саяас давна — буцаах 0', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2027-05-10',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: 2_500_000,
    });
    expect(r.fullMonths).toBe(8);
    expect(r.owed).toBeGreaterThan(2_500_000);
    expect(r.refund).toBe(0);
    expect(r.over).toBe(r.owed - 2_500_000);
  });

  it('гарсан сард: сард 1 албан ёсны чөлөө + ажилтны сонгосон (эмнэлгийн) өдөр хасагдана; бүтэн сард хасахгүй', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-10-10',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      excusedDays: ['2026-09-08', '2026-10-03', '2026-10-06'],
      extraExcluded: ['2026-10-08'],
      paid: 700_000,
    });
    expect(r.cycles[0]).toMatchObject({ full: true, charge: 350_000 });
    const last = r.cycles[1];
    // 10/1 Пү, 10/3 Ба, 10/5 Да, 10/6 Мя, 10/8 Пү, 10/10 Ба = 6 − чөлөө 1 (10/3) − эмнэлэг 1 (10/8) = 4
    expect(last).toMatchObject({
      lessons: 6,
      leaveDay: '2026-10-03',
      extraDays: ['2026-10-08'],
      counted: 4,
      charge: 87_500,
    });
    expect(r.refund).toBe(700_000 - 437_500);
  });

  it('гарсан мөчлөгийн дүн сарын төлбөрөөс хэтрэхгүй (17 хичээлтэй сар)', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-09-30',
      lessonDays: days4('2026-09-01', '2026-09-30'),
      paid: 350_000,
    });
    expect(r.cycles[0].lessons).toBeGreaterThan(16);
    expect(r.cycles[0].charge).toBe(350_000);
    expect(r.refund).toBe(0);
  });

  it('амралт, цуцалсан хичээл (lessonDays-д ороогүй) тоологдохгүй; 3 өдрийн анги 25 000₮', () => {
    const lessons = ['2026-09-02', '2026-09-04', '2026-09-07'];
    const r = computeWithdrawal({
      ...base,
      monthlyFee: 300_000,
      lessonsPerMonth: 12,
      leftOn: '2026-09-07',
      lessonDays: lessons,
      paid: 300_000,
    });
    expect(r.owed).toBe(75_000);
    expect(r.refund).toBe(225_000);
  });

  it('мөчлөг эхэлсэн өдрөөр: 9/7-нд орсон бол 10/6 хүртэл бүтэн; 1/31 → 2/28', () => {
    const r = computeWithdrawal({
      ...base,
      countFrom: '2026-09-07',
      leftOn: '2026-10-07',
      lessonDays: days4('2026-09-07', '2026-10-31'),
      paid: 350_000,
    });
    expect(r.cycles[0]).toMatchObject({
      start: '2026-09-07',
      end: '2026-10-06',
      full: true,
    });
    expect(r.cycles[1]).toMatchObject({
      start: '2026-10-07',
      counted: 0,
      charge: 0,
    });
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
  });

  it('эхлэхээс өмнө гарсан → ногдох 0, бүгд буцна', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-08-20',
      lessonDays: [],
      paid: 350_000,
    });
    expect(r.cycles).toHaveLength(0);
    expect(r.refund).toBe(350_000);
  });

  it('сард ногдох хичээл: 4 өдөр 16, 3 өдөр 12', () => {
    expect(lessonsPerMonthFor(4, 350_000)).toBe(16);
    expect(lessonsPerMonthFor(3, 300_000)).toBe(12);
    expect(lessonsPerMonthFor(null, 350_000)).toBe(16);
  });
});
