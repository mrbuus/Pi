/* eslint-disable */
/**
 * LaTeX V2 номуудын засалт (2026-10-18): книги 100, 200, 300, 200V3
 *
 * Асуудлууд:
 * 1) Системийн тэгшитгэлүүд: \left\{ ... \end{array} \right → \left\{ ... \end{array} \right.
 * 2) Unicode математик дүрслэл текстэд: 𝑓(𝑥) → f(x), [−∞;a] → [-\\infty;a]
 * 3) Сонголтын тэмдэглэгээ текстэд: "(A). text" → "text"
 * 4) Хэт их зай: 4+ хоосон орон → 1 орон
 * 5) Сондгой доллар: $...$ дот хүүхэлрүү дуусахгүй үлдэх
 *
 *   node prisma/fix-v2-latex.cjs [--book=100,200,300,200V3]   # dry-run
 *   node prisma/fix-v2-latex.cjs --book=... --commit
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const COMMIT = process.argv.includes('--commit');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const BOOKS = arg('book') ? arg('book').split(',') : ['100', '200', '300', '200V3'];
const SAMPLES = Number(arg('samples') || 20);

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

// Unicode math character replacements
const UNICODE_REPLACEMENTS = [
  // Math alphanumerics to ASCII
  ['𝐀', 'A'], ['𝐁', 'B'], ['𝐂', 'C'], ['𝐃', 'D'], ['𝐄', 'E'], ['𝐅', 'F'], ['𝐆', 'G'], ['𝐇', 'H'], ['𝐈', 'I'], ['𝐉', 'J'],
  ['𝐊', 'K'], ['𝐋', 'L'], ['𝐌', 'M'], ['𝐍', 'N'], ['𝐎', 'O'], ['𝐏', 'P'], ['𝐐', 'Q'], ['𝐑', 'R'], ['𝐒', 'S'], ['𝐓', 'T'],
  ['𝐔', 'U'], ['𝐕', 'V'], ['𝐖', 'W'], ['𝐗', 'X'], ['𝐘', 'Y'], ['𝐙', 'Z'],
  ['𝐚', 'a'], ['𝐛', 'b'], ['𝐜', 'c'], ['𝐝', 'd'], ['𝐞', 'e'], ['𝐟', 'f'], ['𝐠', 'g'], ['𝐡', 'h'], ['𝐢', 'i'], ['𝐣', 'j'],
  ['𝐤', 'k'], ['𝐥', 'l'], ['𝐦', 'm'], ['𝐧', 'n'], ['𝐨', 'o'], ['𝐩', 'p'], ['𝐪', 'q'], ['𝐫', 'r'], ['𝐬', 's'], ['𝐭', 't'],
  ['𝐮', 'u'], ['𝐯', 'v'], ['𝐰', 'w'], ['𝐱', 'x'], ['𝐲', 'y'], ['𝐳', 'z'],
  ['𝑓', 'f'], ['𝑥', 'x'], ['𝑦', 'y'], ['𝑧', 'z'],
  // Common math symbols
  ['−', '-'], ['×', 'x'], ['÷', '/'], ['≤', '<='], ['≥', '>='], ['≠', '!='],
  ['π', 'pi'], ['·', '*'], ['∙', '*'], ['°', 'o'],
];

const LATEX_REPLACEMENTS = [
  ['−', '-'], ['×', '\\times'], ['÷', '\\div'], ['≤', '\\leq'], ['≥', '\\geq'], ['≠', '\\neq'],
  ['√', '\\sqrt'], ['π', '\\pi'], ['·', '\\cdot'], ['∙', '\\cdot'], ['∠', '\\angle'], ['°', '^\\circ'],
  ['∞', '\\infty'], ['∈', '\\in'], ['∉', '\\notin'], ['⊂', '\\subset'], ['⊆', '\\subseteq'],
  ['∪', '\\cup'], ['∩', '\\cap'], ['→', '\\to'], ['⇒', '\\Rightarrow'], ['⇔', '\\Leftrightarrow'],
  ['±', '\\pm'], ['∓', '\\mp'], ['≈', '\\approx'], ['∑', '\\sum'], ['∫', '\\int'],
  ['△', '\\triangle'], ['⊥', '\\perp'], ['∥', '\\parallel'],
];

function fixUnicodeInText(text, tags) {
  if (typeof text !== 'string' || !text) return text;
  let modified = false;
  let result = text;

  for (const [u, a] of UNICODE_REPLACEMENTS) {
    if (result.includes(u)) {
      result = result.split(u).join(a);
      modified = true;
    }
  }

  if (modified) {
    tags.add('unicode-fix');
  }
  return result;
}

// Remove choice markers from text: "(A). text" → "text"
function removeChoiceMarkers(text, tags) {
  if (typeof text !== 'string' || !text) return text;
  const before = text;
  let result = text;

  // Match (X). or (X) at the start - X = A-E or Cyrillic letters
  const choicePattern = /^\s*\([\s]*[A-EА-Е𝐀𝐁𝐂𝐃𝐄]\s*\)[\s]*\.?[\s]*/;
  result = result.replace(choicePattern, '');

  if (result !== before) {
    tags.add('choice-marker');
  }
  return result;
}

