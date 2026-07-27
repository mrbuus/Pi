import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { TopicsController } from './topics.controller';

@Module({
  controllers: [ContentController, CatalogController, TopicsController],
  providers: [ContentService],
})
export class ContentModule {}
