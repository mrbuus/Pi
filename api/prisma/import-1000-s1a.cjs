/* eslint-disable */
/**
 * «1000 бодлого · Сорил 1-A» (token 1000-S1A-*) — бодлогын агуулгыг эх PDF-ээс
 * дахин бүтээсэн JSON-оор БАЙГАА бодлогууд дээр нь шинэчилнэ (id, token, тестийн холбоос хэвээр).
 *
 * Эх: /Users/mr.buus/Desktop/Books/1000 бодлого/1000-БОДЛОГО-Сорил-1.2.7A.pdf («Тест 1.2.7-A»)
 * JSON: /Users/mr.buus/Intern/1000-bodlogo/json/S01A.json (1000-bodlogo/SPEC.md формат)
 * Зураг: /Users/mr.buus/Intern/1000-bodlogo/fig/S01A-*.png (PyMuPDF 400dpi)
 *
 * Хуучин агуулга (PDF-ийн хог текст, «A..E» placeholder, хоосон сонголт, manualReview)-ыг
 * бүрэн орлуулна. Бодлого бүр НЭГ transaction:
 *   CHOICE      statementText, format, points, imageKey, choices = DbNull,
 *               correctAnswer = зөв сонголтын текст, ProblemChoice A–E (order 1–5, isCorrect,
 *               зурган сонголтод imageKey), scoringGroups = DbNull
 *   FILL_NUMBER statementText, format, points, imageKey, choices = DbNull,
 *               correctAnswer = { a: '1', b: '1', … } (нүд бүр нэг цифр), ProblemChoice-гүй,
 *               scoringGroups = JSON steps (алхмын оноо)
 *   + version +1, updatedAt; Сорил 1-A тестийн TestProblem.points ≠ points бол тэнцүүлнэ.
 * Зураг StoredFile-д `fig-<sha256[0:24]>.png` түлхүүрээр (import-1000.cjs-тэй ижил — тестийн код ил гарахгүй).
 *
 * Бичихээс ӨМНӨ бүх текстийг KaTeX-ээр (web/node_modules/katex, throwOnError, strict 'ignore') болон
 * эзний дүрмээр (unicode математик тэмдэг, \bullet/•, «/1 оноо/», markdown **) шалгана — нэг ч алдаа
 * байвал юу ч бичихгүй.
 *
 *   node prisma/import-1000-s1a.cjs            # DRY-RUN
 *   node prisma/import-1000-s1a.cjs --commit   # локал ӨС-д бичнэ
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Prisma } = require('../dist/src/generated/prisma/client');

const COMMIT = process.argv.includes('--commit');
const ROOT = '/Users/mr.buus/Intern/1000-bodlogo';
const JSON_PATH = path.join(ROOT, 'json', 'S01A.json');
const TEST_TITLE = '1000 бодлого · Сорил 1-A';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// ---------- Шалгалт (content-audit.cjs / MathText-тэй ижил задаргаа) ----------
function segments(input) {
  const out = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0, m;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: input.slice(last, m.index) });
    out.push({ t: 'math', v: m[1] !== undefined ? m[1] : m[2], display: m[1] !== undefined });
    last = re.lastIndex;
  }
  if (last < input.length) out.push({ t: 'text', v: input.slice(last) });
  return out;
}
const UNI_MATH = /[−×÷≤≥≠√∛π²³⁴⁵⁰¹·∙•∠°∞∈∉⊂⊆∪∩→⇒⇔±∓≈∑∫△⊥∥′″≡]/u;
const MATH_ALNUM = /[\u{1D400}-\u{1D7FF}]/u;
const SCORE = /\/\s*\d+\s*оноо\s*\/|\(\s*\d+\s*оноо\s*\)|оноо\s*\$?\)/u;
const CYR = /[Ѐ-ӿ]/u;

function textIssues(text, where) {
  const issues = [];
  if (typeof text !== 'string') return [`${where}: текст биш`];
  if ((text.match(/\$/g) || []).length % 2) issues.push(`${where}: $ тэгш биш`);
  if (/\\bullet|•/.test(text)) issues.push(`${where}: \\bullet/•`);
  if (/\*\*/.test(text)) issues.push(`${where}: markdown **`);
  if (SCORE.test(text)) issues.push(`${where}: онооны бичвэр`);
  if (MATH_ALNUM.test(text)) issues.push(`${where}: unicode математик үсэг`);
  if (/ {3,}|\n[ \t]+/.test(text)) issues.push(`${where}: PDF-ийн илүү зай`);
  for (const s of segments(text)) {
    if (s.t === 'text') {
      if (UNI_MATH.test(s.v)) issues.push(`${where}: $…$-ээс гадуур unicode тэмдэг «${s.v.match(UNI_MATH)[0]}»`);
      continue;
    }
    try {
      katex.renderToString(s.v, { throwOnError: true, strict: 'ignore', displayMode: s.display, maxSize: 20, maxExpand: 1000 });
    } catch (e) {
      issues.push(`${where}: KaTeX «${s.v.slice(0, 60)}» — ${String(e.message).slice(0, 100)}`);
    }
    if (UNI_MATH.test(s.v)) issues.push(`${where}: томьёонд unicode тэмдэг «${s.v.match(UNI_MATH)[0]}»`);
    if (CYR.test(s.v.replace(/\\text\{[^}]*\}|\\mathrm\{[^}]*\}|\\operatorname\{[^}]*\}/g, ''))) issues.push(`${where}: томьёонд кирилл үг`);
  }
  return issues;
}

