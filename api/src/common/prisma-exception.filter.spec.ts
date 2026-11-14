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

  it('adapter-pg: ӨС хүрэхгүй (P1001) → 503 (өмнө нь 500 гоожиж байсан)', () => {
    // Бодит хэлбэр (2026-11-03 локал хуулбар дээр Postgres унтарсан үед барьсан)
    const mapped = mapPrismaError({
      name: 'PrismaClientKnownRequestError',
      code: 'P1001',
      meta: {
        modelName: 'User',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: { kind: 'DatabaseNotReachable', host: '127.0.0.1', port: 5599 },
        },
      },
    });
    expect(mapped?.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it.each([
    [{ kind: 'ConnectionClosed' }],
    [{ kind: 'SocketTimeout' }],
    [{ kind: 'TooManyConnections' }],
    [{ kind: 'postgres', code: '57014' }], // statement_timeout
    [{ kind: 'postgres', code: '57P01' }], // admin shutdown
  ])('түр доголдол %j → 503', (cause) => {
    const mapped = mapPrismaError({
      name: 'PrismaClientKnownRequestError',
      code: 'P2010',
      meta: { driverAdapterError: { cause } },
    });
    expect(mapped?.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('postgres-ийн бусад алдаа (жишээ 42601) 503 БОЛОХГҮЙ — жинхэнэ алдааг нуухгүй', () => {
    expect(
      mapPrismaError({
        name: 'PrismaClientKnownRequestError',
        code: 'P2010',
        meta: { driverAdapterError: { cause: { kind: 'postgres', code: '42601' } } },
      }),
    ).toBeNull();
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
