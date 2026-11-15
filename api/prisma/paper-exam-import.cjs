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
 * --topics=<guide.json>: бодлого бүрийн сэдвийг тайлбарын файлаас оноох (paper-exam-guide.cjs-ийн JSON).
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

/** Тайлбарын сэдэв → «Сэдэв» жагсаалтын нэр (PAPER_TOPICS) */
const TOPIC = {
  'Тоо тоолол': 'Тоо',
  'Рациональ тэгшитгэл': 'Рационал тэгшитгэл',
  'Рациональ тэнцэтгэл биш': 'Рационал тэнцэтгэл биш',
  'Модультай тэгшитгэл': 'Модультай тэгшитгэл',
  'Модультай тэнцэтгэл биш': 'Модультай тэнцэтгэл биш',
};
/** Нөхөх даалгаврын багц (37…48) → сэдэв: II.1 Тоо, II.2 модуль, II.3–II.4 рационал тэнцэтгэл биш */
const FILL_TOPICS = ['Тоо', 'Модультай тэнцэтгэл биш', 'Рационал тэнцэтгэл биш', 'Рационал тэнцэтгэл биш'];

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
      const choice = (guide.variants.A || []).filter((e) => e.number !== null);
      const current = await prisma.paperExamItem.findMany({ where: { examId: exam.id }, orderBy: { number: 'asc' } });
      const items = current.map((it) => {
        const g = choice.find((e) => e.number === it.number);
        const fillIndex = Math.floor((it.number - choice.length - 1) / 3);
        const topic = g ? TOPIC[g.content.topic] ?? g.content.topic : FILL_TOPICS[fillIndex] ?? it.topic;
        return { number: it.number, answerKey: it.answerKey, points: it.points, area: it.area, topic, formulaSlugs: it.formulaSlugs, voided: it.voided };
      });
      await svc.saveItems(exam.id, { items }, actor);
      console.log('Сэдэв онооллоо:', [...new Set(items.map((i) => i.topic))].join(', '));
    }

    const res = await svc.importFile(exam.id, buffer, path.basename(file), { confirm: has('commit'), replace: has('replace') }, actor);
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
