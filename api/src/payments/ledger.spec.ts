import {
  ACADEMIC_YEAR,
  PRICE_TIERS,
  amountThrough,
  computeLedger,
  promiseState,
  resolvePlan,
  tierFor,
  todayKeyUB,
  type LedgerInput,
} from './ledger';

const g12 = PRICE_TIERS.g12;
const base = (over: Partial<LedgerInput>): LedgerInput => ({
  plan: 'MONTHLY',
  tuitionAmount: 350_000,
  tier: g12,
  startDate: '2026-09-01',
  leftOn: null,
  payments: [],
  today: '2026-10-13',
  ...over,
});
const pay = (amount: number, forMonth: string | null, paidOn: string | null = null) => ({
  amount,
  forMonth,
  paidOn,
});
const states = (r: ReturnType<typeof computeLedger>) => r.blocks.map((b) => b.state);

describe('computeLedger — сарын блок', () => {
  it('жил 9 мөчлөгтэй (9-р сараас 5-р сар)', () => {
    expect(ACADEMIC_YEAR.months).toHaveLength(9);
    expect(ACADEMIC_YEAR.months[0]).toBe('2026-09');
    expect(ACADEMIC_YEAR.months[8]).toBe('2027-05');
  });

  it('бүтэн жил төлсөн → бүх мөр ногоон', () => {
    const r = computeLedger(
      base({ plan: 'FULL_YEAR', tuitionAmount: 2_500_000, payments: [pay(2_500_000, '2026-06')] }),
    );
    expect(states(r)).toEqual(Array(9).fill('PAID'));
    expect(r.owedNow).toBe(0);
    expect(r.credit).toBe(0);
    expect(r.price).toBe(2_500_000); // бүхэл хуваалт — төгрөг алдагдахгүй
    expect(r.coveredThrough).toBe('2027-05');
  });

  it('бүтэн жилд илүү төлсөн бол илүүг credit-д', () => {
    const r = computeLedger(
      base({
        plan: 'FULL_YEAR',
        tuitionAmount: 2_500_000,
        payments: [pay(350_000, '2026-06'), pay(2_500_000, '2026-07')],
      }),
    );
    expect(states(r)).toEqual(Array(9).fill('PAID'));
    expect(r.credit).toBe(350_000);
    expect(r.paidTotal).toBe(2_850_000);
  });

  it('бүтэн жилийн зөвхөн урьдчилгаа → үлдэгдэл өр (бүтэн жил эхэндээ төлөгдөнө)', () => {
    const r = computeLedger(
      base({ plan: 'FULL_YEAR', tuitionAmount: 2_500_000, payments: [pay(350_000, null, '2026-04-15')] }),
    );
    expect(r.blocks[0].state).toBe('PAID');
    expect(r.blocks[1].state).toBe('PARTIAL');
    expect(r.blocks.slice(2).every((b) => b.state === 'OWED')).toBe(true);
    expect(r.owedNow).toBe(2_150_000);
    expect(r.owedMonths).toBe(8);
  });

  it('хагас жил (хуваан төлөхийн эхний хэсэг) → 12-р сар хүртэл ногоон, үлдсэн нь хугацаа болоогүй', () => {
    const r = computeLedger(
      base({ plan: 'INSTALLMENT', tuitionAmount: 3_000_000, payments: [pay(1_500_000, '2026-09')] }),
    );
    expect(states(r)).toEqual([
      'PAID', 'PAID', 'PAID', 'PAID',
      'FUTURE', 'FUTURE', 'FUTURE', 'FUTURE', 'FUTURE',
    ]);
    expect(r.owedNow).toBe(0);
    expect(r.remaining).toBe(1_500_000);
    expect(r.nextDue).toEqual({ month: '2027-01', amount: 300_000, dueOn: '2026-12-20' });
  });

  it('хуваан төлөхийн үлдэгдэл 12/20-ноос хойш өр болно', () => {
    const r = computeLedger(
      base({
        plan: 'INSTALLMENT',
        tuitionAmount: 3_000_000,
        payments: [pay(1_500_000, '2026-09')],
        today: '2026-12-21',
      }),
    );
    expect(r.owedMonths).toBe(5);
    expect(r.owedNow).toBe(1_500_000);
  });

  it('сар бүр: 9-р сар төлсөн, 10-р сар өртэй, цааш хугацаа болоогүй', () => {
    const r = computeLedger(base({ payments: [pay(350_000, '2026-09')] }));
    expect(states(r).slice(0, 3)).toEqual(['PAID', 'OWED', 'FUTURE']);
    expect(r.owedNow).toBe(350_000);
    expect(r.owedMonths).toBe(1);
    expect(r.nextDue).toEqual({ month: '2026-10', amount: 350_000, dueOn: '2026-10-01' });
  });

  it('сар бүр: дутуу төлбөр тухайн сард PARTIAL, дүнтэйгээ', () => {
    const r = computeLedger(base({ payments: [pay(500_000, '2026-09')] }));
    expect(r.blocks[1]).toMatchObject({ state: 'PARTIAL', paid: 150_000, due: 350_000 });
    expect(r.owedNow).toBe(200_000);
  });

  it('мөчлөг сурагчийн орсон өдрөөр: 9/28-нд орсон бол 10-р сар 10/28-нд л төлөгдөнө', () => {
    const r = computeLedger(base({ startDate: '2026-09-28', payments: [pay(350_000, '2026-09')] }));
    expect(r.blocks[1]).toMatchObject({ state: 'FUTURE', dueOn: '2026-10-28' });
    expect(r.owedNow).toBe(0);
  });

  it('банк 10-р сараар тэмдэглэсэн 9-р сарын төлбөр 9-р сарыг дүүргэнэ (хуучин өрөөс)', () => {
    const r = computeLedger(base({ payments: [pay(350_000, '2026-10', '2026-10-03')] }));
    expect(states(r).slice(0, 2)).toEqual(['PAID', 'OWED']);
  });

  it('жилийн дундаас орсон бол өмнөх сар OFF', () => {
    const r = computeLedger(base({ startDate: '2026-10-01', payments: [pay(350_000, '2026-10')] }));
    expect(r.blocks[0].state).toBe('OFF');
    expect(r.blocks[1].state).toBe('PAID');
    expect(r.owedNow).toBe(0);
  });

  it('гарсан сарын дараах сарууд OFF', () => {
    const r = computeLedger(base({ leftOn: '2026-11-10', today: '2027-01-15' }));
    expect(states(r).slice(3)).toEqual(Array(6).fill('OFF'));
    expect(r.price).toBe(3 * 350_000);
  });

  it('зунаас суусан сар бүрийн сурагчийн зуны төлбөр 9-р сарыг дүүргэхгүй', () => {
    const r = computeLedger(
      base({ startDate: '2026-06-08', payments: [pay(350_000, '2026-06'), pay(350_000, '2026-07')] }),
    );
    expect(r.blocks[0].state).toBe('OWED');
    expect(r.paidTotal).toBe(0);
  });

  it('9-р сараас суусан сурагчийн 8-р сард хийсэн урьдчилгаа 9-р сарыг дүүргэнэ', () => {
    const r = computeLedger(base({ payments: [pay(350_000, '2026-08')] }));
    expect(r.blocks[0].state).toBe('PAID');
  });

  it('өмнөх/дараагийн жилийн төлбөр тооцогдохгүй', () => {
    const r = computeLedger(
      base({ payments: [pay(350_000, '2025-12'), pay(350_000, '2027-09'), pay(350_000, null, '2026-01-10')] }),
    );
    expect(r.paidTotal).toBe(0);
  });

  it('зунаас суусан бүтэн жилийн сурагчийн зуны төлбөр гэрээнд тооцогдоно', () => {
    const r = computeLedger(
      base({
        plan: 'FULL_YEAR',
        tuitionAmount: 2_500_000,
        startDate: '2026-06-08',
        payments: [pay(2_500_000, '2026-06')],
      }),
    );
    expect(states(r)).toEqual(Array(9).fill('PAID'));
  });

  it('REVERSED/PENDING-ийг дуудагч хасна — сөрөг дүн хуваарилагдахгүй', () => {
    const r = computeLedger(base({ payments: [pay(-100, '2026-09')] }));
    expect(r.paidTotal).toBe(0);
  });
});

