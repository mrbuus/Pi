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
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { pdfPageCount } from '../lesson-day/pdf-pages';
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

export interface SaveInput {
  key: string;
  mime: string;
  bytes: Buffer;
  ownerId: string | null;
  purpose?: FilePurpose;
}

/**
 * Серверт ирсэн байтыг хадгална (multipart upload, түвшин тогтоох шалгалтын зураг).
 * S3 идэвхтэй бол S3 → `StoredFile` мөр (bytes = null); үгүй бол өгөгдлийн санд.
 * Мөр үүсгэж чадаагүй бол S3-ийн объектыг буцааж устгана (өнчин файл үлдээхгүй).
 */
export async function saveStoredFile(prisma: PrismaService, input: SaveInput) {
  const pages = input.mime === 'application/pdf' ? pdfPageCount(input.bytes) : null;
  const expiresAt = expiresAtFor(input.purpose ?? 'general');
  if (!s3Enabled()) {
    return prisma.storedFile.create({
      data: {
        key: input.key,
        mime: input.mime,
        size: input.bytes.length,
        bytes: new Uint8Array(input.bytes),
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
      Body: input.bytes,
      ContentType: input.mime,
    }),
  );
  try {
    return await prisma.storedFile.create({
      data: {
        key: input.key,
        mime: input.mime,
        size: input.bytes.length,
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

/**
 * Хөтчийн илгээсэн файлыг шалгаад баталгаажуулна:
 *   1) хэмжээ (HEAD) — 25 MB-аас их бол устгана
 *   2) эхний 16 байт — `check` (magic bytes) татгалзвал устгана
 *   3) PDF бол хуудсыг тоолно (нэг бүсэд S3→EC2 траффик үнэгүй)
 *   4) incoming/ → f/ руу хуулна
 * Амжилтгүй бол объектыг устгаад алдаа шиднэ.
 */
export async function finishDirectUpload(
  key: string,
  mime: string,
  check: (head: Buffer) => boolean,
): Promise<{ size: number; pages: number | null }> {
  const src = incomingKey(key);
  const drop = () =>
    s3()
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: src }))
      .catch(() => undefined);
  let size: number;
  try {
    size = (await s3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: src }))).ContentLength ?? 0;
  } catch {
    throw new Error('not-found');
  }
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    await drop();
    throw new Error('too-large');
  }
  const isPdf = mime === 'application/pdf';
  const got = await s3().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: src, ...(isPdf ? {} : { Range: 'bytes=0-15' }) }),
  );
  const bytes = await bodyBytes(got.Body);
  if (!check(bytes.subarray(0, 16))) {
    await drop();
    throw new Error('bad-signature');
  }
  const pages = isPdf ? pdfPageCount(bytes) : null;
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
