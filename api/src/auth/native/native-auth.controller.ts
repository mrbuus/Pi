import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AppleNativeDto, GoogleNativeDto } from './native-auth.dto';
import { NativeAuthService } from './native-auth.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

const ALL_ROLES = [
  Role.STUDENT,
  Role.PARENT,
  Role.BUYER,
  Role.TEACHER,
  Role.TEACHER_PLUS,
  Role.ADMIN,
];

/**
 * Гар утасны аппын нэвтрэлт. Нэвтрэх маршрутууд нэвтрээгүй хүнд нээлттэй тул
 * /auth/login-той ижил чанга хязгаартай (минутад 10).
 */
@Controller('auth')
export class NativeAuthController {
  constructor(private readonly native: NativeAuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('google/native')
  google(@Body() dto: GoogleNativeDto) {
    return this.native.googleLogin(dto.idToken, dto.remember);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('apple')
  apple(@Body() dto: AppleNativeDto) {
    return this.native.appleLogin(dto.identityToken, dto.nonce, dto.remember);
  }

  /** Нэвтэрсэн хэрэглэгч профайлаасаа Google холбох (апп). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ALL_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('google/native/link')
  googleLink(@Body() dto: GoogleNativeDto, @Req() req: AuthedRequest) {
    return this.native.googleLink(req.user.userId, dto.idToken);
  }

  /** Нэвтэрсэн хэрэглэгч профайлаасаа Apple холбох (апп). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ALL_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('apple/link')
  appleLink(@Body() dto: AppleNativeDto, @Req() req: AuthedRequest) {
    return this.native.appleLink(req.user.userId, dto.identityToken, dto.nonce);
  }
}
