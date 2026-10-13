import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import type { JwtPayload } from '../auth/jwt.strategy';
import { isTokenIssuedAfterPasswordChange } from '../auth/password-reset.util';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Ноорогийн зураг — <img src>-д Authorization толгой дамжихгүй тул ?token= ч
 * хүлээн авна (storage/files-auth.guard.ts-ийн адил баталгаажуулалт). Зөвхөн
 * Багш+/Админ, зөвхөн идэвхтэй ноорогийн блокт холбогдсон (эсвэл өөрийн
 * оруулсан) файл. Ингэснээр нэг ажилтны оруулсан зургийг бусад Багш+ ч харна —
 * ерөнхий /files/:key нь ноорогийг мэдэхгүй (зөвхөн эзэмшигчид нээдэг).
 */
@Injectable()
export class DraftFileGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const header = req.headers.authorization;
    const token =
      typeof header === 'string' && /^Bearer /i.test(header)
        ? header.slice(7)
        : typeof req.query.token === 'string'
          ? req.query.token
          : undefined;
    if (!token) throw new UnauthorizedException();
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 200)
      throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        archivedAt: true,
        passwordChangedAt: true,
        externalTeacherProfile: { select: { userId: true } },
      },
    });
    if (
      !user ||
      user.archivedAt ||
      !isTokenIssuedAfterPasswordChange(payload.iat, user.passwordChangedAt)
    )
      throw new UnauthorizedException();
    if (
      user.externalTeacherProfile ||
      (user.role !== Role.ADMIN && user.role !== Role.TEACHER_PLUS)
    )
      throw new ForbiddenException('Энэ файлыг үзэх эрхгүй.');
    const key = req.params.key;
    if (typeof key !== 'string' || key.length > 200 || !/^[\w][\w.-]*$/.test(key))
      throw new BadRequestException('Буруу түлхүүр');
    const [referenced, own] = await Promise.all([
      this.prisma.draftBlock.findFirst({
        where: { imageKey: key, set: { deletedAt: null } },
        select: { id: true },
      }),
      this.prisma.storedFile.findFirst({
        where: { key, ownerId: user.id },
        select: { key: true },
      }),
    ]);
    if (!referenced && !own)
      throw new ForbiddenException('Энэ файлыг үзэх эрхгүй.');
    return true;
  }
}
