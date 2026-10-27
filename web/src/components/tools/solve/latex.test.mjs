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
  assert.equal(A("12;18").primary, "gcd"); // «12,18» нь одоо 12.18 (аравтын таслал)
  assert.equal(A("12,18,30").primary, "gcd");
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
  assert.ok(run("12;18").ok);
  assert.ok(run("x^{2}-5x+6", "deriv").answer.join().includes("2x-5") || run("x^{2}-5x+6", "deriv").answer.join().includes("2 x-5"));
});

/* ---------- MathLive-ийн БОДИТ гаралт (хөтөч дээр гарын товчоор оруулж mf.getValue('latex')-аар цуглуулсан, 2026-10-27) ---------- */

import { liveSolve } from "./live.ts";
import { solveForY } from "./implicit.ts";
import { normalizeCommas, isIncomplete, IncompleteError } from "./latex.ts";

// [MathLive LaTeX, хүлээгдэх төлөв, хариунд байх ёстой хэсэг (эсвэл төрөл)]
const REAL = [
  ["\\left(2x\\right)^2=y", "done", "y = 4 x^{2}"],
  ["2x^2-3x+1=0", "done", "x_{1} = \\frac{1}{2}"],
  ["x^3-8", "done", "\\left(x-2\\right)\\left(x^{2}+2x+4\\right)"],
  ["\\frac{x+1}{x-2}\\ge0", "done", "\\left(-\\infty;\\ -1\\right]\\cup \\left(2;\\ +\\infty\\right)"],
  ["\\left|2x-1\\right|<5", "done", "\\left(-2;\\ 3\\right)"],
  ["\\sqrt{x+5}=x-1", "done", "x = 4"],
  ["2^{x+1}=16", "done", "x = 3"],
  ["\\log_2\\left(x-1\\right)=3", "done", "x = 9"],
  ["\\sin\\left(x\\right)=\\frac12", "done", "\\frac{\\pi}{6}"],
  ["\\cos\\left(2x\\right)=0", "done", "\\frac{\\pi}{4}+\\frac{\\pi}{2}n"],
  ["y=x^2-4x+3", "done", "x = 1,\\ 3"],
  ["x+y=5;x-y=1", "done", "\\left(3;\\ 2\\right)"],
  ["2x+y=5,x-y=1", "done", "\\left(2;\\ 1\\right)"],
  ["\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x^3\\right)", "done", "3x^{2}"],
  ["\\int x^2\\,\\mathrm{d}x", "done", "\\frac{1}{3}x^{3}+C"],
  ["\\int_0^1x^2\\,\\mathrm{d}x", "done", "= \\frac{1}{3}"],
  ["\\lim_{x\\to0}\\frac{\\sin\\left(x\\right)}{x}", "done", "= 1"],
  ["3!", "done", "= 6"],
  ["\\sqrt{50}+\\sqrt{18}", "done", "8\\sqrt{2}"],
  ["\\frac23+\\frac56", "done", "\\frac{3}{2}"],
  ["15\\%", "done", "= 0.15"],
  ["2,5", "done", "\\frac{5}{2}"],
  ["-x^2", "done", "-x^{2}"],
  ["x^{-1}", "done", "\\frac{1}{x}"],
  ["\\left(2a-3b\\right)^3", "done", "8a^{3}-36a^{2}b+54ab^{2}-27b^{3}"],
  ["x^2y", "done", "x^{2}"],
  ["x^2-5x+6=0", "done", "x_{2} = 3"],
  ["x^2-3x+2\\le0", "done", "\\left[1;\\ 2\\right]"],
  ["\\frac{1}{x}+\\frac{1}{x-1}=\\frac32", "done", "x_{1} = \\frac{1}{3}"],
  ["4^{x}-3\\times2^{x}+2=0", "done", "x_{2} = 1"],
  ["\\operatorname{\\mathrm{tg}}\\left(x\\right)=1", "done", "\\frac{\\pi}{4}+\\pi n"],
  ["\\sin\\left(30\\degree\\right)", "done", "\\frac{1}{2}"],
  ["\\log_{10}\\left(100\\right)", "done", "= 2"],
  ["\\ln\\left(e^2\\right)", "done", "= 2"],
  ["\\mathrm{C}_5^2", "done", "= 10"],
  ["\\sqrt[3]{27}", "done", "= 3"],
  ["2\\frac13", "done", "\\frac{7}{3}"],
  ["\\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^{x}", "done", "= e"],
  ["\\left(x^2\\right)^{\\prime}", "done", "2x"],
  ["\\left|x-3\\right|=2", "done", "x_{2} = 5"],
  ["a^2-b^2", "done", "\\left(a-b\\right)\\left(a+b\\right)"],
  ["12;18", "done", "= 6"],
  ["2x+1>5", "done", "\\left(2;\\ +\\infty\\right)"],
  ["x\\div2=3", "done", "x = 6"],
  ["1,5x=3", "done", "x = 2"],
  ["e^{x}=1", "done", "x = 0"],
  ["\\sqrt[4]{16}", "done", "= 2"],
  ["y=x^2", "done", "x_{\\min} = 0"],
  ["f\\left(x\\right)=x^3-3x", "done", "\\sqrt{3}"],
  ["\\left(x+1\\right)\\left(x-1\\right)", "done", "x^{2}-1"],
  ["\\arcsin\\left(1\\right)", "done", "\\frac{\\pi}{2}"],
  ["\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)", "done", "= 1"],
  ["\\exp\\left(0\\right)", "done", "= 1"],
  ["\\lfloor2,7\\rfloor", "done", "= 2"],
  ["\\operatorname{\\mathrm{sign}}\\left(-3\\right)", "done", "= -1"],
  ["\\frac{\\mathrm{d}^2}{\\mathrm{d}x^2}\\left(x^4\\right)", "done", "12x^{2}"],
  ["\\lim_{x\\to2}x^2", "done", "= 4"],
  ["\\left[x+1\\right]^2", "done", "x^{2}+2x+1"],
  ["\\mathrm{A}_5^2", "done", "= 20"],
  ["x^2+y^2=25", "implicit", null],
  ["\\frac{1}{\\placeholder{}}", "incomplete", null],
  ["\\frac{\\placeholder{}}{\\placeholder{}}", "incomplete", null],
  ["2+", "incomplete", null],
  ["\\placeholder{}\\degree", "incomplete", null],
  ["\\placeholder{}^2", "incomplete", null],
  ["\\lim_{x\\to\\placeholder{}}\\placeholder{}", "incomplete", null],
  ["\\int_0^{\\placeholder{}}\\placeholder{}\\,\\mathrm{d}x", "incomplete", null],
  ["x=", "incomplete", null],
  ["\\left(\\right)", "incomplete", null],
];

