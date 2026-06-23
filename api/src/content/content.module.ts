import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController, CatalogController],
  providers: [ContentService],
})
export class ContentModule {}
