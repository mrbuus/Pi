/**
 * «1000 бодлогын шалгалт» импортер — /Users/mr.buus/Intern/1000-bodlogo/json/*.json
 * (формат: 1000-bodlogo/SPEC.md).
 *
 * Ажиллуулах (api/ дотроос, эхлээд `npm run build` — dist доторх Prisma client-ийг ашиглана):
 *   node prisma/import-1000.cjs                    # ХУУРАЙ: юу өөрчлөгдөхийг л хэвлэнэ
 *   node prisma/import-1000.cjs --commit           # ӨС-д бичнэ
 *   node prisma/import-1000.cjs --only S10A,Y1A    # зөвхөн эдгээр файл
 *   node prisma/import-1000.cjs --dir <json хавтас> # өөр хавтас (зураг нь <хавтас>/../fig/)
 *
 * Юу үүсгэх вэ (бүгд дахин ажиллуулахад давхардахгүй — upsert):
 *   Book  code '1000' (байгаа бол түүнийг)          Chapter  тест бүрд нэг (гарчиг = JSON title)
 *   Problem  token `1000-<ID>-<NN>` (NN = бодлогын дугаар)
 *   ProblemChoice  A–E (isCorrect = answer)          ProblemAnalysis  бодолт = solutionOutline
 *   StoredFile  зураг `fig-<sha256>.png` (ӨС-д, /files/:key-ээр үйлчилнэ; кодыг ил гаргахгүй)
 *   Test  type THOUSAND, groupKey `1000:<ID-үсэггүй>` + variantLabel (ж: 1000:S10 / A)
 *   Problem.scoringGroups  2-р хэсгийн алхмын багц ← JSON `steps` ([{label, boxes, points}]).
 *     Шалгалт: шошго давтагдахгүй, нүд бүр бодлогын [a]… нүдэнд байх, нэг нүд нэг
 *     багцад, бүх нүд хамрагдах, нийлбэр = бодлогын оноо. Буруу бол хадгалахгүй
 *     (бодлого бүхэлдээ нэг багц болж дүгнэгдэнэ) — анхааруулга хэвлэнэ.
 *
 * Хариугүй бодлого (2-р шат хараахан бодоогүй):
 *   Бодлогыг ОРУУЛНА (answerKeyStatus MISSING, correctAnswer = {manualReview:true}),
 *   харин тестийн бүх бодлого хариутай болтол Test.gradingMode = MANUAL — онлайн
 *   эхлүүлэх боломжгүй, ангид оноож болохгүй (сурагч 0/0 гэх мэт шударга бус дүн
 *   авахаас сэргийлнэ). Хариу нөхөгдсөний дараа дахин ажиллуулахад AUTO болно.
 *   confidence = 'low' бол answerKeyStatus = REVIEW_REQUIRED (импортлогдоно, дүнд
 *   тооцогдоно, эргэн харалтад «шалгагдаж байна» гэж харагдана).
 *   Нөхөх хариу: шалгалтын хөдөлгүүр нүднүүдийн цифрийг гарсан дарааллаар нь
 *   залгасан НЭГ стринг илгээдэг тул correctAnswer = "1121" хэлбэрээр хадгална.
 *   Нүд нь нэг цифр биш («-», «36») эсвэл [a]… түлхүүр таарахгүй бол онлайнаар
 *   оруулах боломжгүй → тэр бодлого дүнд тооцогдохгүй (manualReview),
 *   REVIEW_REQUIRED; тест AUTO хэвээр.
 *
 * Сурагч өгсөн тестийн бодлогын БҮРЭЛДЭХҮҮНИЙГ өөрчлөхгүй (анхааруулна); бодлогын
 * агуулга/хариу шинэчлэгдэнэ, гэхдээ өмнөх дүн дахин бодогдохгүй.
 *
 * Өөрчлөлтийн түүх (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md): шинэ эсвэл өөрчлөгдсөн
 * бодлого/тест бүр ContentRevision-д IMPORT хувилбар болж нэг transaction-д
 * бичигдэнэ (dist/src/revisions/revision-store.js — `npm run build` шаардлагатай).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const argValue = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const JSON_DIR = path.resolve(argValue('--dir') || '/Users/mr.buus/Intern/1000-bodlogo/json');
const ROOT_DIR = path.dirname(JSON_DIR); // figure: "fig/S10A-04.png" нь эндээс
const ONLY = (argValue('--only') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const BOOK_CODE = '1000';
const BOOK_TITLE = '1000 Бодлого';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const CONFIDENCE = { high: 0.95, medium: 0.8, low: 0.4 };

// ---------------- Цэвэр туслахууд ----------------

// web/src/components/exam/fillSlots.ts-тэй ИЖИЛ дүрэм: [a], [bc] бүлгүүд гарсан
// дарааллаар, давхардлыг нэг удаа. Шалгалтын хөдөлгүүр нөхөх хариуг нүднүүдийн
// цифрийг энэ дарааллаар залгасан НЭГ стрингээр илгээдэг ("354").
function slotLetters(statement) {
  const seen = new Set();
  const letters = [];
  for (const m of String(statement || '').matchAll(/\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    letters.push(...m[1]);
  }
  return letters;
}

function hasChoiceAnswer(p) {
  return typeof p.answer === 'string' && LETTERS.includes(p.answer.trim().toUpperCase());
}

function hasFillAnswer(p) {
  if (!p.answer || typeof p.answer !== 'object' || Array.isArray(p.answer)) return false;
  const values = Object.values(p.answer);
  return values.length > 0 && values.every((v) => v !== null && v !== undefined && String(v).trim() !== '');
}

function figureList(figure) {
  if (!figure) return [];
  return (Array.isArray(figure) ? figure : [figure]).filter((f) => typeof f === 'string' && f.trim());
}

/**
 * JSON `steps` → Problem.scoringGroups. api/src/tests/exam-items.ts-ийн
 * parseScoringGroups + effectiveGroups-тэй ижил шалгалт (+ бүх нүд хамрагдах).
 * Буруу бол { error } — бодлого бүхэлдээ нэг багц болж дүгнэгдэнэ.
 */
