/* eslint-disable */
/**
 * 100x100 V3 · Рациональ тэнцэтгэл биш 13 (A/B) — эх файлд хариуны түлхүүр байхгүй,
 * A–E сонголт нь нэг өргөн зурагт байсан, 09/10 бодлого холилдсон.
 *
 * Засвар:
 *  - 02,03,05,07,08,09: өргөн зургийг сонголт бүрээр таслав (data/100x100-v3/choice-images,
 *    prisma/split-choice-image.py) → ProblemChoice.imageKey; бодлогын зургийг хасна.
 *  - 01,04,06: текст сонголтыг ProblemChoice болгоно.
 *  - 10: эх PDF-ийн дагуу «Зурагт өгөгдсөн график…» + 09-2 зураг + 09-д наалдсан систем сонголтууд.
 *  - Хариу: Claude бодож, графикийг нэг бүрчлэн шалгасан (RATINEQ13_ANSWERS). B-09-ийн эх
 *    зурагт будалт 1 нүдээр хазайсан (зураас x=1, будалт x=0-ээс) — хэлбэрээр A.
 *  - Тест 2-ыг AUTO болгоно. Бодлого бүрийн version +1.
 *
 *   node prisma/fix-100x100-v3-ratineq13.cjs           # dry-run
 *   node prisma/fix-100x100-v3-ratineq13.cjs --commit
 *
 * Идемпотент: дахин ажиллуулахад ижил төлөвт хүрнэ.
 */
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const DIR = path.join(__dirname, 'data', '100x100-v3', 'choice-images');
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const IMAGE_CHOICE = ['02', '03', '05', '07', '08', '09'];
const TEXT_CHOICE = ['01', '04', '06'];
const Q10 = 'Зурагт өгөгдсөн график нь аль тэнцэтгэл бишийн график вэ?';

const RATINEQ13_ANSWERS = {
  A: { '01': 'E', '02': 'C', '03': 'E', '04': 'E', '05': 'A', '06': 'D', '07': 'D', '08': 'D', '09': 'B', '10': 'C' },
  B: { '01': 'D', '02': 'C', '03': 'B', '04': 'C', '05': 'C', '06': 'B', '07': 'E', '08': 'E', '09': 'A', '10': 'A' },
};