// Fix excessive whitespace
function fixWhitespace(text, tags) {
  if (typeof text !== 'string' || !text) return text;
  const before = text;
  let result = text.replace(/    +/g, ' ').replace(/\n[ \t]{3,}/g, '\n ');

  if (result !== before) {
    tags.add('whitespace');
  }
  return result;
}

function fixMath(v, display, tags) {
  let x = v;

  // Fix trailing backslash (truncated LaTeX)
  if (x.endsWith(' \\') || x === '\\') {
    x = x.replace(/\s*\\$/, '');
    tags.add('trailing-backslash');
  }

  // Fix missing spaces: \leqx → \leq x (where a variable immediately follows)
  // Only fix cases where letter immediately follows, not already spaced
  x = x.replace(/\\leq([a-z])/g, '\\leq $1');

  // Fix systems of equations with array: \left\{ ... \end{array} \right → \left\{ ... \end{array} \right.
  if (x.includes('\\left') && x.includes('\\end{array}') && x.endsWith('\\right') && !x.endsWith('\\right.')) {
    const y = x.replace(/\\right$/, '\\right.');
    if (ok(y, display)) {
      x = y;
      tags.add('system-equation');
    } else if (!ok(x, display)) {
      x = y;
      tags.add('system-equation');
    }
  }

  // Fix systems with matrix: \left\lbrack ... \end{matrix} \right → \left\lbrack ... \end{matrix} \right]
  if (x.includes('\\left\\lbrack') && x.includes('\\end{matrix}') && x.endsWith('\\right') && !x.endsWith('\\right\\rbrack')) {
    const y = x.replace(/\\right$/, '\\right\\rbrack');
    if (ok(y, display)) {
      x = y;
      tags.add('matrix-equation');
    } else if (!ok(x, display)) {
      x = y;
      tags.add('matrix-equation');
    }
  }

  // Fix general unbalanced \left\right delimiters
  if (!ok(x, display)) {
    const y = x
      .replace(/\\left\s*(\\lbrack|\\rbrack|\\lbrace|\\rbrace|\[|\]|\(|\)|\\\{|\\\}|\.)/g, '$1')
      .replace(/\\right\s*(\\lbrack|\\rbrack|\\lbrace|\\rbrace|\[|\]|\(|\)|\\\{|\\\}|\.)/g, '$1')
      .replace(/(^|[^\\])\\\.(?=\s|$)/g, '$1');
    if (ok(y, display)) {
      x = y;
      tags.add('delim-fix');
    }
  }

  // Replace unicode in math mode
  for (const [u, sym] of LATEX_REPLACEMENTS) {
    if (x.includes(u)) {
      x = x.split(u).join(sym);
    }
  }

  return x;
}

function fixText(input, tags) {
  if (typeof input !== 'string' || !input) return input;

  let text = input;
  text = fixUnicodeInText(text, tags);
  text = removeChoiceMarkers(text, tags);
  text = fixWhitespace(text, tags);

  // Fix LaTeX in math mode
  const segs = segments(text);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.t === 'math') {
      s.v = fixMath(s.v, s.display, tags);
    }
  }

  return join(segs);
}

(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const books = await prisma.book.findMany({ where: { deletedAt: null, code: { in: BOOKS } }, select: { id: true, code: true } });
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

      if (Array.isArray(p.choices) && typeof p.correctAnswer === 'string' && p.choices.includes(p.correctAnswer) && !choices.includes(answer)) {
        throw new Error(`${p.token}: хариу сонголттой тэнцүү байдал алдагдлаа`);
      }

      plan.push({
        id: p.id,
        token: p.token,
        book: b.code,
        tags: [...tags],
        statement: statement !== p.statementText ? { before: p.statementText, after: statement } : null,
        choices,
        choicesChanged: JSON.stringify(choices) !== JSON.stringify(p.choices),
        answer,
        answerChanged: JSON.stringify(answer) !== JSON.stringify(p.correctAnswer),
        opts,
      });

      stats[b.code] = stats[b.code] || {};
      for (const t of tags) stats[b.code][t] = (stats[b.code][t] || 0) + 1;
    }
  }

  console.table(stats);
  console.log('засах бодлого:', plan.length);

  const pick = plan.filter((x) => x.statement).slice(0, SAMPLES);
  for (const x of pick) {
    const a = x.statement.before, z = x.statement.after;
    let i = 0;
    while (i < a.length && a[i] === z[i]) i++;
    console.log(`\n${x.token} [${x.tags}]\n  - ${JSON.stringify(a.slice(Math.max(0, i - 30), i + 60))}\n  + ${JSON.stringify(z.slice(Math.max(0, i - 30), i + 60))}`);
  }

  if (!COMMIT) {
    console.log('\nDRY-RUN — ӨС-д юу ч бичээгүй.');
    await prisma.$disconnect();
    return;
  }

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
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
