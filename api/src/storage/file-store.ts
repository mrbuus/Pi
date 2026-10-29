import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHmac, timingSafeEqual } from 'crypto';
import { closeSync, createReadStream, existsSync, openSync, readFileSync, readSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { PDF_PROBE_BYTES, pdfPageCount, pdfPageCountFromRanges } from '../lesson-day/pdf-pages';
import { UPLOAD_DIR } from './upload-dir';

/**
 * Файлын байтыг хаана хадгалах вэ (эзэн 2026-10-22).
 *
 * `S3_BUCKET` тохируулсан бол S3 (эсвэл S3-тай нийцтэй R2 — `S3_ENDPOINT`), үгүй бол
 * хуучнаараа өгөгдлийн санд (`StoredFile.bytes`). Түлхүүрийн гэрээ (`uuid.ext`) хэвээр —
 * зөвхөн байт хаана байгаа нь `StoredFile.storage`-д бичигдэнэ.
 *
 * S3 доторх байрлал:
 *   incoming/<key> — хөтөч presigned URL-аар шууд илгээсэн, сервер шалгаагүй файл.
 *                    Bucket-ийн lifecycle дүрэм 1 хоногийн дараа устгана (хаягдсан upload).
 *   f/<key>        — шалгагдсан, `StoredFile` мөртэй файл.
 *
 * EC2 дээр түлхүүр кодонд байхгүй — instance-ийн IAM Role-оос SDK өөрөө авна.
 */
const BUCKET = process.env.S3_BUCKET?.trim() || '';
const REGION =
  process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || 'ap-east-1';
const ENDPOINT = process.env.S3_ENDPOINT?.trim() || undefined;

/** Хөтөч рүү өгөх татах/илгээх холбоосын хугацаа (секунд) */
export const DOWNLOAD_URL_TTL = 300;
export const UPLOAD_URL_TTL = 600;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const s3Enabled = (): boolean => BUCKET.length > 0;

/**
 * Зориулалт бүрийн дээд хэмжээ. Гэрийн даалгавар = утсан дээр угсарсан ≤6 хуудас PDF
 * (`photosToPdf` 12 МБ-аас том бол өөрөө татгалздаг) — серверт ч мөн адил хатуу хязгаар.
 */
export const HOMEWORK_MAX_BYTES = 12 * 1024 * 1024;
export function maxBytesFor(purpose: FilePurpose): number {
  return purpose === 'homework' ? HOMEWORK_MAX_BYTES : MAX_UPLOAD_BYTES;
}
/** Хөтчийн мэдэгдсэн хуудасны тоог хүлээж авах дээд хэмжээ (задалж чадаагүй үед) */
export const CLIENT_PAGES_MAX = 50;
/** Хэсэгчилсэн уншилтаар олдоогүй PDF-ийг бүтэн уншиж болох дээд хэмжээ */
export const PDF_FULL_READ_MAX = 2 * 1024 * 1024;

let client: S3Client | null = null;
function s3(): S3Client {
  client ??= new S3Client({
    region: REGION,
    ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
  });
  return client;
}

const finalKey = (key: string) => `f/${key}`;
const incomingKey = (key: string) => `incoming/${key}`;

async function bodyBytes(body: unknown): Promise<Buffer> {
  const b = body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!b?.transformToByteArray) throw new Error('S3 хариу хоосон');
  return Buffer.from(await b.transformToByteArray());
}

/* ─────────── Хадгалах хугацаа ─────────── */

/** Файлын зориулалт — хадгалах хугацааг тодорхойлно */
export type FilePurpose = 'homework' | 'theory' | 'general';
export const FILE_PURPOSES: readonly FilePurpose[] = ['homework', 'theory', 'general'];
export const HOMEWORK_KEEP_DAYS = 7;

export function parsePurpose(value: unknown): FilePurpose {
  return FILE_PURPOSES.includes(value as FilePurpose) ? (value as FilePurpose) : 'general';
}

/** Гэрийн даалгавар 7 хоног; онолын зураг болон бусад нь байнга (null). */
export function expiresAtFor(purpose: FilePurpose, now = new Date()): Date | null {
  if (purpose === 'homework') return new Date(now.getTime() + HOMEWORK_KEEP_DAYS * 86400000);
  return null;
}

