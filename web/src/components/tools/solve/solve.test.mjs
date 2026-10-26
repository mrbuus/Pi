// Бодогчийн жинхэнэ модулиудыг шалгана. Ажиллуулах: node --test src/components/tools/solve/
import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, parseRelation, compile } from "../core/expr.ts";
import { solve } from "./solve.ts";
import { evalExact, xtex, approx } from "./exact.ts";
import { polyFrom } from "./poly.ts";
import { solvePoly } from "./roots.ts";
import { signAnalysis, piecesFrom } from "./ineq.ts";
import { N } from "./equation.ts";

const S = (mode, input, extra = {}, sub, degrees = false) => solve({ mode, sub, input, extra, degrees });
const ans = (sol) => sol.answer.join(" ; ");
const okHas = (sol, ...parts) => {
  assert.ok(sol.ok, `ok биш: ${sol.notes?.join(" ")}`);
  const a = ans(sol).replace(/\s+/g, "");
  for (const p of parts) assert.ok(a.includes(p.replace(/\s+/g, "")), `«${p}» хариунд алга: ${ans(sol)}`);
};
const X = (s) => xtex(evalExact(parse(s)));

/* ---------- ЯГ тоо ---------- */

test("яг тоо: бутархай, язгуур, π, тригонометр, логарифм", () => {
  assert.equal(X("1/2+1/3"), "\\frac{5}{6}");
  assert.equal(X("sqrt(12)"), "2\\sqrt{3}");
  assert.equal(X("sqrt(8)+sqrt(18)"), "5\\sqrt{2}");
  assert.equal(X("1/(1+sqrt(2))"), "\\sqrt{2}-1");
  assert.equal(X("tan(pi/12)"), "2-\\sqrt{3}");
  assert.equal(X("sin(pi/12)"), "\\frac{\\sqrt{6}-\\sqrt{2}}{4}");
  assert.equal(X("sqrt(3+2sqrt(2))"), "1+\\sqrt{2}");
  assert.equal(X("cbrt(16)"), "2\\sqrt[3]{2}");
  assert.equal(X("log_4(2)"), "\\frac{1}{2}");
  assert.equal(X("lg(0.001)"), "-3");
  assert.equal(X("ln(e^3)"), "3");
  assert.equal(X("arccos(-sqrt(3)/2)"), "\\frac{5\\pi}{6}");
  assert.equal(X("(-8)^(2/3)"), "4");
  assert.equal(xtex(evalExact(parse("sin(30)"), { degrees: true })), "\\frac{1}{2}");
});

/* ---------- Тооцоолох ---------- */

test("тооцоолох горим", () => {
  okHas(S("calc", "1/2+1/3"), "\\frac{5}{6}");
  okHas(S("calc", "7/3"), "2\\frac{1}{3}");
  okHas(S("calc", "sqrt(50)"), "5\\sqrt{2}");
  okHas(S("calc", "sin(30)", {}, undefined, true), "\\frac{1}{2}");
  okHas(S("calc", "sin 30°"), "\\frac{1}{2}");
  okHas(S("calc", "5!"), "120");
  okHas(S("calc", "C(5,2)"), "10");
  okHas(S("calc", "A(5,2)"), "20");
  okHas(S("calc", "C(10,3)+1"), "121");
  okHas(S("calc", "25!"), "15\\,511\\,210\\,043\\,330\\,985\\,984\\,000\\,000");
  okHas(S("calc", "C(52,5)"), "2\\,598\\,960");
  okHas(S("calc", "12:4"), "3");
  okHas(S("calc", "log_2(32)"), "5");
  okHas(S("calc", "2pi/3+pi/3"), "\\pi");
  const s = S("calc", "sin(1)");
  assert.ok(s.ok && ans(s).includes("\\approx 0.8414709848"));
});

test("тооцоолох: алдаа монголоор", () => {
  assert.match(S("calc", "1/0").notes[0], /тодорхойлогдохгүй/);
  assert.match(S("calc", "sqrt(-4)").notes[0], /тодорхойлогдохгүй/);
  assert.match(S("calc", "2x+1").notes[0], /хувьсагч/);
  assert.match(S("calc", "(2+3").notes[0], /Хаалт/);
  assert.match(S("calc", "").notes[0], /оруулна уу/);
  assert.match(S("calc", "2$3").notes[0], /ойлгосонгүй/);
});

/* ---------- Тэгшитгэл ---------- */

