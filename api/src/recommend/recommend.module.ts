import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [MistakesModule],
  providers: [RecommendService, PrismaService],
  controllers: [RecommendController],
  exports: [RecommendService],
})
export class RecommendModule {}
