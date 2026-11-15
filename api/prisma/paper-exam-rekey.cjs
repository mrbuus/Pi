/* eslint-disable */
/**
 * Нэгдсэн шалгалтын хувилбар бүрийн түлхүүрийг V2 файлаас сэргээж (байгаатай НЭГТГЭЖ),
 * бүх хуудсыг дахин дүгнэнэ. Хариулт, хуудас устахгүй — зөвхөн түлхүүр ба оноо шинэчлэгдэнэ.
 *   node prisma/paper-exam-rekey.cjs <файл.xlsx> --title="Нэгдсэн шалгалт 1" [--commit]
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PaperExamsService } = require('../dist/src/paper-exams/paper-exams.service');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { loadWorkbook } = require('../dist/src/exams/gradebook-sheet');
const { parsePaperWorkbook } = require('../dist/src/paper-exams/paper-exam-sheet');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const prisma = app.get(PrismaService);
    const svc = app.get(PaperExamsService);
    const exam = await prisma.paperExam.findFirst({ where: { title: arg('title'), deletedAt: null }, include: { items: { orderBy: { number: 'asc' } } } });
    if (!exam) throw new Error('Шалгалт олдсонгүй');
    const parsed = parsePaperWorkbook(await loadWorkbook(fs.readFileSync(file)), exam.itemCount);
    const v2 = parsed.v2Items;
    if (!v2 || v2.length !== exam.items.length) throw new Error('Файлын түлхүүр шалгалттай таарахгүй');
    const plan = exam.items.map((it, i) => ({ id: it.id, number: it.number, before: it.answerKeys, after: { ...(it.answerKeys || {}), ...v2[i].keys } }));
    console.log('хувилбар:', [...new Set(plan.flatMap((p) => Object.keys(p.after)))], 'жишээ:', JSON.stringify(plan.slice(0, 3).map((p) => [p.number, p.before, p.after])));
    if (!process.argv.includes('--commit')) return console.log('DRY-RUN');
    await prisma.$transaction(async (tx) => {
      for (const p of plan) await tx.paperExamItem.update({ where: { id: p.id }, data: { answerKeys: p.after } });
      await svc.regrade(tx, exam.id);
    }, { timeout: 120000 });
    console.log('ТҮЛХҮҮР СЭРГЭЭВ, ДАХИН ДҮГНЭВ');
  } finally {
    await app.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
