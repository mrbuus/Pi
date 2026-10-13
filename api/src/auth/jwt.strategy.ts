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

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
// Хуудас ачаалахад зэрэг ирэх олон хүсэлт нэг л UPDATE үүсгэнэ (процессын санах ой)
const lastTouched = new Map<string, number>();

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
      select: {
        id: true,
        role: true,
        passwordChangedAt: true,
        archivedAt: true,
        lastSeenAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    if (user.archivedAt)
      throw new UnauthorizedException(
        'Энэ сурагчийн бүртгэл архивлагдсан байна. Сургалтын төвтэй холбогдоно уу.',
      );

    // Нууц үг солигдохоос ӨМНӨ олгогдсон токеныг хүчингүйд тооцно.
    //
    // Энэ мөргүйгээр нууц үг сэргээх нь утгагүй болно: хэн нэгэн токеныг чинь
    // хулгайлсан бол нууц үгээ сольсон ч тэр токен 7 хоног ажилласаар байна.
    // Хэрэглэгчийг DB-ээс аль хэдийн уншиж байгаа тул нэмэлт өртөггүй.
    if (
      !isTokenIssuedAfterPasswordChange(payload.iat, user.passwordChangedAt)
    ) {
      throw new UnauthorizedException(
        'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү',
      );
    }

    this.touchLastSeen(user.id, user.lastSeenAt);
    return { userId: user.id, role: user.role };
  }

  // «Сайтад сүүлд орсон» (эзэн 2026-10-13). Хүсэлт бүрт бичвэл ачаалал болох
  // тул хэрэглэгч тутам 5 минутад нэг л удаа, хариуг хүлээлгүй шинэчилнэ.
  // Raw UPDATE — Prisma-ийн @updatedAt-ыг (профайл зассан огноо) хөндөхгүй.
  private touchLastSeen(userId: string, lastSeenAt: Date | null | undefined) {
    const now = Date.now();
    if (lastSeenAt && now - lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS)
      return;
    if (now - (lastTouched.get(userId) ?? 0) < LAST_SEEN_THROTTLE_MS) return;
    lastTouched.set(userId, now);
    try {
      void this.prisma
        // TIMESTAMP(3) багана UTC-ээр хадгалдаг (Prisma) — NOW() сессийн цагийн
        // бүсээр (УБ +8) бичигдэхээс сэргийлж UTC руу хөрвүүлнэ
        .$executeRaw`UPDATE "User" SET "lastSeenAt" = (NOW() AT TIME ZONE 'UTC') WHERE "id" = ${userId}`
        .catch(() => undefined);
    } catch {
      // Тест орчны mock-д $executeRaw байхгүй байж болно — нэвтрэлтэд саад болохгүй
    }
  }
}
