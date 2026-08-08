import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/* ============================================================================
 * Prisma-гийн алдааг ЗӨВ HTTP код руу буулгах глобал шүүлтүүр.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-08-08, endpoint smoke test-ийн дүн):
 * 259 маршрутыг шалгахад 9 нь 500 буцаасны 6 нь ЯГ НЭГ шалтгаантай байв:
 * заавал байх ёстой query/param утга ирээгүй → `undefined` шууд Prisma руу
 * орох → `PrismaClientValidationError` → Nest түүнийг танихгүй тул
 * «500 Internal server error».
 *
 * Энэ нь ХОЁР талаараа буруу:
 *   • Клиент буруу хүсэлт явуулсан — буруу нь СЕРВЕРИЙНХ биш, 400 байх ёстой
 *   • 500 нь мониторингийн дохиог бохирдуулж, ЖИНХЭНЭ уналт живнэ
 *
 * Шүүлтүүр нь endpoint бүрд DTO/валидаци нэмэхийг ОРЛОХГҮЙ — тэр нь илүү
 * тодорхой алдааны мессеж өгнө. Гэвч шинэ endpoint нэмэх бүрд валидаци
 * мартагдах нь гарцаагүй тул энэ бол СҮҮЛИЙН ХАМГААЛАЛТ.
 *
 * АЮУЛГҮЙ БАЙДАЛ: Prisma-гийн алдааны бичвэрт хүснэгт/баганын нэр, заримдаа
 * утга хүртэл ордог. Түүнийг клиент рүү БУЦААХГҮЙ — зөвхөн лог руу бичнэ.
 * ========================================================================== */

/** Prisma-гийн алдааны обьектийн танигдах хэлбэр (instanceof-оос хамаарахгүй) */
interface PrismaLikeError {
  name?: string;
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * `instanceof` БИШ, нэрээр таних шалтгаан: Prisma 7-д алдааны ангиуд
 * `@prisma/client` runtime-аас гардаг ба generated client-ээр дамжуулан
 * дахин экспортлогддог. Хоёр өөр замаар импортолбол `instanceof` ХУДАЛ
 * буцаадаг (өөр ангийн обьект болно) — бодит алдаа чимээгүй өнгөрнө.
 */
function asPrismaError(exception: unknown): PrismaLikeError | null {
  if (typeof exception !== 'object' || exception === null) return null;
  const err = exception as PrismaLikeError;
  if (typeof err.name !== 'string') return null;
  return err.name.startsWith('PrismaClient') ? err : null;
}

interface Mapped {
  status: HttpStatus;
  message: string;
}

/**
 * Prisma-гийн алдааны кодыг HTTP хариу руу буулгана.
 * Экспортлогдсон — шүүлтүүрийг Nest-гүйгээр тестлэх боломжтой (spec-ийг үз).
 *
 * Кодын лавлагаа: https://www.prisma.io/docs/orm/reference/error-reference
 */
export function mapPrismaError(err: PrismaLikeError): Mapped | null {
  if (err.name === 'PrismaClientValidationError') {
    // Ихэвчлэн `undefined` утга дамжуулсан, эсвэл талбарын нэр буруу.
    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Хүсэлтийн утга дутуу эсвэл буруу байна',
    };
  }

  if (err.name === 'PrismaClientInitializationError') {
    // Өгөгдлийн сан унтарсан / холбогдож чадсангүй — түр зуурын доголдол.
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Өгөгдлийн сан түр ажиллахгүй байна. Дахин оролдоно уу',
    };
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2000': // утга багананд багтахгүй урт
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Оруулсан утга хэт урт байна',
        };
      case 'P2002': // unique зөрчил
        return {
          status: HttpStatus.CONFLICT,
          message: 'Ийм бичлэг аль хэдийн бүртгэлтэй байна',
        };
      case 'P2003': // foreign key зөрчил
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Холбогдох бичлэг олдсонгүй',
        };
      case 'P2025': // update/delete хийх бичлэг олдсонгүй
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Бичлэг олдсонгүй',
        };
      case 'P2024': // pool-оос холболт авахад timeout
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Сервер завгүй байна. Хэсэг хүлээгээд дахин оролдоно уу',
        };
      default:
        // Танихгүй код — 500 хэвээр үлдээж, лог руу бичнэ. Энэ бол ЖИНХЭНЭ
        // уналт байж болзошгүй тул дуугүй 400 болгож нуухгүй.
        return null;
    }
  }

  return null;
}

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Nest-ийн өөрийн HttpException-ууд (400/401/403/404…) энд хөндөгдөхгүй —
    // тэдгээр нь аль хэдийн зориудаар шидэгдсэн, зөв статустай.
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const prismaError = asPrismaError(exception);
    const mapped = prismaError ? mapPrismaError(prismaError) : null;

    if (mapped) {
      // Жинхэнэ шалтгааныг ЗӨВХӨН лог руу — клиентэд схемийн мэдээлэл гоожуулахгүй
      this.logger.warn(
        `${req.method} ${req.originalUrl} → ${mapped.status} ` +
          `(${prismaError?.name}${prismaError?.code ? ` ${prismaError.code}` : ''}): ` +
          `${(prismaError?.message ?? '').split('\n')[0]}`,
      );
      res.status(mapped.status).json({
        statusCode: mapped.status,
        message: mapped.message,
      });
      return;
    }

    // Танихгүй алдаа — БҮТЭН stack-ийг лог руу бичээд 500 буцаана.
    this.logger.error(
      `${req.method} ${req.originalUrl} → 500 (боловсруулаагүй алдаа)`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
