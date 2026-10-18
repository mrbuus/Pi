/* eslint-disable */
/**
 * LaTeX цэвэрлэгээ (эзний дүрэм 2026-10-18): бүх номын нөхцөл, сонголт, хариуны
 * Word→LaTeX хөрвүүлэлтийн давтагддаг алдааг ДЕТЕРМИНИСТ байдлаар засна.
 *
 *   1) Үржих «\bullet» / «•»  → \cdot (эзний дүрэм: том хар цэг хориотой)
 *   2) Монгол нөхцөлийн зураас томьёонд хасах болсон: «$15 -$ д» → «$15$-д»
 *   3) Хос бус \left / \right хаалт (интервал «]a;b[», «\left\lbrack … » г.м.) — зөвхөн тухайн
 *      томьёо KaTeX-д УНАЖ байгаа үед \left/\right-ийг хасна (хэмжээ л өөрчлөгдөнө)
 *   4) Систем тэгшитгэлийн хаалт «\left\ \begin{array}» → «\left\{ \begin{array}»
 *
 * Засвар бүрийг KaTeX-ээр шалгана: шинэ томьёо задрахгүй бол засварыг ХЭРЭГЛЭХГҮЙ.
 * Legacy `choices` ба string `correctAnswer`-д ИЖИЛ хувиргалт хийнэ (тэнцүү байдал хадгалагдана).
 *
 *   node prisma/fix-latex-hygiene.cjs [--book=100V3,200V3] [--samples=20]   # dry-run
 *   node prisma/fix-latex-hygiene.cjs --book=... --commit
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const COMMIT = process.argv.includes('--commit');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const BOOKS = arg('book') ? arg('book').split(',') : null;
const SAMPLES = Number(arg('samples') || 12);

const ok = (tex, display) => {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: 'ignore', displayMode: display, maxSize: 20, maxExpand: 1000 });
    return true;
  } catch {
    return false;
  }
};

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
const join = (segs) => segs.map((s) => (s.t === 'text' ? s.v : s.display ? `$$${s.v}$$` : `$${s.v}$`)).join('');

// Зөвхөн БОГИНО нөхцөл (-д, -г, -ийн, -ийг, -аас, -тай…) — «-илэрхийллийг» мэт бүтэн үгийг хөндөхгүй
const CYR_START = /^\s*-?\s*[а-яөүё]{1,4}(?=[\s.,;:!?)]|$)/u;

function fixMath(v, display, tags) {
  let x = v;
  if (/\\bullet|•/.test(x)) {
    x = x.replace(/\\bullet\b/g, '\\cdot').replace(/•/g, '\\cdot ');
    tags.add('bullet');
  }
  if (/\\left\\\s+\\begin\{array\}/.test(x)) {
    const y = x.replace(/\\left\\\s+\\begin\{array\}/g, '\\left\\{ \\begin{array}');
    if (ok(y, display) || !ok(x, display)) { x = y; tags.add('system-brace'); }
  }
  if (!ok(x, display)) {
    const y = x
      .replace(/\\left\s*(\\lbrack|\\rbrack|\\lbrace|\\rbrace|\[|\]|\(|\)|\\\{|\\\}|\.)/g, '$1')
      .replace(/\\right\s*(\\lbrack|\\rbrack|\\lbrace|\\rbrace|\[|\]|\(|\)|\\\{|\\\}|\.)/g, '$1')
      .replace(/(^|[^\\])\\\.(?=\s|$)/g, '$1'); // \left. үлдэгдэл
    if (ok(y, display)) { x = y; tags.add('unbalanced-delims'); }
  }
  return x;
}

function fixText(input, tags) {
  if (typeof input !== 'string' || !input) return input;
  const segs = segments(input);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.t === 'text') {
      if (/•/.test(s.v)) { s.v = s.v.replace(/\s*•\s*/g, ' $\\cdot$ '); tags.add('bullet'); }
      // «Бодолт:Эхлээд», «байна.Эндээс» → цэг/хоёр цэгийн дараа зай (зөвхөн ТОМ кирилл үсгийн өмнө;
      // «г.м.» мэт товчлол хөндөгдөхгүй)
      if (/[а-яөүё][.:][А-ЯӨҮЁ]/u.test(s.v)) { s.v = s.v.replace(/([а-яөүё])([.:])([А-ЯӨҮЁ])/gu, '$1$2 $3'); tags.add('punct-space'); }
      continue;
    }
    s.v = fixMath(s.v, s.display, tags);
    // «$15 -$ д» → «$15$-д»: томьёоны сүүлийн хасах + дараагийн текст кирилл үсгээр эхэлбэл
    const next = segs[i + 1];
    if (!s.display && next && next.t === 'text' && /\s*-\s*$/.test(s.v) && CYR_START.test(next.v) && s.v.replace(/\s*-\s*$/, '').trim()) {
      s.v = s.v.replace(/\s*-\s*$/, '');
      next.v = '-' + next.v.replace(/^\s*-?\s*/, '');
      tags.add('suffix-hyphen');
    }
  }
  return join(segs);
}

