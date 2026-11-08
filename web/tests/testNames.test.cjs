// Тестийн нэр товчлох (src/lib/testNames.ts) — node --test tests/testNames.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/testNames.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = { exports: {} };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const { groupTestNames, regroupTopicText } = load();

test('нэг сэдвийн дугаартай тестүүд нэг бүлэг', () => {
  assert.equal(
    groupTestNames([
      'Квадрат тэгшитгэлийн шийдийн хамаарал 1',
      'Квадрат тэгшитгэлийн шийдийн хамаарал 2',
      'Квадрат тэгшитгэлийн шийдийн хамаарал 3',
    ]),
    'Квадрат тэгшитгэлийн шийдийн хамаарал 1, 2, 3',
  );
});

test('өөр сэдвүүд «; »-оор тусдаа, дараалал хадгалагдана', () => {
  assert.equal(
    groupTestNames([
      'Иррационал тэгшитгэл 4',
      'Иррационал тэгшитгэл 5',
      'Иррационал тэгшитгэл 6',
      'Илтгэгч тэгшитгэл 1',
      'Илтгэгч тэгшитгэл 2',
      'Илтгэгч тэгшитгэл 3',
      'Илтгэгч тэгшитгэл 4',
    ]),
    'Иррационал тэгшитгэл 4, 5, 6; Илтгэгч тэгшитгэл 1, 2, 3, 4',
  );
});

test('ганц нэр, хоосон жагсаалт', () => {
  assert.equal(groupTestNames(['Тоо тоолол 1']), 'Тоо тоолол 1');
  assert.equal(groupTestNames([]), '');
  assert.equal(groupTestNames(['', '  ']), '');
});

test('олон оронтой тоо («10») ба тоон дараалал бичсэнээрээ', () => {
  assert.equal(groupTestNames(['Тоо тоолол 9', 'Тоо тоолол 10', 'Тоо тоолол 11']), 'Тоо тоолол 9, 10, 11');
  assert.equal(groupTestNames(['Тоо тоолол 3', 'Тоо тоолол 1']), 'Тоо тоолол 3, 1');
});

test('тоогүй нэр бие даана, тоотой бүлэгтэй нийлэхгүй', () => {
  assert.equal(
    groupTestNames(['Илтгэгч тэгшитгэл', 'Илтгэгч тэгшитгэл 1', 'Илтгэгч тэгшитгэл 2', 'Иррац шалгалт']),
    'Илтгэгч тэгшитгэл; Илтгэгч тэгшитгэл 1, 2; Иррац шалгалт',
  );
});

test('угтвар суурь нэр өөр бүлэг («Тэгшитгэл» ба «Тэгшитгэл систем»)', () => {
  assert.equal(
    groupTestNames(['Тэгшитгэл 1', 'Тэгшитгэл систем 1', 'Тэгшитгэл 2', 'Тэгшитгэл систем 2']),
    'Тэгшитгэл 1, 2; Тэгшитгэл систем 1, 2',
  );
  assert.equal(groupTestNames(['Рациональ тэгшитгэл 1', 'Рациональ тэнцэтгэл биш 1']), 'Рациональ тэгшитгэл 1; Рациональ тэнцэтгэл биш 1');
});

test('холилдсон дараалал — бүлэг анх гарсан байрандаа', () => {
  assert.equal(groupTestNames(['А 1', 'Б 1', 'А 2']), 'А 1, 2; Б 1');
});

test('давхардал, илүү хоосон зай, зөвхөн тоо', () => {
  assert.equal(groupTestNames(['Модуль  1', 'Модуль 1', ' Модуль 2 ']), 'Модуль 1, 2');
  assert.equal(groupTestNames(['5', '5', 'Сэдэв']), '5; Сэдэв');
  assert.equal(groupTestNames(['Тест 1A', 'Тест 1B']), 'Тест 1A; Тест 1B');
});

test('хуучин «, »-тэй гарчгийг товчилно, чөлөөт бичвэрийг эвдэхгүй', () => {
  assert.equal(regroupTopicText('Урвуу функц 1, Урвуу функц 2'), 'Урвуу функц 1, 2');
  assert.equal(regroupTopicText('Урвуу функц 1, Модуль 3'), 'Урвуу функц 1, Модуль 3');
  assert.equal(regroupTopicText('Давталт, шалгалт'), 'Давталт, шалгалт');
  assert.equal(regroupTopicText('Урвуу функц 1, 2'), 'Урвуу функц 1, 2');
  assert.equal(regroupTopicText(null), '');
  assert.equal(regroupTopicText('Сэдэв'), 'Сэдэв');
});
