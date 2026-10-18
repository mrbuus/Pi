import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonDayController } from './lesson-day.controller';
import { LessonDayService } from './lesson-day.service';

/**
 * Хичээлийн өдрийн сурагч-талын үйлдлүүд (эзэн 2026-10-18):
 * - Онолын зураг (LessonPhoto): томилогдсон сурагч илгээнэ, анги нь харна
 * - Нөхөх хичээл (LessonMakeup): тасалсан/чөлөөтэй/хоцорсон сурагчийн үүрэг, явц
 * Үүрэг тооцоолол: ирц + ClassTestSession; төлөвлөгөө: LessonTopic.photoStudentId.
 */
@Module({
  imports: [PrismaModule],
  controllers: [LessonDayController],
  providers: [LessonDayService],
  exports: [LessonDayService],
})
export class LessonDayModule {}
