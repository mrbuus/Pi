import { Module } from '@nestjs/common';
import { ColorTagsController } from './colortags.controller';
import { ColorTagsService } from './colortags.service';

@Module({
  controllers: [ColorTagsController],
  providers: [ColorTagsService],
})
export class ColorTagsModule {}
