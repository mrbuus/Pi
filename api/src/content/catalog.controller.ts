import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ContentService } from './content.service';

// Нийтийн каталог — нэвтрэлт шаардахгүй (SPEC §5: freemium preview)
@Controller('catalog')
export class CatalogController {
  constructor(private content: ContentService) {}

  @Get('grades/:grade/chapters')
  chaptersByGrade(@Param('grade', ParseIntPipe) grade: number) {
    return this.content.publicChaptersByGrade(grade);
  }

  @Get('chapters/:id/preview')
  chapterPreview(@Param('id') id: string) {
    return this.content.publicChapterPreview(id);
  }
}
