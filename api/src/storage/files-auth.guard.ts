import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

// GET /files/:key-г <img src="..."> зэрэг HTML tag-аар шууд ачаалдаг тул
// Authorization header илгээх боломжгүй (браузер img/video/иже татах үед
// custom header нэмдэггүй) — тиймээс энгийн JwtAuthGuard энд ажиллахгүй.
//
// Сонголт хийсэн шийдэл: ftp/cookie/тусдаа файл-токен зэрэг илүү нарийн
// схемүүдийн оронд, аль хэдийн байгаа Bearer JWT-г НЭМЭЛТЭЭР ?token=
// query параметраар хүлээн авна (web/src/lib/api.ts-ийн fileUrl() үүнийг
// автоматаар хавсаргадаг). Header болон query хоёулаа ЯГ АДИЛ хэрэглэгчийн
// эрхийг илэрхийлдэг тул нэмэлт эрх олгохгүй — зөвхөн тээвэрлэх сувгийг
// (header боломжгүй үед query) өргөтгөж байгаа болно. fetch()-ээр татах
// программ хандалт (жш: /uploads-ийн дараа) Authorization header-ээ ашиглаж
// болсоор байна.
@Injectable()
export class FilesAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const header = req.headers.authorization;
    const headerToken = header?.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;
    const queryToken =
      typeof req.query.token === 'string' ? req.query.token : undefined;
    const token = headerToken ?? queryToken;
    if (!token) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Стандарт JwtStrategy-тэй адил: устгагдсан/олдохгүй хэрэглэгчийн
    // хуучин токенийг цуцална.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException();

    return true;
  }
}