function planScoringGroups(p, letters, points) {
  if (!Array.isArray(p.steps) || p.steps.length === 0) return { groups: null };
  const labels = new Set();
  const used = new Set();
  const groups = [];
  for (const s of p.steps) {
    const label = String((s && s.label) || '').trim();
    const boxes = Array.isArray(s && s.boxes) ? s.boxes.map((b) => String(b)) : [];
    const pts = s && s.points;
    if (!label || label.length > 12 || labels.has(label)) return { error: `алхмын шошго буруу («${label}»)` };
    if (!Number.isInteger(pts) || pts < 0 || pts > 100) return { error: `${label}: оноо буруу (${pts})` };
    if (boxes.length === 0) return { error: `${label}: нүдгүй` };
    for (const b of boxes) {
      if (!/^[a-zA-Zа-яА-ЯёЁ]$/.test(b) || !letters.includes(b)) return { error: `${label}: «${b}» нүд бодлогод алга` };
      if (used.has(b)) return { error: `${label}: «${b}» нүд хоёр багцад` };
      used.add(b);
    }
    labels.add(label);
    groups.push({ label, boxes, points: pts });
  }
  const missing = letters.filter((l) => !used.has(l));
  if (missing.length) return { error: `${missing.join(', ')} нүд аль ч багцад ороогүй` };
  const sum = groups.reduce((acc, g) => acc + g.points, 0);
  if (sum !== points) return { error: `алхмын онооны нийлбэр ${sum}, бодлогын оноо ${points}` };
  return { groups };
}

