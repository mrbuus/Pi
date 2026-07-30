import { Module } from '@nestjs/common';
import { StudentTestResultsController, TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  controllers: [TestsController, StudentTestResultsController],
  providers: [TestsService],
})
export class TestsModule {}
