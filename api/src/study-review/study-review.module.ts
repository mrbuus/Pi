import { Module } from '@nestjs/common';
import { StudyReviewController } from './study-review.controller';
import { StudyReviewService } from './study-review.service';
import { MistakesModule } from '../mistakes/mistakes.module';
@Module({
  imports: [MistakesModule],
  controllers: [StudyReviewController],
  providers: [StudyReviewService],
})
export class StudyReviewModule {}
