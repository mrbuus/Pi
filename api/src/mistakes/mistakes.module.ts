import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MistakeCollector } from './mistake-collector.service';
import { MistakesController } from './mistakes.controller';
import { MistakesService } from './mistakes.service';
import { ProblemReviewController } from './problem-review.controller';
import { ProblemReviewService } from './problem-review.service';
@Module({
  imports: [PrismaModule],
  controllers: [MistakesController, ProblemReviewController],
  providers: [MistakesService, MistakeCollector, ProblemReviewService],
  exports: [MistakeCollector, MistakesService, ProblemReviewService],
})
export class MistakesModule {}
