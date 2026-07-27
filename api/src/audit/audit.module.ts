import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  // Бусад модулиуд (payments, notes, users, гэх мэт) AuditService-ийг импортолж
  // мөнгө/эрхтэй холбоотой өөрчлөлт бүрийг бүртгэх боломжтой байх ёстой.
  exports: [AuditService],
})
export class AuditModule {}
