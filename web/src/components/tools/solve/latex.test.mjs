// LaTeX → задлагчийн бичвэр хөрвүүлэгчийг ЖИНХЭНЭ задлагчаар (core/expr.ts) буцааж уншиж шалгана.
// Ажиллуулах: node --test src/components/tools/solve/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, parseRelation, compile } from "../core/expr.ts";
import { latexToText, parseCalculus, readLatex, LatexError } from "./latex.ts";
import { prepare, splitLines } from "./input.ts";
import { analyze, toRequest } from "./auto.ts";
import { solve } from "./solve.ts";

/** Хөрвүүлээд, задлаад, x (ба y)-ийн утгаар тооцоолж хүлээгдэх утгатай харьцуулна */
function val(latex, scope = {}) {
  const text = latexToText(latex);
  const node = parse(prepare(text));
  return compile(node)(scope);
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);
const cases = [
  // [latex, scope, expected]
  ["\\frac{1}{2}+\\frac{1}{3}", {}, 5 / 6],
  ["\\frac{x+1}{x-1}", { x: 3 }, 2],
  ["\\frac{\\frac{1}{x}}{1+\\frac{1}{x}}", { x: 4 }, 0.2],
  ["\\frac{1}{1+\\frac{1}{1+\\frac{1}{2}}}", {}, 3 / 5],
  ["\\dfrac{3}{4}", {}, 0.75],
  ["\\sqrt{16}", {}, 4],
  ["\\sqrt[3]{27}", {}, 3],
  ["\\sqrt[4]{16}", {}, 2],
  ["\\sqrt{x^{2}+9}", { x: 4 }, 5],
  ["\\sqrt{\\frac{9}{4}}", {}, 1.5],
  ["x^{2}-5x+6", { x: 1 }, 2],
  ["2^{10}", {}, 1024],
  ["x^{\\frac{1}{2}}", { x: 9 }, 3],
  ["e^{2x}", { x: 0.5 }, Math.E],
  ["\\left|x-3\\right|", { x: 1 }, 2],
  ["|2x+1|", { x: -2 }, 3],
  ["\\left\\vert x\\right\\vert+1", { x: -4 }, 5],
  ["\\log_{2}\\left(8\\right)", {}, 3],
  ["\\log_{3}81", {}, 4],
  ["\\ln\\left(e^{3}\\right)", {}, 3],
  ["\\lg 1000", {}, 3],
  ["\\sin\\left(\\frac{\\pi}{6}\\right)", {}, 0.5],
  ["\\cos\\pi", {}, -1],
  ["\\operatorname{tg}\\left(\\frac{\\pi}{4}\\right)", {}, 1],
  ["\\operatorname{ctg}\\left(\\frac{\\pi}{4}\\right)", {}, 1],
  ["\\sin^{2}x+\\cos^{2}x", { x: 0.7 }, 1],
  ["2\\cdot 3+4\\times 5", {}, 26],
  ["12\\div 4", {}, 3],
  ["2\\pi x", { x: 1 }, 2 * Math.PI],
  ["\\left(x+1\\right)\\left(x-1\\right)", { x: 3 }, 8],
  ["2\\frac{1}{3}", {}, 7 / 3],
  ["\\mathrm{C}_{5}^{2}", {}, 10],
  ["\\binom{6}{3}", {}, 20],
  ["5!", {}, 120],
  ["\\arcsin\\left(1\\right)", {}, Math.PI / 2],
  ["3{,}5+1", {}, 4.5],
  ["\\sin\\left(30^{\\circ}\\right)", {}, 0.5],
];

test("LaTeX → бичвэр: утга таарна (37 тохиолдол)", () => {
  for (const [latex, scope, expected] of cases) near(val(latex, scope), expected, latex);
});

test("үсэг тус тусдаа: «ln» гэж үсгээр бичвэл l·n, \\ln бол функц", () => {
  near(val("ln", { l: 2, n: 3 }), 6, "l n");
  near(val("\\ln e", {}), 1, "\\ln e");
  near(val("xy", { x: 2, y: 5 }), 10, "xy");
});

test("тэнцэтгэл биш, тэгшитгэл", () => {
  const rels = [
    ["x^{2}-5x+6=0", "="],
    ["\\frac{x-1}{x+2}>0", ">"],
    ["x^{2}-3x+2\\le 0", "<="],
    ["\\left|x-2\\right|<3", "<"],
    ["2x+1\\geq 5", ">="],
    ["\\sqrt{x+3}=x+1", "="],
  ];
  for (const [latex, op] of rels) {
    const r = parseRelation(prepare(latexToText(latex)));
    assert.ok(r, latex);
    assert.equal(r.op, op, latex);
  }
});

test("систем: cases ба \\\\", () => {
  const t = latexToText("\\begin{cases}2x+y=5\\\\x-y=1\\end{cases}");
  assert.deepEqual(splitLines(t).length, 2);
  const t2 = latexToText("x+y=5;xy=6");
  assert.deepEqual(splitLines(t2).length, 2);
  for (const l of splitLines(t)) assert.ok(parseRelation(prepare(l)));
});

