// Буцаах/урагшлах стекийн цэвэр reducer (src/lib/undoable.ts) — node --test tests/undoable.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/undoable.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = { exports: {}, Date };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

const U = load();
// vm контекстод үүссэн массив өөр realm-ийнх тул энгийн JSON болгож харьцуулна
const plain = (v) => JSON.parse(JSON.stringify(v));
const set = (state, value, key, at) => U.undoReducer(state, { type: 'set', value, key, at });

test('set → undo → redo алхмуудыг зөв дарааллаар буцаана', () => {
  let s = U.initUndo({ a: 1 });
  s = set(s, { a: 2 }, null, 0);
  s = set(s, { a: 3 }, null, 10);
  assert.equal(U.canUndo(s), true);
  s = U.undoReducer(s, { type: 'undo' });
  assert.deepEqual(s.present, { a: 2 });
  s = U.undoReducer(s, { type: 'undo' });
  assert.deepEqual(s.present, { a: 1 });
  assert.equal(U.canUndo(s), false);
  s = U.undoReducer(s, { type: 'undo' });
  assert.deepEqual(s.present, { a: 1 }, 'хоосон стек дээр юу ч хийхгүй');
  s = U.undoReducer(s, { type: 'redo' });
  s = U.undoReducer(s, { type: 'redo' });
  assert.deepEqual(s.present, { a: 3 });
  assert.equal(U.canRedo(s), false);
});

test('шинэ өөрчлөлт урагшлах стекийг цэвэрлэнэ', () => {
  let s = U.initUndo('x');
  s = set(s, 'y', null, 0);
  s = U.undoReducer(s, { type: 'undo' });
  assert.equal(U.canRedo(s), true);
  s = set(s, 'z', null, 5);
  assert.equal(U.canRedo(s), false);
  assert.deepEqual(plain(s.past), ['x']);
});

test('бичвэр 0.6 сек дотор нэг алхам болно, зогсолтын дараа шинэ алхам', () => {
  let s = U.initUndo({ text: '' });
  s = set(s, { text: 'a' }, 'statement', 1000);
  s = set(s, { text: 'ab' }, 'statement', 1300);
  s = set(s, { text: 'abc' }, 'statement', 1800);
  assert.equal(s.past.length, 1, '3 товч дарсан ч нэг алхам');
  s = set(s, { text: 'abcd' }, 'statement', 1800 + U.COALESCE_MS + 1);
  assert.equal(s.past.length, 2, '0.6 сек зогссоны дараа шинэ алхам');
  s = U.undoReducer(s, { type: 'undo' });
  assert.deepEqual(s.present, { text: 'abc' });
  s = U.undoReducer(s, { type: 'undo' });
  assert.deepEqual(s.present, { text: '' });
});

test('өөр талбар эсвэл break нь нийлүүлэхгүй', () => {
  let s = U.initUndo({ a: '', b: '' });
  s = set(s, { a: '1', b: '' }, 'a', 0);
  s = set(s, { a: '1', b: '2' }, 'b', 100);
  assert.equal(s.past.length, 2);
  s = U.undoReducer(s, { type: 'break' });
  s = set(s, { a: '1', b: '23' }, 'b', 150);
  assert.equal(s.past.length, 3, 'талбараас гарсны дараа шинэ алхам');
});

test('функцээр шинэчлэх нь сүүлийн төлөв дээр ажиллана (хурдан дараалсан дарлт алдагдахгүй)', () => {
  let s = U.initUndo([1]);
  s = U.undoReducer(s, { type: 'set', value: (prev) => [...prev, 2], at: 0 });
  s = U.undoReducer(s, { type: 'set', value: (prev) => [...prev, 3], at: 1 });
  assert.deepEqual(plain(s.present), [1, 2, 3]);
  assert.equal(s.past.length, 2);
});

