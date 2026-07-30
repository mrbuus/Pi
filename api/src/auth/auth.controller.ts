import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetAvatarDto } from './dto/set-avatar.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private passwordReset: PasswordResetService,
  ) {}

  // Бүртгэл/нэвтрэлтэд нарийн rate limit — нууц үг таах оролдлогыг хаана
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.auth.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ---------- Нууц үг сэргээх (нэвтрээгүй хэрэглэгчид) ----------

  // Хамгийн чанга хязгаар энд байх ёстой: илгээх бүрд SMS-ийн ТӨЛБӨР гарна,
  // мөн хэн нэгний утсыг мессежээр цэглэх (SMS bombing) боломж үүснэ.
  // ThrottlerGuard нь IP-гээр, PasswordResetService нь бүртгэлээр хамгаална —
  // хоёр давхарга хамтдаа л хүрэлцэнэ.
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('forgot-password')
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: { ip?: string },
  ) {
    return this.passwordReset.request(dto.identifier, req.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordReset.reset(dto.identifier, dto.code, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: string } }) {
    return this.auth.me(req.user.userId);
  }

  // Профайл зураг өөрчлөх — эхлээд POST /uploads-аар файлаа явуулж key авна
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  setAvatar(
    @Body() dto: SetAvatarDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.auth.setAvatar(req.user.userId, dto.key);
  }
}
