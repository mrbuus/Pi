import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy, requireJwtSecret } from './jwt.strategy';
import { PasswordResetService } from './password-reset.service';
import { GoogleAuthController } from './google/google-auth.controller';
import { GoogleAuthService } from './google/google-auth.service';
import { LoginTextController } from './login-text.controller';
import { LoginTextService } from './login-text.service';

@Module({
  imports: [
    PassportModule,
    // Нууц үг сэргээх бүр аудитад бүртгэгдэнэ — хэн, хэзээ сэргээснийг
    // хойшид мөрдөх боломжтой байх ёстой.
    AuditModule,
    JwtModule.register({
      // Секрет байхгүй бол асахгүй (fail-fast) — таамаглагдах fallback-аар
      // чимээгүй ажиллах аюулыг хаана
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    AuthController,
    GoogleAuthController,
    ConsentController,
    LoginTextController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordResetService,
    GoogleAuthService,
    ConsentService,
    LoginTextService,
  ],
  // PasswordResetService-ийг UsersModule мөн ашиглана (ажилтан сурагчийн
  // өмнөөс код илгээх).
  exports: [AuthService, PasswordResetService],
})
export class AuthModule {}