/** Бодлогыг шалгаж, импортын төлөвлөгөө гаргана. Алдаатай бол { fatal }. */
function planProblem(test, p) {
  const notes = [];
  if (!Number.isInteger(p.n) || p.n < 1) return { fatal: `n буруу (${p.n})` };
  if (!['CHOICE', 'FILL_NUMBER'].includes(p.format)) return { fatal: `${p.n}: format буруу (${p.format})` };
  if (!p.statement || !String(p.statement).trim()) return { fatal: `${p.n}: statement хоосон` };
  const points = Number.isInteger(p.points) && p.points > 0 ? p.points : 1;
  if (points !== p.points) notes.push(`points буруу (${p.points}) — 1 гэж авав`);

  let answered = false;
  let reviewRequired = p.confidence === 'low';
  if (p.confidence === 'low') notes.push('confidence: low');
  let correctAnswer = { manualReview: true, reason: 'ANSWER_KEY_MISSING' };
  let choices = null;
  let scoringGroups = null;
  if (p.format === 'CHOICE') {
    if (!Array.isArray(p.choices) || p.choices.length !== 5) {
      return { fatal: `${p.n}: сонголт 5 байх ёстой (${Array.isArray(p.choices) ? p.choices.length : 0})` };
    }
    choices = p.choices.map((c) => String(c));
    if (hasChoiceAnswer(p)) {
      answered = true;
      correctAnswer = p.answer.trim().toUpperCase();
    }
  } else {
    const letters = slotLetters(p.statement);
    if (letters.length === 0) return { fatal: `${p.n}: нөхөх бодлогод [a] нүд алга` };
    const steps = planScoringGroups(p, letters, points);
    if (steps.error) notes.push(`алхмын багц хадгалагдсангүй: ${steps.error}`);
    else scoringGroups = steps.groups;
    if (hasFillAnswer(p)) {
      const values = letters.map((l) => (p.answer[l] === undefined ? null : String(p.answer[l]).trim()));
      const extra = Object.keys(p.answer).filter((k) => !letters.includes(k));
      // Хариу бий ч онлайн нүдээр оруулах боломжгүй бол: бодлого дүнд
      // тооцогдохгүй (correctAnswer = manualReview), REVIEW_REQUIRED, тест AUTO хэвээр.
      if (values.some((v) => v === null) || extra.length) {
        answered = true;
        reviewRequired = true;
        notes.push(`нүд [${letters.join('')}] ба хариу {${Object.keys(p.answer).join(',')}} таарахгүй — дүнд тооцохгүй`);
      } else if (values.some((v) => !/^[0-9]$/.test(v))) {
        // Шалгалтын нүд зөвхөн нэг цифр авдаг ("-", "36" оруулах боломжгүй).
        answered = true;
        reviewRequired = true;
        notes.push(`нүд бүр нэг цифр биш (${letters.map((l, i) => `${l}=${values[i]}`).join(', ')}) — дүнд тооцохгүй`);
      } else {
        answered = true;
        correctAnswer = values.join('');
      }
    }
  }
  const figures = figureList(p.figure);
  return {
    warnings: notes,
    n: p.n,
    token: `1000-${test.id}-${String(p.n).padStart(2, '0')}`,
    format: p.format,
    statement: String(p.statement),
    points,
    choices,
    scoringGroups,
    correctAnswer,
    answered,
    answerKeyStatus: !answered ? 'MISSING' : reviewRequired ? 'REVIEW_REQUIRED' : 'VERIFIED',
    confidence: CONFIDENCE[p.confidence] ?? 0,
    solution: typeof p.solution === 'string' && p.solution.trim() ? p.solution : null,
    // Сэдэв (1000-bodlogo/TOPICS.md) → SUBTOPIC tag: анализын «сэдвийн эзэмшил»,
    // «Ижил сэдвийн бодлого бодох» үүгээр ажиллана.
    topic: typeof p.topic === 'string' && p.topic.trim() ? p.topic.trim() : null,
    figures,
    notes: [
      ...notes,
      ...(p.notes ? [String(p.notes)] : []),
      ...(p.fixNote ? [`засвар: ${p.fixNote}`] : []),
      ...(p.check ? [`check: ${p.check}`] : []),
    ],
  };
}

/** Олон зурагтай бодлого: PIL-ээр босоо байдлаар нэгтгэнэ (Problem нь ганц imageKey-тэй). */
function stackFigures(files) {
  const out = path.join(os.tmpdir(), `1000-stack-${process.pid}-${Date.now()}.png`);
  const script = [
    'import sys',
    'from PIL import Image',
    'ims=[Image.open(p).convert("RGB") for p in sys.argv[2:]]',
    'w=max(i.width for i in ims); gap=24',
    'h=sum(i.height for i in ims)+gap*(len(ims)-1)',
    'c=Image.new("RGB",(w,h),"white"); y=0',
    'for i in ims:\n  c.paste(i,((w-i.width)//2,y)); y+=i.height+gap',
    'c.save(sys.argv[1])',
  ].join('\n');
  execFileSync('python3', ['-c', script, out, ...files]);
  const bytes = fs.readFileSync(out);
  fs.unlinkSync(out);
  return bytes;
}