test("олон гишүүнт тэгшитгэл", () => {
  okHas(S("eq", "x^2-5x+6=0"), "x_{1} = 2", "x_{2} = 3");
  okHas(S("eq", "x^3-6x^2+11x-6=0"), "x_{1} = 1", "x_{2} = 2", "x_{3} = 3");
  okHas(S("eq", "2x+3=7"), "x = 2");
  okHas(S("eq", "x^2-2=0"), "-\\sqrt{2}", "\\sqrt{2}");
  okHas(S("eq", "x^2+x+1=0"), "\\varnothing");
  okHas(S("eq", "x^4-5x^2+4=0"), "-2", "-1", "x_{3} = 1", "x_{4} = 2");
  okHas(S("eq", "2x^3-x^2-2x+1=0"), "\\frac{1}{2}");
  okHas(S("eq", "x^2-4x+4=0"), "x = 2");
  okHas(S("eq", "x^2-x-1=0"), "\\frac{1-\\sqrt{5}}{2}", "\\frac{1+\\sqrt{5}}{2}");
  okHas(S("eq", "3(x-1)=2x+5"), "x = 8");
  okHas(S("eq", "x=x"), "\\mathbb{R}");
  const q = S("eq", "x^2-5x+6=0");
  assert.equal(q.title, "Квадрат тэгшитгэл");
  const st = q.steps.map((s) => (s.tex ?? []).join(" ")).join(" ");
  assert.ok(st.includes("D = b^2-4ac"), "дискриминантын алхам");
  assert.ok(q.steps.some((s) => /Виет/.test(s.text ?? "")), "Виетийн алхам");
  const c = S("eq", "x^3-6x^2+11x-6=0");
  assert.ok(c.steps.some((s) => /Хорнер/.test(s.text ?? "")), "Хорнерийн схем");
  const n = S("eq", "x^5-x-1=0");
  assert.ok(n.ok && ans(n).includes("\\approx 1.167304"), "тоон язгуур ≈ тэмдэгтэй");
});

test("бутархай-рационал: ОЗ, гаднах язгуур", () => {
  okHas(S("eq", "(x-1)/(x+2)=0"), "x = 1");
  okHas(S("eq", "1/x+1/(x-1)=3/2"), "\\frac{1}{3}", "x_{2} = 2");
  const s = S("eq", "(x^2-1)/(x-1)=0");
  okHas(s, "x = -1");
  assert.ok(s.steps.some((x) => x.tone === "bad" && /гаднах/.test(x.text)), "x=1 гаднах язгуур гэж тэмдэглэнэ");
  okHas(S("eq", "x/(x-1)=1/(x-1)"), "\\varnothing");
});

test("модультай тэгшитгэл", () => {
  okHas(S("eq", "|x-2|=3"), "x_{1} = -1", "x_{2} = 5");
  okHas(S("eq", "|2x+1|=|x-3|"), "-4", "\\frac{2}{3}");
  okHas(S("eq", "|x-1|+|x-3|=2"), "\\left[1;\\ 3\\right]");
  okHas(S("eq", "|x^2-4|=3x"), "x_{1} = 1", "x_{2} = 4");
  okHas(S("eq", "|x|=-1"), "\\varnothing");
});

test("иррациональ тэгшитгэл: квадрат зэрэгт дэвшүүлж шалгана", () => {
  const s = S("eq", "sqrt(x+3)=x+1");
  okHas(s, "x = 1");
  assert.ok(s.steps.some((x) => x.tone === "bad"), "x=-2 гаднах язгуурыг хаяна");
  okHas(S("eq", "sqrt(2x+3)-sqrt(x+1)=1"), "-1", "3");
  okHas(S("eq", "sqrt(x)=-2"), "\\varnothing");
  okHas(S("eq", "sqrt(x^2+9)=5"), "-4", "4");
});

test("үзүүлэнт ба логарифм тэгшитгэл", () => {
  okHas(S("eq", "2^x=8"), "x = 3");
  okHas(S("eq", "4^x-3*2^x+2=0"), "x_{1} = 0", "x_{2} = 1");
  okHas(S("eq", "3^(x^2-3x)=1/9"), "x_{1} = 1", "x_{2} = 2");
  okHas(S("eq", "2^(x+1)+2^x=12"), "x = 2");
  okHas(S("eq", "e^x=5"), "\\ln 5");
  okHas(S("eq", "9^x=1/3"), "-\\frac{1}{2}");
  okHas(S("eq", "log_2(x)=3"), "x = 8");
  okHas(S("eq", "lg(x)+lg(x-9)=1"), "x = 10");
  okHas(S("eq", "log_3(x^2-8x)=2"), "-1", "9");
  okHas(S("eq", "ln(x)^2-3ln(x)+2=0"), "e", "e^{2}");
  okHas(S("eq", "log_2(x)+log_4(x)=3"), "x = 4");
  okHas(S("eq", "2^x=-4"), "\\varnothing");
});

