import { addDateDays, dateKey, daysBetweenDateOnly, parseDateOnly, todayUB } from './date';

// УБ-ын цагийн бүс (Asia/Ulaanbaatar) UTC-ээс +8 цагийн зөрүүтэй, өвөл/зунаар
// шилждэггүй (DST байхгүй) тул тестэд тогтмол оффсет ашиглаж болно.

function setSystemUtc(iso: string) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(iso));
}

afterEach(() => {
  jest.useRealTimers();
});

describe('todayUB — УБ-ын өнөөдрийг зөв тодорхойлно', () => {
  it('UTC 12:00-д УБ-ын өдөр UTC-тэй адил өдөр байна', () => {
    setSystemUtc('2026-07-15T12:00:00.000Z');
    expect(todayUB().toISOString().slice(0, 10)).toBe('2026-07-15');
  });

  it('яг л файлыг бий болгосон алдааг шалгана: UTC шөнө дунд (00:00-07:59) — УБ-аар аль хэдийн дараагийн өдөр', () => {
    // UTC 2026-07-25 20:00 = УБ (+8) 2026-07-26 04:00. UTC slice-ээр авбал
    // "2026-07-25" гарах бөгөөд энэ нь буруу — todayUB() "2026-07-26" гаргах ёстой.
    setSystemUtc('2026-07-25T20:00:00.000Z');
    expect(todayUB().toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('UTC орой (16:00-с хойш) — УБ-аар мөн адил дараагийн өдөр эхэлсэн байна', () => {
    setSystemUtc('2026-07-25T16:30:00.000Z');
    expect(todayUB().toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('UTC 15:59-д УБ-аар өдөр хараахан сольогдоогүй байна', () => {
    setSystemUtc('2026-07-25T15:59:00.000Z');
    expect(todayUB().toISOString().slice(0, 10)).toBe('2026-07-25');
  });
});

describe('parseDateOnly — зөв огноог таньж, буруу форматыг татгалзана', () => {
  it('YYYY-MM-DD форматыг зөв Date болгоно', () => {
    const d = parseDateOnly('2026-07-26');
    expect(d.toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('цаг агуулсан ISO мөрөөс огнооны хэсгийг л авна', () => {
    const d = parseDateOnly('2026-07-26T15:30:00.000Z');
    expect(d.toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('буруу форматтай мөрийг (зурсаар биш /) татгалзана', () => {
    expect(() => parseDateOnly('2026/07/26')).toThrow('Invalid date');
  });

  it('утга учиргүй мөрийг татгалзана', () => {
    expect(() => parseDateOnly('not-a-date')).toThrow('Invalid date');
  });

  it('хоосон мөрийг татгалзана', () => {
    expect(() => parseDateOnly('')).toThrow('Invalid date');
  });

  it('оршихгүй огноог (2/30) татгалзана', () => {
    expect(() => parseDateOnly('2026-02-30')).toThrow('Invalid date');
  });

  it('нэг оронтой сар/өдөртэй мөрийг татгалзана (стрикт 2 оронтой формат шаардана)', () => {
    expect(() => parseDateOnly('2026-7-6')).toThrow('Invalid date');
  });
});

describe('dateKey / addDateDays / daysBetweenDateOnly — туслах функцууд', () => {
  it('dateKey нь ISO огнооны хэсгийг буцаана', () => {
    expect(dateKey(new Date('2026-07-26'))).toBe('2026-07-26');
  });

  it('addDateDays сарын хилээр зөв дамжина', () => {
    const d = addDateDays(new Date('2026-07-31'), 1);
    expect(dateKey(d)).toBe('2026-08-01');
  });

  it('addDateDays жилийн хилээр зөв дамжина', () => {
    const d = addDateDays(new Date('2026-12-31'), 1);
    expect(dateKey(d)).toBe('2027-01-01');
  });

  it('daysBetweenDateOnly хоёр огнооны зөрүүг өдрөөр тооцно', () => {
    expect(
      daysBetweenDateOnly(new Date('2026-08-01'), new Date('2026-07-30')),
    ).toBe(2);
  });

  it('daysBetweenDateOnly сөрөг зөрүүг зөв тэмдэгтэйгээр буцаана', () => {
    expect(
      daysBetweenDateOnly(new Date('2026-07-30'), new Date('2026-08-01')),
    ).toBe(-2);
  });
});