/* ─────────── Бичих / унших / устгах ─────────── */

export type SaveInput = {
  key: string;
  mime: string;
  ownerId: string | null;
  purpose?: FilePurpose;
} & (
  | { bytes: Buffer; path?: never; size?: never }
  /** Дискэн дээрх файл (multer) — S3 руу урсгалаар илгээнэ, санах ойд бүтэн ачаалахгүй */
  | { path: string; size: number; bytes?: never }
);

/** Дискэн дээрх файлын [offset, offset+len) хэсгийг уншина */
function readRange(path: string, offset: number, len: number): Buffer {
  const out = Buffer.alloc(len);
  const fd = openSync(path, 'r');
  try {
    return out.subarray(0, readSync(fd, out, 0, len, offset));
  } finally {
    closeSync(fd);
  }
}

/** Дискэн дээрх PDF-ийн хуудас: эхний/сүүлийн 64 КБ, олдохгүй бөгөөд жижиг бол бүтэн */
export function pdfPageCountOnDisk(path: string, size: number): number | null {
  if (size <= 2 * PDF_PROBE_BYTES) return pdfPageCount(readFileSync(path));
  const head = readRange(path, 0, PDF_PROBE_BYTES);
  const tail = readRange(path, size - PDF_PROBE_BYTES, PDF_PROBE_BYTES);
  const pages = pdfPageCountFromRanges(head, tail);
  if (pages !== null) return pages;
  // Ховор бүтэцтэй PDF: бүтнээр нь уншина (хэмжээ нь maxBytesFor-оор хязгаарлагдсан).
  // Клиентийн хэлсэн тоонд хэзээ ч итгэхгүй — хуудасны хязгаарыг тойрох боломжтой болно.
  return pdfPageCount(readFileSync(path));
}

/**
 * Серверт ирсэн байтыг хадгална (multipart upload, түвшин тогтоох шалгалтын зураг).
 * S3 идэвхтэй бол S3 → `StoredFile` мөр (bytes = null); үгүй бол өгөгдлийн санд.
 * Мөр үүсгэж чадаагүй бол S3-ийн объектыг буцааж устгана (өнчин файл үлдээхгүй).
 */
export async function saveStoredFile(prisma: PrismaService, input: SaveInput) {
  const isPdf = input.mime === 'application/pdf';
  const size = input.bytes ? input.bytes.length : input.size;
  const pages = !isPdf
    ? null
    : input.bytes
      ? pdfPageCount(input.bytes)
      : pdfPageCountOnDisk(input.path, input.size);
  const expiresAt = expiresAtFor(input.purpose ?? 'general');
  if (!s3Enabled()) {
    // S3-гүй (локал/хуучин) горим — байт өгөгдлийн санд орох тул санах ойд уншина
    const bytes = input.bytes ?? readFileSync(input.path);
    return prisma.storedFile.create({
      data: {
        key: input.key,
        mime: input.mime,
        size,
        bytes: new Uint8Array(bytes),
        ownerId: input.ownerId,
        storage: 'db',
        pages,
        expiresAt,
      },
    });
  }
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: finalKey(input.key),
      Body: input.bytes ?? createReadStream(input.path),
      ContentLength: size,
      ContentType: input.mime,
    }),
  );
  try {
    return await prisma.storedFile.create({
      data: {
        key: input.key,
        mime: input.mime,
        size,
        bytes: null,
        ownerId: input.ownerId,
        storage: 's3',
        pages,
        expiresAt,
      },
    });
  } catch (error) {
    await s3()
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: finalKey(input.key) }))
      .catch(() => undefined);
    throw error;
  }
}

/**
 * Файлын байтыг серверт уншина (зөвхөн сервер өөрөө боловсруулах шаардлагатай үед —
 * хэрэглэгч рүү илгээхдээ `downloadUrl` ашигла). Олдохгүй бол null.
 */
