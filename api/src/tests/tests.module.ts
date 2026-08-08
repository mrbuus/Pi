import { Module } from '@nestjs/common';
import { StudentTestResultsController, TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [ParentsModule],
  controllers: [TestsController, StudentTestResultsController],
  providers: [TestsService],
})
export class TestsModule {}
