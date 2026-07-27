import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PassesController } from './passes.controller';
import { PassesService } from './passes.service';

@Module({
  imports: [AuditModule],
  controllers: [PassesController],
  providers: [PassesService],
  exports: [PassesService],
})
export class PassesModule {}