export async function readStoredBytes(
  prisma: PrismaService,
  key: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  const row = await prisma.storedFile.findUnique({
    where: { key },
    select: { mime: true, storage: true, bytes: true },
  });
  const disk = join(UPLOAD_DIR, key);
  if (existsSync(disk))
    return { bytes: readFileSync(disk), mime: row?.mime ?? 'application/octet-stream' };
  if (!row) return null;
  if (row.storage === 's3') {
    if (!s3Enabled()) return null;
    const out = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: finalKey(key) }));
    return { bytes: await bodyBytes(out.Body), mime: row.mime };
  }
  return row.bytes ? { bytes: Buffer.from(row.bytes), mime: row.mime } : null;
}

/** S3-ийн файлыг хөтөч шууд татах богино хугацааны холбоос (сервер байт дамжуулахгүй). */
export async function downloadUrl(key: string, mime: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: finalKey(key),
      ResponseContentType: mime,
      ResponseContentDisposition: 'inline',
      ResponseCacheControl: 'private, max-age=300',
    }),
    { expiresIn: DOWNLOAD_URL_TTL },
  );
}

/** Файлыг бүрмөсөн устгана: S3 объект, дискний кэш, `StoredFile` мөр. */
export async function deleteStoredFile(prisma: PrismaService, key: string): Promise<void> {
  const row = await prisma.storedFile.findUnique({ where: { key }, select: { storage: true } });
  if (row?.storage === 's3' && s3Enabled())
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: finalKey(key) }));
  try {
    unlinkSync(join(UPLOAD_DIR, key));
  } catch {
    // кэш байхгүй — хэвийн
  }
  await prisma.storedFile.deleteMany({ where: { key } });
}

/* ─────────── Хөтчөөс S3 руу шууд илгээх (presigned) ─────────── */

/**
 * Илгээх «тасалбар»: түлхүүрийг тухайн хэрэглэгч, төрөл, зориулалттай холбож гарын үсэг
 * зурна. `complete` дээр шалгаснаар бусдын түлхүүрийг өөрийнхөө нэр дээр бүртгэх,
 * mime/зориулалтыг солих боломжгүй болно. Төлөв хадгалахгүй (өгөгдлийн санд мөр үүсгэхгүй).
 */
function ticketSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET тохируулаагүй');
  return `upload-ticket:${secret}`;
}

export interface UploadTicket {
  key: string;
  ownerId: string;
  mime: string;
  purpose: FilePurpose;
  exp: number;
}

export function signTicket(t: UploadTicket): string {
  const payload = Buffer.from(JSON.stringify(t)).toString('base64url');
  const mac = createHmac('sha256', ticketSecret()).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

export function verifyTicket(ticket: string, now = Date.now()): UploadTicket | null {
  const [payload, mac] = ticket.split('.');
  if (!payload || !mac) return null;
  const expected = createHmac('sha256', ticketSecret()).update(payload).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const t = JSON.parse(Buffer.from(payload, 'base64url').toString()) as UploadTicket;
    return t.exp > now ? t : null;
  } catch {
    return null;
  }
}

/** Хөтөч `incoming/<key>` руу PUT хийх холбоос. Content-Type гарын үсэгт орно. */
export async function presignUpload(key: string, mime: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: BUCKET, Key: incomingKey(key), ContentType: mime }),
    { expiresIn: UPLOAD_URL_TTL, signableHeaders: new Set(['content-type']) },
  );
}

export interface FinishOptions {
  /** Зориулалтын дээд хэмжээ (`maxBytesFor`) */
  maxBytes?: number;
  /** Хөтчийн мэдэгдсэн хуудасны тоо — серверт задалж чадаагүй үед л, [1, CLIENT_PAGES_MAX] */
  clientPages?: unknown;
}

/** «bytes 0-15/12345» → 12345 */
function totalFromRange(contentRange: string | undefined): number | null {
  const m = /\/(\d+)\s*$/.exec(contentRange ?? '');
  return m ? Number(m[1]) : null;
}

function errorName(error: unknown): string {
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  if (e?.$metadata?.httpStatusCode === 416) return 'InvalidRange';
  return e?.name ?? e?.Code ?? '';
}

export function clampClientPages(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1) return null;
  return Math.min(n, CLIENT_PAGES_MAX);
}