describe('resolvePlan / tierFor', () => {
  it('бодит бус дүн (350₮) бол шатлалын сарын төлбөр', () => {
    expect(resolvePlan('MONTHLY', 350, g12)).toMatchObject({ kind: 'MONTHLY', fee: 350_000, guessed: false });
  });
  it('UNKNOWN + 2.5 сая (12-р анги) → бүтэн жил гэж таамаглана', () => {
    expect(resolvePlan('UNKNOWN', 2_500_000, g12)).toMatchObject({ kind: 'FULL_YEAR', guessed: true, total: 2_500_000 });
  });
  it('UNKNOWN + дүнгүй → сар бүр, таамаг', () => {
    expect(resolvePlan(null, null, g12)).toMatchObject({ kind: 'MONTHLY', guessed: true, fee: 350_000 });
  });
  it('хуваан төлөхийн эхний хэсэг шатлалаас', () => {
    expect(resolvePlan('INSTALLMENT', null, PRICE_TIERS.g9_11)).toMatchObject({ total: 2_500_000, first: 1_300_000 });
  });
  it('нийгмийн анги, 13-х анги, 9-11', () => {
    expect(tierFor(12, 'НИЙГЭМ (Зүүн 4)').tier.key).toBe('social');
    expect(tierFor(13, '13-1 (Зүүн 4)').tier.key).toBe('g12');
    expect(tierFor(10, '10-1').tier.key).toBe('g9_11');
    expect(tierFor(null, null).guessed).toBe(true);
  });
});