test("тригонометрийн энгийн тэгшитгэл: ерөнхий шийд", () => {
  okHas(S("eq", "sin(x)=1/2"), "(-1)^{n}\\frac{\\pi}{6}+\\pi n", "n\\in\\mathbb{Z}");
  okHas(S("eq", "cos(x)=1/2"), "\\pm \\frac{\\pi}{3}+2\\pi n");
  okHas(S("eq", "tg(2x)=1"), "\\frac{\\pi}{8}+\\frac{\\pi}{2}n");
  okHas(S("eq", "sin(x)=cos(x)"), "\\frac{\\pi}{4}+\\pi n");
  okHas(S("eq", "sin(x)=2"), "\\varnothing");
  okHas(S("eq", "sin(2x)=0"), "\\frac{\\pi}{2}n");
  okHas(S("eq", "2sin(x)^2-3sin(x)+1=0"), "(-1)^{n}\\frac{\\pi}{6}", "\\frac{\\pi}{2}+2\\pi n");
  okHas(S("eq", "2cos(x)^2+sin(x)-1=0"), "(-1)^{n+1}\\frac{\\pi}{6}");
  okHas(S("eq", "cos(x+pi/4)=-sqrt(2)/2"), "\\pm \\frac{3\\pi}{4}");
  okHas(S("eq", "sin(x)=1/2", {}, undefined, true), "30^\\circ", "180^\\circ n");
});

test("бодож чадахгүйг үнэнээр хэлнэ", () => {
  const s = S("eq", "x^x=4");
  assert.equal(s.ok, false);
  assert.match(s.notes.join(" "), /бодож чадсангүй/);
  assert.ok((s.approx ?? []).some((a) => a.includes("\\approx 2")), "тоон ойролцоог тусад нь ≈-ээр");
  assert.equal(s.answer.length, 0, "албан хариу гаргахгүй");
  const t = S("eq", "sin(x)=x/2+cos(3x)");
  assert.equal(t.ok, false);
});

/* ---------- Тэнцэтгэл биш ---------- */

test("тэнцэтгэл биш: завсар", () => {
  okHas(S("eq", "2x-1>3"), "\\left(2;\\ +\\infty\\right)");
  okHas(S("eq", "-3x+2<=8"), "\\left[-2;\\ +\\infty\\right)");
  okHas(S("eq", "x^2-3x+2>0"), "\\left(-\\infty;\\ 1\\right)\\cup \\left(2;\\ +\\infty\\right)");
  okHas(S("eq", "x^2-3x+2<=0"), "\\left[1;\\ 2\\right]");
  okHas(S("eq", "x^2+1>0"), "\\mathbb{R}");
  okHas(S("eq", "x^2+1<0"), "\\varnothing");
  okHas(S("eq", "x^2-4x+4<=0"), "\\left\\{2\\right\\}");
  okHas(S("eq", "(x-1)/(x+2)>0"), "\\left(-\\infty;\\ -2\\right)\\cup \\left(1;\\ +\\infty\\right)");
  okHas(S("eq", "(x-1)/(x+2)>=0"), "\\left(-\\infty;\\ -2\\right)\\cup \\left[1;\\ +\\infty\\right)");
  okHas(S("eq", "|x-2|<3"), "\\left(-1;\\ 5\\right)");
  okHas(S("eq", "|x-2|>=3"), "\\left(-\\infty;\\ -1\\right]\\cup \\left[5;\\ +\\infty\\right)");
  okHas(S("eq", "sqrt(x+2)>x"), "\\left[-2;\\ 2\\right)");
  okHas(S("eq", "2^x>8"), "\\left(3;\\ +\\infty\\right)");
  okHas(S("eq", "log_2(x)<3"), "\\left(0;\\ 8\\right)");
  okHas(S("eq", "x^2-2<0"), "\\left(-\\sqrt{2};\\ \\sqrt{2}\\right)");
  const s = S("eq", "(x-1)/(x+2)>=0");
  const nl = s.numberLine;
  assert.ok(nl, "тооны шулуун");
  assert.deepEqual(nl.points.map((p) => [p.label, p.filled]), [["-2", false], ["1", true]]);
  assert.deepEqual(nl.signs, ["+", "-", "+"]);
  const lin = S("eq", "-2x>4");
  assert.ok(lin.steps.some((x) => /эсрэгээр/.test(x.text ?? "")), "сөрөгт хуваахад тэмдэг солигдоно");
  assert.equal(S("eq", "sin(x)>0").ok, false);
});

