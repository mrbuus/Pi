/**
 * Хуучин файлуудыг өгөгдлийн сангаас (StoredFile.bytes) S3 руу зөөнө (эзэн 2026-10-23).
 *
 * Мөр бүрд:  S3-д бичих (f/<key>) → HEAD-ээр хэмжээг тулгах → ТЭГЭЭД л мөрийг
 *            storage='s3', bytes=NULL болгоно. Алдаа гарвал мөр хөндөгдөхгүй (байт хэвээр).
 * Дахин ажиллуулахад аюулгүй: зөвхөн storage='db' мөрүүдийг авна, тасарвал үргэлжлүүлнэ.
 *
 * Ажиллуулах (серверт, ~/pimath/api):
 *   node scripts/migrate-files-to-s3.cjs --dry-run      # юу зөөгдөхийг л тоолно
 *   node scripts/migrate-files-to-s3.cjs --limit 20     # эхний 20-ийг туршина
 *   node scripts/migrate-files-to-s3.cjs                # бүгдийг
 */
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');

let pdfPageCount = () => null;
try {
  ({ pdfPageCount } = require('../dist/src/lesson-day/pdf-pages'));
} catch {
  console.warn('dist/ олдсонгүй — PDF-ийн хуудсыг тоолохгүй (npm run build хийнэ үү)');
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const limitAt = args.indexOf('--limit');
const LIMIT = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;
const BATCH = 50;

const BUCKET = process.env.S3_BUCKET?.trim();
const REGION = process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || 'ap-east-1';
const ENDPOINT = process.env.S3_ENDPOINT?.trim() || undefined;
if (!BUCKET) {
  console.error('S3_BUCKET тохируулаагүй (.env) — зогслоо');
  process.exit(1);
}
const s3 = new S3Client({
  region: REGION,
  ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
});

const mb = (n) => (n / 1048576).toFixed(1) + ' МБ';

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows: [stat] } = await db.query(
    `SELECT count(*)::int AS n, coalesce(sum(size),0)::bigint AS bytes,
            count(*) FILTER (WHERE bytes IS NULL)::int AS empty
       FROM "StoredFile" WHERE storage = 'db'`,
  );
  console.log(
    `Зөөх: ${stat.n - stat.empty} файл (${mb(Number(stat.bytes))})` +
      (stat.empty ? `, байтгүй ${stat.empty} мөр алгасна` : '') +
      ` → s3://${BUCKET}/f/`,
  );
  if (DRY) {
    await db.end();
    return;
  }

  let moved = 0, movedBytes = 0;
  const failed = [];
  const started = Date.now();
  while (moved + failed.length < LIMIT) {
    const take = Math.min(BATCH, LIMIT - moved - failed.length);
    // Байтыг энд авахгүй — нэг нэгээр нь (санах ой бага)
    const { rows } = await db.query(
      `SELECT key, mime, pages FROM "StoredFile"
        WHERE storage = 'db' AND bytes IS NOT NULL AND NOT (key = ANY($1::text[]))
        ORDER BY "createdAt" LIMIT $2`,
      [failed, take],
    );
    if (!rows.length) break;
    for (const row of rows) {
      try {
        const { rows: [b] } = await db.query(
          `SELECT bytes FROM "StoredFile" WHERE key = $1 AND storage = 'db'`,
          [row.key],
        );
        if (!b?.bytes) continue; // зэрэг өөрчлөгдсөн
        const bytes = b.bytes;
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: `f/${row.key}`,
            Body: bytes,
            ContentType: row.mime,
          }),
        );
        const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `f/${row.key}` }));
        if (head.ContentLength !== bytes.length)
          throw new Error(`хэмжээ зөрөв: ${head.ContentLength} ≠ ${bytes.length}`);
        const pages =
          row.pages ?? (row.mime === 'application/pdf' ? pdfPageCount(bytes) : null);
        await db.query(
          `UPDATE "StoredFile" SET storage = 's3', bytes = NULL, pages = $2
            WHERE key = $1 AND storage = 'db'`,
          [row.key, pages],
        );
        moved++;
        movedBytes += bytes.length;
        if (moved % 25 === 0)
          console.log(`  ${moved} файл, ${mb(movedBytes)}, ${Math.round((Date.now() - started) / 1000)}с`);
      } catch (error) {
        failed.push(row.key);
        console.warn(`  ✗ ${row.key}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
  console.log(`Дууслаа: ${moved} файл (${mb(movedBytes)}) S3 руу зөөгдөв, алдаа ${failed.length}`);
  if (failed.length) console.log('Алдаатай мөрүүд өгөгдлийн санд хэвээр — дахин ажиллуулж болно');
  await db.end();
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
