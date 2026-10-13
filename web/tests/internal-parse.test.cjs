// «Дотоод» задлагч (src/components/internal/parse.ts) ба гарын авлагын жишээ —
// node --test tests/internal-parse.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function compile(rel) {
  const source = fs.readFileSync(path.join(__dirname, '../src', rel), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, require: (name) => { throw new Error(`unexpected import ${name}`); } };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

const P = compile('components/internal/parse.ts');
const G = compile('components/internal/guide.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));

test('гарын авлагын жишээ яг 2 блок болно (prompt ↔ задлагч)', () => {
  const blocks = plain(P.parseDraftText(G.GUIDE_EXAMPLE_OUTPUT));
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], {
    kind: 'CHOICE',
    statement: '$x^{2}-5x+6=0$ тэгшитгэлийн шийдүүдийн нийлбэрийг ол',
    choices: ['$5$', '$-5$', '$6$', '$-6$', '$1$'],
    answer: 'A',
    solution: 'Виетийн теоремоор $x_{1}+x_{2}=5$',
    tag: 'Квадрат тэгшитгэл',
    points: 1,
    notes: [],
  });
  assert.equal(blocks[1].kind, 'NUMERIC');
  assert.equal(blocks[1].answer, '10');
  assert.deepEqual(blocks[1].choices, []);
  assert.equal(blocks[1].tag, 'Илэрхийлэл');
  assert.deepEqual(blocks[1].notes, []);
});

test('prompt-ын загварын мөрүүд гэрээтэй таарна', () => {
  const sample = G.CHATGPT_PROMPT.split('---')[0].split('\n').slice(2).join('\n');
  const [block] = plain(P.parseDraftText(sample));
  assert.equal(block.kind, 'CHOICE');
  assert.equal(block.choices.length, 5);
  assert.equal(block.answer, 'B');
  assert.equal(block.tag, 'сэдвийн нэр');
});

test('ChatGPT-ийн зуршил: \\( \\), ```, **Хариу:**, оршил мөр', () => {
  const text = [
    '```',
    '**1.** Хэрэв \\(a=2\\) бол \\(a^{3}\\)-ийг ол',
    'A) $6$',
    'B) $8$',
    'C) $9$',
    'D) $12$',
    '**Хариу:** B',
    '```',
  ].join('\n');
  const [b] = plain(P.parseDraftText(text));
  assert.equal(b.statement, 'Хэрэв $a=2$ бол $a^{3}$-ийг ол');
  assert.deepEqual(b.choices, ['$6$', '$8$', '$9$', '$12$']);
  assert.equal(b.answer, 'B');
});

test('display \\[ \\] → $$ $$', () => {
  assert.equal(P.normalizeDelimiters('Бод: \\[ x^2 \\]'), 'Бод: $$x^2$$');
});

test('нэг мөрөнд бүх сонголт (Word-ын таб)', () => {
  const [b] = plain(P.parseDraftText('Утгыг ол $2^{3}$\nA. $6$\tB. $8$\tC. $9$\tD. $12$\tE. $16$\nХариу: B'));
  assert.deepEqual(b.choices, ['$6$', '$8$', '$9$', '$12$', '$16$']);
  assert.equal(b.answer, 'B');
});

test('томьёон доторх үсгээр сонголтыг таслахгүй, «A ба B»-г ч', () => {
  const [b] = plain(P.parseDraftText('Ол\nA. $f(B) = 2$ B. $3$\nC. A ба B хоёулаа\nХариу: C'));
  assert.deepEqual(b.choices, ['$f(B) = 2$', '$3$', 'A ба B хоёулаа']);
});

test('кирилл шошго: А Б В Г Д дараалал ба ижил дүрст А В С Е', () => {
  const [m] = plain(P.parseDraftText('Ол\nА. 1\nБ. 2\nВ. 3\nГ. 4\nД. 5\nХариу: В'));
  assert.deepEqual(m.choices, ['1', '2', '3', '4', '5']);
  assert.equal(m.answer, 'C');
  const [h] = plain(P.parseDraftText('Ол\nА. 1\nВ. 2\nС. 3\nD. 4\nЕ. 5\nХариу: Е'));
  assert.deepEqual(h.choices, ['1', '2', '3', '4', '5']);
  assert.equal(h.answer, 'E');
});

test('дугааргүй дараалал: сонголт/хариуны дараах мөр шинэ бодлого', () => {
  const text = 'Эхний бодлого\nA. 1\nB. 2\nХариу: A\nХоёр дахь бодлого\nA. 3\nB. 4\nХариу: B';
  const blocks = plain(P.parseDraftText(text));
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].statement, 'Хоёр дахь бодлого');
  assert.equal(blocks[1].answer, 'B');
});

