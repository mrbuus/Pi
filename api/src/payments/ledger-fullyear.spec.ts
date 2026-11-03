import {
  PRICE_TIERS,
  computeLedger,
  fullYearByPayments,
  type LedgerPayment,
} from './ledger';

const g12 = PRICE_TIERS.g12;
const g9 = PRICE_TIERS.g9_11;
const pay = (amount: number, paidOn: string): LedgerPayment => ({
  amount,
  paidOn,
  forMonth: paidOn.slice(0, 7),
});

describe('Бүтэн жил төлбөрөөр (эзэн 2026-11-03, гэрээ «Суудал баталгаажуулах»)', () => {
  it('350 мянга + 2.15 сая 45 хоногийн дотор → бүтэн; нэг дор 2.5 сая → бүтэн', () => {
    expect(
      fullYearByPayments(
        [pay(350_000, '2026-09-03'), pay(2_150_000, '2026-10-10')],
        g12,
        '2026-09-02',
      ),
    ).toBe('FULL');
    expect(
      fullYearByPayments([pay(2_500_000, '2027-01-05')], g12, '2026-09-02'),
    ).toBe('FULL');
    // 3 өдрийн анги: 300 мянга + 1.7 сая
    expect(
      fullYearByPayments(
        [pay(300_000, '2026-09-03'), pay(1_700_000, '2026-10-01')],
        g9,
        '2026-09-01',
      ),
    ).toBe('FULL');
  });

  it('45 хоног хэтэрсэн бол LATE (Багш+ шалгана); сар бүр 350 мянгаар 2.5 саяд хүрсэн нь LATE биш', () => {
    expect(
      fullYearByPayments(
        [pay(350_000, '2026-09-03'), pay(2_150_000, '2026-11-20')],
        g12,
        '2026-09-02',
      ),
    ).toBe('LATE');
    const monthly = ['09', '10', '11', '12']
      .map((m) => pay(350_000, `2026-${m}-03`))
      .concat(
        ['01', '02', '03', '04'].map((m) => pay(350_000, `2027-${m}-03`)),
      );
    expect(fullYearByPayments(monthly, g12, '2026-09-02')).toBeNull();
  });

  it('жил эхлэхээс өмнө (зун) орсон бол хугацаа 9/1-ээс; дутуу бол null', () => {
    expect(
      fullYearByPayments(
        [pay(350_000, '2026-07-10'), pay(2_150_000, '2026-10-10')],
        g12,
        '2026-07-08',
      ),
    ).toBe('FULL');
    expect(
      fullYearByPayments(
        [pay(350_000, '2026-09-03'), pay(2_000_000, '2026-09-20')],
        g12,
        '2026-09-02',
      ),
    ).toBeNull();
  });

  it('ledger: сар бүр гэж бүртгэгдсэн ч 350к + 2.15с төлсөн бол бүх сар төлсөн, өргүй', () => {
    const r = computeLedger({
      plan: 'MONTHLY',
      tuitionAmount: 350_000,
      tier: g12,
      startDate: '2026-09-02',
      leftOn: null,
      payments: [pay(350_000, '2026-09-02'), pay(2_150_000, '2026-09-25')],
      today: '2027-03-10',
    });
    expect(r.plan).toMatchObject({
      kind: 'FULL_YEAR',
      autoFull: true,
      total: 2_500_000,
    });
    expect(r.owedNow).toBe(0);
    expect(
      r.blocks
        .filter((b) => b.state !== 'OFF')
        .every((b) => b.state === 'PAID'),
    ).toBe(true);
  });

  it('ledger: хугацаа хэтэрсэн бол сар бүр хэвээр, fullYearLate тэмдэгтэй; гараар бүрэн бол settled давамгайлна', () => {
    const input = {
      plan: 'MONTHLY' as const,
      tuitionAmount: 350_000,
      tier: g12,
      startDate: '2026-09-02',
      leftOn: null,
      payments: [pay(350_000, '2026-09-02'), pay(2_150_000, '2026-12-01')],
      today: '2027-03-10',
    };
    expect(computeLedger(input).plan).toMatchObject({
      kind: 'MONTHLY',
      fullYearLate: true,
    });
    expect(computeLedger({ ...input, settled: true }).plan).toMatchObject({
      kind: 'FULL_YEAR',
      settled: true,
    });
  });
});
