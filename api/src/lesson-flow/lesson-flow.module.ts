import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonFlowController } from './lesson-flow.controller';
import { LessonFlowService } from './lesson-flow.service';
@Module({
  imports: [PrismaModule],
  controllers: [LessonFlowController],
  providers: [LessonFlowService],
})
export class LessonFlowModule {}
