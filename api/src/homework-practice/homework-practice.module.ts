import { Module } from '@nestjs/common';
import { HomeworkPracticeController } from './homework-practice.controller';
import { HomeworkPracticeService } from './homework-practice.service';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [MistakesModule],
  controllers: [HomeworkPracticeController],
  providers: [HomeworkPracticeService],
})
export class HomeworkPracticeModule {}
