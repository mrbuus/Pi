import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // AuthModule нь PasswordResetService-ийг export хийдэг — ажилтан сурагчийн
  // өмнөөс сэргээх код илгээхэд ашиглана.
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, AuditService],
})
export class UsersModule {}
