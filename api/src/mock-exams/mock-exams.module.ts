import { Module } from '@nestjs/common';
import { MockExamsController, MockExamsPublicController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  controllers: [MockExamsPublicController, MockExamsController],
  providers: [MockExamsService],
})
export class MockExamsModule {}
