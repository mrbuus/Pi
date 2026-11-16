import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { StudentsExportController } from './students-export.controller';
import { PaymentsModule } from '../payments/payments.module';
import { StudentsFullExportService } from './students-full-export.service';
import { UsersService } from './users.service';

@Module({
  // AuthModule нь PasswordResetService-ийг export хийдэг — ажилтан сурагчийн
  // өмнөөс сэргээх код илгээхэд ашиглана.
  imports: [AuthModule, PaymentsModule],
  controllers: [UsersController, StudentsExportController],
  providers: [UsersService, AuditService, StudentsFullExportService],
  // Шийтийн синк шинэ сурагчийг ижил дүрмээр бүртгэнэ (createClassroomStudent)
  exports: [UsersService],
})
export class UsersModule {}