(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const books = await prisma.book.findMany({ where: { deletedAt: null, ...(BOOKS ? { code: { in: BOOKS } } : {}) }, select: { id: true, code: true } });
  const plan = [];
  const stats = {};
  for (const b of books) {
    const probs = await prisma.problem.findMany({
      where: { chapter: { bookId: b.id, deletedAt: null } },
      select: { id: true, token: true, statementText: true, choices: true, correctAnswer: true, choiceOptions: { select: { id: true, text: true } } },
    });
    for (const p of probs) {
      const tags = new Set();
      const statement = fixText(p.statementText, tags);
      const choices = Array.isArray(p.choices) ? p.choices.map((c) => (typeof c === 'string' ? fixText(c, tags) : c)) : p.choices;
      const answer = typeof p.correctAnswer === 'string' ? fixText(p.correctAnswer, tags) : p.correctAnswer;
      const opts = p.choiceOptions.map((c) => ({ id: c.id, before: c.text, after: fixText(c.text, tags) })).filter((c) => c.after !== c.before);
      const changed =
        statement !== p.statementText ||
        JSON.stringify(choices) !== JSON.stringify(p.choices) ||
        JSON.stringify(answer) !== JSON.stringify(p.correctAnswer) ||
        opts.length > 0;
      if (!changed) continue;
      // Аюулгүй байдал: legacy хариу сонголттой тэнцүү байсан бол тэнцүү хэвээр
      if (Array.isArray(p.choices) && typeof p.correctAnswer === 'string' && p.choices.includes(p.correctAnswer) && !choices.includes(answer)) {
        throw new Error(`${p.token}: хариу сонголттой тэнцүү байдал алдагдлаа`);
      }
      plan.push({ id: p.id, token: p.token, book: b.code, tags: [...tags], statement: statement !== p.statementText ? { before: p.statementText, after: statement } : null, choices, choicesChanged: JSON.stringify(choices) !== JSON.stringify(p.choices), answer, answerChanged: JSON.stringify(answer) !== JSON.stringify(p.correctAnswer), opts });
      stats[b.code] = stats[b.code] || {};
      for (const t of tags) stats[b.code][t] = (stats[b.code][t] || 0) + 1;
    }
  }
  console.table(stats);
  console.log('засах бодлого:', plan.length);
  const pick = plan.filter((x) => x.statement).slice(0, SAMPLES);
  for (const x of pick) {
    const a = x.statement.before, z = x.statement.after;
    let i = 0; while (i < a.length && a[i] === z[i]) i++;
    console.log(`\n${x.token} [${x.tags}]\n  - ${JSON.stringify(a.slice(Math.max(0, i - 30), i + 60))}\n  + ${JSON.stringify(z.slice(Math.max(0, i - 30), i + 60))}`);
  }
  if (!COMMIT) { console.log('\nDRY-RUN — ӨС-д юу ч бичээгүй.'); await prisma.$disconnect(); return; }
  let n = 0;
  for (const x of plan) {
    await prisma.$transaction(async (tx) => {
      const data = { version: { increment: 1 } };
      if (x.statement) data.statementText = x.statement.after;
      if (x.choicesChanged) data.choices = x.choices;
      if (x.answerChanged) data.correctAnswer = x.answer;
      await tx.problem.update({ where: { id: x.id }, data });
      for (const o of x.opts) await tx.problemChoice.update({ where: { id: o.id }, data: { text: o.after } });
    });
    n++;
  }
  console.log('COMMIT:', n, 'бодлого засагдлаа');
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
