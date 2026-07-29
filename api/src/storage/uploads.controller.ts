import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  unlinkSync,
} from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesAuthGuard } from './files-auth.guard';

// Локал диск хадгалалт — production дээр S3 руу шилжихэд энэ controller-ийн
// дотоод хэрэгжилт л солигдоно, key-н гэрээ хэвээрээ (SPEC §3)
//
// ⚠️ PRODUCTION: Render-ийн container файлын систем нь ТҮР ЗУУРЫН — redeploy
// эсвэл restart бүрт устдаг. Тиймээс UPLOAD_DIR-ыг орчны хувьсагчаар тогтвортой
// диск рүү (жишээ нь /var/data/uploads) чиглүүлнэ. render.yaml дотор disk mount
// хийгээд UPLOAD_DIR-ыг тэр замаар өгнө (free багц дээр disk дэмжигдэхгүй тул
// одоогоор тайлбарласан байгаа).
// Тохируулаагүй бол ./uploads руу буцаж унана.
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR?.trim() || join(process.cwd(), 'uploads');

// ⚠️ ЭНЭ ХЭСЭГ МОДУЛЬ ИМПОРТЛОГДОХ ҮЕД АЖИЛЛАНА.
// Өмнө нь энд хамгаалалтгүй `mkdirSync` байсан: UPLOAD_DIR нь бичих эрхгүй
// эсвэл mount хийгээгүй зам байвал (ж нь диск идэвхгүй үеийн /var/data/uploads)
// import дундаа шидэж, Nest БҮХЭЛДЭЭ БОСОХГҮЙ болно.
// Шалгалтын платформ дээр энэ нь ЗӨВХӨН файл байршуулах тохиргооны алдаанаас
// болж 1000 сурагчийн шалгалтыг бүтнээр нь унагана гэсэн үг — хэт өргөн хохирол.
//
// Одоогийн бодлого: API боссоор байна (шалгалт саадгүй үргэлжилнэ), гэхдээ
// байршуулах маршрут нь ЧИМЭЭГҮЙ буруу газар бичихийн оронд ил 503 буцаана.
const uploadDirError: string | null = (() => {
  try {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    // mkdir амжаад БИЧИЖ чадахгүй тохиолдол бий (read-only mount) тул тусад нь.
    accessSync(UPLOAD_DIR, constants.W_OK);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
})();

if (uploadDirError) {
  console.error(
    `[uploads] ⚠️  UPLOAD_DIR "${UPLOAD_DIR}" ашиглах боломжгүй: ${uploadDirError}\n` +
      '[uploads]     API ажиллана (шалгалт саадгүй), ГЭХДЭЭ файл байршуулалт 503 буцаана.\n' +
      '[uploads]     Засах: render.yaml дээр disk mount хийх, эсвэл UPLOAD_DIR-ыг арилгаж\n' +
      '[uploads]     ./uploads руу унагах. Дэлгэрэнгүйг DEPLOY.md-ээс үзнэ үү.',
  );
}

// Зөвшөөрөгдсөн файлын төрөл: зураг + PDF л. HTML/SVG/JS зэргийг хориглосноор
// serve хийх үед stored-XSS үүсэх замыг хаана.
//
// АНХААРУУЛГА: энэ шүүлтүүр зөвхөн CLIENT-ийн мэдэгдсэн originalname/mimetype
// дээр л ажиллана (Multer-ийн fileFilter нь файлын агуулга бүрэн ирэхээс ӨМНӨ
// дуудагддаг тул byte-контентод энд хараахан хандах боломжгүй). Өөрөөр хэлбэл
// хэн нэгэн "зураг.png" гэж нэрлээд дотроо HTML/SVG/скрипт агуулсан файл
// илгээвэл ЭНЭ шат дангаараа ялгаж чадахгүй — доорх `assertMagicBytesMatch`
// нь диск рүү бичигдсэний дараа ЖИНХЭНЭ агуулгыг (magic bytes) шалгаж, эх
// сурвалж мэдэгдсэн extension/mimetype-тэй зөрвөл файлыг устгаад татгалзана.
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|heic)$/i;
const ALLOWED_PDF = /\.pdf$/i;
function isAllowedUpload(file: {
  originalname: string;
  mimetype: string;
}): boolean {
  const name = file.originalname;
  if (ALLOWED_EXT.test(name)) return file.mimetype.startsWith('image/');
  if (ALLOWED_PDF.test(name)) return file.mimetype === 'application/pdf';
  return false;
}

