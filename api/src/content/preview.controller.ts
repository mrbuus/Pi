import { Controller, Get, Header, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PreviewService } from './preview.service';
// Deliberately public. The global ThrottlerGuard enforces this per-IP limit.
@Controller('catalog/preview')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class PreviewController {
  constructor(private readonly preview: PreviewService) {}
  @Get('books')
  @Header('Cache-Control', 'no-store')
  books() {
    return this.preview.books();
  }
  @Get('chapters/:id')
  @Header('Cache-Control', 'no-store')
  chapter(@Param('id') id: string) {
    return this.preview.chapter(id);
  }
}
