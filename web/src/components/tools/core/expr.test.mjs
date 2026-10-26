// expr.ts-ийн жинхэнэ кодыг шалгана. Ажиллуулах: node --test src/components/tools/core/
import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, parseRelation, compile, toLatex, diff, freeSymbols, niceTex, toFraction, simplify } from "./expr.ts";

const ev = (s, scope = {}) => compile(parse(s))(scope);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test("далд үржвэр ба эрэмбэ", () => {
  near(ev("2x^2-3x+1", { x: 2 }), 3);
  near(ev("-2^2"), -4);
  near(ev("2^3^2"), 512);
  near(ev("2(x+1)", { x: 3 }), 8);
  near(ev("x(x+1)", { x: 3 }), 12);
  near(ev("(x+1)(x-1)", { x: 3 }), 8);
  near(ev("2pi"), 2 * Math.PI);
  near(ev("ab", { a: 2, b: 5 }), 10);
  near(ev("2^-1"), 0.5);
  near(ev("6/2*3"), 9);
});

test("функцүүд", () => {
  near(ev("sin2x", { x: Math.PI / 4 }), 1);
  near(ev("sin^2 x + cos^2 x", { x: 0.7 }), 1);
  near(ev("tg(pi/4)"), 1);
  near(ev("sqrt(16)"), 4);
  near(ev("√16"), 4);
  near(ev("|x-5|", { x: 2 }), 3);
  near(ev("|x|+|y|", { x: -2, y: 3 }), 5);
  near(ev("2|x|", { x: -3 }), 6);
  near(ev("log_2(8)"), 3);
  near(ev("log(2, 8)"), 3);
  near(ev("lg100"), 2);
  near(ev("ln(e)"), 1);
  near(ev("5!"), 120);
  near(ev("cbrt(-8)"), -2);
  near(ev("(-8)^(1/3)"), -2);
  near(ev("arcsin(1)"), Math.PI / 2);
  near(ev("x²", { x: 3 }), 9);
});

test("градус", () => {
  near(compile(parse("sin(30)"), { degrees: true })({}), 0.5);
});

test("харьцаа", () => {
  const r = parseRelation("x^2+y^2=25");
  assert.equal(r.op, "=");
  assert.equal(parseRelation("2x-1 ≥ 3").op, ">=");
  assert.equal(parseRelation("x+1"), null);
});

test("алдаа монголоор", () => {
  assert.throws(() => parse("(x+1"), /Хаалт/);
  assert.throws(() => parse("x+"), /дутуу/);
  assert.throws(() => parse("x$"), /ойлгосонгүй/);
});

test("LaTeX", () => {
  assert.equal(toLatex(parse("2x^2-3x+1")), "2 x^{2}-3 x+1");
  assert.equal(toLatex(parse("sqrt(x)/2")), "\\frac{\\sqrt{x}}{2}");
  assert.equal(toLatex(parse("tg x")), "\\operatorname{tg} x");
  assert.equal(toLatex(parse("log_2 8")), "\\log_{2} 8");
  assert.equal(toLatex(parse("a-(b+c)")), "a-\\left(b+c\\right)");
});

test("уламжлал", () => {
  const dx = (s, x) => compile(diff(parse(s)))({ x });
  near(dx("x^3", 2), 12);
  near(dx("sin(2x)", 0), 2);
  near(dx("ln(x)", 4), 0.25);
  near(dx("x*e^x", 0), 1);
  near(dx("x^x", 1), 1);
  near(dx("sqrt(x)", 4), 0.25);
  near(dx("log_2(x)", 1), 1 / Math.log(2));
  assert.equal(toLatex(diff(parse("x^2"))), "2 x");
  assert.equal(toLatex(diff(parse("3x"))), "3");
});

test("хялбарчлах ба хувьсагч", () => {
  assert.equal(toLatex(simplify(parse("0+1*x"))), "x");
  assert.deepEqual([...freeSymbols(parse("a x^2 + b x + pi"))].sort(), ["a", "b", "x"]);
});

test("гоё тоо", () => {
  assert.deepEqual(toFraction(1 / 3), [1, 3]);
  assert.equal(niceTex(0.5), "\\frac{1}{2}");
  assert.equal(niceTex(Math.SQRT2), "\\sqrt{2}");
  assert.equal(niceTex(Math.sqrt(3) / 2), "\\frac{\\sqrt{3}}{2}");
  assert.equal(niceTex(-2 * Math.sqrt(5)), "-2\\sqrt{5}");
  assert.equal(niceTex(Math.PI / 6), "\\frac{\\pi}{6}");
  assert.equal(niceTex(-4), "-4");
});

test("харьцааны LaTeX: \\le дараа зай", async () => {
  const { relationLatex } = await import("./expr.ts");
  assert.equal(relationLatex(parseRelation("sqrt(x) >= x-2")), "\\sqrt{x}\\ge x-2");
  assert.equal(relationLatex(parseRelation("x <= 3")), "x\\le 3");
});
