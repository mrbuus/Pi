import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { parseSubjectQuery } from '../common/subject';
import { ContentService } from './content.service';

// Нийтийн каталог — нэвтрэлт шаардахгүй (SPEC §5: freemium preview)
//
// Энэ endpoint-ууд нь хэрэглэгчээс ХАМААРАХГҮЙ, ховор өөрчлөгддөг нийтийн
// мэдээлэл (анги/бүлэг жагсаалт) тул Cache-Control тавьж Cloudflare-д edge
// hit болгоно — Render/Postgres хүртэл огт хүрэхгүй болно. ETag-ийг Express
// автоматаар (weak, анхдагчаар идэвхтэй) нэмдэг тул нэмэлт код шаардлагагүй.
@Controller('catalog')
export class CatalogController {
  constructor(private content: ContentService) {}

  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  @Get('grades/:grade/chapters')
  chaptersByGrade(
    @Param('grade', ParseIntPipe) grade: number,
    @Query('subject') subject?: string,
  ) {
    return this.content.publicChaptersByGrade(grade, parseSubjectQuery(subject));
  }

  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  @Get('chapters/:id/preview')
  chapterPreview(@Param('id') id: string) {
    return this.content.publicChapterPreview(id);
  }
}
