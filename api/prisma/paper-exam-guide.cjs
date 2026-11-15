/* eslint-disable */
/**
 * Нэгдсэн шалгалтын бодлогын тайлбарыг (чанар, санамж, бодолт) санд ачаална — PaperExamGuide.
 * Тайлбарыг урьдчилан бэлдсэн JSON-оос уншина; вэб ажиллах үедээ AI дуудахгүй.
 *
 *   node prisma/paper-exam-guide.cjs prisma/data/paper-exam-guides/negdsen-shalgalt-1.json            # dry-run
 *   node prisma/paper-exam-guide.cjs prisma/data/paper-exam-guides/negdsen-shalgalt-1.json --commit
 *   node prisma/paper-exam-guide.cjs <файл> --exam=<шалгалтын id>     # нэрээр биш id-аар
 *
 * Шалгалтыг файлын `examTitle`-аар (устгаагүй, яг ижил нэртэй ганц шалгалт) эсвэл `--exam`-аар олно.
 * Мөр бүрийг (шалгалт, хувилбар, дугаар)-аар шинээр үүсгэнэ эсвэл агуулгыг шинэчилнэ.
 * Юу ч устгахгүй. Дүн, түлхүүрт хүрэхгүй. Урьдчилан `npm run build` хийсэн байх ёстой (dist).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { guideContentErrors } = require('../dist/src/paper-exams/paper-exam-guide');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const commit = process.argv.includes('--commit');
/** JSONB түлхүүрийн дарааллыг хадгалдаггүй тул харьцуулахдаа түлхүүрийг эрэмбэлнэ. */
const stable = (v) =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

async function main() {
  if (!file) throw new Error('JSON файлын зам өгнө үү');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = Object.entries(doc.variants || {}).flatMap(([variant, entries]) => entries.map((e) => ({ variant, ...e })));
  if (rows.length === 0) throw new Error('Файлд тайлбар алга');

  // 1) Агуулгын шалгалт — нэг ч алдаатай бол юу ч бичихгүй
  const problems = [];
  const seen = new Set();
  for (const r of rows) {
    const id = `${r.variant}/${r.label}`;
    if (seen.has(id)) problems.push(`${id}: давхардсан`);
    seen.add(id);
    if (typeof r.label !== 'string' || !r.label) problems.push(`${id}: label хоосон`);
    if (!Number.isInteger(r.order)) problems.push(`${id}: order бүхэл тоо биш`);
    if (r.number !== null && !Number.isInteger(r.number)) problems.push(`${id}: number буруу`);
    for (const e of guideContentErrors(r.content)) problems.push(`${id}: ${e}`);
  }
  if (problems.length) {
    problems.slice(0, 40).forEach((p) => console.error('  ✗', p));
    throw new Error(`Агуулгын ${problems.length} алдаа — зогслоо`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const examArg = arg('exam');
    const exams = await prisma.paperExam.findMany({
      where: examArg ? { id: examArg, deletedAt: null } : { title: doc.examTitle, deletedAt: null },
      select: { id: true, title: true, itemCount: true, published: true, items: { select: { number: true, answerKey: true, points: true } } },
    });
    if (exams.length !== 1) {
      throw new Error(
        exams.length === 0
          ? `Шалгалт олдсонгүй: ${examArg || doc.examTitle} — эхлээд вэб дээр шалгалтаа үүсгэнэ`
          : `«${doc.examTitle}» нэртэй ${exams.length} шалгалт байна — --exam=<id> өгнө үү`,
      );
    }
    const exam = exams[0];
    console.log(`Шалгалт: ${exam.title} (${exam.id}), ${exam.itemCount} бодлого, ${exam.published ? 'сурагчид нээлттэй' : 'нээгээгүй'}`);

    // 2) Дүнтэй тулгалт: дугаар шалгалтад байгаа эсэх, оноо таарах эсэх (анхааруулга)
    const itemBy = new Map(exam.items.map((i) => [i.number, i]));
    const numbered = rows.filter((r) => r.number !== null);
    const outside = numbered.filter((r) => !itemBy.has(r.number));
    if (outside.length) {
      throw new Error(`Шалгалтад байхгүй дугаар: ${[...new Set(outside.map((r) => r.number))].join(', ')} (шалгалт ${exam.itemCount} бодлоготой)`);
    }
    const pointDiff = [...new Set(numbered.filter((r) => itemBy.get(r.number).points !== r.content.points).map((r) => r.number))];
    if (pointDiff.length) console.log(`  ! Оноо зөрсөн бодлого (шалгалтын «Түлхүүр, агуулга»-ыг шалгана уу): ${pointDiff.join(', ')}`);
    const variants = Object.keys(doc.variants);
    if (variants.length === 1) {
      const keyDiff = numbered.filter((r) => itemBy.get(r.number).answerKey && itemBy.get(r.number).answerKey !== r.content.answer).map((r) => r.number);
      if (keyDiff.length) console.log(`  ! Түлхүүр зөрсөн бодлого: ${keyDiff.join(', ')}`);
    }

    // 3) Ялгаа
    const existing = await prisma.paperExamGuide.findMany({ where: { examId: exam.id }, select: { id: true, variant: true, label: true, number: true, order: true, content: true } });
    const byKey = new Map(existing.map((g) => [`${g.variant}/${g.label}`, g]));
    const create = [];
    const update = [];
    for (const r of rows) {
      const old = byKey.get(`${r.variant}/${r.label}`);
      if (!old) create.push(r);
      else if (old.number !== r.number || old.order !== r.order || stable(old.content) !== stable(r.content)) update.push({ id: old.id, ...r });
    }
    const untouched = existing.filter((g) => !seen.has(`${g.variant}/${g.label}`)).length;
    console.log(`Хувилбар: ${variants.join(', ')} · шинэ ${create.length}, шинэчлэх ${update.length}, өөрчлөгдөөгүй ${rows.length - create.length - update.length}${untouched ? `, файлд байхгүй (хөндөхгүй) ${untouched}` : ''}`);
    if (!commit) {
      console.log('DRY-RUN — бичихийн тулд --commit нэмнэ');
      return;
    }
    await prisma.$transaction(async (tx) => {
      for (const r of create) {
        await tx.paperExamGuide.create({ data: { examId: exam.id, variant: r.variant, label: r.label, number: r.number, order: r.order, content: r.content } });
      }
      for (const r of update) {
        await tx.paperExamGuide.update({ where: { id: r.id }, data: { number: r.number, order: r.order, content: r.content } });
      }
    }, { timeout: 60000 });
    console.log(`Бичлээ: ${create.length + update.length} мөр`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
