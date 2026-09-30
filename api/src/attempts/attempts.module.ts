import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { SummaryCron } from './summary.cron';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [MistakesModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, SummaryCron],
})
export class AttemptsModule {}