describe('amountThrough — «энд хүртэл төлөх»', () => {
  it('11-р сарыг дарахад өмнөх өртэй сарууд нэмэгдэнэ', () => {
    const r = computeLedger(base({ today: '2026-11-15' }));
    expect(amountThrough(r.blocks, '2026-11')).toBe(3 * 350_000);
  });
  it('дутуу сар зөвхөн үлдэгдлээрээ', () => {
    const r = computeLedger(base({ payments: [pay(500_000, '2026-09')] }));
    expect(amountThrough(r.blocks, '2026-10')).toBe(200_000);
  });
  it('OFF сарыг тоолохгүй', () => {
    const r = computeLedger(base({ startDate: '2026-10-01' }));
    expect(amountThrough(r.blocks, '2026-10')).toBe(350_000);
  });
});

describe('promiseState', () => {
  it('тэмдэглэлээс хойш төлбөр ирсэн → KEPT', () => {
    expect(promiseState('2026-10-07', '2026-10-01', ['2026-10-05'], '2026-10-13').state).toBe('KEPT');
  });
  it('амласан өдөр өнгөрсөн, төлбөргүй → BROKEN, хоног', () => {
    expect(promiseState('2026-10-07', '2026-10-01', ['2026-09-02'], '2026-10-13')).toEqual({
      state: 'BROKEN',
      overdueDays: 6,
    });
  });
  it('өдөр болоогүй → UPCOMING', () => {
    expect(promiseState('2026-10-20', '2026-10-01', [], '2026-10-13').state).toBe('UPCOMING');
  });
});

describe('todayKeyUB', () => {
  it('UTC 17:00 = Улаанбаатарын маргааш 01:00', () => {
    expect(todayKeyUB(new Date('2026-10-13T17:00:00Z'))).toBe('2026-10-14');
  });
});

