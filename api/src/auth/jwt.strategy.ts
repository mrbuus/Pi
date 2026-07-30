import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { isTokenIssuedAfterPasswordChange } from './password-reset.util';

export interface JwtPayload {
  sub: string;
  role: Role;
  /** Токен олгогдсон мөч (секунд) — JWT стандартын талбар */
  iat?: number;
}

// JWT_SECRET заавал тохируулагдсан байх — үгүй бол сервер асахгүй
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET орчны хувьсагч тохируулаагүй байна');
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: requireJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, passwordChangedAt: true },
    });
    if (!user) throw new UnauthorizedException();

    // Нууц үг солигдохоос ӨМНӨ олгогдсон токеныг хүчингүйд тооцно.
    //
    // Энэ мөргүйгээр нууц үг сэргээх нь утгагүй болно: хэн нэгэн токеныг чинь
    // хулгайлсан бол нууц үгээ сольсон ч тэр токен 7 хоног ажилласаар байна.
    // Хэрэглэгчийг DB-ээс аль хэдийн уншиж байгаа тул нэмэлт өртөггүй.
    if (!isTokenIssuedAfterPasswordChange(payload.iat, user.passwordChangedAt)) {
      throw new UnauthorizedException(
        'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү',
      );
    }

    return { userId: user.id, role: user.role };
  }
}
