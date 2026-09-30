import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MistakeCollector } from './mistake-collector.service';
import { MistakesController } from './mistakes.controller';
import { MistakesService } from './mistakes.service';
@Module({ imports: [PrismaModule], controllers: [MistakesController], providers: [MistakesService, MistakeCollector], exports: [MistakeCollector, MistakesService] })
export class MistakesModule {}
