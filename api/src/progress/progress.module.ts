import { Module } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { AttemptsService } from '../attempts/attempts.service';
import { MistakesModule } from '../mistakes/mistakes.module';
import { AuditService } from '../audit/audit.service';
import { TestsService } from '../tests/tests.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

// Progress reuses the attempt/test services. Their collector dependency is
// supplied by MistakesModule, just as in AttemptsModule and TestsModule.
@Module({
  imports: [MistakesModule],
  controllers: [ProgressController],
  providers: [
    ProgressService,
    AttemptsService,
    ActivityService,
    TestsService,
    AuditService,
  ],
})
export class ProgressModule {}
