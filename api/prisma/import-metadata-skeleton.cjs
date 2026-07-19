/*
 * Metadata-only импорт (Шийдвэр 5, дараагийн ээлж) — Хавтгай-1/2, ОГТОРГУЙ,
 * 300x300 фолдеруудаас БОДЛОГО ХУУЛАХГҮЙГЭЭР зөвхөн Chapter/Test-ийн НЭРС,
 * ДАРААЛАЛ-ыг оруулна. Учир шалтгаан: эдгээр фолдерын нэршил "1000 бодлого"/
 * "Логарифм илэрхийлэл..." шиг нарийн taxonomy-той биш (энгийн "Тест-N" эсвэл
 * inconsistent) тул автомат LaTeX/сонголт задаргаа алдаатай гарах эрсдэлтэй —
 * харин сургалтын төвийн нүдэнд "энэ ном/сэдвүүд байгаа" гэдэг нь харагдаж,
 * багш дараа нь тестийн дэлгэрэнгүйг (PDF/шинжлэлтэй нь) нэмж болно.
 *
 * Ажиллуулах: node prisma/import-metadata-skeleton.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT_CANDIDATES = [
  '/Volumes/SSD2/future',
  path.join(process.env.HOME, 'Desktop', 'Books'),
  path.join(process.env.HOME, 'new future'),
];
const ROOT = ROOT_CANDIDATES.find((d) => fs.existsSync(d));
if (!ROOT) {
  console.error('Эх сурвалж олдсонгүй:', ROOT_CANDIDATES.join(' | '));
  process.exit(1);
}

// Сериалаар "Тест-N" / "Тест -N" файлуудыг дугаарлаж жагсаана
function listSequentialTests(dir) {
  if (!fs.existsSync(dir)) return [];
  const nums = new Set();
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('~$') || f.startsWith('._')) continue;
    const m = f.match(/^Тест\s*-?\s*(\d+)(?:\s|\.|$)/i);
    if (m) nums.add(Number(m[1]));
  }
  return [...nums].sort((a, b) => a - b);
}

// "Topic-N[-d][ OK][ copy][ 2].ext" хэлбэрийн файлуудыг өгөгдсөн сэдвүүдийн
// угтвараар (том/жижиг үсэггүйгээр) тааруулж {topic, number} жагсаалт гаргана
function listTopicNumbered(dir, topics) {
  if (!fs.existsSync(dir)) return [];
  const seen = new Map(); // "topic|number" → true (davhцлыг арилгана)
  const sortedTopics = [...topics].sort((a, b) => b.length - a.length); // урт нь түрүүлж
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('~$') || f.startsWith('._')) continue;
    if (!/\.(docx|pdf)$/i.test(f)) continue;
    const base = f.replace(/\.(docx|pdf)$/i, '');
    for (const topic of sortedTopics) {
      const topicPattern = topic.replace(/[\s-]+/g, '[\\s-]+');
      const re = new RegExp(`^${topicPattern}[\\s-]+(\\d+)`, 'i');
      const m = base.match(re);
      if (m) {
        const key = `${topic}|${Number(m[1])}`;
        if (!seen.has(key)) seen.set(key, { topic, number: Number(m[1]) });
        break;
      }
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.topic.localeCompare(b.topic, 'mn') || a.number - b.number,
  );
}

async function ensureChapter(prisma, bookId, title, order, cache) {
  const key = `${bookId}|${title}`;
  if (cache.has(key)) return cache.get(key);
  let ch = await prisma.chapter.findFirst({ where: { bookId, title } });
  if (!ch) {
    if (!DRY) ch = await prisma.chapter.create({ data: { bookId, title, order } });
    else ch = { id: `DRY-${key}` }; // dry-run тоолоход хэрэглэнэ, DB-д бичихгүй
  }
  cache.set(key, ch);
  return ch;
}

async function ensureTest(prisma, chapterId, title, groupKey, adminId, stats) {
  const existing = await prisma.test.findFirst({ where: { chapterId, title } });
  if (existing) return;
  stats.created += 1;
  if (DRY) return;
  await prisma.test.create({
    data: {
      title,
      type: 'DAILY',
      gradingMode: 'MANUAL', // бодлого/хариу оруулаагүй тул багш гараар дүгнэнэ
      chapterId,
      groupKey,
      createdById: adminId,
    },
  });
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const admin = await prisma.user.findUnique({ where: { phone: '70000001' } });
  if (!admin) throw new Error('Админ хэрэглэгч (70000001) олдсонгүй');

  const stats = { created: 0, chaptersCreated: 0, skipped: [] };
  const chapterCache = new Map();

  // ---------- Хавтгайн геометр (HAV): Хавтгай-1 → I, Хавтгай-2 → II ----------
  const hav = await prisma.book.findUnique({ where: { code: 'HAV' } });
  if (hav) {
    const parts = [
      { dir: path.join(ROOT, 'Хавтгай-1'), title: 'Хавтгай геометр I', order: 1 },
      { dir: path.join(ROOT, 'Хавтгай-2'), title: 'Хавтгай геометр II', order: 2 },
    ];
    for (const part of parts) {
      const nums = listSequentialTests(part.dir);
      if (nums.length === 0) {
        stats.skipped.push(`HAV/${part.title}: файл олдсонгүй (${part.dir})`);
        continue;
      }
      const ch = await ensureChapter(prisma, hav.id, part.title, part.order, chapterCache);
      if (!ch) continue;
      for (const n of nums) {
        await ensureTest(prisma, ch.id, `Тест ${n}`, part.title, admin.id, stats);
      }
    }
  } else stats.skipped.push('Book HAV олдсонгүй');

  // ---------- Огторгуйн геометр (OGT) ----------
  const ogt = await prisma.book.findUnique({ where: { code: 'OGT' } });
  if (ogt) {
    const dir = path.join(ROOT, 'ОГТОРГУЙ');
    const nums = listSequentialTests(dir);
    if (nums.length === 0) {
      stats.skipped.push(`OGT: файл олдсонгүй (${dir})`);
    } else {
      const ch = await ensureChapter(prisma, ogt.id, 'Огторгуйн геометр', 1, chapterCache);
      if (ch) {
        for (const n of nums) {
          await ensureTest(prisma, ch.id, `Тест ${n}`, 'Огторгуйн геометр', admin.id, stats);
        }
      }
    }
  } else stats.skipped.push('Book OGT олдсонгүй');

  // ---------- 300x300: одоо байгаа 16 сэдвийн Chapter-т Test-ийн нэрс нэмнэ ----------
  const book300 = await prisma.book.findUnique({ where: { code: '300' } });
  if (book300) {
    const chapters = await prisma.chapter.findMany({
      where: { bookId: book300.id },
      select: { id: true, title: true },
    });
    const topicToChapter = new Map(chapters.map((c) => [c.title, c]));
    const dir = path.join(ROOT, '300x300 V2');
    const rows = listTopicNumbered(dir, [...topicToChapter.keys()]);
    if (rows.length === 0) {
      stats.skipped.push(`300x300: файл тааруулагдсангүй (${dir})`);
    }
    for (const { topic, number } of rows) {
      const ch = topicToChapter.get(topic);
      if (!ch) continue;
      await ensureTest(prisma, ch.id, `${topic} ${number}`, topic, admin.id, stats);
    }
  } else stats.skipped.push('Book 300 олдсонгүй');

  // ---------- П-тест: Book мөр л (нэрээр хангалттай, дэлгэрэнгүй хожим) ----------
  const piBook = await prisma.book.findUnique({ where: { code: 'PI' } });
  if (!piBook && !DRY) {
    await prisma.book.create({
      data: { code: 'PI', title: 'П-тест', sourceLabel: 'П-тест.pdf' },
    });
    stats.created += 1;
  } else if (!piBook) stats.created += 1;

  console.log(
    JSON.stringify(
      { dryRun: DRY, testsCreatedOrPending: stats.created, skipped: stats.skipped },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
