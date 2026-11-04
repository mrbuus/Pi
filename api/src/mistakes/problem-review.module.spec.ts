import { Test } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { MistakesModule } from './mistakes.module';
import { MistakeCollector } from './mistake-collector.service';
import { ProblemReviewService } from './problem-review.service';
import { StudyReviewModule } from '../study-review/study-review.module';
import { StudyReviewService } from '../study-review/study-review.service';
import { HomeworkPracticeModule } from '../homework-practice/homework-practice.module';
import { HomeworkPracticeService } from '../homework-practice/homework-practice.service';
import { ActivityModule } from '../activity/activity.module';
import { WeeklyGoalService } from '../activity/weekly-goal.service';

/**
 * STATUS.md §8.1(б): модулийн экспорт дутуу бол tsc, jest өнгөрч апп асахдаа унадаг.
 * DI-ийн графыг (холболтгүй) бүтээж, давталтын сервис hook-уудад үнэхээр орж байгааг шалгана.
 */
describe('Хугацаатай давталтын модулийн холбоос', () => {
  it('collector, давтлага, гэрийн даалгавар ProblemReviewService-ийг авна', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, MistakesModule, StudyReviewModule, HomeworkPracticeModule, ActivityModule],
    }).compile();
    const reviews = moduleRef.get(ProblemReviewService);
    expect(reviews).toBeInstanceOf(ProblemReviewService);
    for (const token of [MistakeCollector, StudyReviewService, HomeworkPracticeService]) {
      const service = moduleRef.get(token, { strict: false }) as unknown as { reviews?: unknown };
      expect(service.reviews).toBe(reviews);
    }
    expect(moduleRef.get(WeeklyGoalService, { strict: false })).toBeInstanceOf(WeeklyGoalService);
  });
});
