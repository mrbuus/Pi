/* eslint-disable */
/**
 * Тестийн эх PDF (эзэн 2026-11-03): багш бүр номын болон хуваарийн тестийн ЭХ файлыг
 * (Word-оос хэвлэсэн, гараар шивсэн — вэб бодлогоос үүсгэхгүй) татна.
 *
 * Нэг бүлэг («Функц · Тест 1») = нэг эх файл, дотроо A, B хувилбар хамт.
 * Хадгалалт: StoredFile key = `chapter-pdf-<chapterId>.pdf` (src/tests/source-pdf.ts),
 * S3 идэвхтэй бол S3-д. Шинэ багана, migration хэрэггүй.
 *
 *   # 1) Mac дээр: бүлэг ↔ файл тааруулж, файлуудыг нэг хавтсанд хуулна (ӨС-д бичихгүй)
 *   node prisma/chapter-pdfs.cjs plan --out=/path/to/staging
 *   # 2) Тухайн сан дээр (локал эсвэл EC2): шалгаад хэрэглэнэ
 *   node prisma/chapter-pdfs.cjs apply --dir=/path/to/staging            # dry-run
 *   node prisma/chapter-pdfs.cjs apply --dir=/path/to/staging --commit
 *
 * apply нь бүлгийг (номын код + бүлгийн нэр)-ээр олно — локал, прод ID зөрсөн ч зөв.
 * Аль хэдийн файлтай бүлгийг алгасна (`--replace` бол шинэчилнэ). Юу ч устгахгүй
 * (`--replace` үед хуучин объектыг солих нь зөвхөн тэр түлхүүрийн файл).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const HOME = os.homedir();
/** Номын код → эх PDF-ийн хавтас (эзний компьютер) */
const SOURCES = {
  '100V3': [path.join(HOME, 'Desktop/Books/100x100 V3')],
  '200V3': [path.join(HOME, 'Desktop/Books/200x200 V3')],
  '100': [path.join(HOME, 'new future/100x100 V2')],
  HG1: [path.join(HOME, 'Desktop/Books/Хавтгай-1')],
  '1000': [path.join(HOME, 'Desktop/Books/1000 бодлого'), path.join(HOME, 'Downloads')],
};
/** Бүлгийн сэдэв ↔ файлын сэдэв ялгаатай үед (норм хэлбэрээр) */
const ALIAS = {
  рациональтэгшитгэл: 'тэгшитгэл',
  рациональтэнцэтгэлбиш: 'тэнцэтгэлбиш',
};

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/ё/g, 'е').replace(/[\s\-–_.,]/g, '');
const keyOf = (chapterId) => `chapter-pdf-${chapterId}.pdf`;

/** «Функц · Тест 1» → { topic: «Функц», no: 1 } */
function splitTitle(title) {
  const m = title.match(/^(.*?)\s*·\s*(?:Тест|Сорил)\s*([0-9]+)\s*-?\s*([A-ZА-Я])?\s*$/u);
  return m ? { topic: m[1].trim(), no: Number(m[2]), variant: m[3] || null } : null;
}

/** «Уламжлалын хэрэглээ-6.duguilah holimog.pdf» → { topic, no } */
function splitFile(name) {
  const base = name.replace(/\.pdf$/i, '').split('.')[0];
  const m = base.match(/^(.*?)[\s-]*([0-9]+)$/u);
  return m ? { topic: m[1], no: Number(m[2]) } : null;
}

function pdfsIn(dirs) {
  const out = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/\.pdf$/i.test(f) && !f.startsWith('~$')) out.push(path.join(d, f));
  }
  return out;
}

function match(code, chapterTitle, files) {
  // «1000 бодлого · Явцын 3-A» → «2026 Явцын шалгалт 3A.pdf» (нийлсэн «1-4A» файлыг авахгүй)
  const progress = code === '1000' && chapterTitle.match(/Явцын\s*([0-9]+)\s*-\s*([A-Z])/u);
  if (progress) {
    const re = new RegExp(`явцыншалгалт${progress[1]}[${progress[2] === 'A' ? 'aа' : 'bв'}]pdf$`, 'u');
    const hits = files.filter((f) => re.test(norm(path.basename(f))));
    return hits.length === 1 ? { file: hits[0] } : { why: hits.length ? `${hits.length} файл таарав` : 'файл олдсонгүй' };
  }
  const t = splitTitle(chapterTitle);
  if (!t) return { why: 'бүлгийн нэр «Сэдэв · Тест N» хэлбэргүй' };
  let hits;
  if (code === 'HG1') {
    hits = files.filter((f) => norm(path.basename(f)) === norm(`Тест-${t.no}.pdf`));
  } else if (code === '1000') {
    const v = t.variant ? `[${t.variant}${t.variant === 'A' ? 'А' : ''}${t.variant === 'B' ? 'В' : ''}]` : '';
    const re = new RegExp(`Сорил-?${t.no}${v}\\.pdf$`, 'iu');
    hits = files.filter((f) => re.test(path.basename(f).replace(/\s+/g, '')));
  } else {
    const want = ALIAS[norm(t.topic)] || norm(t.topic);
    hits = files.filter((f) => {
      const s = splitFile(path.basename(f));
      return s && s.no === t.no && norm(s.topic) === want;
    });
  }
  if (hits.length === 1) return { file: hits[0] };
  return { why: hits.length ? `${hits.length} файл таарав: ${hits.map((h) => path.basename(h)).join(', ')}` : 'файл олдсонгүй' };
}

