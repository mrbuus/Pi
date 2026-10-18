import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { parseSubjectQuery } from '../common/subject';
import { BooksCatalogService } from './books-catalog.service';
import { ContentService } from './content.service';
import { TryService } from './try.service';

// Нийтийн каталог — нэвтрэлт шаардахгүй (SPEC §5: freemium preview)
//
// Энэ endpoint-ууд нь хэрэглэгчээс ХАМААРАХГҮЙ, ховор өөрчлөгддөг нийтийн
// мэдээлэл (анги/бүлэг жагсаалт) тул Cache-Control тавьж Cloudflare-д edge
// hit болгоно — Render/Postgres хүртэл огт хүрэхгүй болно. ETag-ийг Express
// автоматаар (weak, анхдагчаар идэвхтэй) нэмдэг тул нэмэлт код шаардлагагүй.
@Controller('catalog')
export class CatalogController {
  constructor(
    private content: ContentService,
    private books: BooksCatalogService,
    private tryService: TryService,
  ) {}

  // ---- Номын хуудас (/books): ном → сэдэв → бүлэг → тест, үнэгүй тэмдэгтэй ----
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  @Get('books')
  listBooks() {
    return this.books.listBooks();
  }

  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  @Get('books/:code')
  bookDetail(@Param('code') code: string) {
    return this.books.bookDetail(code);
  }

  // ---- Үнэгүй тестийг нэвтрэлтгүй бодох: бодлого (хариугүй) → дүн (зөв/буруу) ----
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @Get('try/tests/:id')
  tryView(@Param('id') id: string) {
    return this.tryService.view(id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('try/tests/:id/grade')
  tryGrade(@Param('id') id: string, @Body() body: { answers?: unknown }) {
    return this.tryService.grade(id, body?.answers);
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('try/tests/:id/files/:key')
  async tryFile(@Param('id') id: string, @Param('key') key: string, @Res() res: Response) {
    const f = await this.tryService.file(id, key);
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.send(f.bytes);
  }

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
