import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
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
  writeFileSync,
} from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { RequestWithUser } from '../auth/request.interface';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_TTL,
  maxBytesFor,
  downloadUrl,
  finishDirectUpload,
  parsePurpose,
  presignUpload,
  s3Enabled,
  saveStoredFile,
  signTicket,
  verifyTicket,
  expiresAtFor,
} from './file-store';
import { UPLOAD_DIR } from './upload-dir';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { FilesAuthGuard } from './files-auth.guard';

/** «Файл 12 МБ-аас их байна» — зориулалтын хязгаараар */
const tooLargeMessage = (maxBytes: number) =>
  `Файл ${Math.round(maxBytes / (1024 * 1024))} МБ-аас их байна`;

/**
 * Хэрэглэгч бүрт (getTracker = JWT sub) минутад 30 — нэг гэрийн даалгавар = 1 presign +
 * 1 complete, дахин илгээх, онолын зураг зэрэгт хангалттай; давталттай скриптээс хамгаална.
 */
const UPLOAD_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

// Локал диск хадгалалт — production дээр S3 руу шилжихэд энэ controller-ийн
// дотоод хэрэгжилт л солигдоно, key-н гэрээ хэвээрээ (SPEC §3)
//
// ⚠️ PRODUCTION: Render-ийн container файлын систем нь ТҮР ЗУУРЫН — redeploy
// эсвэл restart бүрт устдаг. Тиймээс UPLOAD_DIR-ыг орчны хувьсагчаар тогтвортой
// диск рүү (жишээ нь /var/data/uploads) чиглүүлнэ. render.yaml дотор disk mount
// хийгээд UPLOAD_DIR-ыг тэр замаар өгнө (free багц дээр disk дэмжигдэхгүй тул
// одоогоор тайлбарласан байгаа).
// Тохируулаагүй бол ./uploads руу буцаж унана. S3_BUCKET тохируулсан бол байт S3-д
// хадгалагдаж, диск зөвхөн multipart upload-ийн түр зам болно (file-store.ts).
export { UPLOAD_DIR };

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
      '[uploads]     ./uploads руу унагах. Дэлгэрэнгүйг STATUS.md §4-ээс үзнэ үү.',
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
  constructor(private prisma: PrismaService) {}

  // Хуучин multipart зам (S3-гүй үед эсвэл presign бүтэлгүйтвэл). Multer дискэнд урсгалаар
  // бичнэ (санах ойд биш), 25 МБ хатуу хязгаар; S3 руу мөн урсгалаар илгээнэ.
  // nginx `client_max_body_size` ≥ 26m байх ёстой (infra/aws/README.md).
  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_THROTTLE)
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
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
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
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: RequestWithUser,
  ) {
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
    const path = join(UPLOAD_DIR, file.filename);
    assertMagicBytesMatch(path);
    const purpose = parsePurpose(
      (req as { body?: { purpose?: unknown } }).body?.purpose,
    );
    if (file.size > maxBytesFor(purpose)) {
      try {
        unlinkSync(path);
      } catch {
        // аль хэдийн устсан
      }
      throw new BadRequestException(tooLargeMessage(maxBytesFor(purpose)));
    }
    // S3 идэвхтэй: дискнээс S3 руу урсгалаар (санах ойд бүтэн ачаалахгүй), дараа нь
    // дискний түр файлыг устгана (EC2-ийн диск дүүрэхгүй).
    if (s3Enabled()) {
      try {
        await saveStoredFile(this.prisma, {
          key: file.filename,
          mime: file.mimetype,
          path,
          size: file.size,
          ownerId: req.user.userId,
          purpose,
        });
      } catch {
        throw new ServiceUnavailableException(
          'Файл хадгалахад алдаа гарлаа. Дахин оролдоно уу.',
        );
      } finally {
        try {
          unlinkSync(path);
        } catch {
          // аль хэдийн устсан
        }
      }
      return { key: file.filename, size: file.size, mime: file.mimetype };
    }
    // G05: Render-ийн диск deploy бүрт устдаг тул ӨС-д давхар хадгална
    // (диск = кэш, ӨС = эх сурвалж). ӨС-д бичиж чадаагүй бол upload-ийг
    // амжилттай гэж хэлэхгүй — дараагийн deploy-оор чимээгүй алга болохоос сэргийлнэ.
    try {
      await saveStoredFile(this.prisma, {
        key: file.filename,
        mime: file.mimetype,
        path,
        size: file.size,
        ownerId: req.user.userId,
        purpose,
      });
    } catch {
      unlinkSync(path);
      throw new ServiceUnavailableException(
        'Файл хадгалахад алдаа гарлаа. Дахин оролдоно уу.',
      );
    }
    return { key: file.filename, size: file.size, mime: file.mimetype };
  }

  /**
   * Хөтчөөс S3 руу ШУУД илгээх (сервер файлын байтыг дамжуулахгүй).
   * S3 тохируулаагүй бол `{ direct: false }` — хөтөч хуучин POST /uploads руу шилжинэ.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_THROTTLE)
  @Post('uploads/presign')
  async presign(
    @Body() body: { name?: unknown; mime?: unknown; size?: unknown; purpose?: unknown },
    @Req() req: RequestWithUser,
  ) {
    if (!s3Enabled()) return { direct: false };
    const name = typeof body?.name === 'string' ? body.name.slice(0, 200) : '';
    const mime = typeof body?.mime === 'string' ? body.mime.toLowerCase() : '';
    const size = typeof body?.size === 'number' ? body.size : -1;
    if (!isAllowedUpload({ originalname: name, mimetype: mime }))
      throw new BadRequestException(
        'Зөвхөн зураг (jpg, png, gif, webp, heic) эсвэл PDF оруулна',
      );
    const purpose = parsePurpose(body?.purpose);
    if (size <= 0 || size > maxBytesFor(purpose))
      throw new BadRequestException(tooLargeMessage(maxBytesFor(purpose)));
    const key = `${randomUUID()}${extname(name).toLowerCase()}`;
    const ticket = signTicket({
      key,
      ownerId: req.user.userId,
      mime,
      purpose,
      exp: Date.now() + UPLOAD_URL_TTL * 1000,
    });
    try {
      const url = await presignUpload(key, mime);
      return { direct: true, key, url, ticket, headers: { 'Content-Type': mime } };
    } catch {
      throw new ServiceUnavailableException(
        'Файл хадгалах сан түр ажиллахгүй байна. Дахин оролдоно уу.',
      );
    }
  }

  /** Шууд илгээсэн файлыг шалгаж (хэмжээ, magic bytes, PDF хуудас) бүртгэнэ. */
  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_THROTTLE)
  @Post('uploads/complete')
  async complete(
    @Body() body: { ticket?: unknown; pages?: unknown },
    @Req() req: RequestWithUser,
  ) {
    if (!s3Enabled()) throw new BadRequestException('Шууд илгээлт идэвхгүй');
    const t = typeof body?.ticket === 'string' ? verifyTicket(body.ticket) : null;
    if (!t || t.ownerId !== req.user.userId)
      throw new BadRequestException('Илгээлтийн хугацаа дууссан. Дахин илгээнэ үү.');
    let size: number, pages: number | null;
    try {
      ({ size, pages } = await finishDirectUpload(t.key, t.mime, matchesKnownFileSignature, {
        maxBytes: maxBytesFor(t.purpose),
        clientPages: body?.pages,
      }));
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'bad-signature')
        throw new BadRequestException(
          'Файлын агуулга нь зөвшөөрөгдсөн төрөлтэй (зураг/PDF) тохирохгүй байна',
        );
      if (code === 'too-large')
        throw new BadRequestException(tooLargeMessage(maxBytesFor(t.purpose)));
      if (code === 'not-found') throw new BadRequestException('Файл ирсэнгүй. Дахин илгээнэ үү.');
      throw new ServiceUnavailableException('Файл хадгалахад алдаа гарлаа. Дахин оролдоно уу.');
    }
    // Давхар complete (сүлжээ давтсан) — мөр аль хэдийн байвал тэрийгээ буцаана
    await this.prisma.storedFile.upsert({
      where: { key: t.key },
      create: {
        key: t.key,
        mime: t.mime,
        size,
        bytes: null,
        storage: 's3',
        ownerId: t.ownerId,
        pages,
        expiresAt: expiresAtFor(t.purpose),
      },
      update: {},
    });
    return { key: t.key, size, mime: t.mime };
  }

  // ⚠️ ӨМНӨ НЬ ЭНД ЯМАР Ч ХАМГААЛАЛТГҮЙ БАЙСАН — key-г мэдэх/таах хэн ч
  // сурагчийн бичиг баримт, профайл зураг, бодлогын зураг, PDF-ийг чөлөөтэй
  // татаж болдог байв. FilesAuthGuard-аар хамгаална (тайлбарыг тэндээс үз).
  @UseGuards(FilesAuthGuard)
  @Get('files/:key')
  async serve(@Param('key') key: string, @Res() res: Response) {
    if (!/^[\w][\w.-]*$/.test(key)) {
      throw new BadRequestException('Буруу түлхүүр');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // S3-д байгаа файл: эрхийг (FilesAuthGuard) шалгасны дараа 5 минутын холбоос руу
    // чиглүүлнэ — байтыг хөтөч S3-аас шууд татна, сервер дамжуулахгүй.
    if (s3Enabled()) {
      const meta = await this.prisma.storedFile.findUnique({
        where: { key },
        select: { storage: true, mime: true },
      });
      if (meta?.storage === 's3') {
        res.redirect(302, await downloadUrl(key, meta.mime));
        return;
      }
    }
    const path = join(UPLOAD_DIR, key);
    if (!existsSync(path)) {
      // Диск дээр алга (redeploy) → ӨС-ээс сэргээж дискэнд кэшлэнэ.
      const stored = await this.prisma.storedFile.findUnique({
        where: { key },
      });
      if (!stored?.bytes) throw new NotFoundException('Файл олдсонгүй');
      try {
        if (!uploadDirError) writeFileSync(path, stored.bytes);
      } catch {
        // Кэшлэж чадаагүй ч ӨС-ээс шууд илгээнэ.
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', stored.mime);
      res.end(Buffer.from(stored.bytes));
      return;
    }
    // Хөтөч агуулгыг таамаглаж (sniff) өөр төрлөөр ажиллуулахыг хориглоно
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      await new Promise<void>((resolve, reject) => {
        res.sendFile(
          path,
          { maxAge: 0, cacheControl: false, dotfiles: 'allow' },
          (error) => {
            if (error) reject(error);
            else resolve();
          },
        );
      });
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : undefined);
        return;
      }
      const failure = error as { code?: string; status?: number };
      if (failure.code === 'ENOENT' || failure.status === 404) {
        const stored = await this.prisma.storedFile.findUnique({
          where: { key },
        });
        if (!stored?.bytes) throw new NotFoundException('Файл олдсонгүй');
        res.setHeader('Content-Type', stored.mime);
        res.end(Buffer.from(stored.bytes));
        return;
      }
      throw new ServiceUnavailableException(
        'Файлыг уншиж чадсангүй. Дахин оролдоно уу.',
      );
    }
  }
}
