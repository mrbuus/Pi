import { Module } from '@nestjs/common';
import { PaperExamsController } from './paper-exams.controller';
import { PaperExamsService } from './paper-exams.service';

@Module({
  controllers: [PaperExamsController],
  providers: [PaperExamsService],
})
export class PaperExamsModule {}
