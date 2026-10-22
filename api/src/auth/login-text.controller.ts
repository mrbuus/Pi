import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../generated/prisma/enums';
import { Roles } from './decorators/roles.decorator';
import { LoginTextDto } from './dto/login-text.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginTextService } from './login-text.service';

/** Нэвтрэх хуудасны админ засдаг тайлбар (эзэн 2026-10-22) */
@Controller('auth/login-text')
export class LoginTextController {
  constructor(private loginText: LoginTextService) {}

  /** Нийтийн — нэвтрээгүй хүн нэвтрэх хуудсан дээр уншина */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  get() {
    return this.loginText.get();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put()
  set(
    @Body() dto: LoginTextDto,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    return this.loginText.set(dto.body, req.user);
  }
}
