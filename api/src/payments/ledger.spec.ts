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
