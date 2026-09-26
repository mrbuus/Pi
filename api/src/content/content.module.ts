import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { TopicsController } from './topics.controller';

@Module({
  controllers: [PreviewController, ContentController, CatalogController, TopicsController],
  providers: [PreviewService, ContentService],
})
export class ContentModule {}
