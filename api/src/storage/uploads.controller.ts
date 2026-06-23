import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Локал диск хадгалалт — production дээр S3 руу шилжихэд энэ controller-ийн
// дотоод хэрэгжилт л солигдоно, key-н гэрээ хэвээрээ (SPEC §3)
export const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

@Controller()
export class UploadsController {
  @UseGuards(JwtAuthGuard)
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл ирсэнгүй');
    return { key: file.filename, size: file.size, mime: file.mimetype };
  }

  @Get('files/:key')
  serve(@Param('key') key: string, @Res() res: Response) {
    if (!/^[\w][\w.-]*$/.test(key)) {
      throw new BadRequestException('Буруу түлхүүр');
    }
    const path = join(UPLOAD_DIR, key);
    if (!existsSync(path)) throw new NotFoundException('Файл олдсонгүй');
    res.sendFile(path);
  }
}
