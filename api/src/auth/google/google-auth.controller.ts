import { Body, Controller, Delete, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GoogleOAuthPurpose } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleExchangeDto } from './google-auth.dto';
import { GoogleAuthService } from './google-auth.service';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private google: GoogleAuthService) {}

  /** Вэб «Google-ээр нэвтрэх» товчийг харуулах эсэхийг шийднэ. */
  @Get('config')
  config() {
    return { enabled: this.google.isEnabled() };
  }

  /** Нэвтрэх урсгал эхлүүлэх — вэб хариуны url руу шилжинэ. */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('url')
  async loginUrl() {
    return { url: await this.google.authorizationUrl(GoogleOAuthPurpose.LOGIN) };
  }

  /** Нэвтэрсэн хэрэглэгч өөрийн бүртгэлд Google холбох. */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('link')
  async linkUrl(@Req() req: { user: { userId: string } }) {
    return { url: await this.google.authorizationUrl(GoogleOAuthPurpose.LINK, req.user.userId) };
  }

  /** Google-ээс буцах хаяг (GOOGLE_REDIRECT_URI). Үргэлж вэб рүү redirect. */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const target = await this.google.handleCallback({ code, state, error });
    return res.redirect(302, target);
  }

  /** Нэг удаагийн кодыг JWT болгож солино. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('exchange')
  exchange(@Body() dto: GoogleExchangeDto) {
    return this.google.exchange(dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@Req() req: { user: { userId: string } }) {
    return this.google.status(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('link')
  unlink(@Req() req: { user: { userId: string } }) {
    return this.google.unlink(req.user.userId);
  }
}