test('олон мөрт бодолт, сэдэв, оноо', () => {
  const [b] = plain(P.parseDraftText('1. Ол\nХариу: 7\nБодолт: эхний мөр\nхоёр дахь мөр\nСэдэв: Тоо\nОноо: 3'));
  assert.equal(b.solution, 'эхний мөр\nхоёр дахь мөр');
  assert.equal(b.tag, 'Тоо');
  assert.equal(b.points, 3);
});

test('тоон хариу: «4,5» → 4.5, «$-3$» → -3, тоо биш бол тэмдэглэнэ', () => {
  assert.equal(P.parseDraftText('Ол\nХариу: 4,5')[0].answer, '4.5');
  assert.equal(P.parseDraftText('Ол\nХариу: $-3$')[0].answer, '-3');
  const [b] = plain(P.parseDraftText('Ол\nХариу: \\frac{9}{2}'));
  assert.ok(b.notes.includes('Хариу тоо биш — шалгана уу'));
});

test('хариугүй, сонголт дутуу, зураг — тэмдэглэл', () => {
  const [b] = plain(P.parseDraftText('1. Зурагт [Зураг] үзүүлсэн\nA. 1\nC. 3'));
  assert.deepEqual(b.choices, ['1', '', '3']);
  assert.ok(b.notes.includes('B сонголт алга'));
  assert.ok(b.notes.includes('Хариу алга'));
  assert.ok(b.notes.includes('Зураг хавсаргана'));
});

test('хариуг сонголтын утгаар бичсэн бол үсгийг олно', () => {
  const [b] = plain(P.parseDraftText('Ол\nA. $5$\nB. $-5$\nХариу: $-5$'));
  assert.equal(b.answer, 'B');
});

test('юникод → LaTeX: бичвэрт ба томьёонд', () => {
  assert.equal(P.fixUnicodeMath('Талбай πr² байна'), 'Талбай $\\pi r^{2}$ байна');
  assert.equal(P.fixUnicodeMath('$x² + y²$'), '$x^{2} + y^{2}$');
  assert.equal(P.fixUnicodeMath('Өнцөг 30° байна.'), 'Өнцөг $30^{\\circ}$ байна.');
  assert.equal(P.fixUnicodeMath('$a$ ба √2'), '$a$ ба $\\sqrt{2}$');
  assert.equal(P.fixUnicodeMath('2·3 = 6'), '$2\\cdot 3 = 6$');
  assert.equal(P.fixUnicodeMath('Энгийн бичвэр'), 'Энгийн бичвэр');
  assert.deepEqual(plain(P.unicodeGlyphs('x² ба π')), ['²', 'π']);
  const [b] = plain(P.parseDraftText('1. x² − 1 = 0\nХариу: 1'));
  assert.equal(b.statement, '$x^{2} - 1 = 0$');
  assert.ok(b.notes.includes('Юникод тэмдэгтийг LaTeX болгосон'));
});

test('хөрш томьёо «$$» болж нийлэхгүй', () => {
  const out = P.fixUnicodeMath('$a$π');
  assert.ok(!out.includes('$$'), out);
  assert.equal(out, '$a \\pi$');
});

test('Word-ын мөрүүд (хүснэгтийн нүд) нэг бичвэр болно', () => {
  const text = P.wordBlocksToText([
    { text: 'Ол ＄5＄' },
    { text: '', rows: [[[{ text: 'A. 1' }], [{ text: 'B. 2' }]]] },
  ]);
  assert.equal(text, 'Ол $5$\nA. 1\nB. 2');
});

test('хоосон бичвэр → хоосон', () => {
  assert.deepEqual(plain(P.parseDraftText('   \n\n')), []);
  assert.deepEqual(plain(P.parseDraftText('---\n---')), []);
});

test('ChatGPT-ийн оршил, төгсгөлийн тайлбарыг бодлого гэж үзэхгүй', () => {
  const text = 'Энэ бол таны хүссэн бодлогууд:\n```\n1. Ол\nA. 1\nB. 2\nХариу: A\n```\nӨөр бодлого байвал илгээгээрэй!';
  const blocks = plain(P.parseDraftText(text));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].statement, 'Ол');
});

test('дугааргүй ганц тоон бодлого (хариугүй) хэвээр үлдэнэ', () => {
  const blocks = plain(P.parseDraftText('Талбайг ол'));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, 'NUMERIC');
});
