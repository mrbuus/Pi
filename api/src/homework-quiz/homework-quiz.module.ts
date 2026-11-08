import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { HomeworkQuizController } from './homework-quiz.controller';
import { HomeworkQuizService } from './homework-quiz.service';

@Module({
  controllers: [HomeworkQuizController],
  providers: [HomeworkQuizService, AuditService],
})
export class HomeworkQuizModule {}
