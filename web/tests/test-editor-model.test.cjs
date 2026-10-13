// «Тест засах» блокийн цэвэр логик (src/components/test-editor/model.ts) — node --test tests/test-editor-model.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function compile(rel, modules = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', rel), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    exports: {},
    require: (name) => {
      if (modules[name]) return modules[name];
      throw new Error(`unexpected import ${name}`);
    },
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

const fillSlots = compile('components/exam/fillSlots.ts');
const M = compile('components/test-editor/model.ts', { '@/components/exam/fillSlots': fillSlots });
const plain = (v) => JSON.parse(JSON.stringify(v));

const choiceProblem = {
  id: 'p1',
  token: '1000-S22A-01',
  format: 'CHOICE',
  statementText: '$a<b$',
  imageKey: null,
  version: 3,
  choiceOptions: [
    { order: 2, text: ' $2$ ', isCorrect: true, label: 'B' },
    { order: 1, text: '$1$', isCorrect: false, label: 'A' },
  ],
};
const fillProblem = {
  id: 'p2',
  token: '1000-S22A-37',
  format: 'FILL_NUMBER',
  statementText: 'Хариу [ab] ба [c]',
  correctAnswer: '214',
  version: 0,
};

test('contentOf: сонголтыг дарааллаар, нөхөхийн хариуг нүдээр', () => {
  assert.deepEqual(plain(M.contentOf(choiceProblem).choices), [
    { text: '$1$', isCorrect: false },
    { text: ' $2$ ', isCorrect: true },
  ]);
  assert.equal(M.contentOf(fillProblem).fill, '214');
  // хуучин загвар: choices текст + үсгэн хариу
  const legacy = M.contentOf({ id: 'x', token: 't', format: 'CHOICE', choices: ['1', '2', '3'], correctAnswer: 'c' });
  assert.deepEqual(plain(legacy.choices.map((c) => c.isCorrect)), [false, false, true]);
  // объект хариу → нүдний дараалал
  assert.equal(M.fillAnswerOf({ a: '2', b: 1, c: '4' }, 'x [ab] y [c]'), '214');
  assert.equal(M.fillAnswerOf({ ab: '21', c: '4' }, 'x [ab] y [c]'), '214');
});

test('validateContent: зөв хариугүй, хоосон сонголт, дутуу нүд', () => {
  const c = M.newContent('CHOICE');
  c.statement = 'Бодлого';
  assert.equal(M.validateContent(c), 'Хоосон сонголт байна');
  c.choices = c.choices.map((ch, i) => ({ ...ch, text: String(i) }));
  assert.equal(M.validateContent(c), 'Зөв хариуг сонгоно уу'); // анхнаасаа A биш
  c.choices[2].isCorrect = true;
  assert.equal(M.validateContent(c), '');
  const f = M.contentOf(fillProblem);
  assert.equal(M.validateContent(f), '');
  assert.match(M.validateContent({ ...f, fill: '2_4' }), /3 нүдийг/);
  assert.equal(M.validateContent({ ...f, statement: '', imageKey: null }), 'Бодлогын текст хоосон байна');
});

test('дараалал: зөөх, дээр/доор нэмэх, хасах', () => {
  const items = ['a', 'b', 'c', 'd'].map((k) => ({ key: k, problemId: k, points: 1 }));
  assert.deepEqual(plain(M.moveItem(items, 'a', 2).map((i) => i.key)), ['b', 'c', 'a', 'd']);
  assert.deepEqual(plain(M.moveItem(items, 'd', 0).map((i) => i.key)), ['d', 'a', 'b', 'c']);
  const n = { key: 'new-1', problemId: null, points: 2 };
  assert.deepEqual(plain(M.insertItems(items, 1, [n]).map((i) => i.key)), ['a', 'new-1', 'b', 'c', 'd']);
  // аль хэдийн байгааг давхар нэмэхгүй
  assert.equal(M.insertItems(items, 0, [items[2]]).length, 4);
  assert.deepEqual(plain(M.removeItem(items, 'b').map((i) => i.key)), ['a', 'c', 'd']);
});

function state(over = {}) {
  return {
    settings: {
      title: 'Сорил',
      type: 'THOUSAND',
      gradingMode: 'AUTO',
      chapterId: 'ch1',
      subject: 'MATH',
      timeLimit: '100',
      groupKey: '1000:S22',
      variantLabel: 'A',
      pdfKey: '',
      price: '',
    },
    items: [
      { key: 'p1', problemId: 'p1', points: 1 },
      { key: 'p2', problemId: 'p2', points: 7 },
    ],
    classes: ['c1'],
    drafts: {},
    ...over,
  };
}
const ctx = (over = {}) => ({
  originals: { p1: choiceProblem, p2: fillProblem },
  mode: 'FULL',
  isAdmin: false,
  thousand: true,
  chapterId: 'ch1',
  makeToken: (item, i) => `1000-S22A-N${i}`,
  ...over,
});

test('planSave: өөрчлөлтгүй бол юу ч илгээхгүй', () => {
  const s = state();
  assert.deepEqual(plain(M.planSave(s, s, ctx())), { creates: [], updates: [], test: null });
});