test("хоосон нүд ба ойлгомжгүй тэмдэгт — монгол алдаа", () => {
  assert.throws(() => latexToText("\\frac{1}{\\placeholder{}}"), LatexError);
  assert.throws(() => latexToText("\\frac{1}{}"), LatexError);
  assert.throws(() => latexToText("\\alpha+1"), LatexError);
  assert.equal(latexToText(""), "");
});

test("матанализын бичлэг таних", () => {
  let c = parseCalculus("\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x\\sin x\\right)");
  assert.equal(c.kind, "deriv");
  assert.equal(c.order, 1);
  near(compile(parse(prepare(c.body)))({ x: 1 }), Math.sin(1), "deriv body");
  c = parseCalculus("\\frac{d^{2}}{dx^{2}}x^{3}");
  assert.equal(c.kind, "deriv");
  assert.equal(c.order, 2);
  c = parseCalculus("\\int x e^{x}\\,\\mathrm{d}x");
  assert.equal(c.kind, "int");
  near(compile(parse(prepare(c.body)))({ x: 1 }), Math.E, "int body");
  c = parseCalculus("\\int_{0}^{1}x^{2}\\,dx");
  assert.deepEqual([c.kind, c.a, c.b], ["defint", "0", "1"]);
  c = parseCalculus("\\int_{0}^{\\pi}\\sin x\\differentialD x");
  assert.equal(c.kind, "defint");
  assert.equal(c.b, "pi");
  c = parseCalculus("\\lim_{x\\to 0}\\frac{\\sin x}{x}");
  assert.deepEqual([c.kind, c.to], ["lim", "0"]);
  c = parseCalculus("\\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^{x}");
  assert.equal(c.to, "inf");
  c = parseCalculus("\\left(x^{2}\\right)^{\\prime}");
  assert.equal(c.kind, "deriv");
  assert.equal(parseCalculus("x^{2}+1"), null);
  assert.equal(parseCalculus("\\frac{1}{2}"), null);
});

/* ---------- Автомат таних (auto.ts) ---------- */

test("автомат таних: төрөл ба анхдагч үйлдэл", () => {
  const A = (latex) => { const r = readLatex(latex); return analyze(r.text, r.calc); };
  assert.deepEqual([A("x^{2}-5x+6=0").kind, A("x^{2}-5x+6=0").primary], ["equation", "solve"]);
  assert.equal(A("x^{2}-3x+2\\le 0").kind, "inequality");
  assert.equal(A("\\begin{cases}2x+y=5\\\\x-y=1\\end{cases}").kind, "system");
  assert.deepEqual([A("\\frac{1}{2}+\\frac{1}{3}").kind, A("\\frac{1}{2}+\\frac{1}{3}").primary], ["number", "calc"]);
  assert.ok(A("360").actions.includes("prime"));
  assert.equal(A("12,18").primary, "gcd");
  assert.equal(A("x^{2}-5x+6").primary, "factor");
  assert.equal(A("\\left(2a-3b\\right)^{3}").primary, "expand");
  assert.equal(A("\\frac{x^{2}-1}{x^{2}+2x+1}").primary, "frac");
  assert.equal(A("x\\sin x").primary, "deriv");
  assert.deepEqual([A("y=x^{3}-3x").kind, A("y=x^{3}-3x").primary], ["function", "study"]);
  assert.equal(A("\\int_{0}^{1}x^{2}\\,dx").primary, "defint");
  assert.equal(A("\\lim_{x\\to 0}\\frac{\\sin x}{x}").primary, "lim");
  assert.ok(A("x^{2}-5x+6").actions.includes("deriv"));
});

test("автомат таних → бодогч: хариу зөв", () => {
  const run = (latex, action) => {
    const r = readLatex(latex);
    const a = analyze(r.text, r.calc);
    return solve(toRequest(a, action ?? a.primary, {}, false));
  };
  assert.deepEqual(run("x^{2}-5x+6=0").answer, ["x_{1} = 2", "x_{2} = 3"]);
  assert.ok(run("\\frac{1}{x}+\\frac{1}{x-1}=\\frac{3}{2}").answer.join().includes("\\frac{1}{3}"));
  assert.ok(run("x^{2}-3x+2\\le 0").answer.join().includes("\\left[1;\\ 2\\right]"));
  assert.ok(run("\\begin{cases}2x+y=5\\\\x-y=1\\end{cases}").answer.join().includes("\\left(2;\\ 1\\right)"));
  assert.ok(run("x^{2}-5x+6").answer.join().includes("\\left(x-2\\right)\\left(x-3\\right)"));
  assert.ok(run("\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x\\sin x\\right)").answer.join().includes("x \\cos x"));
  assert.ok(run("\\int_{0}^{1}x^{2}\\,dx").answer.join().includes("\\frac{1}{3}"));
  assert.ok(run("\\lim_{x\\to 0}\\frac{\\sin x}{x}").answer.join().includes("= 1"));
  assert.ok(run("y=x^{3}-3x").ok);
  assert.ok(run("12,18").ok);
  assert.ok(run("x^{2}-5x+6", "deriv").answer.join().includes("2x-5") || run("x^{2}-5x+6", "deriv").answer.join().includes("2 x-5"));
});
