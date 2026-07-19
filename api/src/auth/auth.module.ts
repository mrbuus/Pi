import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy, requireJwtSecret } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // Секрет байхгүй бол асахгүй (fail-fast) — таамаглагдах fallback-аар
      // чимээгүй ажиллах аюулыг хаана
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
