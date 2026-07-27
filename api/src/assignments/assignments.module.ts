import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AuditService],
})
export class AssignmentsModule {}
