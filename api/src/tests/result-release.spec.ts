import {
  releasedTestWhere,
  resultsHiddenUntil,
  resultsPendingMessage,
  resultsPendingOf,
} from './result-release';

describe('result-release — хаах цаг хүртэл дүн нуух', () => {
  const now = new Date('2026-11-25T02:00:00Z'); // УБ 10:00

  it('closesAt null — нуухгүй (өмнөх зан төлөв)', () => {
    expect(resultsHiddenUntil({ closesAt: null }, now)).toBeNull();
    expect(resultsPendingOf({}, now)).toBeNull();
  });

  it('хаах цагаас өмнө нууна, тэр мөчөөс нээнэ', () => {
    const closesAt = new Date('2026-11-25T03:40:00Z');
    expect(resultsHiddenUntil({ closesAt }, now)).toEqual(closesAt);
    expect(resultsHiddenUntil({ closesAt }, closesAt)).toBeNull();
  });

  it('мессеж Улаанбаатарын цагаар HH:MM, өөр өдөр бол огноотой, цэггүй төгсгөл', () => {
    expect(resultsPendingMessage(new Date('2026-11-25T03:40:00Z'), now)).toBe(
      'Хариу хүлээн авлаа. Дүн, бодолт 11:40 цагт нээгдэнэ',
    );
    expect(resultsPendingMessage(new Date('2026-11-26T03:40:00Z'), now)).toBe(
      'Хариу хүлээн авлаа. Дүн, бодолт 2026-11-26 11:40 цагт нээгдэнэ',
    );
  });

  it('Prisma нөхцөл', () => {
    expect(releasedTestWhere(now)).toEqual({
      OR: [{ closesAt: null }, { closesAt: { lte: now } }],
    });
  });
});
