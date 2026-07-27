import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';

@Module({
  controllers: [ClassroomsController],
  providers: [ClassroomsService, AuditService],
})
export class ClassroomsModule {}