// Зөвшөөрөгдсөн төрөл бүрийн "гарын үсэг" (эхний byte-ууд) — эдгээр нь
// хуурамчаар (spoof) үүсгэхэд хэцүү, файлын ФОРМАТААС шалтгаалсан тогтмол
// утгууд тул extension/mimetype-ээс илүү найдвартай эх сурвалж.
const HEIC_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
]);

/**
 * Файлын эхний byte-уудыг (magic bytes) шалгаж, зөвшөөрөгдсөн зураг эсвэл
 * PDF форматын аль нэгтэй тохирч байгаа эсэхийг тодорхойлно. Extension болон
 * client-ийн мэдэгдсэн mimetype-ийг ХАРГАЛЗАХГҮЙ — зөвхөн бодит агуулгаар.
 */
function matchesKnownFileSignature(buf: Buffer): boolean {
  if (buf.length < 12) return false;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true;
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  // GIF: "GIF87a" эсвэл "GIF89a"
  const gifHeader = buf.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return true;

  // WEBP: "RIFF"<4 byte size>"WEBP"
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }

  // PDF: "%PDF"
  if (buf.subarray(0, 4).toString('ascii') === '%PDF') return true;

  // HEIC/HEIF: ISO BMFF контейнер — offset 4-т "ftyp", дараа нь brand ирнэ
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (HEIC_BRANDS.has(brand)) return true;
  }

  return false;
}

/**
 * Диск рүү бичигдсэн upload-ийн ЖИНХЭНЭ агуулгыг magic bytes-аар шалгана.
 * Зөрвөл (жш: .png нэртэй ч дотроо HTML/скрипт байвал) файлыг шууд устгаж,
 * BadRequestException шиднэ — extension spoofing-ийн эсрэг сүүлчийн шат.
 */
function assertMagicBytesMatch(filePath: string): void {
  // Диск (25MB хүртэл байж болно) бүхэлд нь уншихгүй, эхний 16 byte-ыг л
  // файлын дескриптороор шууд уншина — хурдан бөгөөд санах ойд хямд.
  const head = Buffer.alloc(16);
  const fd = openSync(filePath, 'r');
  let bytesRead = 0;
  try {
    bytesRead = readSync(fd, head, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  if (!matchesKnownFileSignature(head.subarray(0, bytesRead))) {
    unlinkSync(filePath);
    throw new BadRequestException(
      'Файлын агуулга нь зөвшөөрөгдсөн төрөлтэй (зураг/PDF) тохирохгүй байна',
    );
  }
}

@Controller()
export class UploadsController {
  @UseGuards(JwtAuthGuard)
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          ),
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (isAllowedUpload(file)) cb(null, true);
        else
          cb(
            new BadRequestException(
              'Зөвхөн зураг (jpg, png, gif, webp, heic) эсвэл PDF оруулна',
            ),
            false,
          );
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    // Хадгалах сан ажиллахгүй бол ил хэлнэ — multer нь destination байхгүй үед
    // ойлгомжгүй 500 шиддэг тул шалтгааныг нь тодорхой болгож 503 буцаана.
    if (uploadDirError) {
      throw new ServiceUnavailableException(
        'Файл хадгалах сан тохируулагдаагүй байна. Админд хандана уу.',
      );
    }
    if (!file) throw new BadRequestException('Файл ирсэнгүй');
    // Extension/mimetype шүүлтүүр (fileFilter) хуурч болохуйц (client-ийн
    // мэдэгдсэн утга) тул диск дээр аль хэдийн бичигдсэн ЖИНХЭНЭ байтуудыг
    // magic bytes-аар давхар шалгана. Зөрвөл файлыг устгаад алдаа буцаана.
    assertMagicBytesMatch(join(UPLOAD_DIR, file.filename));
    return { key: file.filename, size: file.size, mime: file.mimetype };
  }

  // ⚠️ ӨМНӨ НЬ ЭНД ЯМАР Ч ХАМГААЛАЛТГҮЙ БАЙСАН — key-г мэдэх/таах хэн ч
  // сурагчийн бичиг баримт, профайл зураг, бодлогын зураг, PDF-ийг чөлөөтэй
  // татаж болдог байв. FilesAuthGuard-аар хамгаална (тайлбарыг тэндээс үз).
  @UseGuards(FilesAuthGuard)
  @Get('files/:key')
  serve(@Param('key') key: string, @Res() res: Response) {
    if (!/^[\w][\w.-]*$/.test(key)) {
      throw new BadRequestException('Буруу түлхүүр');
    }
    const path = join(UPLOAD_DIR, key);
    if (!existsSync(path)) throw new NotFoundException('Файл олдсонгүй');
    // Хөтөч агуулгыг таамаглаж (sniff) өөр төрлөөр ажиллуулахыг хориглоно
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path);
  }
}
