import { Module } from '@nestjs/common';
import { DocumentImportService } from './document-import.service';
import { DocumentImportController } from './document-import.controller';
@Module({
  controllers: [DocumentImportController],
  providers: [DocumentImportService],
})
export class DocumentImportModule {}
