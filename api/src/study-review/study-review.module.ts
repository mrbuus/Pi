import { Module } from '@nestjs/common';
import { StudyReviewController } from './study-review.controller';
import { StudyReviewService } from './study-review.service';
@Module({
  controllers: [StudyReviewController],
  providers: [StudyReviewService],
})
export class StudyReviewModule {}
