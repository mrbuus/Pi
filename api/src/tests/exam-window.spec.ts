import { formatUB, sessionDeadline, startWindowError, windowError } from './exam-window';

const at = (iso: string) => new Date(iso);

describe('formatUB — Улаанбаатарын цагаар', () => {
  it('UTC 01:00 → UB 09:00', () => {
    expect(formatUB(at('2026-11-25T01:00:00Z'))).toBe('2026-11-25 09:00');
  });
  it('UTC 18:30 → дараагийн өдөр 02:30', () => {
    expect(formatUB(at('2026-11-24T18:30:00Z'))).toBe('2026-11-25 02:30');
  });
});

describe('startWindowError', () => {
  const opensAt = at('2026-11-25T01:00:00Z');
  const closesAt = at('2026-11-25T02:40:00Z');
  it('цонхгүй бол үргэлж нээлттэй (өмнөх зан төлөв)', () => {
    expect(startWindowError({}, at('2000-01-01T00:00:00Z'))).toBeNull();
    expect(startWindowError({ opensAt: null, closesAt: null }, new Date())).toBeNull();
  });
  it('нээгдэхээс өмнө — хэдэн цагт нээгдэхийг хэлнэ', () => {
    expect(startWindowError({ opensAt, closesAt }, at('2026-11-25T00:59:59Z'))).toBe(
      'Шалгалт 2026-11-25 09:00 цагт нээгдэнэ (Улаанбаатарын цагаар)',
    );
  });
  it('нээгдсэн мөчөөс эхэлж болно', () => {
    expect(startWindowError({ opensAt, closesAt }, opensAt)).toBeNull();
  });
  it('хаагдсан мөч ба түүнээс хойш эхлүүлэхгүй', () => {
    expect(startWindowError({ opensAt, closesAt }, closesAt)).toMatch(/10:40 цагт хаагдсан/);
    expect(startWindowError({ closesAt }, at('2026-11-26T00:00:00Z'))).not.toBeNull();
  });
});

describe('sessionDeadline = min(эхэлсэн + хугацаа, хаах цаг)', () => {
  const start = at('2026-11-25T01:00:00Z');
  it('хаах цаггүй — өмнөх шиг', () => {
    expect(sessionDeadline(start, 100, null)?.toISOString()).toBe('2026-11-25T02:40:00.000Z');
  });
  it('хугацаагүй, цаггүй — null', () => {
    expect(sessionDeadline(start, null, null)).toBeNull();
  });
  it('хоцорсон сурагч хаах цаг хүртэл л', () => {
    const late = at('2026-11-25T01:30:00Z');
    expect(sessionDeadline(late, 100, at('2026-11-25T02:40:00Z'))?.toISOString()).toBe(
      '2026-11-25T02:40:00.000Z',
    );
  });
  it('эрт эхэлсэн бол хугацаагаар', () => {
    expect(sessionDeadline(start, 30, at('2026-11-25T02:40:00Z'))?.toISOString()).toBe(
      '2026-11-25T01:30:00.000Z',
    );
  });
  it('хугацаагүй боловч хаах цагтай — хаах цаг', () => {
    expect(sessionDeadline(start, null, at('2026-11-25T02:40:00Z'))?.toISOString()).toBe(
      '2026-11-25T02:40:00.000Z',
    );
  });
});

describe('windowError', () => {
  it('хаах нь нээхээс өмнө — алдаа', () => {
    expect(windowError({ opensAt: at('2026-11-25T02:00:00Z'), closesAt: at('2026-11-25T01:00:00Z') })).not.toBeNull();
    expect(windowError({ opensAt: at('2026-11-25T01:00:00Z'), closesAt: at('2026-11-25T01:00:00Z') })).not.toBeNull();
  });
  it('зөв эсвэл нэг нь л байвал null', () => {
    expect(windowError({ opensAt: at('2026-11-25T01:00:00Z'), closesAt: at('2026-11-25T02:00:00Z') })).toBeNull();
    expect(windowError({ closesAt: at('2026-11-25T02:00:00Z') })).toBeNull();
  });
});