// web/src/components/exam/fillSlots.ts ба api/src/tests/grading.ts (fillSlotKeys)-тэй ижил
function slotLetters(statement) {
  const seen = new Set();
  const letters = [];
  for (const m of String(statement || '').matchAll(/\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]|\\lbrack\s*([a-zA-Zа-яА-ЯёЁ]{1,8})\s*\\rbrack/g)) {
    const key = m[1] ?? m[2];
    if (seen.has(key)) continue;
    seen.add(key);
    letters.push(...key);
  }
  return letters;
}

function tokenOf(p) {
  if (p.format === 'FILL_NUMBER') {
    const k = /^II\.(\d)$/.exec(p.label || '');
    if (!k) throw new Error(`#${p.n}: label «${p.label}» II.k биш`);
    return `1000-S1A-II-${k[1]}`;
  }
  return `1000-S1A-${String(p.n).padStart(2, '0')}`;
}

function loadPng(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error(`зураг олдсонгүй: ${file}`);
  const bytes = fs.readFileSync(file);
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) throw new Error(`PNG биш: ${file}`);
  const key = `fig-${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.png`;
  return { key, bytes, rel };
}

/** JSON бодлого → ӨС-ийн төлөвлөгөө (бүх шалгалттай). */
function planProblem(p) {
  const errors = [];
  const where = `#${p.n}`;
  if (!['CHOICE', 'FILL_NUMBER'].includes(p.format)) errors.push(`${where}: format ${p.format}`);
  if (!Number.isInteger(p.points) || p.points < 1) errors.push(`${where}: points ${p.points}`);
  errors.push(...textIssues(p.statement, `${where} statement`));
  const figure = p.figure ? loadPng(p.figure) : null;
  const plan = { n: p.n, token: tokenOf(p), format: p.format, points: p.points, statement: p.statement, figure, errors };

  if (p.format === 'CHOICE') {
    if (!Array.isArray(p.choices) || p.choices.length !== 5) errors.push(`${where}: 5 сонголт биш`);
    const idx = LETTERS.indexOf(String(p.answer || '').trim());
    if (idx < 0) errors.push(`${where}: хариу «${p.answer}» A–E биш`);
    const figs = Array.isArray(p.choiceFigures) ? p.choiceFigures : null;
    if (figs && figs.length !== 5) errors.push(`${where}: choiceFigures 5 биш`);
    plan.options = (p.choices || []).map((text, i) => {
      const t = String(text);
      if (t) errors.push(...textIssues(t, `${where} ${LETTERS[i]}`));
      const img = figs ? loadPng(figs[i]) : null;
      if (!t && !img) errors.push(`${where} ${LETTERS[i]}: текст ч зураг ч алга`);
      return { label: LETTERS[i], text: t, isCorrect: i === idx, order: i + 1, image: img };
    });
    if (new Set(plan.options.map((o) => o.text + '|' + (o.image ? o.image.key : ''))).size !== plan.options.length) errors.push(`${where}: давхардсан сонголт`);
    plan.correctAnswer = idx >= 0 ? plan.options[idx].text : null;
    plan.answerLetter = LETTERS[idx];
    plan.scoringGroups = null;
  } else {
    const letters = slotLetters(p.statement);
    const ans = p.answer && typeof p.answer === 'object' ? p.answer : {};
    if (letters.length === 0) errors.push(`${where}: [a] нүд алга`);
    if (JSON.stringify(Object.keys(ans)) !== JSON.stringify(letters)) errors.push(`${where}: нүд [${letters.join('')}] ба хариу {${Object.keys(ans).join('')}} таарахгүй`);
    for (const [k, v] of Object.entries(ans)) if (!/^[0-9]$/.test(String(v))) errors.push(`${where}: ${k}=«${v}» нэг цифр биш`);
    plan.correctAnswer = Object.fromEntries(letters.map((l) => [l, String(ans[l])]));
    // Алхмын багц (exam-items.ts parseScoringGroups/effectiveGroups-ийн нөхцөл)
    const groups = (p.steps || []).map((s) => ({ label: String(s.label), boxes: s.boxes.map(String), points: s.points }));
    const used = groups.flatMap((g) => g.boxes);
    if (!groups.length) errors.push(`${where}: steps алга`);
    if (new Set(groups.map((g) => g.label)).size !== groups.length) errors.push(`${where}: алхмын шошго давхардсан`);
    if (new Set(used).size !== used.length || JSON.stringify([...used].sort()) !== JSON.stringify([...letters].sort())) errors.push(`${where}: алхмын нүд бүх нүдийг яг нэг удаа хамрахгүй`);
    if (groups.reduce((s, g) => s + g.points, 0) !== p.points) errors.push(`${where}: алхмын онооны нийлбэр ≠ ${p.points}`);
    plan.scoringGroups = groups;
    plan.options = [];
  }
  if (typeof plan.correctAnswer === 'string' && plan.correctAnswer) errors.push(...textIssues(plan.correctAnswer, `${where} correctAnswer`));
  return plan;
}

