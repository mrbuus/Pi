import { claimBankPayments } from './bank-claim';

const ins = (studentId: string, amount: number, paidOn: string | null, cell = 'main|2026-11', forMonth = '2026-11') => ({ studentId, amount, paidOn, cell, forMonth });

describe('шийтийн шинэ төлбөр ↔ хуулгаас баталсан төлбөр', () => {
  it('ижил хүүхэд, дүн, ойр огноо → шинээр бичихгүй, холбоно', () => {
    const r = claimBankPayments([ins('a', 350_000, '2026-11-05')], [{ id: 'bank_1', userId: 'a', amount: 350_000, paidOn: '2026-11-04' }]);
    expect(r.keep).toEqual([]);
    expect(r.links).toEqual([{ paymentId: 'bank_1', studentId: 'a', cell: 'main|2026-11' }]);
  });
  it('өөр хүүхэд, өөр дүн эсвэл хол огноо → шинээр бичнэ', () => {
    const bank = [{ id: 'bank_1', userId: 'a', amount: 350_000, paidOn: '2026-11-01' }];
    expect(claimBankPayments([ins('b', 350_000, '2026-11-01')], bank).keep).toHaveLength(1);
    expect(claimBankPayments([ins('a', 300_000, '2026-11-01')], bank).keep).toHaveLength(1);
    expect(claimBankPayments([ins('a', 350_000, '2026-11-10')], bank).keep).toHaveLength(1);
  });
  it('нэг хуулгын төлбөрийг хоёр нүдэнд холбохгүй (хоёр дахь нь жинхэнэ шинэ төлбөр)', () => {
    const r = claimBankPayments(
      [ins('a', 350_000, '2026-10-01', 'main|2026-10'), ins('a', 350_000, '2026-10-02', 'main|2026-11')],
      [{ id: 'bank_1', userId: 'a', amount: 350_000, paidOn: '2026-10-01' }],
    );
    expect(r.links).toHaveLength(1);
    expect(r.keep).toHaveLength(1);
  });
  it('хамгийн ойр огноотойг сонгоно', () => {
    const r = claimBankPayments(
      [ins('a', 350_000, '2026-11-05')],
      [
        { id: 'far', userId: 'a', amount: 350_000, paidOn: '2026-11-02' },
        { id: 'near', userId: 'a', amount: 350_000, paidOn: '2026-11-05' },
      ],
    );
    expect(r.links[0].paymentId).toBe('near');
  });
  it('огноогүй нүд → тэр сарын хуулгын төлбөр', () => {
    expect(claimBankPayments([ins('a', 350_000, null)], [{ id: 'b', userId: 'a', amount: 350_000, paidOn: '2026-11-03' }]).links).toHaveLength(1);
    expect(claimBankPayments([ins('a', 350_000, null)], [{ id: 'b', userId: 'a', amount: 350_000, paidOn: '2026-10-30' }]).keep).toHaveLength(1);
  });
});
