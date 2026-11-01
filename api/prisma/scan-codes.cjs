/**
 * Номд хэвлэх QR код (Problem.scanCode) олгох, хэвлэлтэд экспортлох.
 * Логик, аюулгүй байдлын тайлбар: src/scan/scan-code.ts · docs/MOBILE-SCAN.md
 *
 * Ажиллуулах (api/ дотроос, .env-ийн DATABASE_URL):
 *   node prisma/scan-codes.cjs                         # ХУУРАЙ: ном тус бүрд кодгүй бодлогын тоо
 *   node prisma/scan-codes.cjs --commit                # кодгүй БҮХ бодлогод код олгоно
 *   node prisma/scan-codes.cjs --commit --book 300     # зөвхөн нэг ном (Book.code)
 *   node prisma/scan-codes.cjs --export 300 --out ~/qr-300.csv
 *       # хэвлэлийн загварчлагчид: token, хуудас, дугаар, код, URL (UTF-8 BOM, Excel-д зөв)
 *
 * Зөвхөн NULL-ийг бөглөнө — олгосон кодыг ХЭЗЭЭ Ч дарж бичихгүй (хэвлэгдсэн QR
 * эвдэрнэ). Дахин ажиллуулахад аюулгүй.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomInt } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

// src/scan/scan-code.ts-тэй ИЖИЛ байх ёстой (normalizeScanCode энэ цагаан толгойг л хүлээн авна).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 8;
const URL_BASE = 'https://pimath.mn/q/';

function generate() {
  let out = '';
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const commit = process.argv.includes('--commit');
  const book = arg('--book');
  const exportBook = arg('--export');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    if (exportBook) {
      const out = (arg('--out') || `qr-${exportBook}.csv`).replace(/^~(?=\/)/, os.homedir());
      const { rows } = await db.query(
        `SELECT p.token, p.page, p.number, p."scanCode"
           FROM "Problem" p JOIN "Chapter" c ON c.id = p."chapterId" JOIN "Book" b ON b.id = c."bookId"
          WHERE b.code = $1 AND p."deletedAt" IS NULL
          ORDER BY p.page NULLS LAST, c."order", p.number NULLS LAST, p.token`,
        [exportBook],
      );
      const missing = rows.filter((r) => !r.scanCode).length;
      if (missing) {
        console.error(`${missing} бодлого кодгүй байна — эхлээд --commit --book ${exportBook}`);
        process.exitCode = 1;
        return;
      }
      const lines = [['token', 'page', 'number', 'scanCode', 'url'].join(',')];
      for (const r of rows) lines.push([r.token, r.page, r.number, r.scanCode, URL_BASE + r.scanCode].map(csvCell).join(','));
      fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', { encoding: 'utf8' });
      console.log(`${rows.length} мөр → ${out}`);
      return;
    }

    const { rows: summary } = await db.query(
      `SELECT COALESCE(b.code, '(номгүй)') AS book, count(*)::int AS total,
              count(*) FILTER (WHERE p."scanCode" IS NULL)::int AS missing
         FROM "Problem" p JOIN "Chapter" c ON c.id = p."chapterId" LEFT JOIN "Book" b ON b.id = c."bookId"
        WHERE p."deletedAt" IS NULL AND ($1::text IS NULL OR b.code = $1)
        GROUP BY 1 ORDER BY 1`,
      [book ?? null],
    );
    console.table(summary);
    if (!commit) {
      console.log('ХУУРАЙ ажиллагаа — бичихийн тулд --commit');
      return;
    }

    const { rows: todo } = await db.query(
      `SELECT p.id FROM "Problem" p JOIN "Chapter" c ON c.id = p."chapterId" LEFT JOIN "Book" b ON b.id = c."bookId"
        WHERE p."deletedAt" IS NULL AND p."scanCode" IS NULL AND ($1::text IS NULL OR b.code = $1)`,
      [book ?? null],
    );
    let assigned = 0;
    for (const { id } of todo) {
      for (let attempt = 0; ; attempt++) {
        try {
          // WHERE "scanCode" IS NULL: зэрэг ажилласан өөр процесс олгосон бол дарахгүй.
          const r = await db.query(`UPDATE "Problem" SET "scanCode" = $1 WHERE id = $2 AND "scanCode" IS NULL`, [
            generate(),
            id,
          ]);
          assigned += r.rowCount;
          break;
        } catch (e) {
          // 23505 = давхардсан код (маш ховор) → шинэ код үүсгээд дахин оролдоно.
          if (e.code !== '23505' || attempt >= 5) throw e;
        }
      }
    }
    console.log(`${assigned} бодлогод код олголоо`);
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