/* ---------- Систем ---------- */

test("систем", () => {
  okHas(S("sys", "2x+y=5\nx-y=1"), "\\left(x;\\ y\\right) = \\left(2;\\ 1\\right)");
  okHas(S("sys", "x+y+z=6; x-y+z=2; 2x+y-z=1"), "\\left(1;\\ 2;\\ 3\\right)");
  okHas(S("sys", "3x-2y=1\n5x+4y=9"), "\\left(1;\\ 1\\right)");
  okHas(S("sys", "x+y=2\n2x+2y=5"), "\\varnothing");
  const inf = S("sys", "x+y=2\n2x+2y=4");
  assert.ok(inf.ok && /Төгсгөлгүй/.test(inf.notes.join("")));
  okHas(S("sys", "x+y=5\nxy=6"), "\\left(2;\\ 3\\right)", "\\left(3;\\ 2\\right)");
  okHas(S("sys", "x^2+y^2=25\nx+y=7"), "\\left(3;\\ 4\\right)", "\\left(4;\\ 3\\right)");
  okHas(S("sys", "y=x^2\ny=x+2"), "\\left(-1;\\ 1\\right)", "\\left(2;\\ 4\\right)");
  const cr = S("sys", "2x+y=5\nx-y=1");
  assert.ok(cr.steps.some((x) => /Крамер/.test(x.text ?? "")) && cr.steps.some((x) => /Орлуулах/.test(x.text ?? "")));
  assert.match(S("sys", "x+y=1").notes[0], /2 тэгшитгэл/);
  okHas(S("eq", "2x+y=5\nx-y=1"), "\\left(2;\\ 1\\right)"); // олон мөрийг систем гэж танина
});

/* ---------- Алгебр ---------- */

test("үржигдэхүүнд задлах", () => {
  const F = (s) => S("alg", s, {}, "factor");
  okHas(F("x^2-5x+6"), "\\left(x-2\\right)\\left(x-3\\right)");
  okHas(F("x^2-9"), "\\left(x-3\\right)\\left(x+3\\right)");
  okHas(F("4a^2-9b^2"), "\\left(2a-3b\\right)\\left(2a+3b\\right)");
  okHas(F("x^3-8"), "\\left(x-2\\right)\\left(x^{2}+2x+4\\right)");
  okHas(F("x^3+27y^3"), "\\left(x+3y\\right)\\left(x^{2}-3xy+9y^{2}\\right)");
  okHas(F("2x^2+4x"), "2x\\left(x+2\\right)");
  okHas(F("ax+ay+bx+by"), "\\left(a+b\\right)\\left(x+y\\right)");
  okHas(F("x^4+4"), "\\left(x^{2}+2x+2\\right)\\left(x^{2}-2x+2\\right)");
  okHas(F("x^3-x^2-x+1"), "\\left(x+1\\right)\\left(x-1\\right)^{2}");
  okHas(F("x^2-5xy+6y^2"), "\\left(x-2y\\right)\\left(x-3y\\right)");
  okHas(F("a^2+2ab+b^2-c^2"), "\\left(a+b-c\\right)\\left(a+b+c\\right)");
  okHas(F("6x^2-x-2"), "\\left(2x+1\\right)\\left(3x-2\\right)");
  const irr = F("x^2+1");
  assert.ok(irr.ok && irr.steps.some((x) => x.tone === "note"), "задрахгүйг тэмдэглэнэ");
});

