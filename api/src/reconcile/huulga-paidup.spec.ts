import { dropPaidUp, paidUpOn } from './huulga-paidup';
import type { RowSuggestion } from './reconcile.service';

const block = (month: string, state: 'PAID' | 'OWED' | 'OFF', paidOn: string | null = null) =>
  ({ month, state, due: 1, paid: state === 'PAID' ? 1 : 0, dueOn: null, paidOn, lateDays: 0 }) as const;
const ledger = (blocks: ReturnType<typeof block>[], remaining = 0, settled = false) => ({ blocks: [...blocks], remaining, plan: { settled } as never });
const cand = (studentId: string) => ({ studentId, score: 2, signals: ['NAME', 'PHONE'] as never });
const sug = (over: Partial<RowSuggestion> = {}): RowSuggestion => ({
  decision: 'AUTO',
  candidates: [cand('paid'), cand('other')],
  kind: 'TUITION',
  confident: true,
  reason: 'Сургалтын төлбөр',
  ...over,
});

describe('huulga-paidup', () => {
  it('бүрэн болсон өдөр = сүүлийн сар төлөгдсөн өдөр; дутуу бол null', () => {
    expect(paidUpOn(ledger([block('2026-08', 'OFF'), block('2026-09', 'PAID', '2026-09-03'), block('2026-10', 'PAID', '2026-10-18')]))).toBe('2026-10-18');
    expect(paidUpOn(ledger([block('2026-09', 'PAID', '2026-09-03'), block('2026-10', 'OWED')], 350_000))).toBeNull();
    expect(paidUpOn(ledger([block('2026-09', 'PAID')], 0, true))).toBe('0000-01-01');
  });

  it('гүйлгээнээс 3+ хоногийн өмнө бүрэн төлсөн хүүхдийг хасаж, автомат оноолтыг зогсооно', () => {
    const out = dropPaidUp(sug(), '2026-11-05', new Map([['paid', '2026-10-18']]));
    expect(out.candidates.map((c) => c.studentId)).toEqual(['other']);
    expect(out).toMatchObject({ decision: 'CHOOSE', confident: false, hiddenPaidUp: 1 });
  });

  it('тэр гүйлгээ өөрөө бүрэн болгосон бол (3 хоногийн дотор) хасахгүй', () => {
    const s = sug();
    expect(dropPaidUp(s, '2026-10-18', new Map([['paid', '2026-10-18']]))).toBe(s);
    expect(dropPaidUp(s, '2026-10-20', new Map([['paid', '2026-10-18']]))).toBe(s);
  });

  it('ажилтан шийтэд тэр хүүхдэд ойрын өдөр бүртгэсэн бол бүрэн төлсөн ч хасахгүй', () => {
    const s = sug();
    expect(dropPaidUp(s, '2026-11-05', new Map([['paid', '2026-07-28']]), (id) => id === 'paid')).toBe(s);
  });

  it('ном, хариултын хуудсанд хамаарахгүй; бүгд хасагдвал NONE', () => {
    const book = sug({ kind: 'BOOK' });
    expect(dropPaidUp(book, '2026-11-05', new Map([['paid', '2026-09-01']]))).toBe(book);
    const out = dropPaidUp(sug({ candidates: [cand('paid')] }), '2026-11-05', new Map([['paid', '2026-09-01']]));
    expect(out).toMatchObject({ decision: 'NONE', candidates: [], confident: false });
  });
});
