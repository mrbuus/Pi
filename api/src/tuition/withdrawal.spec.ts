import {
  PRICE_TIERS,
  computeLedger,
  fullYearByPayments,
  type LedgerPayment,
} from '../payments/ledger';
import {
  addMonths,
  computeWithdrawal,
  firstPattern,
  leaveCandidates,
  lessonsPerMonthFor,
  projectLessonDays,
  webMarkingStart,
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
    // 9/29 (мөчлөгийн сүүлийн өдрийн өмнөх өдөр) — гарсан мөчлөг хэвээр, 9/1–9/29 = 17 хичээл
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-09-29',
      lessonDays: days4('2026-09-01', '2026-09-30'),
      paid: 350_000,
    });
    expect(r.cycles[0].full).toBe(false);
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

/** JS гарагаар (0=Ням…6=Бямба) [from, to] хичээлийн өдрүүд */
const wd = (from: DateKey, to: DateKey, days: number[], off: DateKey[] = []) =>
  projectLessonDays(from, to, days, new Set(off));
const MWFS = [1, 3, 5, 6]; // Да, Лх, Ба, Бя — 7 хоногт 4 өдөр
const MWF = [1, 3, 5]; // 7 хоногт 3 өдөр

describe('Мөчлөгийн хил (эзэн 2026-11-08)', () => {
  it('мөчлөгийн СҮҮЛИЙН өдөр мэдэгдсэн бол бүтэн сар (хичээлээр биш)', () => {
    // 9/1–9/30 мөчлөг; амралтаар 9/14–9/20 хичээлгүй тул 15 хичээл ч бүтэн сар = 350 000₮
    const lessons = days4('2026-09-01', '2026-10-31', [
      '2026-09-14',
      '2026-09-15',
      '2026-09-17',
      '2026-09-19',
    ]);
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-09-30',
      lessonDays: lessons,
      paid: 350_000,
    });
    expect(r.cycles).toHaveLength(1);
    expect(r.cycles[0]).toMatchObject({ full: true, charge: 350_000 });
    expect(r.cycles[0].lessons).toBeLessThan(16);
    expect(r.refund).toBe(0);
  });

  it('дараагийн мөчлөгийн эхний өдөр гарвал тэр өдрийн хичээл л нэмэгдэнэ', () => {
    // 10/1 Пү — хичээлтэй
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-10-01',
      lessonDays: days4('2026-09-01', '2026-10-31'),
      paid: 700_000,
    });
    expect(r.cycles.map((c) => c.full)).toEqual([true, false]);
    expect(r.cycles[1]).toMatchObject({ lessons: 1, counted: 1, charge: 21_875 });
    expect(r.refund).toBe(700_000 - 371_875);
  });
});

describe('Үнийн шатлал: ÷16 (4 өдөр) ба ÷12 (3 өдөр)', () => {
  it('4 өдрийн анги: 350 000 ÷ 16 = 21 875₮ хичээл', () => {
    const r = computeWithdrawal({
      ...base,
      lessonsPerMonth: lessonsPerMonthFor(4, 350_000),
      leftOn: '2026-09-10',
      lessonDays: wd('2026-09-01', '2026-12-31', MWFS),
      paid: 350_000,
    });
    // 9/2 Лх, 9/4 Ба, 9/5 Бя, 9/7 Да, 9/9 Лх = 5
    expect(r.cycles[0]).toMatchObject({ full: false, counted: 5, charge: 109_375 });
    expect(r.perLesson).toBe(21_875);
    expect(r.refund).toBe(240_625);
  });

  it('3 өдрийн анги: 300 000 ÷ 12 = 25 000₮ хичээл, 12-оос олон хичээлтэй ч сарын төлбөрөөс хэтрэхгүй', () => {
    const r = computeWithdrawal({
      ...base,
      monthlyFee: 300_000,
      lessonsPerMonth: lessonsPerMonthFor(3, 300_000),
      leftOn: '2026-09-29',
      lessonDays: wd('2026-09-01', '2026-12-31', MWF),
      paid: 300_000,
    });
    // 9/2…9/28 Да/Лх/Ба = 12 → 300 000 (13 байсан ч 300 000)
    expect(r.perLesson).toBe(25_000);
    expect(r.cycles[0].counted).toBeGreaterThanOrEqual(12);
    expect(r.cycles[0].charge).toBe(300_000);
    expect(r.refund).toBe(0);
  });
});

