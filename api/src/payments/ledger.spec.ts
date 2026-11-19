import {
  ACADEMIC_YEAR,
  PRICE_TIERS,
  amountThrough,
  blockSources,
  gapTarget,
  monthlyPeriods,
  resolveCycleStart,
  plusMonth,
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

describe('blockSources — сар бүрийг аль төлбөр дүүргэсэн', () => {
  const { blockSources } = jest.requireActual('./ledger') as typeof import('./ledger');
  const b = (month: string, due: number, paid: number) => ({ month, state: paid >= due ? 'PAID' : paid > 0 ? 'PARTIAL' : 'OWED', due, paid, dueOn: `${month}-01`, paidOn: null, lateDays: 0 }) as const;

  it('огноогоор хуучнаас нь дүүргэж, нэг төлбөр олон сар, нэг сар олон төлбөр', () => {
    const blocks = [b('2026-09', 350_000, 350_000), b('2026-10', 350_000, 350_000), b('2026-11', 350_000, 100_000)];
    const out = blockSources(
      blocks,
      [
        { id: 'late', amount: 100_000, forMonth: null, paidOn: '2026-11-02' },
        { id: 'big', amount: 400_000, forMonth: null, paidOn: '2026-09-03' },
        { id: 'mid', amount: 300_000, forMonth: null, paidOn: '2026-10-01' },
      ],
      'MONTHLY',
      '2026-09-01',
    );
    expect(out['2026-09']).toEqual([{ paymentId: 'big', amount: 350_000 }]);
    expect(out['2026-10']).toEqual([{ paymentId: 'big', amount: 50_000 }, { paymentId: 'mid', amount: 300_000 }]);
    expect(out['2026-11']).toEqual([{ paymentId: 'late', amount: 100_000 }]);
  });
});

describe('Тохирсон (хөнгөлөлттэй) бүтэн жилийн дүн — гараар тавьсан', () => {
  const paid = [pay(350_000, null, '2026-05-25'), pay(1_900_000, null, '2026-07-03')];

  it('2,250,000 (10% хөнгөлөлт) гэж тавиад яг төлсөн → өргүй, бүх сар төлсөн', () => {
    const r = computeLedger(base({ plan: 'FULL_YEAR', tuitionAmount: 2_500_000, agreed: 2_250_000, payments: paid }));
    expect(r.plan).toMatchObject({ kind: 'FULL_YEAR', total: 2_250_000, discounted: true });
    expect(r).toMatchObject({ owedNow: 0, remaining: 0, credit: 0 });
    expect(states(r).every((s) => s === 'PAID' || s === 'OFF')).toBe(true);
  });

  it('тавиагүй бол шатлалын үнээр 250,000 дутуу; шийтээс ирсэн tuitionAmount гэрээ болохгүй', () => {
    const r = computeLedger(base({ plan: 'FULL_YEAR', tuitionAmount: 2_250_000, payments: paid }));
    expect(r.plan.total).toBe(g12.fullYear);
    expect(r.remaining).toBe(250_000);
  });

  it('хөнгөлөлттэй дүнгээс бага төлсөн бол үлдэгдэл нь тэр дүнгээр', () => {
    const r = computeLedger(base({ plan: 'FULL_YEAR', agreed: 2_250_000, payments: [pay(350_000, null, '2026-09-01')] }));
    expect(r.remaining).toBe(1_900_000);
  });

  it('шатлалын үнээс их, хэт бага дүн, сар бүрийн багцад үйлчлэхгүй', () => {
    expect(computeLedger(base({ plan: 'FULL_YEAR', agreed: 2_850_000, payments: paid })).plan.total).toBe(g12.fullYear);
    expect(computeLedger(base({ plan: 'FULL_YEAR', agreed: 300_000, payments: paid })).plan.total).toBe(g12.fullYear);
    expect(computeLedger(base({ plan: 'MONTHLY', agreed: 2_250_000, payments: [pay(350_000, '2026-09')] })).plan.kind).toBe('MONTHLY');
  });

  it('ах дүүгийн хөнгөлөлт сар бүрд: 315,000 гэж тавьсан → 315,000 төлсөн сар «төлсөн» (2026-11-19)', () => {
    const r = computeLedger(base({ plan: 'MONTHLY', agreed: 315_000, payments: [pay(315_000, '2026-09', '2026-09-01')] }));
    expect(r.plan).toMatchObject({ kind: 'MONTHLY', fee: 315_000, discounted: true });
    expect(r.blocks.find((b) => b.month === '2026-09')).toMatchObject({ state: 'PAID' });
  });

  it('хоёр хувааж төлөх: 3,000,000 → 2,700,000, эхний хэсэг 1,500,000 → 1,350,000', () => {
    const r = computeLedger(base({ plan: 'INSTALLMENT', agreed: 2_700_000, payments: [] }));
    expect(r.plan).toMatchObject({ kind: 'INSTALLMENT', total: 2_700_000, first: 1_350_000, discounted: true });
  });

  it('сар бүрд хэт бага эсвэл үнээс их дүн хөнгөлөлт болохгүй', () => {
    expect(computeLedger(base({ plan: 'MONTHLY', agreed: 50_000, payments: [] })).plan.fee).toBe(g12.monthly);
    expect(computeLedger(base({ plan: 'MONTHLY', agreed: 400_000, payments: [] })).plan.fee).toBe(g12.monthly);
  });
});

describe('Сар бүрийн хугацаа — шийтийн хугацаа, сунгалт (эзэн 2026-11-12)', () => {
  const months = ['2026-09', '2026-10', '2026-11', '2026-12'];
  const first = (m: string) => `${m}-01`;
  const view = (r: ReturnType<typeof monthlyPeriods>) => [...r.values()].map((p) => `${p.from}..${p.to}`);

  it('сунгалтгүй: сар бүр өмнөх сарын дууссан өдрөөс', () => {
    expect(view(monthlyPeriods(months.slice(0, 2), first))).toEqual(['2026-09-01..2026-10-01', '2026-10-01..2026-11-01']);
  });

  it('шийтийн хугацаа («09/04-10/04») үнэн; дараагийн сар гинжээр үргэлжилнэ', () => {
    const r = monthlyPeriods(months.slice(0, 3), first, { '2026-09': { from: '2026-09-04', to: '2026-10-04' } });
    expect(view(r)).toEqual(['2026-09-04..2026-10-04', '2026-10-04..2026-11-04', '2026-11-04..2026-12-04']);
  });

  it('шийтэд ажилтан сунгасан («08/04-09/14» маягийн 41 тохиолдол) → дараагийнх нь 14-нөөс', () => {
    const r = monthlyPeriods(months.slice(0, 2), first, { '2026-09': { from: '2026-09-04', to: '2026-10-14' } });
    expect(view(r)).toEqual(['2026-09-04..2026-10-14', '2026-10-14..2026-11-14']);
  });

  it('Гэрэлт-Од: 9-р сарыг 10 хоногоор сунгавал 09/14–10/14, дараагийн бүх сар шилжиж, шийтийн хуучин хугацааг үл тооно', () => {
    const sheet = { '2026-09': { from: '2026-09-04', to: '2026-10-04' }, '2026-10': { from: '2026-10-04', to: '2026-11-04' } };
    const r = monthlyPeriods(months.slice(0, 3), first, sheet, [{ month: '2026-09', days: 10 }]);
    expect(view(r)).toEqual(['2026-09-14..2026-10-14', '2026-10-14..2026-11-14', '2026-11-14..2026-12-14']);
    expect(r.get('2026-09')!.extDays).toBe(10);
  });

  it('хэд хэдэн сунгалт нэмэгдэнэ; сарын сүүлийн өдрийг хэтрүүлэхгүй (01/31 → 02/28)', () => {
    const r = monthlyPeriods(['2026-10', '2026-11'], first, {}, [{ month: '2026-11', days: 7 }, { month: '2026-11', days: 14 }]);
    expect(view(r)).toEqual(['2026-10-01..2026-11-01', '2026-11-22..2026-12-22']);
    expect(plusMonth('2027-01-31')).toBe('2027-02-28');
    expect(plusMonth('2026-12-15')).toBe('2027-01-15');
  });

  it('ledger: сунгасан хугацаа өр, «хэтэрсэн хоног»-д тусна; бүтэн жилд үл хамаарна', () => {
    const before = computeLedger(base({ today: '2026-09-10', startDate: '2026-09-01', payments: [] }));
    expect(before.blocks[0].state).toBe('OWED');
    const after = computeLedger(base({ today: '2026-09-10', startDate: '2026-09-01', payments: [], extensions: [{ month: '2026-09', days: 13 }] }));
    expect(after.blocks[0]).toMatchObject({ state: 'FUTURE', dueOn: '2026-09-14', period: { from: '2026-09-14', to: '2026-10-14' }, extDays: 13 });
    const full = computeLedger(base({ plan: 'FULL_YEAR', tuitionAmount: 2_500_000, extensions: [{ month: '2026-09', days: 13 }] }));
    expect(full.blocks[0].period).toBeUndefined();
  });
});

describe('энэ жилийн мөчлөг эхлэх өдөр (эзэн 2026-11-16)', () => {
  const summer = (over: Partial<LedgerInput>) =>
    base({ startDate: '2026-06-17', today: '2026-11-16', ...over });

  it('зунаас суусан, 9/7-нд анх ирсэн (ирцээс) → 10-р сарын төлөх өдөр 10/07', () => {
    const cs = resolveCycleStart(null, { firstAny: '2026-09-07', classFirst: '2026-09-01', firstPresent: '2026-09-07' }, '2026-06-17');
    expect(cs).toEqual({ on: '2026-09-07', source: 'ATTENDANCE' });
    const r = computeLedger(summer({ cycleStart: { on: cs.on!, source: 'ATTENDANCE' } }));
    expect(r.blocks[0].dueOn).toBe('2026-09-07');
    expect(r.blocks[1].dueOn).toBe('2026-10-07');
    expect(r.blocks[1].period).toEqual({ from: '2026-10-07', to: '2026-11-07' });
  });

  it('мөчлөгийн эхлэлгүй зуны сурагч → хуучнаараа 1-ний өдөр', () => {
    const r = computeLedger(summer({}));
    expect(r.blocks[1].dueOn).toBe('2026-10-01');
  });

  it('ирц бүртгэж эхэлсэн өдөр жагсаалтад байсан хүүхдийн ирцэд итгэхгүй (өмнөөс сууж байсан)', () => {
    expect(resolveCycleStart(null, { firstAny: '2026-10-23', classFirst: '2026-10-23', firstPresent: '2026-10-23' }, '2026-06-17'))
      .toEqual({ on: null, source: 'DEFAULT' });
    expect(resolveCycleStart(null, { firstAny: '2026-10-23', classFirst: '2026-10-23', firstPresent: '2026-10-23' }, '2026-09-14'))
      .toEqual({ on: '2026-09-14', source: 'JOINED' });
  });

  it('гараар тавьсан нь ирцээс давуу; жилээс гадуурх гар утгыг үл тооно', () => {
    const att = { firstAny: '2026-10-25', classFirst: '2026-10-23', firstPresent: '2026-10-25' };
    expect(resolveCycleStart('2026-09-07', att, '2026-06-17')).toEqual({ on: '2026-09-07', source: 'MANUAL' });
    expect(resolveCycleStart('2026-08-20', att, '2026-06-17')).toEqual({ on: '2026-10-25', source: 'ATTENDANCE' });
  });

  it('гараар тавьсан эхлэл шийтийн зөрсөн хугацааг дарна; таарвал шийтийнх хэвээр', () => {
    const periods = { '2026-09': { from: '2026-09-01', to: '2026-10-01' }, '2026-10': { from: '2026-10-01', to: '2026-11-01' } };
    const r = computeLedger(summer({ periods, cycleStart: { on: '2026-09-07', source: 'MANUAL' } }));
    expect(r.blocks[1].dueOn).toBe('2026-10-07');
    const same = { '2026-09': { from: '2026-09-07', to: '2026-10-12' } };
    const r2 = computeLedger(summer({ periods: same, cycleStart: { on: '2026-09-07', source: 'MANUAL' } }));
    expect(r2.blocks[1].dueOn).toBe('2026-10-12');
  });

  it('10/15-нд эхэлсэн (гараар) → 9-р сар идэвхгүй, сар бүрийн 15-нд төлөх', () => {
    const r = computeLedger(summer({ cycleStart: { on: '2026-10-15', source: 'MANUAL' } }));
    expect(r.blocks[0].state).toBe('OFF');
    expect(r.blocks[1].dueOn).toBe('2026-10-15');
    expect(r.blocks[2].dueOn).toBe('2026-11-15');
  });

  it('бүтэн жилийн багцад мөчлөгийн эхлэл нөлөөлөхгүй', () => {
    const r = computeLedger(summer({ plan: 'FULL_YEAR', cycleStart: { on: '2026-09-07', source: 'MANUAL' } }));
    expect(r.blocks[0].dueOn).toBe('2026-09-01');
  });

  it('эхлэлийн дараах сунгалт: 10/10–10/20 ирээгүй (11 хоног) → 11-р сар 11/18, 12-р сар 12/18', () => {
    const r = computeLedger(
      summer({ cycleStart: { on: '2026-09-07', source: 'MANUAL' }, extensions: [{ month: '2026-11', days: 11 }] }),
    );
    expect(r.blocks[1].dueOn).toBe('2026-10-07');
    expect(r.blocks[2].dueOn).toBe('2026-11-18');
    expect(r.blocks[3].dueOn).toBe('2026-12-18');
    expect(gapTarget(computeLedger(summer({ cycleStart: { on: '2026-09-07', source: 'MANUAL' } })).blocks, '2026-10-10')).toBe('2026-11');
  });
});

describe('зуны төлбөр илүү төлөлт биш (эзэн 2026-11-16)', () => {
  const ym = base({
    plan: 'FULL_YEAR',
    agreed: 2_000_000,
    tier: PRICE_TIERS.g9_11,
    today: '2026-11-16',
    payments: [
      { id: 'p-june', ...pay(300_000, '2026-09', '2026-06-08') },
      { id: 'p-nov', ...pay(2_000_000, '2026-11', '2026-11-14') },
    ],
  });

  it('зунаас суусан бол 6-р сарын 300 мянга зуны төлбөр — илүү төлсөнгүй', () => {
    const r = computeLedger({ ...ym, startDate: '2026-06-01' });
    expect(r.credit).toBe(0);
    expect(r.summerPaid).toBe(300_000);
    expect(r.summerPaymentIds).toEqual(['p-june']);
    expect(r.paidTotal).toBe(2_000_000);
    expect(r.blocks.every((b) => b.state === 'PAID')).toBe(true);
    expect(blockSources(r.blocks, ym.payments as never, r.plan.kind, '2026-06-01', ACADEMIC_YEAR, r.summerPaymentIds)['2026-09'][0].paymentId).toBe('p-nov');
  });

  it('9-р сараас эхэлсэн бол хэвээр илүү төлсөн', () => {
    const r = computeLedger({ ...ym, startDate: '2026-09-01' });
    expect(r.credit).toBe(300_000);
    expect(r.summerPaid).toBe(0);
  });

  it('зуны урьдчилгаа гэрээг нөхөж байвал хасахгүй (шинэ өр үүсгэхгүй)', () => {
    const r = computeLedger(
      base({
        plan: 'FULL_YEAR',
        startDate: '2026-07-01',
        payments: [pay(350_000, '2026-09', '2026-07-01'), pay(2_150_000, '2026-09', '2026-09-20')],
      }),
    );
    expect(r.owedNow).toBe(0);
    expect(r.credit).toBe(0);
    expect(r.summerPaid).toBe(0);
  });
});

describe('Суугаагүй өдөр ба ажилтны засвар (эзэн 2026-11-19)', () => {
  const months = ['2026-09', '2026-10', '2026-11'];
  const first = (m: string) => `${m}-16`;
  it('9/25–10/4 суугаагүй (10 хоног) → 9-р сар «9/16–10/26», 10-р сар 10/26-аас', () => {
    const r = monthlyPeriods(months, first, {}, [{ month: '2026-10', days: 10, gapFrom: '2026-09-25' }]);
    expect(r.get('2026-09')).toMatchObject({ from: '2026-09-16', to: '2026-10-26', absentDays: 10 });
    expect(r.get('2026-10')).toMatchObject({ from: '2026-10-26', to: '2026-11-26', extDays: 0 });
    expect(r.get('2026-11')!.from).toBe('2026-11-26');
  });
  it('ирцээс таамагласан эхлэл шийтэд ажилтны бичсэн эхлэлийг дарахгүй, гараар тавьсан нь дарна', () => {
    const sheet = { '2026-09': { from: '2026-09-17', to: '2026-10-17' } };
    const att = computeLedger(base({ plan: 'MONTHLY', startDate: '2026-09-01', periods: sheet, cycleStart: { on: '2026-09-01', source: 'ATTENDANCE' }, payments: [] }));
    expect(att.blocks.find((b) => b.month === '2026-09')!.period).toEqual({ from: '2026-09-17', to: '2026-10-17' });
    const man = computeLedger(base({ plan: 'MONTHLY', startDate: '2026-09-01', periods: sheet, cycleStart: { on: '2026-09-20', source: 'MANUAL' }, payments: [] }));
    expect(man.blocks.find((b) => b.month === '2026-09')!.period!.from).toBe('2026-09-20');
  });
});