test(`MathLive-ийн бодит гаралт: ${REAL.length} тохиолдол алдаагүй, зөв хариутай`, () => {
  for (const [latex, status, part] of REAL) {
    const r = liveSolve(latex);
    assert.equal(r.status, status, `${latex}: төлөв ${r.status} ${r.message ?? ""}`);
    if (status === "done") {
      assert.ok(r.sol.ok, `${latex}: бодож чадсангүй ${JSON.stringify(r.sol.notes)}`);
      if (part) assert.ok(r.sol.answer.join(" ").includes(part) || (r.sol.problem ?? "").includes(part) || r.sol.steps.some((s) => (s.tex ?? []).join(" ").includes(part)), `${latex}: «${part}» алга — ${JSON.stringify(r.sol.answer)}`);
    }
  }
});

test("(2x)^2 = y → y = 4x^2: функц гэж танина, эхний алхам y-ээр илэрхийлнэ", () => {
  const r = liveSolve("\\left(2x\\right)^2=y");
  assert.equal(r.analysis.kind, "function");
  assert.equal(r.analysis.primary, "study");
  assert.deepEqual(r.analysis.graph, ["4*x^2"]);
  assert.ok(r.sol.steps[0].tex.join(" ").includes("y = 4 x^{2}") || r.sol.steps[0].tex.join(" ").includes("y = 4x^{2}"));
  // y зүүн, баруун, коэффициенттэй, бутархай хуваарьтай
  const Y = (s) => solveForY(parseRelation(prepare(s)));
  assert.equal(Y("2y-x^2=4"), "(1/2)*x^2+2");
  assert.equal(Y("x*y=1"), "(1)/(x)");
  assert.equal(Y("sin(x)=y"), "sin(x)");
  assert.equal(Y("x^2+y^2=25"), null);
  assert.equal(Y("y^2=x"), null);
  assert.equal(liveSolve("y>x^{2}").status, "implicit");
});

test("таслал: 2,5 = 2.5, 12,18,30 жагсаалт, систем таслалаар, C(10,3) хэвээр", () => {
  assert.equal(normalizeCommas("2,5"), "2.5");
  assert.equal(normalizeCommas("x=2,5"), "x=2.5");
  assert.equal(normalizeCommas("12,18,30"), "12,18,30");
  assert.equal(normalizeCommas("2x+y=5,x-y=1"), "2x+y=5\\\\x-y=1");
  assert.equal(normalizeCommas("C(10,3)"), "C(10,3)");
  assert.equal(normalizeCommas("2{,}5"), "2{,}5");
});

test("дутуу оролтыг алдаа гэж харуулахгүй (isIncomplete)", () => {
  assert.ok(isIncomplete(new IncompleteError("x")));
  assert.ok(isIncomplete("Илэрхийлэл дутуу байна"));
  assert.ok(isIncomplete("Хаалт дутуу байна"));
  assert.ok(!isIncomplete("«*» энд байж болохгүй"));
  assert.equal(liveSolve("2+*3").status, "error");
  assert.equal(liveSolve("").status, "empty");
});
