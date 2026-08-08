import { Module } from '@nestjs/common';
import { TeacherGroupsController } from './teacher-groups.controller';
import { TeacherGroupsService } from './teacher-groups.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [TeacherGroupsController],
  providers: [TeacherGroupsService, AuditService],
  exports: [TeacherGroupsService],
})
export class TeacherGroupsModule {}
