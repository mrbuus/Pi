import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BookPaymentsController } from './book-payments.controller';
import { BookPaymentsService } from './book-payments.service';

// «Номын мөнгө» (эзэн 2026-11-12). ClassChecksModule номын чекэд энэ сервисийг ашиглана.
@Module({
  imports: [AuditModule],
  controllers: [BookPaymentsController],
  providers: [BookPaymentsService],
  exports: [BookPaymentsService],
})
export class BookPaymentsModule {}
