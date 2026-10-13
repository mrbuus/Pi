import { Module } from '@nestjs/common';
import { RevisionsController } from './revisions.controller';
import { RevisionsService } from './revisions.service';

// Өөрчлөлтийн түүх: GET/POST /revisions/… Засварын замууд нь revision-store.ts-ийн
// цэвэр функцийг (DI-гүй) өөрсдийн transaction дотор шууд дууддаг.
@Module({
  controllers: [RevisionsController],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
