/* eslint-disable */
/**
 * Бодлогын агуулгын аудит (2026-10-18): бүх номын нөхцөл, сонголт, хариуг вэбийн MathText-тэй
 * ИЖИЛ дүрмээр KaTeX-ээр задалж, улаанаар гарах алдаа болон эзний дүрэм зөрчсөн зүйлсийг олно.
 *
 *   node prisma/content-audit.cjs [--book=100V3,1000] [--out=/path/audit.json]
 *
 * Зөвхөн уншина — ӨС-д юу ч бичихгүй.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const BOOKS = arg('book') ? arg('book').split(',') : null;
const OUT = arg('out') || '/private/tmp/claude-501/content-audit.json';

// MathText.parse-тай ижил
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

const UNI_MATH = /[−×÷≤≥≠√∛π²³⁴⁵⁰¹·∙•∠°∞∈∉⊂⊆∪∩→⇒⇔±∓≈∑∫△⊥∥′″]/u;
const MATH_ALNUM = /[\u{1D400}-\u{1D7FF}]/u;
const SCORE = /\/\s*\d+\s*оноо\s*\/|\(\s*\d+\s*оноо\s*\)/u;
const CHOICE_MARK = /\(\s*[A-EАБВГД𝐀-𝐄𝐴-𝐸]\s*\)\s*\./u;
const CYR = /[Ѐ-ӿ]/u;

function check(text, where) {
  const issues = [];
  if (typeof text !== 'string' || !text) return issues;
  const dollars = (text.match(/\$/g) || []).length;
  if (dollars % 2) issues.push({ k: 'odd-dollar', where });
  if (/\\bullet|•/.test(text)) issues.push({ k: 'bullet', where });
  if (SCORE.test(text)) issues.push({ k: 'score-text', where });
  if (MATH_ALNUM.test(text)) issues.push({ k: 'math-alnum-unicode', where });
  if (CHOICE_MARK.test(text)) issues.push({ k: 'choice-marker-in-text', where });
  if (/ {4,}|\n[ \t]{3,}/.test(text)) issues.push({ k: 'pdf-whitespace', where });
  for (const s of segments(text)) {
    if (s.t === 'text') {
      if (UNI_MATH.test(s.v)) issues.push({ k: 'unicode-math-outside', where, v: s.v.match(UNI_MATH)[0] });
      continue;
    }
    try {
      katex.renderToString(s.v, { throwOnError: true, strict: 'ignore', displayMode: s.display, maxSize: 20, maxExpand: 1000 });
    } catch (e) {
      issues.push({ k: 'katex-error', where, v: s.v.slice(0, 80), e: String(e.message).slice(0, 120) });
    }
    if (CYR.test(s.v.replace(/\\text\{[^}]*\}|\\mathrm\{[^}]*\}|\\operatorname\{[^}]*\}/g, ''))) issues.push({ k: 'cyrillic-in-math', where, v: s.v.slice(0, 60) });
  }
  return issues;
}

(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const books = await prisma.book.findMany({ where: { deletedAt: null, ...(BOOKS ? { code: { in: BOOKS } } : {}) }, select: { id: true, code: true } });
  const report = [];
  const summary = {};
  for (const b of books) {
    const probs = await prisma.problem.findMany({
      where: { chapter: { bookId: b.id, deletedAt: null } },
      select: { id: true, token: true, format: true, statementText: true, choices: true, correctAnswer: true, choiceOptions: { select: { label: true, text: true } } },
    });
    const counts = {};
    for (const p of probs) {
      const issues = [...check(p.statementText, 'statement')];
      for (const c of p.choiceOptions) issues.push(...check(c.text, `choice ${c.label}`));
      if (Array.isArray(p.choices)) p.choices.forEach((c, i) => issues.push(...check(typeof c === 'string' ? c : '', `legacy ${'ABCDE'[i] || i}`)));
      if (typeof p.correctAnswer === 'string') issues.push(...check(p.correctAnswer, 'answer'));
      if (p.format === 'CHOICE' && p.choiceOptions.length === 0 && !(Array.isArray(p.choices) && p.choices.length)) issues.push({ k: 'choice-missing', where: 'choices' });
      if (issues.length) {
        report.push({ book: b.code, id: p.id, token: p.token, issues });
        for (const k of new Set(issues.map((i) => i.k))) counts[k] = (counts[k] || 0) + 1;
      }
    }
    summary[b.code] = { problems: probs.length, ...counts };
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.table(summary);
  console.log('бичсэн:', OUT, 'асуудалтай бодлого:', report.length);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
