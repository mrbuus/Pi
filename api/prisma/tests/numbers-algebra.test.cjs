/* eslint-disable */
// Content checks, not a general LaTeX engine. Unsupported notation is left to
// validate-formulas.cjs and manual review. Run: node --test <this file>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const source = process.env.FORMULA_FILE || path.join(__dirname, '../data/formulas/numbers-algebra.json');
const data = JSON.parse(fs.readFileSync(source, 'utf8'));
const formulas = new Map(data.formulas.map((f) => [f.slug, f]));

// Evaluate arithmetic directly from the content; no eval, generated code or
// external libraries. Odd roots preserve the sign of a negative radicand.
function evaluate(input, values = {}) {
  const text = input.replace(/\\(?:left|right)/g, '').replace(/\\(?:,|;|!)/g, '')
    .replace(/\\tfrac/g, '\\frac').replace(/\\frac(\d)(\d)/g, '\\frac{$1}{$2}')
    .replace(/\\frac(\d)(?=\{)/g, '\\frac{$1}').replace(/\s+/g, '');
  let i = 0;
  const consume = (token) => text.startsWith(token, i) && ((i += token.length), true);
  function group(open, close) {
    assert.ok(consume(open), `Expected ${open}: ${text.slice(i)}`);
    const result = sum(close);
    assert.ok(consume(close), `Expected ${close}: ${text.slice(i)}`);
    return result;
  }
  function atom() {
    if (text[i] === '(') return group('(', ')');
    if (text[i] === '{') return group('{', '}');
    if (text[i] === '|') return Math.abs(group('|', '|'));
    if (consume('\\frac')) return atom() / atom();
    if (consume('\\sqrt')) {
      const n = text[i] === '[' ? group('[', ']') : 2;
      const a = atom();
      if (a < 0 && Number.isInteger(n) && n % 2 !== 0) return -((-a) ** (1 / n));
      return a ** (1 / n);
    }
    const number = text.slice(i).match(/^\d+(?:\.\d+)?/);
    if (number) { i += number[0].length; return Number(number[0]); }
    const variable = text[i];
    if (variable && Object.hasOwn(values, variable)) { i++; return values[variable]; }
    throw new Error(`Unsupported arithmetic: ${text.slice(i)}`);
  }
  function power() { const a = atom(); return consume('^') ? a ** unary() : a; }
  function unary() { return consume('-') ? -unary() : consume('+') ? unary() : power(); }
  function product(stop) {
    let a = unary();
    while (i < text.length && text[i] !== stop) {
      if (consume('\\cdot') || consume('*')) a *= unary();
      else if (consume('\\div') || consume('/')) a /= unary();
      else if (/^[({|\dA-Za-z]/.test(text.slice(i)) || /^\\(?:frac|sqrt)/.test(text.slice(i))) a *= unary();
      else break;
    }
    return a;
  }
  function sum(stop) {
    let a = product(stop);
    while (i < text.length && text[i] !== stop) {
      if (consume('+')) a += product(stop);
      else if (consume('-')) a -= product(stop);
      else break;
    }
    return a;
  }
  const result = sum();
  if (i !== text.length || !Number.isFinite(result)) throw new Error(`Unsupported or undefined: ${input}`);
  return result;
}
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const math = (text) => [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
const relation = (a, op, b) => op === '=' ? close(a, b) : op === '\\le' ? a <= b : op === '\\ge' ? a >= b : op === '<' ? a < b : a > b;
function numericRelations(formulaData) {
  const failures = [];
  let checked = 0;
  for (const formula of formulaData) for (const [index, ex] of formula.examples.entries()) {
    for (const text of [...ex.steps, ex.answer]) for (const expression of math(text)) {
      const terms = expression.split(/(\\le|\\ge|=|<|>)/);
      for (let i = 0; i + 2 < terms.length; i += 2) {
        let a, b;
        try { a = evaluate(terms[i]); b = evaluate(terms[i + 2]); } catch { continue; }
        checked++;
        if (!relation(a, terms[i + 1], b)) failures.push(`${formula.slug} example ${index + 1}: ${terms.slice(i, i + 3).join(' ')}`);
      }
    }
  }
  return { checked, failures };
}

test('arithmetic reader respects exponent precedence, fractions and signed odd roots', () => {
  for (const [text, expected] of [['-2^2', -4], ['(-2)^2', 4], ['\\frac23', 2 / 3], ['\\frac{1+3}{8}', 0.5], ['\\sqrt[3]{-8}', -2], ['|4-9|', 5]]) {
    assert.ok(close(evaluate(text), expected), text);
  }
  assert.throws(() => evaluate('\\sqrt{-1}'));
  assert.throws(() => evaluate('process.exit()'));
});

test('numeric equalities and inequalities in the actual worked examples hold', (t) => {
  const result = numericRelations(data.formulas);
  assert.ok(result.checked >= 80, `Unexpectedly low supported coverage: ${result.checked}`);
  assert.deepEqual(result.failures, []);
  t.diagnostic(`${result.checked} numeric relations evaluated; unsupported symbolic notation requires manual review.`);
  const oldMistake = structuredClone(formulas.get('am-gm'));
  oldMistake.examples[1].steps = ['$5=\\sqrt{16}$'];
  assert.ok(numericRelations([oldMistake]).failures.length > 0, 'Detect the original arithmetic regression');
});

const products = ['square-sum', 'square-difference-binomial', 'cube-sum-binomial', 'cube-difference-binomial', 'difference-squares', 'sum-cubes', 'difference-cubes', 'square-trinomial', 'sum-squares', 'sum-cubes-short'];
let seed = 20260927;
function integer() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 41 - 20; }

test('all ten stored short-product identities hold at 50 deterministic random inputs', (t) => {
  for (const slug of products) {
    const [left, right] = formulas.get(slug).latex.split('=');
    for (let i = 0; i < 50; i++) {
      const values = { a: integer(), b: integer(), c: integer() };
      assert.ok(close(evaluate(left, values), evaluate(right, values)), `${slug}: ${JSON.stringify(values)}`);
    }
  }
  t.diagnostic('500 identity checks evaluated from the stored LaTeX.');
});

test('stored expanded/factored example answers agree with their problem expressions', (t) => {
  let checked = 0;
  for (const slug of products.slice(0, 8)) for (const ex of formulas.get(slug).examples) {
    const problem = math(ex.problem).at(-1);
    const answer = math(ex.answer)[0];
    for (let i = 0; i < 20; i++) {
      const values = Object.fromEntries('abctuvxy'.split('').map((key) => [key, integer()]));
      assert.ok(close(evaluate(problem, values), evaluate(answer, values)), `${slug}: ${problem} versus ${answer}`);
      checked++;
    }
  }
  t.diagnostic(`${checked} checks across 16 worked polynomial examples.`);
});

test('a question asking for a binomial coefficient returns the coefficient, not the term', () => {
  const ex = formulas.get('newton-binomial').examples.find((item) => item.problem.includes('коэффициент'));
  const [, n] = ex.problem.match(/\(a-b\)\^(\d+)/);
  const [, k] = ex.problem.match(/a\^\d+b\^(\d+)/);
  let coefficients = [1];
  for (let i = 0; i < Number(n); i++) {
    const next = Array(coefficients.length + 1).fill(0);
    coefficients.forEach((value, j) => { next[j] += value; next[j + 1] -= value; });
    coefficients = next;
  }
  assert.equal(evaluate(math(ex.answer)[0]), coefficients[Number(k)]);
});

test('arithmetic quiz choices are distinguishable under varied valid values', (t) => {
  let checked = 0;
  for (const formula of data.formulas) {
    const quiz = formula.quiz[0];
    for (const distractor of quiz.distractors) {
      const comparisons = [];
      for (let i = 0; i < 30; i++) {
        // Positive bases and nonzero denominators satisfy the arithmetic rules.
        const values = { a: i % 7 + 1, b: i % 5 + 2, c: i % 3 + 3, d: i % 11 + 1, m: i % 4 + 1, n: i % 5 + 2, x: i % 8 + 1, y: i % 6 + 2, p: i % 7 + 2, N: i % 9 + 2, P: i % 9 + 2, r: 0.1 };
        if (['abs-product', 'sqrt-square'].includes(formula.slug) && i % 2 === 0) values.a *= -1;
        try { comparisons.push(close(evaluate(quiz.answer, values), evaluate(distractor, values))); } catch { /* Reviewed manually. */ }
      }
      if (comparisons.length >= 20) {
        checked++;
        assert.ok(comparisons.some((same) => !same), `${formula.slug}: equivalent distractor ${distractor}`);
      }
    }
    assert.ok(!formula.quiz[1].prompt.includes('Эхний жишээ'), `${formula.slug}: standalone prompt required`);
  }
  assert.ok(checked >= 70, `Unexpectedly low arithmetic choice coverage: ${checked}`);
  t.diagnostic(`${checked} arithmetic answer/distractor pairs checked; text, modular and relational options reviewed manually.`);
});

test('exponent comparison quiz has exactly one universally correct relational choice', () => {
  const quiz = formulas.get('compare-powers').quiz[0];
  const options = [quiz.answer, ...quiz.distractors];
  const valid = options.filter((option) => [0.2, 0.5, 0.8].every((a) => [-2, 0, 3].every((x) => relation(a ** x, option, a ** (x + 1)))));
  assert.deepEqual(valid, [quiz.answer]);
});
