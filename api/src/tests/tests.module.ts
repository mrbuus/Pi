import { Module } from '@nestjs/common';
import { StudentTestResultsController, TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { ParentsModule } from '../parents/parents.module';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [ParentsModule, MistakesModule],
  controllers: [TestsController, StudentTestResultsController],
  providers: [TestsService],
})
export class TestsModule {}
