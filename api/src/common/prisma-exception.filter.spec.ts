import { HttpStatus } from '@nestjs/common';
import { mapPrismaError } from './prisma-exception.filter';

/*
 * Шүүлтүүрийн ГОЛ шийдвэр бол «аль Prisma алдаа ямар HTTP код болох вэ».
 * Түүнийг Nest-ийн контекстгүйгээр шууд тестлэнэ.
 */

describe('mapPrismaError', () => {
  it('валидацийн алдааг 400 болгоно (500 БИШ)', () => {
    // ЯГ ЭНЭ тохиолдол прод дээр 500 өгч байсан: `?chapterId=` дутуу үед
    // undefined нь findUnique руу орно.
    const mapped = mapPrismaError({
      name: 'PrismaClientValidationError',
      message: 'Argument `where` of type ChapterWhereUniqueInput needs...',
    });
    expect(mapped?.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('P2025 (бичлэг олдсонгүй) → 404', () => {
    const mapped = mapPrismaError({
      name: 'PrismaClientKnownRequestError',
      code: 'P2025',
    });
    expect(mapped?.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('P2002 (unique зөрчил) → 409', () => {
    const mapped = mapPrismaError({
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
    });
    expect(mapped?.status).toBe(HttpStatus.CONFLICT);
  });

  it('P2003 (foreign key) → 400', () => {
    const mapped = mapPrismaError({
      name: 'PrismaClientKnownRequestError',
      code: 'P2003',
    });
    expect(mapped?.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('P2024 (pool timeout) → 503, ачаалал ихсэхэд «сервер завгүй» гэж хэлнэ', () => {
    const mapped = mapPrismaError({
      name: 'PrismaClientKnownRequestError',
      code: 'P2024',
    });
    expect(mapped?.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('ӨС холбогдоогүй → 503 (клиентийн буруу БИШ)', () => {
    const mapped = mapPrismaError({ name: 'PrismaClientInitializationError' });
    expect(mapped?.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('ТАНИХГҮЙ Prisma код → null (500 хэвээр үлдэнэ)', () => {
    // Чухал: танихгүй алдааг дуугүй 400 болгож НУУХГҮЙ. Тэр нь жинхэнэ
    // уналт байж болох тул мониторингид 500 хэвээр харагдах ёстой.
    expect(
      mapPrismaError({ name: 'PrismaClientKnownRequestError', code: 'P9999' }),
    ).toBeNull();
  });

  it('Prisma-гийн БИШ алдаа → null', () => {
    expect(mapPrismaError({ name: 'TypeError', message: 'x is not a function' })).toBeNull();
  });

  it('клиентэд буцаах мессежид схемийн мэдээлэл ОРОХГҮЙ', () => {
    const mapped = mapPrismaError({
      name: 'PrismaClientValidationError',
      message:
        'Invalid `prisma.user.findUnique()` invocation:\n\nArgument `passwordHash`...',
    });
    expect(mapped?.message).not.toMatch(/prisma|passwordHash|findUnique/i);
  });
});
