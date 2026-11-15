/* eslint-disable */
/**
 * Нэгдсэн шалгалтын дүнг V2 Excel-ээс оруулна — вэбийн «Дүн оруулах»-тай ЯГ ИЖИЛ сервис
 * (PaperExamsService.importFile): машины онооноос зөрсөн мөрийг хадгалахгүй, давхар мөрийг
 * холбогдоогүй хуудас болгоно, юу ч устгахгүй. Сурагчдад НЭЭХГҮЙ (published хэвээр).
 *
 *   node prisma/paper-exam-import.cjs <файл.xlsx> --title="Нэгдсэн шалгалт 1" --held=2026-11-14            # урьдчилан харах
 *   node prisma/paper-exam-import.cjs <файл.xlsx> --title="Нэгдсэн шалгалт 1" --held=2026-11-14 --create   # шалгалт байхгүй бол үүсгэнэ
 *   node prisma/paper-exam-import.cjs <файл.xlsx> --title="Нэгдсэн шалгалт 1" --commit                     # хадгална
 *
 * --topics=<file.json>: {items:[{number, topic, area}]} — бодлого бүрийн сэдэв, БҮТ-ийн агуулга
 *   (prisma/data/paper-exam-guides/negdsen-shalgalt-1-topics.json).
 * Урьдчилан `npm run build` хийсэн байх ёстой (dist).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PaperExamsService } = require('../dist/src/paper-exams/paper-exams.service');
const { PrismaService } = require('../dist/src/prisma/prisma.service');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const has = (name) => process.argv.includes(`--${name}`);
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));


async function main() {
  if (!file) throw new Error('Excel файлын зам өгнө үү');
  const title = arg('title');
  if (!title) throw new Error('--title= өгнө үү');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const svc = app.get(PaperExamsService);
    const prisma = app.get(PrismaService);
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', archivedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!admin) throw new Error('Админ хэрэглэгч олдсонгүй');
    const actor = { userId: admin.id, role: 'ADMIN' };
    const buffer = fs.readFileSync(file);

    let exams = await prisma.paperExam.findMany({ where: { title, deletedAt: null }, select: { id: true, itemCount: true, published: true } });
    if (exams.length > 1) throw new Error(`«${title}» нэртэй ${exams.length} шалгалт байна`);
    if (exams.length === 0) {
      if (!has('create')) throw new Error(`«${title}» шалгалт алга — --create --held=YYYY-MM-DD нэмж үүсгэнэ`);
      const held = arg('held');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(held)) throw new Error('--held=YYYY-MM-DD өгнө үү');
      const { parsePaperWorkbook } = require('../dist/src/paper-exams/paper-exam-sheet');
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const parsed = parsePaperWorkbook(wb);
      if (!parsed.itemCount) throw new Error('Файлаас бодлогын тоо уншигдсангүй');
      const created = await svc.create({ title, heldOn: held, itemCount: parsed.itemCount }, actor);
      console.log(`Үүсгэлээ: ${title} (${created.id}), ${parsed.itemCount} бодлого, сурагчдад НЭЭГЭЭГҮЙ`);
      exams = [{ id: created.id, itemCount: parsed.itemCount, published: false }];
    }
    const exam = exams[0];

    const topicsFile = arg('topics');
    if (topicsFile && has('commit')) {
      const guide = JSON.parse(fs.readFileSync(topicsFile, 'utf8'));
      const current = await prisma.paperExamItem.findMany({ where: { examId: exam.id }, orderBy: { number: 'asc' } });
      // {items:[{number, topic, area}]} — бодлого бүрийн сэдэв, БҮТ-ийн агуулга (шууд)
      if (Array.isArray(guide.items)) {
        const by = new Map(guide.items.map((i) => [i.number, i]));
        const items = current.map((it) => {
          const g = by.get(it.number);
          return { number: it.number, answerKey: it.answerKey, points: it.points, area: g?.area ?? it.area, topic: g?.topic ?? it.topic, formulaSlugs: it.formulaSlugs, voided: it.voided };
        });
        await svc.saveItems(exam.id, { items }, actor);
        console.log('Сэдэв, агуулга онооллоо:', guide.items.length, 'бодлого');
      }
    }

    // Бичих мөр байхгүй бол хоосон импорт үүсгэхгүй
    const preview = await svc.importFile(exam.id, buffer, path.basename(file), { confirm: false, replace: has('replace') }, actor);
    const write = has('commit') && preview.totals.willWrite > 0;
    if (has('commit') && !write) console.log('Бичих шинэ мөр алга — импорт хийсэнгүй');
    const res = write ? await svc.importFile(exam.id, buffer, path.basename(file), { confirm: true, replace: has('replace') }, actor) : preview;
    console.log(JSON.stringify({ format: res.format, pointsChange: res.pointsChange, blocking: res.blocking, ...res.totals }, null, 1));
    const show = (label, list) => list.length && console.log(`${label} (${list.length}):\n` + list.slice(0, 40).map((r) => `  ${r.groupLabel} · ${r.code} · ${r.lastName} ${r.firstName} · ${r.totalScore} · ${r.warnings.join('; ')}`).join('\n'));
    show('ХАДГАЛАХГҮЙ', res.rows.filter((r) => r.warnings.some((w) => w.startsWith('ХАДГАЛАХГҮЙ'))));
    show('Сурагчтай холбогдоогүй', res.rows.filter((r) => !r.student));
    console.log(res.saved ? `ХАДГАЛЛАА · импорт ${res.importId}` : 'DRY-RUN — хадгалахын тулд --commit');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
