import { CycleState, periodText, receiptTokens, RowState, writeTuition } from './sheet-pay-writer';

const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
const row = (start: string | null, form: string | null, cells: Partial<Record<string, Partial<CycleState>>> = {}): RowState => ({
  start,
  form,
  cycles: MONTHS.map((month) => ({ month, amount: 0, text: null, period: null, receipts: [], ...cells[month] })),
});
const cell = (r: RowState, m: string) => r.cycles.find((c) => c.month === m)!;

describe('sheet-pay-writer', () => {
  it('«Баримт»-ын огноог MM/DD болгоно', () => {
    expect(receiptTokens('2026-09-01')).toEqual(['09/01']);
    expect(receiptTokens('9/1, 09/30')).toEqual(['09/01', '09/30']);
    expect(receiptTokens(null)).toEqual([]);
    expect(periodText(12, 5)).toBe('12/05-01/05');
  });

  it('цэнхэр (суугаагүй) сарыг алгасаж, сууж эхэлсэн өдрөөр хугацаа бичнэ', () => {
    const r = row('2026-09-08', 'сар бүр', { '2026-06': { skip: true }, '2026-07': { skip: true }, '2026-08': { skip: true } });
    expect(writeTuition(r, { amount: 350_000, date: '2026-09-10' })).toEqual({ idx: 3, mode: 'NEW' });
    expect(cell(r, '2026-09')).toMatchObject({ amount: 350_000, period: '09/08-10/08', receipts: ['09/10'] });
  });

  it('зунаас үргэлжилсэн хүүхдийн 9-р сар 09/01-ээс, дараагийн сар үргэлжилнэ', () => {
    const r = row('2026-06-08', 'сар бүр', { '2026-06': { amount: 350_000, period: '06/08-07/08' }, '2026-07': { amount: 350_000, period: '07/08-08/08' }, '2026-08': { skip: true } });
    writeTuition(r, { amount: 350_000, date: '2026-09-02' });
    writeTuition(r, { amount: 350_000, date: '2026-10-01' });
    expect(cell(r, '2026-09').period).toBe('09/01-10/01');
    expect(cell(r, '2026-10').period).toBe('10/01-11/01');
  });

  it('дутуу сард нэмэлт төлбөрийг нэмж, огноог залгана', () => {
    const r = row('2026-09-01', 'сар бүр', { '2026-09': { amount: 300_000, period: '09/01-10/01', receipts: ['09/01'] } });
    expect(writeTuition(r, { amount: 50_000, date: '2026-09-30' }).mode).toBe('TOP_UP');
    expect(cell(r, '2026-09')).toMatchObject({ amount: 350_000, receipts: ['09/01', '09/30'] });
  });

  it('бүтэн жилийн үлдэгдлийг урьдчилгааны нүдэнд нэмж «бүтэн» болгоно', () => {
    const r = row('2026-09-07', 'Бүтэн', { '2026-09': { amount: 350_000, period: '09/07-10/07', receipts: ['09/03'] } });
    expect(writeTuition(r, { amount: 2_150_000, date: '2026-09-20' })).toEqual({ idx: 3, mode: 'FULL_MERGE' });
    expect(cell(r, '2026-09')).toMatchObject({ amount: 2_500_000, period: 'бүтэн', receipts: ['09/03', '09/20'] });
    expect(cell(r, '2026-10').amount).toBe(0);
  });

  it('«бүтэн» нүд 2.5 саяас бага бол дараагийн төлбөр түүнд нэмэгдэнэ', () => {
    const r = row('2026-09-01', 'Бүтэн', { '2026-09': { amount: 2_000_000, period: 'бүтэн' } });
    expect(writeTuition(r, { amount: 500_000, date: '2026-10-05' }).mode).toBe('FULL_MERGE');
    expect(cell(r, '2026-09').amount).toBe(2_500_000);
  });

  it('урьдчилгаагүйгээр бүтэн жил төлбөл хичээлийн жилийн эхний сард «бүтэн»', () => {
    const r = row('2026-09-01', 'Бүтэн', { '2026-06': { skip: true }, '2026-07': { skip: true }, '2026-08': { skip: true } });
    writeTuition(r, { amount: 2_500_000, date: '2026-09-04' });
    expect(cell(r, '2026-09')).toMatchObject({ amount: 2_500_000, period: 'бүтэн' });
  });
});