test("хаалт задлах, бутархай хураах, хуваах", () => {
  okHas(S("alg", "(x+2)^2", {}, "expand"), "x^{2}+4x+4");
  okHas(S("alg", "(2a-3b)^3", {}, "expand"), "8a^{3}-36a^{2}b+54ab^{2}-27b^{3}");
  okHas(S("alg", "(x-1)(x+1)", {}, "expand"), "x^{2}-1");
  okHas(S("alg", "(x^2-1)/(x^2+2x+1)", {}, "frac"), "\\frac{x-1}{x+1}");
  okHas(S("alg", "(a^2-b^2)/(a+b)", {}, "frac"), "= a-b");
  okHas(S("alg", "x/(x+1)+1/(x+1)", {}, "frac"), "= 1");
  okHas(S("alg", "(x^3-2x^2+4)/(x-3)", {}, "div"), "x^{2}+x+3+\\frac{13}{x-3}");
  okHas(S("alg", "(2x^4+3x^2-1):(x^2+1)", {}, "div"), "2x^{2}+1-\\frac{2}{x^{2}+1}");
  assert.match(S("alg", "x^2+1", {}, "div").notes[0], /A\/B/);
});

test("ХИЕХ, ХБЕХ, анхны үржвэр", () => {
  const g = S("alg", "12, 18", {}, "gcd");
  okHas(g, "\\text{ХИЕХ}(12;\\ 18) = 6", "\\text{ХБЕХ}(12;\\ 18) = 36");
  assert.ok(g.steps.some((x) => /Евклид/.test(x.text ?? "")));
  okHas(S("alg", "24 36 60", {}, "gcd"), "= 12", "= 360");
  okHas(S("alg", "360", {}, "prime"), "360 = 2^{3}\\cdot 3^{2}\\cdot 5");
  const p = S("alg", "97", {}, "prime");
  assert.match(p.notes[0], /анхны тоо/);
  assert.match(S("alg", "12", {}, "gcd").notes[0], /Хоёр/);
  assert.match(S("alg", "abc", {}, "prime").notes[0], /натурал/);
});

/* ---------- Матанализ ---------- */

test("уламжлал", () => {
  const D = (s, extra = {}) => S("an", s, extra, "deriv");
  okHas(D("x sin x"), "\\sin x+x \\cos x");
  okHas(D("x^3-2x^2+5"), "3x^{2}-4x");
  okHas(D("e^(x^2)"), "2 x e^{x^{2}}");
  okHas(D("ln(x^2+1)"), "\\frac{2 x}{x^{2}+1}");
  okHas(D("x/(x+1)"), "\\frac{1}{\\left(x+1\\right)^{2}}");
  okHas(D("x^3", { order: "2" }), "f''(x) = 6x");
  okHas(D("x^3-3x", { at: "2" }), "f'\\left(2\\right) = 9");
  const p = D("x sin x");
  assert.ok(p.steps.some((x) => /Үржвэрийн/.test(x.text ?? "")));
  const q = D("sin(2x+1)");
  assert.ok(q.steps.some((x) => /Нийлмэл/.test(x.text ?? "")));
});

test("интеграл", () => {
  const I = (s) => S("an", s, {}, "int");
  okHas(I("x^2"), "\\frac{1}{3}x^{3}+C");
  okHas(I("1/x"), "\\ln\\left|x\\right|+C");
  okHas(I("sin(3x)"), "-\\frac{1}{3} \\cos\\left(3 x\\right)+C");
  okHas(I("x e^x"), "x e^{x}-e^{x}+C");
  okHas(I("(2x+1)^5"), "\\frac{1}{12}\\left(2 x+1\\right)^{6}+C");
  okHas(I("1/(x^2+4)"), "\\operatorname{arctg}");
  okHas(I("sin(x)^2"), "\\frac{1}{2} x-\\frac{1}{4} \\sin\\left(2 x\\right)+C");
  assert.equal(I("e^(x^2)").ok, false);
  okHas(S("an", "x^2", { a: "0", b: "1" }, "defint"), "= \\frac{1}{3}");
  okHas(S("an", "sin x", { a: "0", b: "pi" }, "defint"), "= 2");
  okHas(S("an", "1/x", { a: "1", b: "e" }, "defint"), "= 1");
  const num = S("an", "e^(x^2)", { a: "0", b: "1" }, "defint");
  assert.ok(num.ok && ans(num).includes("\\approx 1.46265175"));
  assert.equal(S("an", "1/x", { a: "-1", b: "1" }, "defint").ok, false);
});