async function chaptersWithTests(prisma, codes) {
  return prisma.chapter.findMany({
    where: {
      book: { code: { in: codes } },
      tests: { some: { deletedAt: null } },
    },
    select: { id: true, title: true, order: true, book: { select: { code: true } } },
    orderBy: [{ bookId: 'asc' }, { order: 'asc' }],
  });
}

async function plan(prisma) {
  const out = arg('out');
  if (!out) throw new Error('--out=<хавтас> заавал');
  fs.mkdirSync(out, { recursive: true });
  const chapters = await chaptersWithTests(prisma, Object.keys(SOURCES));
  const manifest = [];
  const missing = [];
  const files = Object.fromEntries(Object.entries(SOURCES).map(([c, dirs]) => [c, pdfsIn(dirs)]));
  for (const ch of chapters) {
    const code = ch.book.code;
    const r = match(code, ch.title, files[code]);
    if (!r.file) {
      missing.push(`${code} | ${ch.title} — ${r.why}`);
      continue;
    }
    const name = `${code}--${path.basename(r.file)}`;
    if (!fs.existsSync(path.join(out, name))) fs.copyFileSync(r.file, path.join(out, name));
    manifest.push({ book: code, chapterTitle: ch.title, file: name, source: r.file });
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
  const by = {};
  for (const m of manifest) by[m.book] = (by[m.book] || 0) + 1;
  console.log(`бүлэг ${chapters.length}, файл олдсон ${manifest.length}`, by);
  if (missing.length) console.log(`\nОЛДООГҮЙ ${missing.length}:\n` + missing.map((x) => '  - ' + x).join('\n'));
  console.log(`\n→ ${path.join(out, 'manifest.json')}`);
}

async function apply(prisma) {
  const dir = arg('dir');
  const commit = process.argv.includes('--commit');
  const replace = process.argv.includes('--replace');
  if (!dir) throw new Error('--dir=<хавтас> заавал');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const chapters = await chaptersWithTests(prisma, [...new Set(manifest.map((m) => m.book))]);
  const byTitle = new Map(chapters.map((c) => [`${c.book.code}|${c.title}`, c]));
  const { saveStoredFile, deleteStoredFile } = require('../dist/src/storage/file-store');
  let added = 0, skipped = 0;
  const problems = [];
  for (const m of manifest) {
    const ch = byTitle.get(`${m.book}|${m.chapterTitle}`);
    if (!ch) { problems.push(`${m.book} | ${m.chapterTitle} — энэ санд бүлэг олдсонгүй`); continue; }
    const bytes = fs.readFileSync(path.join(dir, m.file));
    if (bytes.subarray(0, 5).toString() !== '%PDF-') { problems.push(`${m.file} — PDF биш`); continue; }
    const key = keyOf(ch.id);
    const exists = await prisma.storedFile.findUnique({ where: { key }, select: { key: true } });
    if (exists && !replace) { skipped++; continue; }
    if (commit) {
      if (exists) await deleteStoredFile(prisma, key);
      await saveStoredFile(prisma, { key, mime: 'application/pdf', bytes, ownerId: null, purpose: 'general' });
    }
    added++;
  }
  console.log(`${commit ? 'ХЭРЭГЛЭСЭН' : 'DRY-RUN'}: нэмэх/шинэчлэх ${added}, аль хэдийн байгаа ${skipped}, асуудал ${problems.length}`);
  problems.forEach((p) => console.log('  ! ' + p));
}

(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const cmd = process.argv[2];
    if (cmd === 'plan') await plan(prisma);
    else if (cmd === 'apply') await apply(prisma);
    else throw new Error('Хэрэглээ: plan --out=… | apply --dir=… [--commit] [--replace]');
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
