import {
  BadRequestException,
  Controller,
  Body,
  Req,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { MAX_DOCX_BYTES } from './docx-parser';
import { DocumentImportService } from './document-import.service';
import { ConfirmDocumentDto } from './confirm-document.dto';
import type { RequestWithUser } from '../auth/request.interface';
@Controller('document-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
export class DocumentImportController {
  constructor(private readonly imports: DocumentImportService) {}
  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCX_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  async preview(
    @Req() request: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('DOCX файл сонгоно уу.');
    try {
      return await this.imports.preview(
        file.buffer,
        file.originalname,
        request.user.userId,
        request.user.role,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Баримтыг уншиж чадсангүй.',
      );
    }
  }
  @Post('confirm')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  confirm(@Body() dto: ConfirmDocumentDto, @Req() request: RequestWithUser) {
    return this.imports.confirm(dto, request.user.userId, request.user.role);
  }
}
