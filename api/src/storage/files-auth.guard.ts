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
import { PrismaService } from '../prisma/prisma.service';
import { FileAuthorizationService } from './file-authorization.service';

/** Query bearer support remains for native img/PDF tags; object grants and revocation are checked on every request. */
@Injectable()
export class FilesAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly files: FileAuthorizationService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const header = req.headers.authorization;
    const headerToken =
      typeof header === 'string' && /^Bearer /i.test(header)
        ? header.slice(7)
        : undefined;
    const queryToken =
      typeof req.query.token === 'string' ? req.query.token : undefined;
    const token = headerToken ?? queryToken;
    if (!token) throw new UnauthorizedException();
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      payload.sub.length > 200
    )
      throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        archivedAt: true,
        passwordChangedAt: true,
      },
    });
    if (
      !user ||
      user.archivedAt ||
      !isTokenIssuedAfterPasswordChange(payload.iat, user.passwordChangedAt)
    )
      throw new UnauthorizedException();
    const key = req.params.key;
    if (
      typeof key !== 'string' ||
      key.length > 200 ||
      !/^[\w][\w.-]*$/.test(key)
    )
      throw new BadRequestException('Буруу түлхүүр');
    if (!(await this.files.allowed({ id: user.id, role: user.role }, key)))
      throw new ForbiddenException('Энэ файлыг үзэх эрхгүй.');
    return true;
  }
}
