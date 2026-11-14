import { CycleState, owedGap, periodText, receiptTokens, RowState, SOCIAL_PRICES, writeTuition } from './sheet-pay-writer';

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

  it('10-р сараа төлөөгүй хүүхэд 11-р сард төлбөл 10-р сард орно (эзэн 2026-11-12)', () => {
    const r = row('2026-09-28', 'суудал', {
      '2026-09': { amount: 350_000, period: '09/28-10/28' },
      '2026-11': { amount: 350_000, period: null },
    });
    expect(owedGap(r, 5)).toBe(4);
    expect(writeTuition(r, { amount: 350_000, date: '2026-11-20' })).toEqual({ idx: 4, mode: 'NEW' });
    expect(cell(r, '2026-10')).toMatchObject({ amount: 350_000, period: '10/28-11/28' });
  });

  it('хоосон сар өр биш: нэг нүдэнд хоёр сарынх, цэнхэр сар, бүтэн жил', () => {
    // 10-р сард 700,000 (9, 10-р сар хоёулаа)
    const two = row('2026-09-01', 'суудал', { '2026-10': { amount: 700_000, period: '09/01-11/01' } });
    expect(owedGap(two, 4)).toBe(-1);
    const blue = row('2026-09-01', 'сар бүр', { '2026-09': { amount: 350_000 }, '2026-10': { skip: true }, '2026-11': { amount: 350_000 } });
    expect(owedGap(blue, 5)).toBe(-1);
    const full = row('2026-09-01', 'Бүтэн', { '2026-09': { amount: 350_000 }, '2026-11': { amount: 2_150_000 } });
    expect(owedGap(full, 5)).toBe(-1);
    // Сууж эхлэхээс өмнөх сар өр биш
    const late = row('2026-10-05', 'сар бүр', { '2026-10': { amount: 350_000, period: '10/05-11/05' } });
    expect(writeTuition(late, { amount: 350_000, date: '2026-11-04' }).idx).toBe(5);
  });

  it('нийгэм: сар төлсний дараах үлдэгдэл эхний нүдэнд нийлж «бүтэн» (300,000 + 1,200,000)', () => {
    const r = row('2026-09-08', 'сар бүр', { '2026-09': { amount: 300_000, period: '09/16-10/16', receipts: ['09/16'] } });
    expect(writeTuition(r, { amount: 1_200_000, date: '2026-10-08' }, SOCIAL_PRICES)).toEqual({ idx: 3, mode: 'FULL_MERGE' });
    expect(cell(r, '2026-09')).toMatchObject({ amount: 1_500_000, period: 'бүтэн', receipts: ['09/16', '10/08'] });
  });

  it('нийгэм: 700,000 + 800,000 = бүтэн жил нэг нүдэнд', () => {
    const r = row('2026-09-17', 'бүтэн', { '2026-06': { skip: true }, '2026-07': { skip: true }, '2026-08': { skip: true } });
    writeTuition(r, { amount: 700_000, date: '2026-09-19' }, SOCIAL_PRICES);
    expect(cell(r, '2026-09')).toMatchObject({ amount: 700_000, period: 'бүтэн' });
    writeTuition(r, { amount: 800_000, date: '2026-10-05' }, SOCIAL_PRICES);
    expect(cell(r, '2026-09')).toMatchObject({ amount: 1_500_000, period: 'бүтэн' });
    expect(cell(r, '2026-10').amount).toBe(0);
  });

  it('нийгэм: сар бүр 300,000', () => {
    const r = row('2026-09-17', 'сар бүр', { '2026-09': { amount: 300_000, period: '09/17-10/17' } });
    expect(writeTuition(r, { amount: 300_000, date: '2026-10-08' }, SOCIAL_PRICES)).toEqual({ idx: 4, mode: 'NEW' });
    expect(cell(r, '2026-10').period).toBe('10/17-11/17');
  });
});
