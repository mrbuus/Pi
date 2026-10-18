/* eslint-disable */
/**
 * 200x200 V3 — Word импортод нэгдсэн/тасарсан 8 бодлогыг эх PDF-ээр (Функц-4, Функц-3,
 * Квадрат-функцийн-график-2, Уламжлалын хэрэглээ-10) засна (2026-10-18).
 *   - «$- 1 (E).2$» гэх мэт D, E сонголт нэг мөрөнд нийлсэн → тусгаарлана
 *   - Функц-3/4 №5: сонголт нөхцөл дотор/хоёр мөрөнд нийлсэн, хариу manualReview → 5 сонголт + хариу
 *   - Функц-4-B №5, Уламжлалын хэрэглээ-10-A №7: нөхцөл хоосон/зураггүй → эхээс нөхцөл + зураг
 *   - Уламжлалын хэрэглээ-10-A №6 E сонголтод №7 нийлсэн, «10\frac км ц» → «10 км/ц»
 * Хариуг бодож шалгасан: F4A5 = f(0)+g(0) = 3+4 = 7 (C), F4B5 = −2+6 = 4 (A), F3A5: x = −1 → 2 (C),
 * F3B5: x = 0 → 7 (B). Бусдын түлхүүр хэвээр.
 *
 *   node prisma/fix-200v3-merged.cjs          # dry-run
 *   node prisma/fix-200v3-merged.cjs --commit
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Prisma } = require('../dist/src/generated/prisma/client');

const COMMIT = process.argv.includes('--commit');
const L = ['A', 'B', 'C', 'D', 'E'];

const FIX = {
  '200V3-KVADRAT_FUNKTSIIN_GRAFIK-02-A-03': { choices: ['$1$', '$-3$', '$3$', '$-1$', '$2$'], correct: 'D' },
  '200V3-KVADRAT_FUNKTSIIN_GRAFIK-02-A-05': { choices: ['$3$', '$-3$', '$-2$', '$7$', '$2$'], correct: 'C' },
  '200V3-KVADRAT_FUNKTSIIN_GRAFIK-02-B-05': { choices: ['$3$', '$-3$', '$4$', '$-4$', '$13$'], correct: 'B' },
  '200V3-FUNKTS-03-A-05': {
    statement: '$P(3x + 1) = x^{2} - 3x - 2$ бол $P(-2)$-ийн утгыг ол.',
    choices: ['$-5$', '$8$', '$2$', '$6$', '$12$'],
    correct: 'C',
  },
  '200V3-FUNKTS-03-B-05': {
    statement: '$P(2x + 3) = 4x^{2} - 2x + 7$ бол $P(3)$-ийн утгыг ол.',
    choices: ['$37$', '$7$', '$9$', '$5$', '$19$'],
    correct: 'B',
  },
  '200V3-FUNKTS-04-A-05': {
    image: '/private/tmp/claude-501/crop-F04A05.png',
    choices: ['$5$', '$6$', '$7$', '$8$', '$9$'],
    correct: 'C',
  },
  '200V3-FUNKTS-04-B-05': {
    statement: 'Дараах зурагт өгөгдсөн графикуудыг ашиглан $f\\left( g(3) \\right) + g\\left( f(2) \\right)$-ийн утгыг ол.',
    image: '/private/tmp/claude-501/crop-F04B05.png',
    choices: ['$4$', '$-2$', '$6$', '$8$', '$-4$'],
    correct: 'A',
  },
  '200V3-ULAMJLALYN_HEREGLEE-10-A-06': {
    statement:
      'Дараах зурагт $L$ цэгээс $M$ цэг рүү $15$ км/ц хурдтай дугуйчин; $K$ цэгээс $L$ цэг рүү $30$ км/ц хурдтай мотоцикл зэрэг хөдлөв. $KL\\perp LM$ ба $KL = 50$ км бол хоёр тээврийн хэрэгслийн хоорондох зай хамгийн багадаа хэд байх вэ?',
    choices: ['$10$ км', '$15\\sqrt{2}$ км', '$10\\sqrt{5}$ км', '$5\\sqrt{10}$ км', '$20\\sqrt{5}$ км'],
    correct: 'D',
  },
  '200V3-ULAMJLALYN_HEREGLEE-10-A-07': {
    statement:
      'Дугуйчин $A$ хотоос $C$ хот руу явахдаа $AB$ замаар $10$ км/ц; $BC$ замаар $6$ км/ц хурдтай явдаг. $|DC| = 2$ км ба $|AD| = 20$ км, $AD\\perp DC$ бол $A$ хотоос $C$ хот руу хамгийн хурдан хүрэхийн тулд $|AB|$ хот хоорондох зай хэд байх вэ?',
    image: '/private/tmp/claude-501/crop-U10A07.png',
    choices: ['$12.5$ км', '$15$ км', '$16$ км', '$17.5$ км', '$18.5$ км'],
    correct: 'E',
  },
  '200V3-ULAMJLALYN_HEREGLEE-10-B-07': {
    statement:
      'Дугуйчин $A$ хотоос $C$ хот руу явахдаа $AB$ замаар $12$ км/ц; $BC$ замаар $6$ км/ц хурдтай явдаг. $|DC| = 3$ км ба $|AD| = 18$ км, $AD\\perp DC$ бол $A$ хотоос $C$ хот руу хамгийн хурдан хүрэхийн тулд $|BC|$ хот хоорондох зай хэд байх вэ?',
    choices: ['$\\sqrt{3}$ км', '$2\\sqrt{3}$ км', '$3\\sqrt{3}$ км', '$4$ км', '$6\\sqrt{2}$ км'],
    correct: 'B',
  },
};

function validate(text, where) {
  const re = /\$([^$]+)\$/g;
  let m;
  while ((m = re.exec(text))) katex.renderToString(m[1], { throwOnError: true, strict: 'ignore' });
  if (/[•−×÷≤≥≠√π²³·]/.test(text.replace(/\$[^$]*\$/g, ''))) throw new Error(`${where}: юникод тэмдэгт`);
  if ((text.match(/\$/g) || []).length % 2) throw new Error(`${where}: сондгой $`);
}

(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const rows = await prisma.problem.findMany({
    where: { token: { in: Object.keys(FIX) } },
    select: { id: true, token: true, statementText: true, imageKey: true, choiceOptions: { select: { label: true, text: true, isCorrect: true }, orderBy: { order: 'asc' } } },
  });
  if (rows.length !== Object.keys(FIX).length) throw new Error(`олдсон ${rows.length}/${Object.keys(FIX).length}`);
  for (const r of rows) {
    const f = FIX[r.token];
    if (f.statement) validate(f.statement, r.token);
    f.choices.forEach((c, i) => validate(c, `${r.token} ${L[i]}`));
    if (f.choices.length !== 5 || new Set(f.choices).size !== 5) throw new Error(`${r.token}: 5 ялгаатай сонголт биш`);
    if (f.image && !fs.existsSync(f.image)) throw new Error(`${r.token}: зураг алга`);
    const before = r.choiceOptions.map((c) => c.label + ':' + c.text + (c.isCorrect ? '*' : '')).join(' | ');
    console.log(`\n${r.token}\n  хуучин: ${before || '(сонголтгүй)'}\n  шинэ:   ${f.choices.map((c, i) => L[i] + ':' + c + (L[i] === f.correct ? '*' : '')).join(' | ')}${f.statement ? '\n  нөхцөл: ' + f.statement : ''}${f.image ? '\n  зураг: ' + path.basename(f.image) : ''}`);
  }
  if (!COMMIT) { console.log('\nDRY-RUN — ӨС-д юу ч бичээгүй.'); await prisma.$disconnect(); return; }
  for (const r of rows) {
    const f = FIX[r.token];
    await prisma.$transaction(async (tx) => {
      const data = {
        format: 'CHOICE',
        choices: Prisma.DbNull,
        correctAnswer: f.choices[L.indexOf(f.correct)],
        version: { increment: 1 },
      };
      if (f.statement) data.statementText = f.statement;
      if (f.image) {
        const bytes = fs.readFileSync(f.image);
        const key = `200v3-fix-${crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 20)}.png`;
        await tx.storedFile.upsert({ where: { key }, update: { bytes, size: bytes.length, mime: 'image/png' }, create: { key, bytes, size: bytes.length, mime: 'image/png' } });
        data.imageKey = key;
      }
      await tx.problem.update({ where: { id: r.id }, data });
      await tx.problemChoice.deleteMany({ where: { problemId: r.id } });
      await tx.problemChoice.createMany({
        data: f.choices.map((text, i) => ({
          problemId: r.id,
          label: L[i],
          text,
          isCorrect: L[i] === f.correct,
          mistakeType: L[i] === f.correct ? 'NONE' : 'OTHER',
          order: i + 1,
        })),
      });
    });
  }
  console.log('\nCOMMIT:', rows.length, 'бодлого засагдлаа');
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