describe('Тасалсан, чөлөө, эмнэлгийн өдөр', () => {
  const lessons = days4('2026-09-01', '2027-06-18');

  it('тасалсан (ABSENT), хоцорсон, ирц бүртгээгүй өдөр ногдох дүнг ХЭЗЭЭ Ч бууруулахгүй', () => {
    const att = [
      { date: '2026-11-02', status: 'ABSENT' },
      { date: '2026-11-03', status: 'LATE' },
      { date: '2026-11-05', status: 'ABSENT' },
      { date: '2026-11-07', status: 'PRESENT' },
    ];
    expect(leaveCandidates(att)).toEqual([]);
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-11-07',
      lessonDays: lessons,
      excusedDays: leaveCandidates(att),
      paid: 1_050_000,
    });
    // 11/2, 11/3, 11/5, 11/7 — 4 хичээл бүгд тоологдоно
    expect(r.cycles[2]).toMatchObject({ lessons: 4, counted: 4, leaveDay: null, charge: 87_500 });
  });

  it('гарсан сард чөлөө ЗӨВХӨН 1 хасагдана (хоёр дахь чөлөө тоологдоно)', () => {
    const att = [
      { date: '2026-11-02', status: 'EXCUSED' },
      { date: '2026-11-03', status: 'EXCUSED' },
    ];
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-11-05',
      lessonDays: lessons,
      excusedDays: leaveCandidates(att),
      paid: 1_050_000,
    });
    expect(r.cycles[2]).toMatchObject({ lessons: 3, leaveDay: '2026-11-02', counted: 2 });
  });

  it('вэбээс өмнөх туршилтын EXCUSED бичлэг (10-23-аас өмнө) чөлөөнд орохгүй', () => {
    expect(
      leaveCandidates([
        { date: '2026-10-17', status: 'EXCUSED' },
        { date: '2026-10-23', status: 'EXCUSED' },
      ]),
    ).toEqual(['2026-10-23']);
  });

  it('ажилтны сонгосон эмнэлгийн өдөр + чөлөө хоёулаа хасагдана, бүтэн сард юу ч хасахгүй', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-11-07',
      lessonDays: lessons,
      excusedDays: ['2026-09-08', '2026-11-03'],
      extraExcluded: ['2026-09-10', '2026-11-05'],
      paid: 1_050_000,
    });
    expect(r.cycles[0]).toMatchObject({ full: true, charge: 350_000, extraDays: [] });
    expect(r.cycles[2]).toMatchObject({
      lessons: 4,
      leaveDay: '2026-11-03',
      extraDays: ['2026-11-05'],
      counted: 2,
      charge: 43_750,
    });
  });
});

describe('Вэбд ирц бүртгэж эхэлсэн өдөр (эзэн 2026-11-08)', () => {
  it('ангийн анхны ирц 10-23-аас өмнө бол 10-23 (туршилтын бичлэг), хойно бол тэр өдөр, байхгүй бол null', () => {
    expect(webMarkingStart('2026-10-17')).toBe('2026-10-23');
    expect(webMarkingStart('2026-10-23')).toBe('2026-10-23');
    expect(webMarkingStart('2026-10-31')).toBe('2026-10-31');
    expect(webMarkingStart(null)).toBeNull();
  });

  it('вэбээс өмнөх өдрийг чөлөө, ажилтны сонголтоор ч ХАСАХГҮЙ — суусан гэж үзнэ', () => {
    const lessons = wd('2026-10-01', '2026-12-31', MWFS);
    const assumed = lessons.filter((d) => d < '2026-10-23');
    const r = computeWithdrawal({
      ...base,
      countFrom: '2026-10-01',
      leftOn: '2026-10-28',
      lessonDays: lessons,
      assumedDays: assumed,
      excusedDays: ['2026-10-09', '2026-10-26'],
      extraExcluded: ['2026-10-10', '2026-10-28'],
      paid: 350_000,
    });
    const c = r.cycles[0];
    // 10/2…10/21 = 12 вэбээс өмнө + 10/23, 10/24, 10/26, 10/28 = 4
    expect(c.lessons).toBe(16);
    expect(c.assumed).toBe(12);
    // 10/9 чөлөө, 10/10 сонголт — вэбээс өмнө тул үл тооцно; 10/26 чөлөө, 10/28 сонголт хасагдана
    expect(c.leaveDay).toBe('2026-10-26');
    expect(c.extraDays).toEqual(['2026-10-28']);
    expect(c.counted).toBe(14);
  });

  it('хуваарь вэбд хожуу үүссэн бол өмнөх хичээлийг анхны хуваарийн гарагаар тооцно', () => {
    const p = firstPattern([
      { weekday: 1, effectiveFrom: '2026-10-23', effectiveTo: null },
      { weekday: 3, effectiveFrom: '2026-10-23', effectiveTo: null },
      { weekday: 6, effectiveFrom: '2026-10-23', effectiveTo: '2026-11-01' },
      { weekday: 0, effectiveFrom: '2026-11-02', effectiveTo: null },
    ]);
    expect(p).toEqual({ from: '2026-10-23', weekdays: [1, 3, 6] });
    expect(firstPattern([])).toBeNull();
    // 10/5 Да … 10/21 Лх; 10/12 амралт
    expect(wd('2026-10-05', '2026-10-22', p!.weekdays, ['2026-10-12'])).toEqual([
      '2026-10-05',
      '2026-10-07',
      '2026-10-10',
      '2026-10-14',
      '2026-10-17',
      '2026-10-19',
      '2026-10-21',
    ]);
    expect(wd('2026-10-05', '2026-10-22', [])).toEqual([]);
  });
});

