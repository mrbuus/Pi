/* eslint-disable */
/**
 * 100x100 V3 импорт — ЗӨВХӨН A/B хувилбар (эзний дүрэм: C нь эзний хувийн материал).
 *
 * Өгөгдөл: api/prisma/data/100x100-v3/ (plan JSON + зургууд). Эзний шийдвэр
 * (2026-09-27): репо одоохондоо нийтэд нээлттэй ч өгөгдлийг оруулж болно —
 * нийтэд гаргахдаа репог private болгоно.
 *
 * Анхдагчаар DRY-RUN: ӨС-д юу ч бичихгүй, юу хийхийг л тоолж хэвлэнэ.
 *
 *   node prisma/import-100x100-v3.cjs                       # dry-run
 *   node prisma/import-100x100-v3.cjs --commit              # ӨС-д бичнэ
 *   node prisma/import-100x100-v3.cjs --commit --hide-others
 *        # бусад бүх номыг archived=true (УСТГАХГҮЙ) — номын санд зөвхөн V3 харагдана
 *
 * Идемпотент: token (100V3-…)-оор upsert. Дахин ажиллуулахад давхардахгүй.
 * Зураг: StoredFile хүснэгтэд (G05, redeploy-д устахгүй), key = 100v3-<тест>-<бодлого>-<n>.png.
 * Хариугүй (RATINEQ-13) бодлоготой тест → gradingMode MANUAL.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const BOOK = { code: '100V3', title: '100x100', sourceLabel: '100x100 V3' };
const VALID_VARIANTS = new Set(['A', 'B']);
// V2-той ижил сэдвийн дараалал ба хугацаа (import-100x100-v2.cjs TOPICS).
const TOPIC_META = {
  TOO: { order: 1, minutes: 15 },
  RATEQ: { order: 2, minutes: 40 },
  RATINEQ: { order: 3, minutes: 40 },
  ABSEQ: { order: 4, minutes: 45 },
  ABSINEQ: { order: 5, minutes: 45 },
  IRREQ: { order: 6, minutes: 45 },
  IRRINEQ: { order: 7, minutes: 45 },
  EXPEQ: { order: 8, minutes: 50 },
  EXPINEQ: { order: 9, minutes: 50 },
  LOGEXP: { order: 10, minutes: 45 },
  LOGEQ: { order: 11, minutes: 50 },
  LOGINEQ: { order: 12, minutes: 60 },
};

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return null;
  const v = hit.split('=').slice(1).join('=');
  return v.startsWith('~') ? path.join(os.homedir(), v.slice(1)) : v;
}
const flag = (name) => process.argv.includes(`--${name}`);

function isManual(answer) {
  return !answer || (typeof answer === 'object' && answer.manualReview === true);
}

/** Plan-ыг шалгаж импортын нэгжүүд болгон хувиргана (ӨС-гүй, цэвэр). */
function buildImport(plan, imagesDir) {
  const errors = [];
  const warnings = [];
  const tests = [];
  const images = new Map(); // key -> abs path

  for (const t of plan.tests) {
    if (!VALID_VARIANTS.has(t.variant)) {
      errors.push(`${t.token}: «${t.variant}» хувилбар — зөвхөн A/B импортлогдоно`);
      continue;
    }
    const meta = TOPIC_META[t.topicSlug];
    if (!meta) {
      errors.push(`${t.token}: үл мэдэгдэх сэдэв ${t.topicSlug}`);
      continue;
    }
    const problems = [];
    for (const p of t.problems) {
      if (!p.token.startsWith('100V3-')) errors.push(`${p.token}: token 100V3- биш`);
      if (p.format === 'CHOICE' && p.choicesLatex && p.choicesLatex.length !== 5) {
        warnings.push(`${p.token}: ${p.choicesLatex.length} сонголт`);
      }
      let imageKey = null;
      p.images.forEach((img, i) => {
        const abs = path.join(imagesDir, path.basename(img.file));
        const key = path.basename(img.file).toLowerCase(); // файлын нэр аль хэдийн 100V3- угтвартай
        if (!fs.existsSync(abs)) errors.push(`${p.token}: зураг алга ${abs}`);
        else images.set(key, abs);
        if (i === 0) imageKey = key;
        else warnings.push(`${p.token}: ${p.images.length} зураг — зөвхөн эхнийх нь харагдана (${key})`);
      });
      if (p.review && p.review.length) warnings.push(`${p.token}: гараар шалгах — ${p.review.join('; ')}`);
      problems.push({
        token: p.token,
        number: p.number,
        format: p.format,
        statementText: p.statementLatex,
        // Сонголт зураг хэлбэртэй (CHOICES_FIGURE) бол текст сонголтгүй — 5 үсэг л.
        choices: p.format === 'CHOICE' ? (p.choicesLatex ?? ['A', 'B', 'C', 'D', 'E']) : null,
        correctAnswer: p.correctAnswer,
        manual: isManual(p.correctAnswer),
        imageKey,
      });
    }
    tests.push({
      token: t.token,
      topicSlug: t.topicSlug,
      topicTitle: t.topicTitle,
      testNumber: t.testNumber,
      variant: t.variant,
      chapterTitle: `${t.topicTitle} · Тест ${t.testNumber}`,
      chapterOrder: meta.order * 100 + t.testNumber,
      title: `${t.topicTitle} ${t.testNumber}`,
      groupKey: `100V3 ${t.topicTitle} ${t.testNumber}`,
      timeLimitMin: meta.minutes,
      gradingMode: problems.some((p) => p.manual) ? 'MANUAL' : 'AUTO',
      problems,
    });
  }

  const allProblems = tests.flatMap((t) => t.problems);
  return {
    errors,
    warnings,
    tests,
    images,
    totals: {
      tests: tests.length,
      problems: allProblems.length,
      problemsA: tests.filter((t) => t.variant === 'A').reduce((s, t) => s + t.problems.length, 0),
      problemsB: tests.filter((t) => t.variant === 'B').reduce((s, t) => s + t.problems.length, 0),
      manualProblems: allProblems.filter((p) => p.manual).length,
      manualTests: tests.filter((t) => t.gradingMode === 'MANUAL').length,
      chapters: new Set(tests.map((t) => t.chapterTitle)).size,
      images: images.size,
    },
  };
}

