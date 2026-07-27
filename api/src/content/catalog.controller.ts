import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { parseSubjectQuery } from '../common/subject';
import { ContentService } from './content.service';

// Нийтийн каталог — нэвтрэлт шаардахгүй (SPEC §5: freemium preview)
@Controller('catalog')
export class CatalogController {
  constructor(private content: ContentService) {}

  @Get('grades/:grade/chapters')
  chaptersByGrade(
    @Param('grade', ParseIntPipe) grade: number,
    @Query('subject') subject?: string,
  ) {
    return this.content.publicChaptersByGrade(grade, parseSubjectQuery(subject));
  }

  @Get('chapters/:id/preview')
  chapterPreview(@Param('id') id: string) {
    return this.content.publicChapterPreview(id);
  }
}