describe('Төлбөрийн тал: бүтэн жил, илүү төлөлт, төлбөргүй, өмнөх буцаалт', () => {
  const pay = (amount: number, paidOn: DateKey): LedgerPayment => ({
    amount,
    paidOn,
    forMonth: paidOn.slice(0, 7),
  });
  const paidTotal = (payments: LedgerPayment[], tier = PRICE_TIERS.g12) =>
    computeLedger({
      plan: 'FULL_YEAR',
      tuitionAmount: null,
      tier,
      startDate: '2026-09-01',
      leftOn: null,
      payments,
      today: '2026-11-08',
    }).paidTotal;

  it('бүтэн жил 2.5 сая (суудал 350 мянга + үлдэгдэл 45 хоногт): 2 бүтэн сар + 3 хичээл → 1 734 375₮', () => {
    const payments = [pay(350_000, '2026-08-20'), pay(2_150_000, '2026-10-10')];
    expect(fullYearByPayments(payments, PRICE_TIERS.g12, '2026-09-01')).toBe('FULL');
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-11-05',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: paidTotal(payments),
    });
    expect(r.paid).toBe(2_500_000);
    expect(r.owed).toBe(700_000 + 65_625);
    expect(r.refund).toBe(1_734_375);
  });

  it('45 хоног хэтэрсэн үлдэгдэл (LATE) ч буцаалт ижил — төлсөн мөнгөөр л тооцно', () => {
    const payments = [pay(350_000, '2026-08-20'), pay(2_150_000, '2026-11-01')];
    expect(fullYearByPayments(payments, PRICE_TIERS.g12, '2026-09-01')).toBe('LATE');
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-11-05',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: paidTotal(payments),
    });
    expect(r.refund).toBe(1_734_375);
  });

  it('бүтэн жил 2 сая (3 өдрийн анги): 1 бүтэн сар + 6 хичээл → 1 550 000₮', () => {
    const payments = [pay(2_000_000, '2026-08-25')];
    expect(fullYearByPayments(payments, PRICE_TIERS.g9_11, '2026-09-01')).toBe('FULL');
    const r = computeWithdrawal({
      ...base,
      monthlyFee: 300_000,
      lessonsPerMonth: 12,
      leftOn: '2026-10-15',
      lessonDays: wd('2026-09-01', '2027-05-31', MWF),
      paid: paidTotal(payments, PRICE_TIERS.g9_11),
    });
    expect(r.owed).toBe(300_000 + 150_000);
    expect(r.refund).toBe(1_550_000);
  });

  it('урьдчилж илүү төлсөн сар бүр төлөгч: ирээдүйн сарын мөнгө буцна', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-10-03',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: 1_050_000,
    });
    // 9-р сар бүтэн + 10/1 Пү, 10/3 Ба = 2 хичээл
    expect(r.owed).toBe(350_000 + 43_750);
    expect(r.refund).toBe(1_050_000 - 393_750);
  });

  it('огт төлөөгүй: буцаах 0, суусан дүн «over»-т (нэхэхгүй, мэдээлэл)', () => {
    const r = computeWithdrawal({
      ...base,
      leftOn: '2026-10-03',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: 0,
    });
    expect(r.refund).toBe(0);
    expect(r.over).toBe(393_750);
  });

  it('өмнө нь гаргасан буцаалтыг хасна — сэргээгээд дахин хасахад давхар буцаахгүй', () => {
    const input = {
      ...base,
      leftOn: '2026-10-03',
      lessonDays: days4('2026-09-01', '2027-06-18'),
      paid: 1_050_000,
    };
    const first = computeWithdrawal(input);
    expect(first.refund).toBe(656_250);
    const again = computeWithdrawal({ ...input, refundedBefore: first.refund });
    expect(again.refundedBefore).toBe(656_250);
    expect(again.refund).toBe(0);
    expect(again.paid).toBe(1_050_000);
  });
});