const choiceKey = (token, letter) => `100v3-choice-${token.toLowerCase()}-${letter.toLowerCase()}.png`;

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  // `npm run build` хийсний дараа (dist дотор ProblemChoice.imageKey багтсан байх ёстой)
  const { PrismaClient, Prisma } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const plan = [];
  for (const variant of ['A', 'B']) {
    const tok = (n) => `100V3-RATINEQ-13-${variant}-${n}`;
    const rows = await prisma.problem.findMany({
      where: { token: { startsWith: `100V3-RATINEQ-13-${variant}-` } },
      select: { id: true, token: true, statementText: true, choices: true, imageKey: true, version: true },
    });
    const byNo = new Map(rows.map((r) => [r.token.slice(-2), r]));
    if (byNo.size !== 10) throw new Error(`${variant}: 10 бодлого хүлээсэн, ${byNo.size} олдлоо`);
    const answer = RATINEQ13_ANSWERS[variant];

    for (const n of TEXT_CHOICE) {
      const p = byNo.get(n);
      const texts = p.choices;
      if (!Array.isArray(texts) || texts.length !== 5) throw new Error(`${p.token}: 5 текст сонголт алга`);
      plan.push({
        id: p.id,
        token: p.token,
        data: { format: 'CHOICE' },
        choices: texts.map((t, i) => ({ text: String(t), imageKey: null, isCorrect: LETTERS[i] === answer[n] })),
      });
    }

    for (const n of IMAGE_CHOICE) {
      const p = byNo.get(n);
      const files = LETTERS.map((L) => path.join(DIR, `${tok(n)}-${L}.png`));
      for (const f of files) if (!fs.existsSync(f)) throw new Error(`Зураг алга: ${f}`);
      const data = { format: 'CHOICE', imageKey: null };
      // 09: эх файлд 10-ын асуулт наалдсан → салгана
      if (n === '09') data.statementText = p.statementText.replace(Q10, '').trim();
      plan.push({
        id: p.id,
        token: p.token,
        data,
        files: files.map((f, i) => ({ key: choiceKey(p.token, LETTERS[i]), file: f })),
        choices: LETTERS.map((L) => ({ text: '', imageKey: choiceKey(p.token, L), isCorrect: L === answer[n] })),
      });
    }

    // 10: 09-д наалдсан систем сонголт + 09-2 зураг
    const p9 = byNo.get('09');
    const p10 = byNo.get('10');
    const sys = Array.isArray(p9.choices) && p9.choices.length === 5 && p9.choices[0] !== 'A' ? p9.choices : null;
    const prev10 = plan.find((x) => x.token === p10.token);
    if (!prev10) {
      const cached = sys ?? (await prisma.problem.findUnique({ where: { id: p10.id }, select: { choiceOptions: { orderBy: { order: 'asc' } } } })).choiceOptions.map((c) => c.text);
      if (!cached || cached.length !== 5) throw new Error(`${p10.token}: систем сонголт олдсонгүй`);
      plan.push({
        id: p10.id,
        token: p10.token,
        data: {
          format: 'CHOICE',
          statementText: Q10,
          imageKey: `100v3-ratineq-13-${variant.toLowerCase()}-09-2.jpeg`,
        },
        choices: cached.map((t, i) => ({ text: String(t), imageKey: null, isCorrect: LETTERS[i] === answer['10'] })),
      });
    }
  }

  for (const item of plan) {
    const correct = item.choices.find((c) => c.isCorrect);
    if (item.choices.filter((c) => c.isCorrect).length !== 1) throw new Error(`${item.token}: яг 1 зөв биш`);
    console.log(
      `${item.token}  ${item.files ? 'зураг×5' : 'текст'}  зөв=${LETTERS[item.choices.indexOf(correct)]}` +
        (item.data.statementText !== undefined ? '  [statement]' : '') +
        (item.data.imageKey !== undefined ? `  [imageKey→${item.data.imageKey}]` : ''),
    );
  }
  console.log(`\nНийт ${plan.length} бодлого, ${plan.reduce((s, x) => s + (x.files?.length ?? 0), 0)} сонголтын зураг`);

  if (!COMMIT) {
    console.log('DRY-RUN — ӨС-д юу ч бичээгүй. --commit-оор ажиллуул.');
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const item of plan) {
        for (const f of item.files ?? []) {
          const bytes = fs.readFileSync(f.file);
          await tx.storedFile.upsert({
            where: { key: f.key },
            update: { bytes, size: bytes.length, mime: 'image/png' },
            create: { key: f.key, bytes, size: bytes.length, mime: 'image/png' },
          });
        }
        const correct = item.choices.find((c) => c.isCorrect);
        await tx.problem.update({
          where: { id: item.id },
          data: {
            ...item.data,
            choices: Prisma.DbNull,
            correctAnswer: correct.text,
            version: { increment: 1 },
          },
        });
        await tx.problemChoice.deleteMany({ where: { problemId: item.id } });
        await tx.problemChoice.createMany({
          data: item.choices.map((c, i) => ({
            problemId: item.id,
            label: LETTERS[i],
            text: c.text,
            imageKey: c.imageKey,
            isCorrect: c.isCorrect,
            mistakeType: c.isCorrect ? 'NONE' : 'OTHER',
            order: i + 1,
          })),
        });
      }
      const tests = await tx.test.updateMany({
        where: { groupKey: '100V3 Рациональ тэнцэтгэл биш 13' },
        data: { gradingMode: 'AUTO' },
      });
      console.log(`Тест AUTO болсон: ${tests.count}`);
    },
    { timeout: 60000 },
  );
  console.log('COMMIT хийгдлээ.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
