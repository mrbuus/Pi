/* ============================================================================
 * set-book-display.cjs — Сурагчид харагдах номын нэр/дараалал/нуух (идемпотент).
 *
 * Эзний шийдвэр 6 (2026-10-29): Е-1 = 100×100 (100V3), Е-2 = 200×200 (200V3),
 * Е-3 = 300×300 (300), дараа нь өөрийн нэрээр: «1000 бодлого», «Хавтгайн геометр 1»,
 * «Огторгуйн геометр». Сурагчаас нуух: 100, 200 (V2 давхардал), 100-legacy,
 * LAB/test/legacy/V2 код, HAV, жагсаалтад ороогүй бусад MATH ном.
 * MATH-аас бусад хичээлийн ном (Нийгмийн ухаан г.м.) ангиар хаалттай тул энд
 * нуухгүй — зөвхөн «ХЯНАХ» гэж хэвлэнэ.
 *
 * Зөвхөн Book.displayName / displayOrder / studentHidden-ийг өөрчилнө. title,
 * code, бодлого, тест — хөндөхгүй. Юу ч устгахгүй.
 *
 * Ажиллуулах:
 *   node prisma/set-book-display.cjs            # dry-run (анхдагч) — DB-ээс уншаад өөрчлөлтийг хэвлэнэ
 *   node prisma/set-book-display.cjs --commit   # бичнэ
 *   node prisma/set-book-display.cjs --static   # DB-гүй, жишээ кодоор логикийг хэвлэнэ
 * ========================================================================== */

const E = 'Е'; // Кирилл «Е» (U+0415) — латин E биш

const DISPLAY = {
  '100V3': { displayName: `${E}-1`, displayOrder: 1 },
  '200V3': { displayName: `${E}-2`, displayOrder: 2 },
  '300': { displayName: `${E}-3`, displayOrder: 3 },
  '1000': { displayName: '1000 бодлого', displayOrder: 4 },
  HG1: { displayName: 'Хавтгайн геометр 1', displayOrder: 5 },
  OGT: { displayName: 'Огторгуйн геометр', displayOrder: 6 },
};

const HIDDEN_CODES = new Set(['100', '200', '100-legacy', 'HAV']);
const HIDDEN_RE = /LAB|legacy|TEST|V2$/i;

/** Нэг номын зорилтот төлөв + шалтгаан (цэвэр функц) */
function targetFor(book) {
  const mapped = DISPLAY[book.code];
  if (mapped) return { ...mapped, studentHidden: false, reason: 'жагсаалтад' };
  const base = { displayName: book.displayName ?? null, displayOrder: book.displayOrder ?? null };
  if (HIDDEN_CODES.has(book.code)) return { ...base, studentHidden: true, reason: 'нуух жагсаалт' };
  if (HIDDEN_RE.test(book.code)) return { ...base, studentHidden: true, reason: 'LAB/legacy/TEST/V2 код' };
  if (book.subject && book.subject !== 'MATH')
    return { ...base, studentHidden: false, reason: `ХЯНАХ: ${book.subject} ном — нуугаагүй` };
  return { ...base, studentHidden: true, reason: 'ХЯНАХ: жагсаалтад ороогүй' };
}

/** Бүх номын өөрчлөлтийн төлөвлөгөө (зөвхөн ялгаатай талбарууд) */
function planBookDisplay(books) {
  return books.map((b) => {
    const t = targetFor(b);
    const data = {};
    for (const k of ['displayName', 'displayOrder', 'studentHidden']) {
      const cur = b[k] ?? (k === 'studentHidden' ? false : null);
      if (cur !== t[k]) data[k] = t[k];
    }
    return { id: b.id, code: b.code, title: b.title, target: t, data, changed: Object.keys(data).length > 0 };
  });
}

function printPlan(plan) {
  for (const p of plan) {
    const t = p.target;
    const shown = t.studentHidden ? 'НУУХ   ' : `ХАРУУЛ ${String(t.displayOrder ?? '-').padStart(2)}`;
    const name = t.studentHidden ? '' : `«${t.displayName ?? p.title}»`;
    const diff = p.changed ? `  өөрчлөх: ${JSON.stringify(p.data)}` : '  (өөрчлөлтгүй)';
    console.log(`  ${p.code.padEnd(14)} ${shown} ${name.padEnd(22)} [${t.reason}]${diff}`);
  }
  const n = plan.filter((p) => p.changed).length;
  console.log(`\nНийт ${plan.length} ном, өөрчлөгдөх: ${n}`);
}

const STATIC_SAMPLE = [
  '100V3', '200V3', '300', '1000', 'HG1', 'OGT', '100', '200', '100-legacy', 'HAV', '100-V3-LAB', 'PI',
].map((code) => ({ id: code, code, title: code, subject: 'MATH', displayName: null, displayOrder: null, studentHidden: false }))
  .concat([{ id: 'SOCIAL', code: 'SOCIAL', title: 'Нийгмийн ухаан', subject: 'SOCIAL_STUDIES', displayName: null, displayOrder: null, studentHidden: false }]);

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--static')) {
    console.log('СТАТИК (DB-гүй) жишээ:');
    printPlan(planBookDisplay(STATIC_SAMPLE));
    return;
  }
  const commit = args.includes('--commit');
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const books = await prisma.book.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, title: true, subject: true, displayName: true, displayOrder: true, studentHidden: true },
      orderBy: { code: 'asc' },
    });
    const plan = planBookDisplay(books);
    console.log(commit ? 'БИЧИЖ БАЙНА (--commit):' : 'DRY-RUN (бичихгүй, --commit өгвөл бичнэ):');
    printPlan(plan);
    if (!commit) return;
    for (const p of plan.filter((x) => x.changed)) {
      await prisma.book.update({ where: { id: p.id }, data: p.data });
    }
    console.log('Бичлээ.');
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { DISPLAY, targetFor, planBookDisplay };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
