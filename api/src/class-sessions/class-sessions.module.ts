import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassSessionsController } from './class-sessions.controller';
import { ClassSessionsService } from './class-sessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClassSessionsController],
  providers: [ClassSessionsService],
  // Нөхөлт (makeup-visits) замын зургийг уншина
  exports: [ClassSessionsService],
})
export class ClassSessionsModule {}