/**
 * Бодит тохиолдол (эзэн 2026-11-08, нэрийг нууцалсан «Т»): 13-р ангийн бүлэг, Да/Лх/Ба/Бя (7 хоногт 4),
 * 9/4-нд элссэн, 9/6 ба 10/1-нд 350 000₮ (сар бүр). Ангийн хуваарь вэбд 10/23-нд үүссэн, ирц 10/23-наас;
 * 10/23–10/30 ирсэн, 11/2 тасалсан. 2 сар суусан хүүхдэд «буцаах 196 875₮» гарч байсан.
 */
describe('Т (бодит тохиолдол): 2 сар суусан хүүхдэд буцаалт гарахгүй', () => {
  const countFrom = '2026-09-04';
  const webStart = '2026-10-23';
  const webDays = wd(webStart, '2027-05-31', MWFS);
  const preWeb = wd(countFrom, '2026-10-22', MWFS);
  const t = {
    monthlyFee: 350_000,
    lessonsPerMonth: 16,
    countFrom,
    excusedDays: leaveCandidates([
      { date: '2026-10-23', status: 'PRESENT' },
      { date: '2026-10-24', status: 'PRESENT' },
      { date: '2026-10-26', status: 'PRESENT' },
      { date: '2026-10-28', status: 'PRESENT' },
      { date: '2026-10-30', status: 'PRESENT' },
      { date: '2026-11-02', status: 'ABSENT' },
    ]),
    extraExcluded: [] as DateKey[],
    paid: 700_000,
  };

  it('ӨМНӨХ алдаа: хуваарьгүй хугацааг 0 хичээл гэж тоолоход 11/2-нд «буцаах 196 875₮» гарч байсан', () => {
    const r = computeWithdrawal({ ...t, leftOn: '2026-11-02', lessonDays: webDays });
    expect(r.cycles[1]).toMatchObject({ full: false, lessons: 7 });
    expect(r.refund).toBe(196_875);
  });

  it('ЗАССАН: 10/4–10/22-ны 10 хичээл суусан гэж тооцогдоно → 11/2-нд буцаах 0', () => {
    const r = computeWithdrawal({
      ...t,
      leftOn: '2026-11-02',
      lessonDays: [...preWeb, ...webDays],
      assumedDays: preWeb,
    });
    expect(r.cycles[0]).toMatchObject({ full: true, charge: 350_000 });
    expect(r.cycles[1]).toMatchObject({ full: false, lessons: 17, assumed: 10, counted: 17, charge: 350_000 });
    expect(r.owed).toBe(700_000);
    expect(r.refund).toBe(0);
  });

  it('11/3 (2-р мөчлөгийн сүүлийн өдөр) — 2 бүтэн сар, буцаах 0', () => {
    const r = computeWithdrawal({
      ...t,
      leftOn: '2026-11-03',
      lessonDays: [...preWeb, ...webDays],
      assumedDays: preWeb,
    });
    expect(r.fullMonths).toBe(2);
    expect(r.refund).toBe(0);
  });

  it('өнөөдөр (11/8) гарвал 3-р мөчлөгийн 3 хичээл нэмэгдэж төлсөнөөс давна — буцаах 0', () => {
    const r = computeWithdrawal({
      ...t,
      leftOn: '2026-11-08',
      lessonDays: [...preWeb, ...webDays],
      assumedDays: preWeb,
    });
    expect(r.cycles[2]).toMatchObject({ start: '2026-11-04', lessons: 3, charge: 65_625 });
    expect(r.refund).toBe(0);
    expect(r.over).toBe(65_625);
  });

  it('10/25-нд гарсан бол 2-р мөчлөгийн 12 хичээл → үлдсэн 4 хичээлийн 87 500₮ л буцна', () => {
    const r = computeWithdrawal({
      ...t,
      leftOn: '2026-10-25',
      lessonDays: [...preWeb, ...webDays],
      assumedDays: preWeb,
    });
    expect(r.cycles[1]).toMatchObject({ lessons: 12, charge: 262_500 });
    expect(r.refund).toBe(87_500);
  });
});
