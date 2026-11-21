/* eslint-disable */
/**
 * Цаасан Нэгдсэн шалгалтын guide JSON → онлайн шалгалт (хувилбар бүрд нэг Test, ижил groupKey).
 * Цэвэр логик: src/tests/paper-exam-to-test.ts (jest-ээр тестэлсэн). Урьдчилан `npm run build` (dist).
 *
 *   node prisma/paper-exam-to-test.cjs prisma/data/paper-exam-guides/negdsen-shalgalt-1.json            # dry-run
 *   node prisma/paper-exam-to-test.cjs <файл> \
 *        --mistakes=prisma/data/paper-exam-guides/negdsen-shalgalt-1-mistakes.draft.json \
 *        --topics=prisma/data/paper-exam-guides/negdsen-shalgalt-1-topics.json --commit
 *
 * Сонголт:
 *   --mistakes=<файл>  буруу сонголтын тайлбар → ProblemChoice.mistakeNote (сурагчид бодолттой ИЖИЛ
 *                      нөхцөлөөр, ProblemAnalysis VERIFIED үед л харагдана)
 *   --topics=<файл>    бодлого бүрийн сэдэв (цаасан шалгалтын импорттой ижил нэр) → SUBTOPIC шошго
 *   --author=<userId>  Problem/Test.createdById (анхдагч: хамгийн эртний ADMIN)
 *   --type=EESH_MOCK   Test.type (EESH_MOCK | CHAPTER_EXAM), анхдагч EESH_MOCK
 *   --minutes=100      Test.timeLimitMin
 *   --no-images        зургийг алгасна (imageKey хоосон)
 *
 * Үр дүн: Test (paperMode = true — сонголт A–E, холихгүй, хувилбарыг сервер онооно;
 * isDraft = true — ангид оноогоогүй, багш «Шалгалт → Тохиргоо»-оос A, B ХОЁУЛАНГ ангид онооно),
 * Problem + ProblemChoice, TestProblem.points, scoringGroups, SUBTOPIC шошго, зураг (StoredFile:
 * S3_BUCKET тохируулсан бол S3, үгүй бол одоо байгаа DB хадгалалт).
 *
 * Аюулгүй: dry-run анхдагч; агуулгын нэг ч алдаатай бол юу ч бичихгүй; ЮУ Ч УСТГАХГҮЙ;
 * давтан ажиллуулахад token / groupKey+variantLabel-аар олж давхардуулахгүй. Сурагч эхлүүлсэн/дүнтэй
 * тестийн бодлого, оноог хөндөхгүй (зөрүүг л хэвлэнэ).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Prisma } = require('../dist/src/generated/prisma/client');
const { planPaperExam } = require('../dist/src/tests/paper-exam-to-test');
const { saveStoredFile, s3Enabled } = require('../dist/src/storage/file-store');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const commit = process.argv.includes('--commit');
const noImages = process.argv.includes('--no-images');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const stable = (v) =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

async function main() {
  if (!file) throw new Error('JSON файлын зам өгнө үү');
  const type = arg('type') || 'EESH_MOCK';
  if (!['EESH_MOCK', 'CHAPTER_EXAM'].includes(type)) throw new Error('--type нь EESH_MOCK эсвэл CHAPTER_EXAM');
  const minutes = arg('minutes') ? Number(arg('minutes')) : 100;
  if (!Number.isInteger(minutes) || minutes <= 0) throw new Error('--minutes эерэг бүхэл тоо');

  const plan = planPaperExam(readJson(file), {
    timeLimitMin: minutes,
    mistakes: arg('mistakes') ? readJson(arg('mistakes')) : null,
    topics: arg('topics') ? readJson(arg('topics')) : null,
    imageHash: (b64) => crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').slice(0, 10),
  });
  plan.warnings.forEach((w) => console.log('  ! ' + w));
  if (plan.errors.length) {
    plan.errors.slice(0, 60).forEach((e) => console.error('  x ' + e));
    throw new Error(`Агуулгын ${plan.errors.length} алдаа — юу ч бичсэнгүй`);
  }

  // ---- Тойм ба түлхүүрийн хүснэгт ----
  console.log(`Шалгалт: ${plan.examTitle}, ${minutes} минут, төрөл ${type}`);
  for (const t of plan.tests) {
    const choice = t.problems.filter((p) => p.format === 'CHOICE');
    const fill = t.problems.filter((p) => p.format === 'FILL_NUMBER');
    const notes = choice.reduce((s, p) => s + p.choices.filter((c) => c.mistakeNote).length, 0);
    const p1 = choice.reduce((s, p) => s + p.points, 0);
    const p2 = fill.reduce((s, p) => s + p.points, 0);
    console.log(
      `\n${t.title} (groupKey «${t.groupKey}», хувилбар ${t.variantLabel}): ${t.problems.length} бодлого — ` +
        `I хэсэг ${choice.length} (${p1} оноо), II хэсэг ${fill.length} (${p2} оноо), нийт ${t.totalPoints} / цаасных ${t.paperPoints} ` +
        `${t.totalPoints === t.paperPoints ? 'ТЭНЦҮҮ' : 'ЗӨРҮҮТЭЙ'}; сонголт ${choice.length * 5}, тайлбар ${notes}, зураг ${t.problems.filter((p) => p.image).length}`,
    );
    const rows = [];
    for (let i = 0; i < choice.length; i += 12) {
      rows.push(
        choice
          .slice(i, i + 12)
          .map((p) => `${String(p.number).padStart(2)}:${p.choices.find((c) => c.isCorrect).label}(${p.points})`)
          .join(' '),
      );
    }
    rows.forEach((r) => console.log('  ' + r));
    for (const p of fill) {
      const groups = p.scoringGroups.map((g) => `${g.label}[${g.boxes.join('')}]=${g.points}`).join(' ');
      console.log(`  ${p.label}: ${Object.entries(p.correctAnswer).map(([k, v]) => `${k}=${v}`).join(' ')}  | ${groups}${p.normalized.length ? `  | нүд хөрвүүлсэн: ${p.normalized.join(', ')}` : ''}`);
    }
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const authorArg = arg('author');
    const author = authorArg
      ? await prisma.user.findUnique({ where: { id: authorArg }, select: { id: true, role: true } })
      : await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true, role: true } });
    if (!author) throw new Error('Зохиогч (--author эсвэл ADMIN) олдсонгүй');

    // ---- Ялгаа ----
    const chapter = await prisma.chapter.findFirst({ where: { title: plan.examTitle, bookId: null, deletedAt: null }, select: { id: true } });
    const tokens = plan.tests.flatMap((t) => t.problems.map((p) => p.token));
    const existingProblems = await prisma.problem.findMany({
      where: { token: { in: tokens } },
      select: {
        id: true, token: true, statementText: true, correctAnswer: true, scoringGroups: true, imageKey: true, deletedAt: true,
        choiceOptions: { select: { label: true, text: true, isCorrect: true, mistakeNote: true, order: true } },
      },
    });
    const problemBy = new Map(existingProblems.map((p) => [p.token, p]));
    const existingTests = await prisma.test.findMany({
      where: { groupKey: plan.examTitle, variantLabel: { in: plan.tests.map((t) => t.variantLabel) }, deletedAt: null },
      select: {
        id: true, variantLabel: true, paperMode: true,
        problems: { select: { problemId: true, points: true, order: true } },
        _count: { select: { attemptSessions: true, results: true } },
      },
    });
    for (const v of plan.tests.map((t) => t.variantLabel)) {
      if (existingTests.filter((t) => t.variantLabel === v).length > 1) throw new Error(`«${plan.examTitle}» ${v} хувилбар 2+ тест — гараар шалгана уу`);
    }
    const testBy = new Map(existingTests.map((t) => [t.variantLabel, t]));
    const imageKeys = plan.tests.flatMap((t) => t.problems.filter((p) => p.image).map((p) => p.image.key));
    const existingFiles = new Set((await prisma.storedFile.findMany({ where: { key: { in: imageKeys } }, select: { key: true } })).map((f) => f.key));

    const counts = { problemsNew: 0, problemsUpdate: 0, problemsSame: 0, problemsLocked: 0, choicesNew: 0, testsNew: 0, testsExisting: 0, linksNew: 0, images: 0 };
    const locked = new Set();
    for (const t of plan.tests) {
      const test = testBy.get(t.variantLabel);
      const taken = test && test._count.attemptSessions + test._count.results > 0;
      if (test) counts.testsExisting += 1;
      else counts.testsNew += 1;
      if (test && !test.paperMode) console.log(`  ! ${t.title}: paperMode асаагүй байна — асаана`);
      for (const p of t.problems) {
        const old = problemBy.get(p.token);
        if (p.image && !noImages && !existingFiles.has(p.image.key)) counts.images += 1;
        if (!old) {
          counts.problemsNew += 1;
          counts.choicesNew += p.choices.length;
        } else if (
          old.statementText !== p.statementText ||
          stable(old.correctAnswer) !== stable(p.correctAnswer) ||
          stable(old.scoringGroups ?? null) !== stable(p.scoringGroups) ||
          stable([...old.choiceOptions].sort((a, b) => a.order - b.order).map((c) => [c.label, c.text, c.isCorrect, c.mistakeNote])) !==
            stable(p.choices.map((c) => [c.label, c.text, c.isCorrect, c.mistakeNote]))
        ) {
          if (taken) {
            counts.problemsLocked += 1;
            locked.add(p.token);
          } else counts.problemsUpdate += 1;
        } else counts.problemsSame += 1;
        if (!test || !old || !test.problems.some((tp) => tp.problemId === old.id)) counts.linksNew += 1;
      }
    }
    console.log(
      `\nСан (${new URL(process.env.DATABASE_URL).host}): бүлэг ${chapter ? 'байгаа' : 'шинэ'}; тест шинэ ${counts.testsNew}, байгаа ${counts.testsExisting}; ` +
        `бодлого шинэ ${counts.problemsNew}, шинэчлэх ${counts.problemsUpdate}, өөрчлөгдөөгүй ${counts.problemsSame}` +
        `${counts.problemsLocked ? `, сурагч өгсөн тул хөндөхгүй ${counts.problemsLocked}` : ''}; сонголт шинэ ${counts.choicesNew}; тестийн бодлогын холбоос шинэ ${counts.linksNew}; ` +
        `зураг ${noImages ? 'алгасна (--no-images)' : `шинэ ${counts.images} (${s3Enabled() ? 'S3' : 'S3 тохируулаагүй — өгөгдлийн сан (storage=db)'})`}`,
    );
    if (!commit) {
      console.log('DRY-RUN — бичихийн тулд --commit нэмнэ');
      return;
    }

    // ---- Бичих (устгалгүй) ----
    const chapterId =
      chapter?.id ?? (await prisma.chapter.create({ data: { title: plan.examTitle, order: 0, freePreview: false }, select: { id: true } })).id;
    const tagIds = new Map();
    for (const name of new Set(plan.tests.flatMap((t) => t.problems.flatMap((p) => p.topics)))) {
      const tag = await prisma.tag.upsert({ where: { type_name: { type: 'SUBTOPIC', name } }, update: {}, create: { type: 'SUBTOPIC', name }, select: { id: true } });
      tagIds.set(name, tag.id);
    }
    for (const t of plan.tests) {
      const existing = testBy.get(t.variantLabel);
      const taken = existing && existing._count.attemptSessions + existing._count.results > 0;
      const idByToken = new Map();
      for (const p of t.problems) {
        let imageKey = null;
        if (p.image && !noImages) {
          imageKey = p.image.key;
          if (!existingFiles.has(imageKey)) {
            await saveStoredFile(prisma, { key: imageKey, mime: p.image.mime, bytes: Buffer.from(p.image.base64, 'base64'), ownerId: author.id, purpose: 'general' });
            existingFiles.add(imageKey);
          }
        }
        const old = problemBy.get(p.token);
        const data = {
          chapterId,
          number: p.number,
          format: p.format,
          statementText: p.statementText,
          imageKey: imageKey ?? old?.imageKey ?? null,
          choices: Prisma.DbNull,
          correctAnswer: p.correctAnswer,
          scoringGroups: p.scoringGroups ?? Prisma.DbNull,
          points: p.points,
        };
        let id = old?.id;
        if (!old) {
          id = (await prisma.problem.create({ data: { ...data, token: p.token, createdById: author.id }, select: { id: true } })).id;
        } else if (!locked.has(p.token) && !taken) {
          await prisma.problem.update({ where: { id: old.id }, data: { ...data, deletedAt: null } });
        }
        if (!locked.has(p.token) && !taken) {
          for (const c of p.choices) {
            await prisma.problemChoice.upsert({
              where: { problemId_label: { problemId: id, label: c.label } },
              update: { text: c.text, isCorrect: c.isCorrect, mistakeNote: c.mistakeNote, order: c.order },
              create: { problemId: id, label: c.label, text: c.text, isCorrect: c.isCorrect, mistakeNote: c.mistakeNote, order: c.order },
            });
          }
        }
        if (p.topics.length) {
          await prisma.problemTag.createMany({ data: p.topics.map((n) => ({ problemId: id, tagId: tagIds.get(n) })), skipDuplicates: true });
        }
        idByToken.set(p.token, id);
      }
      const links = t.problems.map((p) => ({ problemId: idByToken.get(p.token), order: p.order, points: p.points }));
      if (!existing) {
        await prisma.test.create({
          data: {
            title: t.title, type, gradingMode: 'AUTO', timeLimitMin: t.timeLimitMin, groupKey: t.groupKey, variantLabel: t.variantLabel,
            paperMode: true, isDraft: true, createdById: author.id,
            problems: { create: links },
          },
        });
      } else {
        if (!existing.paperMode) await prisma.test.update({ where: { id: existing.id }, data: { paperMode: true } });
        const have = new Map(existing.problems.map((tp) => [tp.problemId, tp]));
        const missing = links.filter((l) => !have.has(l.problemId));
        if (missing.length && taken) console.log(`  ! ${t.title}: сурагч өгсөн тул ${missing.length} бодлого нэмсэнгүй`);
        else if (missing.length) await prisma.testProblem.createMany({ data: missing.map((l) => ({ testId: existing.id, ...l })), skipDuplicates: true });
        if (!taken) {
          for (const l of links) {
            const h = have.get(l.problemId);
            if (h && (h.points !== l.points || h.order !== l.order))
              await prisma.testProblem.update({ where: { testId_problemId: { testId: existing.id, problemId: l.problemId } }, data: { points: l.points, order: l.order } });
          }
        }
      }
    }
    const after = await prisma.test.findMany({
      where: { groupKey: plan.examTitle, deletedAt: null },
      select: { id: true, title: true, variantLabel: true, isDraft: true, paperMode: true, problems: { select: { points: true } } },
      orderBy: { variantLabel: 'asc' },
    });
    for (const t of after) {
      console.log(`Бичлээ: ${t.title} ${t.id} — ${t.problems.length} бодлого, ${t.problems.reduce((s, p) => s + p.points, 0)} оноо, ${t.isDraft ? 'ноорог (ангид оноогоогүй)' : 'нийтэлсэн'}, paperMode=${t.paperMode}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