test('ижил утга алхам нэмэхгүй; reset нь стекийг цэвэрлэж baseline тавина; dirty', () => {
  let s = U.initUndo({ v: 1 });
  s = set(s, { v: 1 }, null, 0);
  assert.equal(s.past.length, 0);
  assert.equal(U.isDirty(s), false);
  s = set(s, { v: 2 }, null, 1);
  assert.equal(U.isDirty(s), true);
  s = U.undoReducer(s, { type: 'undo' });
  assert.equal(U.isDirty(s), false, 'буцааж анхны утгад хүрвэл хадгалаагүй өөрчлөлт алга');
  s = U.undoReducer(s, { type: 'reset', baseline: { v: 9 } });
  assert.deepEqual(plain(s), plain(U.initUndo({ v: 9 })));
});

test('түүхийн урт хязгаартай', () => {
  let s = U.initUndo(0);
  for (let i = 1; i <= 10; i += 1) s = U.undoReducer(s, { type: 'set', value: i, at: i, limit: 3 });
  assert.deepEqual(plain(s.past), [7, 8, 9]);
});

test('товчлол: Cmd/Ctrl+Z, Shift+Cmd+Z, Ctrl+Y; кирилл гарын байрлал', () => {
  const k = (o) => U.classifyUndoKey({ key: 'z', code: 'KeyZ', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...o });
  assert.equal(k({ metaKey: true }), 'undo');
  assert.equal(k({ ctrlKey: true }), 'undo');
  assert.equal(k({ metaKey: true, shiftKey: true, key: 'Z' }), 'redo');
  assert.equal(k({ ctrlKey: true, shiftKey: true, key: 'Z' }), 'redo');
  assert.equal(k({ ctrlKey: true, key: 'y', code: 'KeyY' }), 'redo');
  assert.equal(k({ metaKey: true, key: 'y', code: 'KeyY' }), null, 'Mac Cmd+Y — хөтчийн түүх');
  assert.equal(k({ metaKey: true, key: 'я', code: 'KeyZ' }), 'undo', 'монгол/кирилл гар');
  assert.equal(k({}), null);
  assert.equal(k({ metaKey: true, altKey: true }), null);
  assert.equal(k({ metaKey: true, isComposing: true }), null);
});

test('текст талбар: input/textarea/contenteditable; checkbox, товч биш', () => {
  assert.equal(U.isTextEntry({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(U.isTextEntry({ tagName: 'INPUT', type: 'number' }), true);
  assert.equal(U.isTextEntry({ tagName: 'TEXTAREA' }), true);
  assert.equal(U.isTextEntry({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(U.isTextEntry({ tagName: 'INPUT', type: 'checkbox' }), false);
  assert.equal(U.isTextEntry({ tagName: 'BUTTON' }), false);
  assert.equal(U.isTextEntry({ tagName: 'INPUT', type: 'text', readOnly: true }), false);
  assert.equal(U.isTextEntry(null), false);
});

test('хөтчийн текст буцаалт (replace) шинэ алхам үүсгэхгүй; давхардсан алхмыг алгасна', () => {
  let s = U.initUndo({ correct: 'A', note: '' });
  s = set(s, { correct: 'B', note: '' }, null, 0);
  s = set(s, { correct: 'B', note: 'x=3' }, 'note', 5000);
  // хөтчийн Cmd+Z тэмдэглэлийг арилгав
  s = U.undoReducer(s, { type: 'replace', value: { correct: 'B', note: '' } });
  assert.equal(s.past.length, 2, 'алхам нэмэгдээгүй');
  assert.equal(U.canUndo(s), true);
  s = U.undoReducer(s, { type: 'undo' });
  assert.deepEqual(plain(s.present), { correct: 'A', note: '' }, 'бичвэрийг сэргээхгүй, шууд өмнөх үйлдэл рүү');
  assert.equal(U.canUndo(s), false);
});

test('анхдагч хязгаар 20 алхам — хуучин нь унана (эзэн: хэт олон үйлдэл буцаахгүй)', () => {
  assert.equal(U.HISTORY_LIMIT, 20);
  let s = U.initUndo(0);
  for (let i = 1; i <= 30; i += 1) s = set(s, i, null, i * 1000);
  assert.equal(s.past.length, 20);
  for (let i = 0; i < 25; i += 1) s = U.undoReducer(s, { type: 'undo' });
  assert.equal(s.present, 10); // 30 − 20 — түүнээс цааш буцахгүй
  assert.equal(U.canUndo(s), false);
});