async function commit(prisma, built, { adminId, hideOthers }) {
  // 1) Зураг → StoredFile (idempotent)
  for (const [key, abs] of built.images) {
    const bytes = fs.readFileSync(abs);
    await prisma.storedFile.upsert({
      where: { key },
      update: { bytes, size: bytes.length, mime: 'image/png' },
      create: { key, bytes, size: bytes.length, mime: 'image/png' },
    });
  }
  // 2) Ном
  const book = await prisma.book.upsert({
    where: { code: BOOK.code },
    update: { title: BOOK.title, sourceLabel: BOOK.sourceLabel, archived: false, deletedAt: null },
    create: { code: BOOK.code, title: BOOK.title, sourceLabel: BOOK.sourceLabel },
  });
  // 3) Бүлэг, бодлого, тест
  const chapterIds = new Map();
  for (const t of built.tests) {
    let chapterId = chapterIds.get(t.chapterTitle);
    if (!chapterId) {
      const existing = await prisma.chapter.findFirst({ where: { bookId: book.id, title: t.chapterTitle } });
      const data = { order: t.chapterOrder, grade: 12, freePreview: t.chapterOrder === 101 };
      const ch = existing
        ? await prisma.chapter.update({ where: { id: existing.id }, data })
        : await prisma.chapter.create({ data: { bookId: book.id, title: t.chapterTitle, ...data } });
      chapterId = ch.id;
      chapterIds.set(t.chapterTitle, chapterId);
    }
    const problemIds = [];
    for (const p of t.problems) {
      const data = {
        chapterId,
        number: p.number,
        format: p.format,
        statementText: p.statementText,
        choices: p.choices,
        correctAnswer: p.correctAnswer,
        imageKey: p.imageKey,
        points: 1,
      };
      const row = await prisma.problem.upsert({
        where: { token: p.token },
        update: data,
        create: { token: p.token, createdById: adminId, ...data },
      });
      problemIds.push(row.id);
    }
    const existingTest = await prisma.test.findFirst({
      where: { groupKey: t.groupKey, variantLabel: t.variant },
    });
    const testData = {
      title: t.title,
      type: 'DAILY',
      gradingMode: t.gradingMode,
      chapterId,
      timeLimitMin: t.timeLimitMin,
      groupKey: t.groupKey,
      variantLabel: t.variant,
      createdById: adminId,
    };
    const test = existingTest
      ? await prisma.test.update({ where: { id: existingTest.id }, data: testData })
      : await prisma.test.create({ data: testData });
    await prisma.testProblem.deleteMany({ where: { testId: test.id } });
    await prisma.testProblem.createMany({
      data: problemIds.map((problemId, i) => ({ testId: test.id, problemId, order: i + 1, points: 1 })),
    });
  }
  // 4) Бусад номыг нуух (УСТГАХГҮЙ — буцаах SQL-ийг хэвлэнэ)
  let hidden = [];
  if (hideOthers) {
    const others = await prisma.book.findMany({
      where: { code: { not: BOOK.code }, archived: false, deletedAt: null },
      select: { id: true, code: true },
    });
    await prisma.book.updateMany({ where: { id: { in: others.map((b) => b.id) } }, data: { archived: true } });
    hidden = others.map((b) => b.code);
  }
  return { bookId: book.id, chapters: chapterIds.size, hidden };
}

async function main() {
  const planPath = arg('plan') ?? path.join(__dirname, 'data', '100x100-v3', 'plan-100x100-v3.json');
  const imagesDir = arg('images') ?? path.join(path.dirname(planPath), 'images');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const built = buildImport(plan, imagesDir);

  console.log('== 100x100 V3 импорт ==');
  console.log(JSON.stringify(built.totals, null, 2));
  console.log(`Анхааруулга: ${built.warnings.length} (эхний 10):`);
  built.warnings.slice(0, 10).forEach((w) => console.log(`  - ${w}`));
  if (built.errors.length) {
    console.error(`АЛДАА: ${built.errors.length}`);
    built.errors.slice(0, 20).forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  if (!flag('commit')) {
    console.log('\nDRY-RUN — ӨС-д юу ч бичсэнгүй. Бичихийн тулд --commit нэм.');
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const adminPhone = arg('admin-phone') ?? '70000001';
    const admin =
      (await prisma.user.findUnique({ where: { phone: adminPhone } })) ??
      (await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } }));
    if (!admin) throw new Error('ADMIN хэрэглэгч олдсонгүй (--admin-phone=)');
    const res = await commit(prisma, built, { adminId: admin.id, hideOthers: flag('hide-others') });
    console.log(`\nБИЧИГДЛЭЭ: ном ${BOOK.code}, ${res.chapters} бүлэг, ${built.totals.tests} тест, ${built.totals.problems} бодлого, ${built.totals.images} зураг.`);
    if (res.hidden.length) {
      console.log(`Нуусан номууд: ${res.hidden.join(', ')}`);
      console.log(`Буцаах: UPDATE "Book" SET archived=false WHERE code IN (${res.hidden.map((c) => `'${c}'`).join(', ')});`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { buildImport };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