test('planSave: зөвхөн өөрчилсөн агуулга, expectedVersion-той', () => {
  const base = state();
  const draft = { ...M.contentOf(choiceProblem), statement: '$a>b$' };
  const plan = M.planSave(state({ drafts: { p1: draft } }), base, ctx());
  assert.deepEqual(plain(plan.updates), [
    { key: 'p1', problemId: 'p1', body: { statementText: '$a>b$' }, expectedVersion: 3 },
  ]);
  assert.equal(plan.test, null);
  // зөв хариу солих → бүх сонголт (сервер ProblemChoice-ийг шинэчилнэ)
  const answer = { ...M.contentOf(choiceProblem), choices: [{ text: '$1$', isCorrect: true }, { text: '$2$', isCorrect: false }] };
  const p2 = M.planSave(state({ drafts: { p1: answer } }), base, ctx());
  assert.deepEqual(plain(p2.updates[0].body), {
    choiceOptions: [
      { text: '$1$', isCorrect: true },
      { text: '$2$', isCorrect: false },
    ],
  });
  // нөхөх хариу
  const fill = { ...M.contentOf(fillProblem), fill: '215' };
  assert.deepEqual(plain(M.planSave(state({ drafts: { p2: fill } }), base, ctx()).updates[0].body), {
    correctAnswer: '215',
  });
});

test('planSave: зөөх/оноо → тестийн бодлогын жагсаалт; 1000-д анги, төрөл илгээхгүй', () => {
  const base = state();
  const moved = state({
    items: [
      { key: 'p2', problemId: 'p2', points: 7 },
      { key: 'p1', problemId: 'p1', points: 2 },
    ],
    classes: ['c1', 'c2'],
    settings: { ...base.settings, type: 'DAILY', title: 'Шинэ нэр ' },
  });
  const plan = M.planSave(moved, base, ctx());
  assert.deepEqual(plain(plan.test), {
    title: 'Шинэ нэр',
    problems: [
      { problemId: 'p2', order: 1, points: 7 },
      { problemId: 'p1', order: 2, points: 2 },
    ],
  });
  // энгийн тестэд анги, төрөл явна
  const normal = M.planSave(moved, base, ctx({ thousand: false }));
  assert.deepEqual(plain(normal.test.classroomIds), ['c1', 'c2']);
  assert.equal(normal.test.type, 'DAILY');
});

test('planSave: шинэ бодлого — үүсгэх биетэй, жагсаалтад түлхүүрээрээ', () => {
  const base = state();
  const c = M.newContent('CHOICE');
  c.statement = 'Шинэ';
  c.choices = [
    { text: '1', isCorrect: false },
    { text: '2', isCorrect: true },
  ];
  const s = state({
    items: [base.items[0], { key: 'new-1', problemId: null, points: 2 }, base.items[1]],
    drafts: { 'new-1': c },
  });
  const plan = M.planSave(s, base, ctx());
  assert.deepEqual(plain(plan.creates), [
    {
      key: 'new-1',
      body: {
        chapterId: 'ch1',
        token: '1000-S22A-N1',
        format: 'CHOICE',
        statementText: 'Шинэ',
        choiceOptions: [
          { text: '1', isCorrect: false },
          { text: '2', isCorrect: true },
        ],
        points: 2,
      },
    },
  ]);
  assert.deepEqual(plain(plan.test.problems.map((p) => p.problemId)), ['p1', 'new-1', 'p2']);
});

test('planSave: сурагч өгсөн (LIMITED) — зөвхөн нэр, хугацаа', () => {
  const base = state();
  const s = state({
    settings: { ...base.settings, timeLimit: '90', gradingMode: 'MANUAL' },
    items: [...base.items].reverse(),
  });
  assert.deepEqual(plain(M.planSave(s, base, ctx({ mode: 'LIMITED' })).test), { timeLimitMin: 90 });
});

test('tokenPrefix ба statsOf', () => {
  assert.equal(M.tokenPrefix(['1000-S22A-12']), '1000-S22A');
  assert.equal(M.tokenPrefix([]), 'T');
  const s = state();
  assert.deepEqual(
    plain(M.statsOf(s.items, (i) => (i.key === 'p1' ? 'CHOICE' : 'FILL_NUMBER'))),
    { choice: 1, fill: 1, open: 0, points: 8 },
  );
});

test("сонголтын зураг: contentOf уншиж, planSave зөвхөн өөрчлөгдсөн үед илгээнэ", () => {
  const server = {
    id: "p1",
    format: "CHOICE",
    statementText: "График",
    version: 3,
    choiceOptions: [
      { order: 1, text: "", isCorrect: true, imageKey: "a.png" },
      { order: 2, text: "", isCorrect: false, imageKey: "b.png" },
    ],
  };
  const c = M.contentOf(server);
  assert.deepEqual(plain(c.choices.map((x) => x.imageKey)), ["a.png", "b.png"]);
  assert.equal(M.validateContent(c), "");
  const draft = { ...c, choices: c.choices.map((x, i) => (i === 1 ? { ...x, imageKey: null } : x)) };
  const body = M.contentPatch(c, draft);
  assert.deepEqual(plain(body.choiceOptions), [
    { text: "", isCorrect: true, imageKey: "a.png" },
    { text: "", isCorrect: false },
  ]);
  assert.deepEqual(plain(M.contentPatch(c, c)), {});
});

test("legacyChoiceList: «A» үсэг эсвэл зөв хариуны текстээр", () => {
  assert.deepEqual(M.legacyChoiceList(["6", "7"], "A").map((x) => x.isCorrect).slice(), [true, false]);
  assert.deepEqual(M.legacyChoiceList(["6", "7"], "7").map((x) => x.isCorrect).slice(), [false, true]);
  assert.equal(M.legacyChoiceList(null, "A").length, 0);
});