// Эзэн 2026-10-31: үнэ суудаг ангийн 7 хоногийн өдрөөс, Багш+ гараар «бүтэн жил»
describe('суудаг анги, гараар бүтэн жил, хоцорч төлсөн', () => {
  const g9 = PRICE_TIERS.g9_11;

  it('үнэ сургуулийн ангиас биш, 7 хоногт хэдэн өдөр ордгоос', () => {
    // 11-р ангийн хүүхэд 12-р ангийнхантай (4 өдөр) → 350 мянга / 2.5 сая
    expect(tierFor(11, '12-11 (Баруун 4)', 4).tier.key).toBe('g12');
    // 12-р ангийн хүүхэд 3 өдрийн ангид → 300 мянга / 2 сая
    expect(tierFor(12, '11-2 (Баруун 4)', 3).tier.key).toBe('g9_11');
    // Нийгэм өдрөөс үл хамаарна; хуваарьгүй анги → сургуулийн ангиар
    expect(tierFor(11, 'НИЙГЭМ (Зүүн 4)', 3).tier.key).toBe('social');
    expect(tierFor(11, '11-1', null).tier.key).toBe('g9_11');
    expect(tierFor(11, '11-1', 0).tier.key).toBe('g9_11');
  });

  it('гэрээ = стандарт үнэ; шийтээс ирсэн «төлсөн дүн» гэрээ болохгүй', () => {
    // 3 өдрийн анги, шийт 350 мянгыг сарын дүн гэж бичсэн → 300 мянга
    expect(resolvePlan('MONTHLY', 350_000, g9)).toMatchObject({ fee: 300_000 });
    // 4 өдрийн анги, бүтэн жилд 2 сая төлсөн → гэрээ 2.5 сая (дутуу харагдана)
    expect(resolvePlan('FULL_YEAR', 2_000_000, g12)).toMatchObject({ total: 2_500_000, settled: false });
    const r = computeLedger(base({ plan: 'FULL_YEAR', tuitionAmount: 2_000_000, payments: [pay(2_000_000, '2026-06')] }));
    expect(r.remaining).toBe(500_000);
    expect(r.owedNow).toBe(500_000);
  });

  it('3 өдрийн ангийн 2 сая = бүрэн, 300 мянгаар сар бүр төлсөн = бүрэн', () => {
    const full = computeLedger(base({ tier: g9, plan: 'FULL_YEAR', tuitionAmount: 2_000_000, payments: [pay(2_000_000, '2026-06')] }));
    expect(full.remaining).toBe(0);
    expect(states(full).every((s) => s === 'PAID')).toBe(true);
    const monthly = computeLedger(base({ tier: g9, tuitionAmount: 350_000, payments: [pay(350_000, '2026-09'), pay(300_000, '2026-10')] }));
    expect(monthly.owedNow).toBe(0);
    expect(states(monthly).slice(0, 2)).toEqual(['PAID', 'PAID']);
  });

  it('гараар бүтэн жил: гэрээ = бодит төлсөн дүн, бүх сар төлсөн, өр/илүү үгүй', () => {
    const r = computeLedger(base({ plan: 'MONTHLY', payments: [pay(1_000_000, '2026-09', '2026-09-03')], settled: true }));
    expect(r.plan).toMatchObject({ kind: 'FULL_YEAR', settled: true, total: 1_000_000 });
    expect(states(r).every((s) => s === 'PAID')).toBe(true);
    expect([r.owedNow, r.remaining, r.credit, r.overdueDays]).toEqual([0, 0, 0, 0]);
    expect(r.nextDue).toBeNull();
    // 0₮ (багшийн хүүхэд) ч бүтэн
    const free = computeLedger(base({ payments: [], settled: true }));
    expect(states(free).every((s) => s === 'PAID')).toBe(true);
    expect(free.owedNow).toBe(0);
    // жилийн дундаас орсон бол өмнөх сар OFF хэвээр
    const late = computeLedger(base({ startDate: '2026-11-05', payments: [], settled: true }));
    expect(states(late).slice(0, 3)).toEqual(['OFF', 'OFF', 'PAID']);
  });

  it('хоцорч төлсөн хоног ба одоогийн хэтэрсэн хоног', () => {
    const r = computeLedger(
      base({
        today: '2026-11-20',
        payments: [pay(350_000, '2026-09', '2026-09-01'), pay(350_000, '2026-10', '2026-10-12')],
      }),
    );
    expect(r.blocks[0]).toMatchObject({ state: 'PAID', paidOn: '2026-09-01', lateDays: 0 });
    expect(r.blocks[1]).toMatchObject({ state: 'PAID', paidOn: '2026-10-12', lateDays: 11 });
    // 11-р сар 11/01-нд төлөгдөх байсан → 19 хоног хэтэрсэн
    expect(r.overdueDays).toBe(19);
    expect(r.blocks[2]).toMatchObject({ state: 'OWED', paidOn: null, lateDays: 0 });
    // хоёр сарыг нэг дор хожуу төлсөн — хоёулаа тэр өдөр бүрэн
    const two = computeLedger(base({ today: '2026-11-20', payments: [pay(700_000, '2026-10', '2026-10-20')] }));
    expect(two.blocks.slice(0, 2).map((b) => [b.paidOn, b.lateDays])).toEqual([
      ['2026-10-20', 49],
      ['2026-10-20', 19],
    ]);
  });
});
