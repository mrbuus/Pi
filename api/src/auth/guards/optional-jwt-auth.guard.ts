import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Нийтийн маршрутад (жишээ нь GET /books) нэвтэрсэн хэрэглэгчийг ТАНИХ guard:
 * хүчинтэй токентой бол `req.user` бөглөгдөнө (JwtStrategy-ийн ижил шалгалт —
 * архив, нууц үг солигдсон), токенгүй/хүчингүй бол хүсэлт нэвтрээгүй хэвээр
 * үргэлжилнэ (`req.user` undefined). Хэзээ ч 401 өгөхгүй.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    return (err || !user ? undefined : user) as TUser;
  }
}