test("хязгаар", () => {
  const L = (s, to) => S("an", s, { to }, "lim");
  okHas(L("sin(x)/x", "0"), "= 1");
  okHas(L("(x^2-4)/(x-2)", "2"), "= 4");
  okHas(L("(2x^2+1)/(3x^2-x)", "inf"), "= \\frac{2}{3}");
  okHas(L("(1+1/x)^x", "inf"), "= e");
  okHas(L("(1-cos x)/x^2", "0"), "= \\frac{1}{2}");
  okHas(L("(e^x-1)/x", "0"), "= 1");
  okHas(L("1/x^2", "0"), "+\\infty");
  const d = L("1/x", "0");
  assert.match(d.notes[0], /оршихгүй/);
  assert.equal(L("sin(1/x)", "0").ok, false);
});

test("функцийн судалгаа", () => {
  const s = S("an", "x^3-3x", {}, "study");
  okHas(s, "D(f) = \\mathbb{R}", "x_{\\max} = -1,\\ f_{\\max} = 2", "x_{\\min} = 1,\\ f_{\\min} = -2", "\\text{сондгой функц}");
  okHas(S("an", "(x^2+1)/x", {}, "study"), "x = 0,\\ y = x");
  okHas(S("an", "sqrt(x)", {}, "study"), "D(f) = \\left[0;\\ +\\infty\\right)");
});

/* ---------- Прогресс, комбинаторик ---------- */

test("прогресс ба комбинаторик", () => {
  okHas(S("seq", "", { a1: "2", d: "3", n: "10" }, "arith"), "a_{10} = 29", "S_{10} = 155");
  okHas(S("seq", "", { b1: "3", q: "2", n: "5" }, "geom"), "b_{5} = 48", "S_{5} = 93");
  okHas(S("seq", "", { b1: "1", q: "1/2", n: "4" }, "geom"), "S = 2");
  okHas(S("seq", "", { n: "5", k: "2" }, "comb"), "A_{5}^{2} = 20", "C_{5}^{2} = 10", "P_{5} = 120");
  okHas(S("seq", "", { m: "3", n: "6" }, "prob"), "\\frac{1}{2}");
  okHas(S("seq", "", { n: "3", k: "2", p: "1/2" }, "bern"), "\\frac{3}{8}");
  assert.match(S("seq", "", { a1: "2", d: "3", n: "0" }, "arith").notes[0], /натурал/);
  assert.match(S("seq", "", { a1: "", d: "3", n: "2" }, "arith").notes[0], /оруулна уу/);
});

/* ---------- Шинж чанарын тест: санамсаргүй бодлогын хариуг шууд тооцоогоор тулгана ---------- */

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

test("санамсаргүй олон гишүүнт: мэдэгдэж буй бүхэл язгуурууд яг олдоно", () => {
  const r = rng(7);
  for (let t = 0; t < 60; t++) {
    const k = 1 + Math.floor(r() * 4);
    const roots = Array.from({ length: k }, () => Math.floor(r() * 13) - 6);
    const lead = 1 + Math.floor(r() * 3);
    const src = `${lead}*` + roots.map((a) => `(x-(${a}))`).join("*");
    const p = polyFrom(parse(src));
    const res = solvePoly(p, [], { quiet: true });
    const got = res.roots.map((x) => approx(x.x));
    const want = [...new Set(roots)].sort((a, b) => a - b);
    assert.deepEqual(got, want, src);
    assert.ok(res.exact && res.complete);
  }
});

test("санамсаргүй квадрат тэгшитгэл: хариу бүр тэгшитгэлийг хангана", () => {
  const r = rng(11);
  for (let t = 0; t < 80; t++) {
    const a = 1 + Math.floor(r() * 5), b = Math.floor(r() * 21) - 10, c = Math.floor(r() * 21) - 10;
    const src = `${a}x^2+(${b})x+(${c})=0`;
    const sol = S("eq", src);
    assert.ok(sol.ok, src);
    const D = b * b - 4 * a * c;
    const n = sol.answer[0].includes("varnothing") ? 0 : sol.answer.length;
    assert.equal(n, D < 0 ? 0 : D === 0 ? 1 : 2, src);
  }
});

test("санамсаргүй шугаман систем: Крамер/Гаусс хариу яг", () => {
  const r = rng(5);
  for (let t = 0; t < 40; t++) {
    const xs = [Math.floor(r() * 11) - 5, Math.floor(r() * 11) - 5, Math.floor(r() * 11) - 5];
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const c = [1, 2, 3].map(() => Math.floor(r() * 9) - 4);
      const rhs = c[0] * xs[0] + c[1] * xs[1] + c[2] * xs[2];
      rows.push(`${c[0]}x+(${c[1]})y+(${c[2]})z=${rhs}`);
    }
    const sol = S("sys", rows.join("\n"));
    assert.ok(sol.ok, rows.join(" | "));
    if (/Төгсгөлгүй/.test((sol.notes ?? []).join(""))) continue;
    okHas(sol, `\\left(${xs.join(";\\ ")}\\right)`);
  }
});