const short = (v, n = 90) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s && s.length > n ? s.slice(0, n) + '…' : s;
};

(async () => {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  if (data.id !== 'S01A' || !Array.isArray(data.problems)) throw new Error('S01A.json бүтэц буруу');
  const plans = data.problems.map(planProblem);
  const errors = plans.flatMap((p) => p.errors);
  const tokens = plans.map((p) => p.token);
  if (new Set(tokens).size !== tokens.length) errors.push('token давхардсан');
  console.log(`S01A.json: ${plans.length} бодлого (${plans.filter((p) => p.format === 'CHOICE').length} сонгох, ${plans.filter((p) => p.format === 'FILL_NUMBER').length} нөхөх), нийт оноо ${plans.reduce((s, p) => s + p.points, 0)}`);
  if (errors.length) {
    console.log(`\nАЛДАА (${errors.length}) — юу ч бичихгүй:\n  ` + errors.join('\n  '));
    process.exit(1);
  }
  console.log('KaTeX + эзний дүрмийн шалгалт: алдаагүй');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const problems = await prisma.problem.findMany({
      where: { token: { startsWith: '1000-S1A-' } },
      select: {
        id: true, token: true, format: true, points: true, statementText: true, imageKey: true, choices: true, correctAnswer: true, version: true,
        choiceOptions: { select: { label: true, text: true, isCorrect: true }, orderBy: { order: 'asc' } },
      },
    });
    const byToken = new Map(problems.map((p) => [p.token, p]));
    const missing = tokens.filter((t) => !byToken.has(t));
    const extra = problems.map((p) => p.token).filter((t) => !tokens.includes(t));
    if (missing.length) throw new Error(`ӨС-д олдоогүй token: ${missing.join(', ')}`);
    if (extra.length) console.log(`АНХААР: JSON-д ороогүй 1000-S1A token: ${extra.join(', ')} (хөндөхгүй)`);

    const test = await prisma.test.findFirst({ where: { title: TEST_TITLE, deletedAt: null }, select: { id: true, title: true } });
    if (!test) throw new Error(`«${TEST_TITLE}» тест олдсонгүй`);
    const links = await prisma.testProblem.findMany({ where: { testId: test.id }, select: { problemId: true, order: true, points: true } });
    const linkBy = new Map(links.map((l) => [l.problemId, l]));
    const ids = new Set(problems.map((p) => p.id));
    if (links.length !== 40 || links.some((l) => !ids.has(l.problemId))) console.log(`АНХААР: тестийн холбоос ${links.length}, S1A бус бодлого: ${links.filter((l) => !ids.has(l.problemId)).length}`);

    let linkFix = 0;
    for (const pl of plans) {
      const cur = byToken.get(pl.token);
      const link = linkBy.get(cur.id);
      if (!link) throw new Error(`${pl.token}: «${TEST_TITLE}» тестэд холбогдоогүй`);
      pl.id = cur.id;
      pl.link = link;
      if (link.points !== pl.points) linkFix++;
      const curChoices = cur.choiceOptions.length ? cur.choiceOptions.map((c) => `${c.isCorrect ? '*' : ''}${c.text}`).join(' | ') : short(cur.choices, 60);
      console.log(`\n${pl.token} (#${pl.n}, ${pl.format}, ${cur.points}→${pl.points} оноо${link.points !== pl.points ? `, тестийн оноо ${link.points}→${pl.points}` : ''}${pl.figure ? `, зураг ${pl.figure.rel}` : ''})`);
      console.log(`  − ${short(cur.statementText)}`);
      console.log(`  + ${short(pl.statement)}`);
      if (pl.format === 'CHOICE') {
        console.log(`  сонголт − ${short(curChoices, 100)}`);
        console.log(`  сонголт + ${pl.options.map((o) => `${o.isCorrect ? '*' : ''}${o.text || `[зураг ${o.image.rel}]`}`).join(' | ')}`);
      }
      console.log(`  хариу − ${short(cur.correctAnswer, 70)}  + ${short(pl.correctAnswer, 70)}${pl.answerLetter ? ` (${pl.answerLetter})` : ''}`);
    }
    console.log(`\nДҮН: ${plans.length} бодлого шинэчлэгдэнэ; тестийн оноо засах холбоос ${linkFix}; зураг ${plans.filter((p) => p.figure).length} + сонголтын зураг ${plans.reduce((s, p) => s + p.options.filter((o) => o.image).length, 0)}`);
    if (!COMMIT) {
      console.log('\nDRY-RUN — ӨС-д юу ч бичээгүй. --commit-оор бичнэ.');
      return;
    }

    const now = new Date();
    let n = 0;
    for (const pl of plans) {
      await prisma.$transaction(async (tx) => {
        const files = [pl.figure, ...pl.options.map((o) => o.image)].filter(Boolean);
        for (const f of files) {
          await tx.storedFile.upsert({
            where: { key: f.key },
            update: {},
            create: { key: f.key, bytes: f.bytes, size: f.bytes.length, mime: 'image/png' },
          });
        }
        await tx.problemChoice.deleteMany({ where: { problemId: pl.id } });
        await tx.problem.update({
          where: { id: pl.id },
          data: {
            number: pl.n,
            format: pl.format,
            statementText: pl.statement,
            imageKey: pl.figure ? pl.figure.key : null,
            choices: Prisma.DbNull,
            correctAnswer: pl.correctAnswer,
            points: pl.points,
            scoringGroups: pl.scoringGroups ? pl.scoringGroups : Prisma.DbNull,
            version: { increment: 1 },
            updatedAt: now,
          },
        });
        if (pl.options.length) {
          await tx.problemChoice.createMany({
            data: pl.options.map((o) => ({
              problemId: pl.id,
              label: o.label,
              text: o.text,
              isCorrect: o.isCorrect,
              mistakeType: o.isCorrect ? 'NONE' : 'OTHER',
              imageKey: o.image ? o.image.key : null,
              order: o.order,
            })),
          });
        }
        if (pl.link.points !== pl.points) {
          await tx.testProblem.update({
            where: { testId_problemId: { testId: test.id, problemId: pl.id } },
            data: { points: pl.points },
          });
        }
      });
      n++;
    }
    console.log(`\nCOMMIT: ${n} бодлого шинэчлэгдлээ (тест ${test.id}).`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
