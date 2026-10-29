import { Module } from '@nestjs/common';
import { HomeworkPracticeController } from './homework-practice.controller';
import { HomeworkPracticeService } from './homework-practice.service';

@Module({
  controllers: [HomeworkPracticeController],
  providers: [HomeworkPracticeService],
})
export class HomeworkPracticeModule {}
