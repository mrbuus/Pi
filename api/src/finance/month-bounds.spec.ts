import { financeMonthBounds, exactMoney, sumMoney } from './month-bounds';
describe('Ulaanbaatar financial month boundaries', () => {
  it.each(['UTC', 'Asia/Ulaanbaatar', 'America/New_York'])('is independent of process timezone %s', zone => {
    const prior = process.env.TZ;
    try {
      process.env.TZ = zone;
      const b = financeMonthBounds('2024-02');
      expect(b.start.toISOString()).toBe('2024-01-31T16:00:00.000Z');
      expect(b.end.toISOString()).toBe('2024-02-29T16:00:00.000Z');
      expect(b.dateStart.toISOString()).toBe('2024-02-01T00:00:00.000Z');
      expect(b.dateEnd.toISOString()).toBe('2024-03-01T00:00:00.000Z');
      expect(new Date('2024-02-29T23:59:59+08:00').getTime()).toBeLessThan(b.end.getTime());
      expect(new Date('2024-03-01T00:00:00+08:00').getTime()).toBe(b.end.getTime());
    } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
  });
  it('handles non-leap February and year rollover', () => {
    expect(financeMonthBounds('2025-02').end.toISOString()).toBe('2025-02-28T16:00:00.000Z');
    expect(financeMonthBounds('2026-12').end.toISOString()).toBe('2026-12-31T16:00:00.000Z');
  });
  it('rejects invalid months and unsafe monetary rounding', () => {
    expect(() => financeMonthBounds('2026-13')).toThrow();
    expect(() => exactMoney(9007199254740992n)).toThrow();
    expect(sumMoney([1001, 2002, -3])).toBe(3000);
  });
});