/**
 * Хөтчийн илгээсэн файлыг шалгаад баталгаажуулна. Файлыг санах ойд БҮТЭН уншихгүй
 * (2 GB EC2 дээр 22:00–23:00-ийн гэрийн даалгаврын оргилд зэрэг олон 12 МБ PDF):
 *   1) эхний хэсгийг ranged GET-ээр (зураг — 16 байт, PDF — 64 КБ) — Content-Range-аас
 *      нийт хэмжээ, эхний 16 байтаас magic bytes. Тусдаа HEAD хийхгүй
 *   2) хэмжээ > зориулалтын хязгаар (гэрийн даалгавар 12 МБ, бусад 25 МБ) бол устгана
 *   3) PDF бол хуудас: эхний + сүүлийн 64 КБ (`bytes=-65536`) → олдохгүй бөгөөд ≤2 МБ бол
 *      бүтэн → тэгсэн ч үгүй бол хөтчийн мэдэгдсэн тоо (хязгаартай) → null
 *   4) incoming/ → f/ руу хуулна
 * Амжилтгүй бол объектыг устгаад алдаа шиднэ.
 */
export async function finishDirectUpload(
  key: string,
  mime: string,
  check: (head: Buffer) => boolean,
  opts: FinishOptions = {},
): Promise<{ size: number; pages: number | null }> {
  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES;
  const src = incomingKey(key);
  const drop = () =>
    s3()
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: src }))
      .catch(() => undefined);
  const isPdf = mime === 'application/pdf';
  const probe = isPdf ? PDF_PROBE_BYTES : 16;
  let head: Buffer;
  let size: number;
  try {
    const got = await s3().send(
      new GetObjectCommand({ Bucket: BUCKET, Key: src, Range: `bytes=0-${probe - 1}` }),
    );
    head = await bodyBytes(got.Body);
    size = totalFromRange(got.ContentRange) ?? (head.length < probe ? head.length : -1);
    if (size < 0) {
      // Content-Range буцаагаагүй S3-тай нийцтэй үйлчилгээ — хэмжээг HEAD-ээр
      const meta = await s3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: src }));
      size = meta.ContentLength ?? 0;
    }
  } catch (error) {
    // 0 байт объект → 416 InvalidRange
    if (errorName(error) === 'InvalidRange') {
      await drop();
      throw new Error('too-large');
    }
    throw new Error('not-found');
  }
  if (size <= 0 || size > maxBytes) {
    await drop();
    throw new Error('too-large');
  }
  if (!check(head.subarray(0, 16))) {
    await drop();
    throw new Error('bad-signature');
  }
  let pages: number | null = null;
  if (isPdf) {
    if (size <= head.length) {
      pages = pdfPageCount(head);
    } else {
      const tailGot = await s3().send(
        new GetObjectCommand({ Bucket: BUCKET, Key: src, Range: `bytes=-${PDF_PROBE_BYTES}` }),
      );
      pages = pdfPageCountFromRanges(head, await bodyBytes(tailGot.Body));
      if (pages === null) {
        // Ховор бүтэцтэй PDF: бүтнээр нь уншина (size нь дээр maxBytes-оор хязгаарлагдсан).
        // Клиентийн илгээсэн хуудасны тоонд ИТГЭХГҮЙ — хязгаар шалгахад ашиглагддаг.
        // Range-ээр яг шалгасан хэмжээг (≤ maxBytes) л татна — шалгалтын дараа объект
        // солигдсон ч (TOCTOU) хязгаараас их уншихгүй.
        const full = await s3().send(
          new GetObjectCommand({ Bucket: BUCKET, Key: src, Range: `bytes=0-${size - 1}` }),
        );
        const bytes = await bodyBytes(full.Body);
        if (bytes.length > size) {
          await drop();
          throw new Error('too-large');
        }
        pages = pdfPageCount(bytes);
      }
    }
  }
  await s3().send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${src}`,
      Key: finalKey(key),
      ContentType: mime,
      MetadataDirective: 'REPLACE',
    }),
  );
  await drop();
  return { size, pages };
}