test("санамсаргүй тэнцэтгэл биш: хариуны завсрыг цэг тус бүрээр шууд шалгана", () => {
  const r = rng(3);
  const ops = ["<", ">", "<=", ">="];
  const forms = [
    () => `(x-(${Math.floor(r() * 9) - 4}))*(x-(${Math.floor(r() * 9) - 4}))`,
    () => `(x-(${Math.floor(r() * 9) - 4}))/(x-(${Math.floor(r() * 9) - 4}))`,
    () => `|x-(${Math.floor(r() * 9) - 4})|-${Math.floor(r() * 4)}`,
    () => `(x-(${Math.floor(r() * 7) - 3}))^2*(x-(${Math.floor(r() * 7) - 3}))/(x-(${Math.floor(r() * 7) - 3}))`,
    () => `x^3-${1 + Math.floor(r() * 9)}x`,
  ];
  for (let t = 0; t < 120; t++) {
    const expr = forms[t % forms.length]();
    const op = ops[Math.floor(r() * 4)];
    const F = parse(expr);
    const sa = signAnalysis(F, "x", false);
    assert.ok(sa, expr);
    const pieces = piecesFrom(sa, op);
    const inPieces = (x) => pieces.some((p) => {
      const lo = p.a ? p.a.v : -Infinity, hi = p.b ? p.b.v : Infinity;
      const okLo = p.a ? (p.aClosed ? x >= lo - 1e-12 : x > lo) : true;
      const okHi = p.b ? (p.bClosed ? x <= hi + 1e-12 : x < hi) : true;
      return okLo && okHi;
    });
    const f = compile(F);
    const test = (y) => (op === "<" ? y < 0 : op === ">" ? y > 0 : op === "<=" ? y <= 0 : y >= 0);
    for (let k = -80; k <= 80; k++) {
      const x = k / 8 + 0.0137;
      const y = f({ x });
      if (!Number.isFinite(y)) { assert.equal(inPieces(x), false, `${expr} ${op} 0, x=${x} тодорхойгүй`); continue; }
      assert.equal(inPieces(x), test(y), `${expr} ${op} 0 at x=${x}`);
    }
    // бүхэл цэгүүд (хил дээр) — тэг/тодорхойгүй цэгийг зөв орхих
    for (let x = -6; x <= 6; x++) {
      const y = f({ x });
      if (!Number.isFinite(y)) { assert.equal(inPieces(x), false, `${expr} ${op} 0 тодорхойгүй x=${x}`); continue; }
      assert.equal(inPieces(x), test(Math.abs(y) < 1e-12 ? 0 : y), `${expr} ${op} 0 at x=${x}`);
    }
  }
});

test("санамсаргүй уламжлал ба интеграл: тоон тулгалт", () => {
  const fs = ["x^2*sin(x)", "e^(3x)*cos(x)", "ln(x^2+1)/x", "sqrt(x^2+1)", "(x+1)/(x-2)", "x^3*e^(-x)", "sin(x)^3", "tan(2x)", "2^x*x"];
  for (const s of fs) {
    const d = S("an", s, {}, "deriv");
    assert.ok(d.ok, s);
  }
  const ints = ["x^3-2x", "e^(-2x)", "cos(4x+1)", "1/(2x+3)", "x cos x", "x^2 sin x", "1/((x-1)(x+2))", "(3x-1)^4", "1/sqrt(x+1)"];
  for (const s of ints) assert.ok(S("an", s, {}, "int").ok, s);
});

test("графикт дамжуулах илэрхийлэл задлагдана", () => {
  for (const [mode, input, sub] of [["eq", "x^2-4x+3=0"], ["eq", "(x-1)/(x+2)>0"], ["an", "x sin x", "deriv"], ["an", "x^2", "int"]]) {
    const sol = S(mode, input, {}, sub);
    assert.ok(sol.graph && sol.graph.length, `${input}: graph`);
    for (const g of sol.graph) assert.doesNotThrow(() => parse(g), g);
  }
  void N;
  void parseRelation;
});
