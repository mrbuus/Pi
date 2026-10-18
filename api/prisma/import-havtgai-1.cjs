/* eslint-disable */
/**
 * «Хавтгайн геометр 1-р дэвтэр» (2026-10 шинэчилсэн PDF) импорт — data/havtgai-1/.
 *
 * Эх: transcribed/<тест>.json (хуулсан нөхцөл, сонголт, бодолт; PILOT-SPEC.md),
 *     manifest.json (чертеж fig/<label>.png), key.json (хариуны түлхүүр), pages.json (хугацаа),
 *     tests.json (тестийн нэр — байхгүй бол TEST_NAMES).
 *
 * Анхдагчаар DRY-RUN: шалгаад юу бичихийг хэвлэнэ. Алдаа (KaTeX, юникод, сонголт≠5, нүд≠түлхүүр,
 * чертеж дутуу) байвал --commit хийхгүй.
 *
 *   node prisma/import-havtgai-1.cjs --tests=4,35              # dry-run
 *   node prisma/import-havtgai-1.cjs --tests=4,35 --commit [--access=<classroomId>]
 *
 * Ном code=HG1 (хуучин HAV номын хоосон тестүүдэд хүрэхгүй). Бүлэг «<нэр> · Тест N»,
 * тест A/B (groupKey «HG1 Тест N»), token «HG1-<label>». Идемпотент (token/groupKey-оор upsert).
 * Зураг StoredFile-д: key «hg1-<label>.png».
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'data', 'havtgai-1');
const COMMIT = process.argv.includes('--commit');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || null;
const BOOK = { code: 'HG1', title: 'Хавтгайн геометр 1', sourceLabel: 'Хавтгайн геометр 1-р дэвтэр (2026-10)' };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const BAD_GLYPHS = /[π²³·×÷≤≥≠√∠°∥⊥△−]/;

// tests.json (судалгааны агент) байхгүй үеийн түр нэр — pilot
const TEST_NAMES = {
  4: 'Параллель шулуун ба огтлогчийн өнцөг',
  35: 'Квадрат, тэгш өнцөгтийн талбай',
};

function load(name, fallback) {
  const p = path.join(DIR, name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
}

function katexErrors(text) {
  const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
  const errs = [];
  if (typeof text !== 'string') return errs;
  if ((text.match(/\$/g) || []).length % 2) errs.push('сондгой $');
  for (const m of text.matchAll(/\$([^$]+)\$/g)) {
    try {
      katex.renderToString(m[1], { throwOnError: true, strict: false });
    } catch (e) {
      errs.push(`KaTeX: ${m[1].slice(0, 40)} — ${e.message.slice(0, 60)}`);
    }
  }
  if (BAD_GLYPHS.test(text)) errs.push('юникод математик тэмдэгт');
  return errs;
}

function buildPlan(testNums) {
  const manifest = new Map(load('manifest.json', []).map((m) => [m.label, m]));
  const key = load('key.json', {});
  const pages = load('pages.json', []);
  const names = new Map(load('tests.json', []).map((t) => [Number(t.test), t]));
  // Баталгаажсан түлхүүрийн алдаа (key-fixes.json) — анхны утга таарвал л засна
  const fixes = Object.fromEntries(Object.entries(load('key-fixes.json', {})).filter(([k]) => !k.startsWith('_')));
  const errors = [];
  const warnings = [];
  const tests = [];
  for (const n of testNums) {
    const meta = names.get(n);
    const name = meta?.name || TEST_NAMES[n];
    if (!name) errors.push(`Тест ${n}: нэр алга (tests.json)`);
    for (const v of ['A', 'B']) {
      const t = `${n}${v}`;
      const file = path.join(DIR, 'transcribed', `${t}.json`);
      if (!fs.existsSync(file)) {
        errors.push(`${t}: transcribed/${t}.json алга`);
        continue;
      }
      const items = JSON.parse(fs.readFileSync(file, 'utf8'));
      const k = key[t];
      const nI = Object.keys(k?.I || {}).length;
      const nII = Object.keys(k?.II || {}).length;
      const gotI = items.filter((p) => p.part === 'I').length;
      const gotII = items.filter((p) => p.part === 'II').length;
      if (gotI !== nI || gotII !== nII) errors.push(`${t}: бодлого I ${gotI}/${nI}, II ${gotII}/${nII}`);
      const minutes = Number(pages.find((p) => p.test === t && p.time)?.time) || null;
      const problems = [];
      for (const p of items) {
        const where = `${p.label}`;
        const m = manifest.get(p.label);
        if (!m) errors.push(`${where}: manifest-д алга`);
        for (const e of katexErrors(p.statement)) errors.push(`${where} нөхцөл: ${e}`);
        if (!p.statement || p.statement.trim().length < 5) errors.push(`${where}: нөхцөл хоосон`);
        const row = {
          label: p.label,
          token: `HG1-${p.label}`,
          part: p.part,
          number: p.part === 'II' ? 100 + p.number : p.number,
          statement: p.statement.trim(),
          fig: m?.fig && p.figure !== 'not-needed' ? path.join(DIR, m.fig) : null,
          solution: p.solution || null,
          keyCheck: p.keyCheck || null,
          uncertain: p.uncertain || null,
        };
        if (p.figure === 'missing' || p.figure === 'bad-crop') warnings.push(`${where}: чертеж ${p.figure} — ${p.figureNote || ''}`);
        if (p.keyCheck && p.keyCheck !== 'ok') warnings.push(`${where}: түлхүүр ${p.keyCheck}`);
        if (p.uncertain) warnings.push(`${where}: эргэлзээ — ${p.uncertain}`);
        if (row.fig && !fs.existsSync(row.fig)) errors.push(`${where}: чертежийн файл алга`);
        if (p.part === 'I') {
          const letter = k?.I?.[String(p.number)];
          if (!letter) errors.push(`${where}: түлхүүр алга`);
          if (!Array.isArray(p.choices) || p.choices.length !== 5) errors.push(`${where}: сонголт ${p.choices?.length}`);
          (p.choices || []).forEach((c, i) => {
            for (const e of katexErrors(c)) errors.push(`${where} ${LETTERS[i]}: ${e}`);
            if (!String(c).trim()) errors.push(`${where} ${LETTERS[i]}: хоосон`);
          });
          if (p.answer !== letter) errors.push(`${where}: answer ${p.answer} ≠ түлхүүр ${letter}`);
          let correct = letter;
          const fx = fixes[p.label];
          if (fx) {
            if (fx.original !== letter) errors.push(`${where}: key-fixes анхны ${fx.original} ≠ түлхүүр ${letter}`);
            correct = fx.fixed;
            row.keyFix = `Түлхүүр ${fx.original} → ${fx.fixed}: ${fx.reason}`;
            warnings.push(`${where}: түлхүүр засав ${fx.original} → ${fx.fixed}`);
          }
          row.format = 'CHOICE';
          row.choices = (p.choices || []).map((text, i) => ({ label: LETTERS[i], text: String(text).trim(), isCorrect: LETTERS[i] === correct }));
          row.correctAnswer = row.choices.find((c) => c.isCorrect)?.text ?? '';
        } else {
          const kk = k?.II?.[String(p.number)] || {};
          row.format = 'FILL_NUMBER';
          const fixed = { ...kk };
          const fx = fixes[p.label];
          if (fx) {
            for (const [a, d] of Object.entries(fx.original)) if (String(kk[a]) !== String(d)) errors.push(`${where}: key-fixes ${a}=${d} ≠ түлхүүр ${kk[a]}`);
            // null → тухайн үсгийг хасна (26B-II03: түлхүүрт илүү үсэг)
            for (const [a, d] of Object.entries(fx.fixed)) if (d === null) delete fixed[a]; else fixed[a] = d;
            row.keyFix = `Түлхүүр ${JSON.stringify(fx.original)} → ${JSON.stringify(fx.fixed)}: ${fx.reason}`;
            warnings.push(`${where}: түлхүүр засав ${JSON.stringify(fx.original)} → ${JSON.stringify(fx.fixed)}`);
          }
          const slotsText = [...p.statement.matchAll(/\[([a-z]{1,8})\]/g)].map((x) => x[1]);
          const letters = [...new Set(slotsText.join('').split(''))].sort().join('');
          const keyLetters = Object.keys(fixed).sort().join('');
          if (letters !== keyLetters) errors.push(`${where}: нүд «${letters}» ≠ түлхүүр «${keyLetters}»`);
          row.correctAnswer = Object.fromEntries(Object.entries(fixed).map(([a, d]) => [a, String(d)]));
        }
        problems.push(row);
      }
      tests.push({ test: n, variant: v, label: t, name, minutes, problems });
    }
  }
  return { tests, errors, warnings };
}

async function main() {
  const nums = (arg('tests') || '').split(',').map(Number).filter(Boolean);
  if (!nums.length) throw new Error('--tests=4,35 гэж өг');
  const { tests, errors, warnings } = buildPlan(nums);
  for (const t of tests) {
    const nf = t.problems.filter((p) => p.fig).length;
    console.log(`${t.label}  «${t.name}»  ${t.minutes ?? '?'} мин  бодлого ${t.problems.length} (чертеж ${nf})`);
  }
  if (warnings.length) console.log(`\nАНХААРУУЛГА (${warnings.length}):\n  ` + warnings.join('\n  '));
  if (errors.length) {
    console.log(`\nАЛДАА (${errors.length}):\n  ` + errors.join('\n  '));
    process.exit(1);
  }
  if (!COMMIT) {
    console.log('\nDRY-RUN — алдаагүй. --commit-оор бичнэ.');
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const admin =
      (await prisma.user.findUnique({ where: { phone: '70000001' } })) ??
      (await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } }));
    if (!admin) throw new Error('ADMIN алга');
    const book = await prisma.book.upsert({
      where: { code: BOOK.code },
      update: { title: BOOK.title, sourceLabel: BOOK.sourceLabel, archived: false, deletedAt: null },
      create: { code: BOOK.code, title: BOOK.title, sourceLabel: BOOK.sourceLabel },
    });
    const access = arg('access');
    for (const t of tests) {
      // Бүлэг: «<нэр> · Тест N» (номын сан « · »-ээр сэдэв/тест болгон бүлэглэнэ)
      const chapterTitle = `${t.name} · Тест ${t.test}`;
      const ch =
        (await prisma.chapter.findFirst({ where: { bookId: book.id, title: chapterTitle } })) ??
        (await prisma.chapter.create({ data: { bookId: book.id, title: chapterTitle, order: t.test, grade: 12, freePreview: false } }));
      await prisma.chapter.update({ where: { id: ch.id }, data: { order: t.test } });

      const ids = [];
      for (const p of t.problems) {
        let imageKey = null;
        if (p.fig) {
          imageKey = `hg1-${p.label.toLowerCase()}.png`;
          const bytes = fs.readFileSync(p.fig);
          await prisma.storedFile.upsert({
            where: { key: imageKey },
            update: { bytes, size: bytes.length, mime: 'image/png' },
            create: { key: imageKey, bytes, size: bytes.length, mime: 'image/png' },
          });
        }
        const data = {
          chapterId: ch.id,
          number: p.number,
          format: p.format,
          statementText: p.statement,
          imageKey,
          choices: require('../dist/src/generated/prisma/client').Prisma.DbNull,
          correctAnswer: p.correctAnswer,
          points: 1,
        };
        const row = await prisma.problem.upsert({
          where: { token: p.token },
          update: data,
          create: { token: p.token, createdById: admin.id, ...data },
        });
        await prisma.problemChoice.deleteMany({ where: { problemId: row.id } });
        if (p.format === 'CHOICE') {
          await prisma.problemChoice.createMany({
            data: p.choices.map((c, i) => ({
              problemId: row.id,
              label: c.label,
              text: c.text,
              isCorrect: c.isCorrect,
              mistakeType: c.isCorrect ? 'NONE' : 'OTHER',
              order: i + 1,
            })),
          });
        }
        // keyCheck зөрсөн ч key-fixes-ээр зассан бол хариу зөв; эзэн баталтал REVIEW_REQUIRED
        const keyOk = (!p.keyCheck || p.keyCheck === 'ok') && !p.keyFix;
        const analysis = {
          status: keyOk && !p.uncertain ? 'AUTO_DRAFT' : 'REVIEW_REQUIRED',
          answerKeyStatus: keyOk ? 'VERIFIED' : 'REVIEW_REQUIRED',
          confidence: keyOk ? 0.9 : 0.5,
          sourcePath: 'Хавтгайн геометр-1-р дэвтэр.pdf',
          sourceVariant: t.variant,
          topic: t.name,
          subtopic: `Тест ${t.test}`,
          solutionOutline: p.solution,
          auditNotes: [p.keyFix, p.keyCheck && p.keyCheck !== 'ok' ? p.keyCheck : null, p.uncertain].filter(Boolean),
        };
        await prisma.problemAnalysis.upsert({
          where: { problemId: row.id },
          update: analysis,
          create: {
            problemId: row.id,
            ...analysis,
            skills: [],
            methods: [],
            formulas: [],
            domainNotes: [],
            signRules: [],
            commonMistakes: [],
          },
        });
        ids.push(row.id);
      }
      const groupKey = `HG1 Тест ${t.test}`;
      const testData = {
        title: `Тест ${t.test} — ${t.name}`,
        type: 'CHAPTER_EXAM',
        gradingMode: 'AUTO',
        chapterId: ch.id,
        timeLimitMin: t.minutes,
        groupKey,
        variantLabel: t.variant,
        createdById: admin.id,
      };
      const existing = await prisma.test.findFirst({ where: { groupKey, variantLabel: t.variant } });
      const test = existing
        ? await prisma.test.update({ where: { id: existing.id }, data: testData })
        : await prisma.test.create({ data: testData });
      await prisma.testProblem.deleteMany({ where: { testId: test.id } });
      await prisma.testProblem.createMany({
        data: ids.map((problemId, i) => ({ testId: test.id, problemId, order: i + 1, points: 1 })),
      });
      if (access) {
        await prisma.testAccess.createMany({ data: [{ testId: test.id, classroomId: access }], skipDuplicates: true });
      }
      console.log(`БИЧИВ ${t.label}: тест ${test.id}, ${ids.length} бодлого`);
    }
    // Нэр солигдсоны дараа үлдсэн хоосон бүлэг (зөвхөн HG1 номынх)
    const emptied = await prisma.chapter.deleteMany({
      where: {
        bookId: book.id,
        problems: { none: {} },
        tests: { none: {} },
        theories: { none: {} },
        lessonPackets: { none: {} },
        videos: { none: {} },
      },
    });
    if (emptied.count) console.log(`Хоосон бүлэг устгав: ${emptied.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