function loadFigure(plan) {
  if (plan.figures.length === 0) return null;
  const files = plan.figures.map((f) => path.resolve(ROOT_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length) return { error: `зураг олдсонгүй: ${missing.map((m) => path.relative(ROOT_DIR, m)).join(', ')}` };
  const bytes = files.length > 1 ? stackFigures(files) : fs.readFileSync(files[0]);
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return { error: `PNG биш: ${files[0]}` };
  // Түлхүүр нь агуулгын хэш — тестийн код (S10A-04) зургийн хаягаар ил гарахгүй.
  const key = `fig-${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.png`;
  return { key, bytes };
}

function validateTest(t) {
  const errors = [];
  if (!t || typeof t.id !== 'string' || !/^[A-Z]+\d+[A-Z]$/.test(t.id)) errors.push(`id буруу (${t && t.id})`);
  if (!t.title || !String(t.title).trim()) errors.push('title хоосон');
  if (!Array.isArray(t.problems) || t.problems.length === 0) errors.push('problems хоосон');
  return errors;
}

// jsonb түлхүүрийн дарааллыг өөрчилдөг тул эрэмбэлсэн түлхүүрээр харьцуулна.
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  }
  return v ?? null;
}
function sameJson(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

// ---------------- Үндсэн ----------------

async function main() {
  let PrismaClient, Prisma, PrismaPg;
  try {
    ({ PrismaClient, Prisma } = require('../dist/src/generated/prisma/client'));
    ({ PrismaPg } = require('@prisma/adapter-pg'));
  } catch {
    console.error('dist/ доторх Prisma client олдсонгүй. Эхлээд `npm run build` ажиллуулна уу.');
    process.exit(1);
  }
  let revisions;
  try {
    revisions = require('../dist/src/revisions/revision-store');
  } catch {
    console.error('dist/ доторх өөрчлөлтийн түүхийн модуль олдсонгүй. Эхлээд `npm run build` ажиллуулна уу.');
    process.exit(1);
  }
  const { beginRevisions, commitRevisions, createdHandle } = revisions;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  console.log(`1000 бодлогын шалгалт импортер — ${COMMIT ? 'ӨС-д БИЧНЭ (--commit)' : 'ХУУРАЙ (юу ч бичихгүй)'}`);
  console.log(`JSON: ${JSON_DIR}`);

  if (!fs.existsSync(JSON_DIR)) {
    console.error('JSON хавтас олдсонгүй.');
    process.exit(1);
  }
  let files = fs.readdirSync(JSON_DIR).filter((f) => f.endsWith('.json')).sort();
  if (ONLY.length) files = files.filter((f) => ONLY.includes(path.basename(f, '.json')));
  if (files.length === 0) {
    console.log('Импортлох JSON файл алга.');
    await prisma.$disconnect();
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', archivedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true },
  });
  if (!admin) throw new Error('ADMIN хэрэглэгч олдсонгүй (createdById-д хэрэгтэй)');

  let book = await prisma.book.findUnique({ where: { code: BOOK_CODE }, select: { id: true, title: true } });
  console.log(book ? `Ном: «${book.title}» (байгаа)` : `Ном: «${BOOK_TITLE}» шинээр үүснэ`);
  if (!book && COMMIT) {
    book = await prisma.book.create({ data: { code: BOOK_CODE, title: BOOK_TITLE }, select: { id: true, title: true } });
  }

  const totals = { files: 0, skipped: 0, testsCreated: 0, testsUpdated: 0, testsUnchanged: 0, problemsCreated: 0, problemsUpdated: 0, problemsUnchanged: 0, auto: 0, manual: 0 };

  for (const [fileIndex, file] of files.entries()) {
    totals.files += 1;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, file), 'utf-8'));
    } catch (e) {
      console.log(`\n[АЛГАСАВ] ${file}: JSON уншиж чадсангүй (${e.message})`);
      totals.skipped += 1;
      continue;
    }
    const testErrors = validateTest(data);
    const plans = testErrors.length ? [] : data.problems.map((p) => planProblem(data, p));
    const fatal = [...testErrors, ...plans.filter((p) => p.fatal).map((p) => p.fatal)];
    const ns = plans.filter((p) => !p.fatal).map((p) => p.n);
    if (new Set(ns).size !== ns.length) fatal.push('бодлогын дугаар давхардсан');
    if (fatal.length) {
      console.log(`\n[АЛГАСАВ] ${file}: ${fatal.join('; ')}`);
      totals.skipped += 1;
      continue;
    }
    plans.sort((a, b) => a.n - b.n);

    const figures = new Map();
    for (const plan of plans) {
      const fig = loadFigure(plan);
      if (fig && fig.error) {
        plan.notes.push(fig.error);
        plan.warnings.push(fig.error);
      }
      else if (fig) figures.set(plan.n, fig);
    }

    const answered = plans.filter((p) => p.answered).length;
    const gradingMode = answered === plans.length ? 'AUTO' : 'MANUAL';
    const review = plans.filter((p) => p.answerKeyStatus === 'REVIEW_REQUIRED').map((p) => p.n);
    const missingFig = plans.filter((p) => p.figures.length && !figures.has(p.n)).map((p) => p.n);
    const groupKey = `1000:${data.id.slice(0, -1)}`;
    const variantLabel = data.id.slice(-1);
    const timeLimitMin = Number.isInteger(data.timeLimitMin) && data.timeLimitMin > 0 ? data.timeLimitMin : 90;

    const existingTest = await prisma.test.findFirst({
      where: { type: 'THOUSAND', groupKey, variantLabel, deletedAt: null },
      select: { id: true, title: true, timeLimitMin: true, gradingMode: true, chapterId: true, problems: { select: { problemId: true, order: true, points: true } } },
    });
    const taken = existingTest
      ? (await prisma.testAttemptSession.count({ where: { testId: existingTest.id } })) +
          (await prisma.testResult.count({ where: { testId: existingTest.id } })) >
        0
      : false;
    const existingProblems = await prisma.problem.findMany({
      where: { token: { in: plans.map((p) => p.token) } },
      select: {
        id: true, token: true, chapterId: true, number: true, format: true, statementText: true, imageKey: true, choices: true, correctAnswer: true, points: true, scoringGroups: true,
        choiceOptions: { select: { label: true, text: true, isCorrect: true, order: true }, orderBy: { order: 'asc' } },
        analysis: { select: { answerKeyStatus: true, solutionOutline: true, confidence: true } },
        tags: { where: { tag: { type: 'SUBTOPIC' } }, select: { tag: { select: { name: true } } } },
      },
    });
    const byToken = new Map(existingProblems.map((p) => [p.token, p]));

    console.log(`\n${data.id} «${data.title}» — ${plans.length} бодлого, хариутай ${answered}, ${gradingMode}${existingTest ? (taken ? ' (байгаа, сурагч өгсөн)' : ' (байгаа)') : ' (шинэ)'}`);
    if (review.length) console.log(`  шалгах шаардлагатай (REVIEW_REQUIRED): ${review.join(', ')}`);
    if (missingFig.length) console.log(`  зураг дутуу: ${missingFig.join(', ')}`);
    if (gradingMode === 'MANUAL') console.log(`  хариугүй: ${plans.filter((p) => !p.answered).length} — бүгд бөглөгдөх хүртэл онлайнаар өгөх/ангид оноох боломжгүй`);
    // JSON-ийн notes нь ProblemAnalysis.auditNotes-д хадгалагдана; энд зөвхөн импортын анхааруулга.
    for (const p of plans) for (const w of p.warnings) console.log(`  ${p.n}: ${w}`);

    // Юу өөрчлөгдөхийг тооцно (идемпотент байдлыг харуулна)
    let created = 0, updated = 0, unchanged = 0;
    const diffs = plans.map((plan) => {
      const prev = byToken.get(plan.token);
      const fig = figures.get(plan.n);
      const wantChoices = plan.format === 'CHOICE'
        ? plan.choices.map((text, order) => ({ label: LETTERS[order], text, isCorrect: plan.answered && plan.correctAnswer === LETTERS[order], order }))
        : [];
      if (!prev) { created += 1; return { plan, fig, wantChoices, prev: null, changed: true }; }
      const changed =
        prev.number !== plan.n || prev.format !== plan.format || prev.statementText !== plan.statement ||
        (prev.imageKey ?? null) !== (fig ? fig.key : null) || !sameJson(prev.choices, plan.choices) ||
        !sameJson(prev.correctAnswer, plan.correctAnswer) || prev.points !== plan.points ||
        !sameJson(prev.scoringGroups, plan.scoringGroups) ||
        !sameJson(prev.choiceOptions, wantChoices) || !prev.analysis ||
        prev.analysis.answerKeyStatus !== plan.answerKeyStatus ||
        (prev.analysis.solutionOutline ?? null) !== plan.solution || prev.analysis.confidence !== plan.confidence ||
        !sameJson(prev.tags.map((t) => t.tag.name).sort(), plan.topic ? [plan.topic] : []);
      if (changed) updated += 1; else unchanged += 1;
      return { plan, fig, wantChoices, prev, changed };
    });
    const wantMembers = (problemIds) => plans.map((p, i) => ({ problemId: problemIds[i], order: p.n, points: p.points }));
    const testChanged = !existingTest || existingTest.title !== data.title || existingTest.timeLimitMin !== timeLimitMin || existingTest.gradingMode !== gradingMode;
    console.log(`  бодлого: шинэ ${created}, шинэчлэх ${updated}, өөрчлөлтгүй ${unchanged}; тест: ${!existingTest ? 'шинээр үүснэ' : testChanged ? 'шинэчлэгдэнэ' : 'өөрчлөлтгүй'}`);
    if (taken && (created > 0 || updated > 0)) console.log('  АНХААР: сурагч өгсөн тест — өмнөх дүн дахин бодогдохгүй');

    totals.problemsCreated += created;
    totals.problemsUpdated += updated;
    totals.problemsUnchanged += unchanged;
    totals[gradingMode === 'AUTO' ? 'auto' : 'manual'] += 1;

    if (!COMMIT) {
      if (!existingTest) totals.testsCreated += 1;
      else if (testChanged || created || updated) totals.testsUpdated += 1;
      else totals.testsUnchanged += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // Байгаа тестийн бүлгийг дахин ашиглана (гарчиг өөрчлөгдсөн ч шинэ бүлэг үүсгэхгүй).
      let chapter = existingTest?.chapterId
        ? await tx.chapter.findUnique({ where: { id: existingTest.chapterId }, select: { id: true, title: true } })
        : await tx.chapter.findFirst({ where: { bookId: book.id, title: data.title, deletedAt: null }, select: { id: true, title: true } });
      if (chapter && chapter.title !== data.title) {
        await tx.chapter.update({ where: { id: chapter.id }, data: { title: data.title } });
      }
      if (!chapter) {
        chapter = await tx.chapter.create({ data: { bookId: book.id, title: data.title, order: 100 + fileIndex }, select: { id: true } });
      }
      for (const fig of figures.values()) {
        await tx.storedFile.upsert({
          where: { key: fig.key },
          update: { bytes: fig.bytes, size: fig.bytes.length, mime: 'image/png' },
          create: { key: fig.key, bytes: fig.bytes, size: fig.bytes.length, mime: 'image/png', ownerId: admin.id },
        });
      }
      // Өөрчлөгдөх бодлогыг түгжиж өмнөх төлөвийг авна (түүхэнд IMPORT хувилбар)
      const revHandles = await beginRevisions(
        tx,
        'PROBLEM',
        diffs.filter((d) => d.prev && d.changed).map((d) => d.prev.id),
      );
      const testHandles = existingTest ? await beginRevisions(tx, 'TEST', [existingTest.id]) : [];
      const importActor = { id: admin.id, role: String(admin.role) };
      const importSummary = (computed, handle) =>
        handle.before ? `Импортоор шинэчилсэн: ${computed}` : 'Импортоор нэмсэн';
      const problemIds = [];
      for (const d of diffs) {
        const { plan, fig } = d;
        const fields = {
          chapterId: chapter.id,
          number: plan.n,
          format: plan.format,
          statementText: plan.statement,
          imageKey: fig ? fig.key : null,
          choices: plan.choices ?? Prisma.DbNull,
          correctAnswer: plan.correctAnswer,
          points: plan.points,
          scoringGroups: plan.scoringGroups ?? Prisma.DbNull,
        };
        let id = d.prev ? d.prev.id : null;
        if (!d.prev) {
          id = (await tx.problem.create({ data: { token: plan.token, createdById: admin.id, ...fields }, select: { id: true } })).id;
          revHandles.push(createdHandle('PROBLEM', id));
        } else if (d.changed) {
          await tx.problem.update({ where: { id }, data: fields });
        }
        problemIds.push(id);
        if (!d.changed) continue;
        await tx.problemChoice.deleteMany({ where: { problemId: id } });
        if (d.wantChoices.length) {
          await tx.problemChoice.createMany({ data: d.wantChoices.map((c) => ({ problemId: id, ...c })) });
        }
        const analysis = {
          status: 'AUTO_DRAFT',
          answerKeyStatus: plan.answerKeyStatus,
          confidence: plan.confidence,
          sourcePath: `1000-bodlogo/json/${file}#${plan.n}`,
          sourceVariant: variantLabel,
          topic: plan.topic ?? data.title,
          solutionOutline: plan.solution,
          auditNotes: plan.notes,
        };
        await tx.problemAnalysis.upsert({
          where: { problemId: id },
          update: analysis,
          create: { problemId: id, ...analysis, skills: [], methods: [], formulas: [], domainNotes: [], signRules: [], commonMistakes: [] },
        });
        // Сэдвийн SUBTOPIC tag — бодлого бүрт яг нэг (импорт эзэмшинэ)
        await tx.problemTag.deleteMany({ where: { problemId: id, tag: { type: 'SUBTOPIC' } } });
        if (plan.topic) {
          const tag = await tx.tag.upsert({
            where: { type_name: { type: 'SUBTOPIC', name: plan.topic } },
            update: {},
            create: { type: 'SUBTOPIC', name: plan.topic },
            select: { id: true },
          });
          await tx.problemTag.create({ data: { problemId: id, tagId: tag.id } });
        }
      }

      await commitRevisions(tx, revHandles, { actor: importActor, action: 'IMPORT', summary: importSummary });

      const testData = { title: data.title, timeLimitMin, gradingMode, chapterId: chapter.id };
      if (!existingTest) {
        const createdTest = await tx.test.create({
          data: {
            ...testData,
            type: 'THOUSAND',
            groupKey,
            variantLabel,
            createdById: admin.id,
            isDraft: false,
            problems: { create: wantMembers(problemIds) },
          },
          select: { id: true },
        });
        await commitRevisions(tx, [createdHandle('TEST', createdTest.id)], { actor: importActor, action: 'IMPORT', summary: importSummary });
        totals.testsCreated += 1;
        return;
      }
      const members = wantMembers(problemIds);
      const sameMembers = sameJson(
        [...existingTest.problems].sort((a, b) => a.order - b.order).map((m) => [m.problemId, m.order, m.points]),
        members.map((m) => [m.problemId, m.order, m.points]),
      );
      if (!sameMembers) {
        if (taken) {
          console.log('  АНХААР: сурагч өгсөн тул бодлогын бүрэлдэхүүнийг өөрчлөөгүй');
        } else {
          await tx.testProblem.deleteMany({ where: { testId: existingTest.id } });
          await tx.testProblem.createMany({ data: members.map((m) => ({ testId: existingTest.id, ...m })) });
        }
      }
      if (testChanged) {
        // Хариу дутуу болсон ч өгсөн тестийг MANUAL болгохгүй (өгсөн дүн хэвээр).
        const mode = taken && gradingMode === 'MANUAL' ? existingTest.gradingMode : gradingMode;
        await tx.test.update({ where: { id: existingTest.id }, data: { ...testData, gradingMode: mode } });
      }
      await commitRevisions(tx, testHandles, { actor: importActor, action: 'IMPORT', summary: importSummary });
      if (testChanged || created || updated || !sameMembers) totals.testsUpdated += 1;
      else totals.testsUnchanged += 1;
    }, { timeout: 60_000 });
  }

  console.log('\nДүн:');
  console.log(`  файл ${totals.files}, алгассан ${totals.skipped}`);
  console.log(`  тест: шинэ ${totals.testsCreated}, шинэчлэгдсэн ${totals.testsUpdated}, өөрчлөлтгүй ${totals.testsUnchanged} (AUTO ${totals.auto}, MANUAL ${totals.manual})`);
  console.log(`  бодлого: шинэ ${totals.problemsCreated}, шинэчлэгдсэн ${totals.problemsUpdated}, өөрчлөлтгүй ${totals.problemsUnchanged}`);
  if (!COMMIT) console.log('\nХУУРАЙ горим — ӨС-д юу ч бичээгүй. Бичих бол: node prisma/import-1000.cjs --commit');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
