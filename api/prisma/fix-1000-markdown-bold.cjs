/* eslint-disable */
/**
 * «1000 бодлого» (Book code 1000): нөхцөлийн markdown тод бичгийг («**I.**», «**II.**» …)
 * энгийн текст болгоно — эзний дүрэм: бодлогын текстэд markdown хэрэглэхгүй.
 *   «**X**» → «X» (X нь од, мөр шилжилтгүй). Нөхцөл (statementText), бүтэцтэй сонголт
 *   (ProblemChoice.text), legacy `choices`, string `correctAnswer` — бүгдэд ижил хувиргалт.
 *
 * Аюулгүй байдал: хувиргалтын өмнө/дараах $…$ томьёонууд ЯГ ижил байх ёстой, шинэ текст
 * KaTeX-ээр (web/node_modules/katex, throwOnError, strict 'ignore') алдаагүй задрах ёстой,
 * хосгүй «**» үлдэх ёсгүй — эс бөгөөс тухайн бодлогыг ХӨНДӨХГҮЙ (тайланд гарна).
 * Бодлого бүр нэг transaction, version +1.
 *
 *   node prisma/fix-1000-markdown-bold.cjs            # DRY-RUN
 *   node prisma/fix-1000-markdown-bold.cjs --commit
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const COMMIT = process.argv.includes('--commit');
const BOLD = /\*\*([^*\n]+?)\*\*/g;

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
const mathOf = (s) => segments(s).filter((x) => x.t === 'math').map((x) => (x.display ? '$$' : '$') + x.v);
function katexOk(s) {
  for (const x of segments(s)) {
    if (x.t !== 'math') continue;
    try {
      katex.renderToString(x.v, { throwOnError: true, strict: 'ignore', displayMode: x.display, maxSize: 20, maxExpand: 1000 });
    } catch (e) {
      return `KaTeX «${x.v.slice(0, 50)}»: ${String(e.message).slice(0, 80)}`;
    }
  }
  return null;
}

/** { value, error } — өөрчлөгдөхгүй бол value === input. */
function unbold(input) {
  if (typeof input !== 'string' || !input.includes('**')) return { value: input };
  const out = input.replace(BOLD, '$1');
  if (out.includes('**')) return { value: input, error: 'хосгүй «**» үлдэв' };
  if (JSON.stringify(mathOf(out)) !== JSON.stringify(mathOf(input))) return { value: input, error: 'томьёо өөрчлөгдөхөөр байна' };
  if ((out.match(/\$/g) || []).length % 2) return { value: input, error: '$ тэгш биш' };
  const k = katexOk(out);
  if (k) return { value: input, error: k };
  return { value: out };
}

(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const book = await prisma.book.findUnique({ where: { code: '1000' }, select: { id: true } });
    if (!book) throw new Error('1000 ном алга');
    const probs = await prisma.problem.findMany({
      where: { chapter: { bookId: book.id } },
      select: { id: true, token: true, statementText: true, choices: true, correctAnswer: true, choiceOptions: { select: { id: true, text: true } } },
      orderBy: { token: 'asc' },
    });
    const plan = [];
    const skipped = [];
    for (const p of probs) {
      const errs = [];
      const st = unbold(p.statementText);
      if (st.error) errs.push(`statement: ${st.error}`);
      const opts = p.choiceOptions.map((c) => ({ id: c.id, ...unbold(c.text), before: c.text })).filter((c) => c.error || c.value !== c.before);
      opts.filter((c) => c.error).forEach((c) => errs.push(`choice: ${c.error}`));
      const legacy = Array.isArray(p.choices) ? p.choices.map((c) => (typeof c === 'string' ? unbold(c) : { value: c })) : null;
      (legacy || []).filter((c) => c.error).forEach((c) => errs.push(`legacy: ${c.error}`));
      const ans = typeof p.correctAnswer === 'string' ? unbold(p.correctAnswer) : { value: p.correctAnswer };
      if (ans.error) errs.push(`answer: ${ans.error}`);
      const legacyAfter = legacy ? legacy.map((c) => c.value) : p.choices;
      const changed = st.value !== p.statementText || opts.some((c) => !c.error) || JSON.stringify(legacyAfter) !== JSON.stringify(p.choices) || ans.value !== p.correctAnswer;
      if (errs.length) { skipped.push(`${p.token}: ${errs.join('; ')}`); continue; }
      if (!changed) continue;
      // legacy хариу сонголттой тэнцүү байсан бол тэнцүү хэвээр байх ёстой
      if (Array.isArray(p.choices) && typeof p.correctAnswer === 'string' && p.choices.includes(p.correctAnswer) && !legacyAfter.includes(ans.value)) {
        skipped.push(`${p.token}: хариу–сонголтын тэнцүү байдал алдагдана`);
        continue;
      }
      plan.push({ id: p.id, token: p.token, before: p.statementText, statement: st.value !== p.statementText ? st.value : null, opts: opts.filter((c) => !c.error), legacy: JSON.stringify(legacyAfter) !== JSON.stringify(p.choices) ? legacyAfter : null, answer: ans.value !== p.correctAnswer ? ans.value : undefined });
    }
    const by = {};
    for (const x of plan) { const k = x.token.split('-')[1]; by[k] = (by[k] || 0) + 1; }
    console.log(`1000 ном: ${probs.length} бодлого; засах ${plan.length} (нөхцөл ${plan.filter((x) => x.statement).length}, сонголт ${plan.reduce((s, x) => s + x.opts.length, 0)}, legacy ${plan.filter((x) => x.legacy).length}, хариу ${plan.filter((x) => x.answer !== undefined).length})`);
    console.log('тестээр:', JSON.stringify(by));
    if (skipped.length) console.log(`\nАЛГАСАВ (${skipped.length}):\n  ` + skipped.join('\n  '));
    for (const x of plan.filter((y) => y.statement).slice(0, 3)) {
      const i = x.before.indexOf('**');
      console.log(`\n${x.token}\n  - ${JSON.stringify(x.before.slice(Math.max(0, i - 10), i + 60))}\n  + ${JSON.stringify(x.statement.slice(Math.max(0, i - 10), i + 56))}`);
    }
    if (!COMMIT) { console.log('\nDRY-RUN — ӨС-д юу ч бичээгүй. --commit-оор бичнэ.'); return; }
    const now = new Date();
    let n = 0;
    for (const x of plan) {
      await prisma.$transaction(async (tx) => {
        const data = { version: { increment: 1 }, updatedAt: now };
        if (x.statement) data.statementText = x.statement;
        if (x.legacy) data.choices = x.legacy;
        if (x.answer !== undefined) data.correctAnswer = x.answer;
        await tx.problem.update({ where: { id: x.id }, data });
        for (const o of x.opts) await tx.problemChoice.update({ where: { id: o.id }, data: { text: o.value } });
      });
      n++;
    }
    console.log(`\nCOMMIT: ${n} бодлого засагдлаа.`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => { console.error(e); process.exit(1); });
