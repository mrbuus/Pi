// formulaSheet.ts-ийн жинхэнэ кодыг шалгана. Ажиллуулах (web/): node --test src/components/tools/formula/
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  parseSheet, checkSheet, filterFormulas, prepareQuery, scoreFormula, inlineMath, displayMath,
  normLatex, foldText, toggleSlug, moveSlug, resolveBasket, sanitizeFilter, DEFAULT_FILTER,
} from "./formulaSheet.ts";

const jsonPath = fileURLToPath(new URL("../../../../public/tools/formulas.json", import.meta.url));
const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
const sheet = parseSheet(raw);

const mini = parseSheet({
  version: 1,
  sections: [
    { slug: "a", title: "Алгебр", order: 1 },
    { slug: "g", title: "Геометр", order: 2 },
  ],
  formulas: [
    { slug: "pyth", title: "Пифагорын теорем", section: "g", order: 1, grade: 8, level: "CORE", latex: "a^2+b^2=c^2", conditions: ["\\gamma=90^\\circ"], keywords: ["тэгш өнцөгт гурвалжин"] },
    { slug: "sq", title: "Нийлбэрийн квадрат", section: "a", order: 1, grade: 7, level: "CORE", latex: "(a+b)^2=a^2+2ab+b^2", explanation: "Пифагорын теоремтой андуурахгүй" },
    { slug: "trig", title: "Үндсэн адилтгал", section: "a", order: 2, grade: 10, level: "CORE", latex: "\\sin^2\\alpha+\\cos^2\\alpha=1" },
    { slug: "ext", title: "Өнцгийн биссектрис", section: "g", order: 2, grade: 9, level: "EXTRA", latex: "\\frac{a}{b}=\\frac{m}{n}" },
    { slug: "bad", title: "Хоосон", section: "g", grade: 9, level: "CORE", latex: "" },
    { slug: "pyth", title: "Давхар", section: "g", grade: 9, level: "CORE", latex: "x" },
  ],
});

test("JSON бүрэн бүтэн: slug давхардалгүй, latex хоосон биш", () => {
  assert.deepEqual(checkSheet(raw), []);
  assert.ok(raw.formulas.length >= 380, `томьёо ${raw.formulas.length}`);
  assert.equal(raw.count, raw.formulas.length);
  assert.equal(new Set(raw.formulas.map((f) => f.slug)).size, raw.formulas.length);
  assert.ok(raw.formulas.every((f) => f.latex.trim().length > 0));
  assert.equal(sheet.formulas.length, raw.formulas.length, "parseSheet нэг ч мөр хаяагүй");
  assert.equal(sheet.sections.length, 8);
  assert.equal(sheet.sections.reduce((s, x) => s + x.count, 0), raw.formulas.length);
});

test("parseSheet буруу мөрийг алгасна", () => {
  assert.equal(parseSheet(null), null);
  assert.equal(parseSheet({ sections: 1 }), null);
  assert.equal(mini.formulas.length, 4); // хоосон latex ба давхар slug хасагдсан
  assert.deepEqual(checkSheet({ sections: [{ slug: "a" }], formulas: [{ slug: "x", title: "t", section: "a", grade: 7, level: "CORE", latex: "$x$" }] }), ["x: latex дотор $ байна"]);
});

test("$-ээр боох", () => {
  assert.equal(inlineMath("a^2"), "$a^2$");
  assert.equal(inlineMath("$a$ ба $b$"), "$a$ ба $b$");
  assert.equal(displayMath("x=1"), "$$x=1$$");
  assert.equal(inlineMath("  "), "");
  assert.equal(inlineMath("100\\$"), "$100\\$$");
});

test("шүүлт: анги, түвшин, бүлгийн тоо", () => {
  const all = filterFormulas(mini, DEFAULT_FILTER);
  assert.equal(all.items.length, 4);
  assert.deepEqual(all.counts, { all: 4, a: 2, g: 2 });
  assert.deepEqual(all.items.map((f) => f.slug), ["sq", "trig", "pyth", "ext"]);
  const g9 = filterFormulas(mini, { ...DEFAULT_FILTER, grade: 9 });
  assert.deepEqual(g9.items.map((f) => f.slug), ["ext"]);
  const upto9 = filterFormulas(mini, { ...DEFAULT_FILTER, grade: 9, gradeMode: "upto" });
  assert.equal(upto9.items.length, 3);
  const extra = filterFormulas(mini, { ...DEFAULT_FILTER, level: "EXTRA" });
  assert.deepEqual(extra.counts, { all: 1, a: 0, g: 1 });
  const secG = filterFormulas(mini, { ...DEFAULT_FILTER, section: "g" });
  assert.equal(secG.items.length, 2);
  assert.equal(secG.counts.all, 4, "бүлгийн чипийн тоо бүлгийн шүүлтээс хамаарахгүй");
});

test("шүүлт: жинхэнэ өгөгдөл дээр тоо нийцтэй", () => {
  const all = filterFormulas(sheet, DEFAULT_FILTER);
  assert.equal(all.items.length, sheet.formulas.length);
  let sum = 0;
  for (let g = 7; g <= 12; g++) sum += filterFormulas(sheet, { ...DEFAULT_FILTER, grade: g }).items.length;
  assert.equal(sum, sheet.formulas.length);
  const core = filterFormulas(sheet, { ...DEFAULT_FILTER, level: "CORE" }).items.length;
  const extra = filterFormulas(sheet, { ...DEFAULT_FILTER, level: "EXTRA" }).items.length;
  assert.equal(core + extra, sheet.formulas.length);
  assert.equal(filterFormulas(sheet, { ...DEFAULT_FILTER, grade: 12, gradeMode: "upto" }).items.length, sheet.formulas.length);
});

test("хайлтын эрэмбэ: гарчиг > тайлбар, ү/у ялгаагүй, LaTeX", () => {
  const s = (q) => filterFormulas(mini, { ...DEFAULT_FILTER, query: q }).items.map((f) => f.slug);
  assert.deepEqual(s("Пифагор"), ["pyth", "sq"]); // гарчигт нь эхэнд, тайлбарт нь дараа
  assert.deepEqual(s("ундсэн"), ["trig"]); // ү-гүй бичсэн
  assert.deepEqual(s("гурвалжин"), ["pyth"]); // түлхүүр үг
  assert.deepEqual(s("\\sin^2"), ["trig"]);
  assert.deepEqual(s("a^2+b^2"), ["pyth"]);
  assert.deepEqual(s("a^{2}"), ["pyth", "sq"]); // хаалттай бичсэн ч олно
  assert.deepEqual(s("пифагор алгебр"), []); // бүх үг таарах ёстой
  assert.deepEqual(s("frac"), ["ext"]);
  assert.equal(normLatex("\\left( x^{2} \\right)"), "(x^2)");
  assert.equal(foldText("Үндсэн Өнцөг"), "ундсэн онцог");
  const q = prepareQuery("Пифагорын теорем");
  assert.ok(scoreFormula(mini.formulas.find((f) => f.slug === "pyth"), q) > scoreFormula(mini.formulas.find((f) => f.slug === "sq"), q));
});

test("хайлт: жинхэнэ өгөгдөл", () => {
  const top = (q) => filterFormulas(sheet, { ...DEFAULT_FILTER, query: q }).items;
  const p = top("Пифагор");
  assert.ok(p.length >= 1 && /Пифагор/.test(p[0].title), p[0]?.title);
  const tr = top("\\sin^2");
  assert.ok(tr.length >= 1 && tr[0].section === "trigonometry", tr[0]?.slug);
  assert.ok(top("логарифм").length >= 5);
  assert.equal(top("zzzqqq").length, 0);
});

test("сагс", () => {
  assert.deepEqual(toggleSlug(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleSlug(["a", "b"], "a"), ["b"]);
  assert.deepEqual(moveSlug(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
  assert.deepEqual(moveSlug(["a", "b"], "a", -1), ["a", "b"]);
  assert.deepEqual(resolveBasket(mini, ["ext", "missing", "pyth"]).map((f) => f.slug), ["ext", "pyth"]);
  assert.deepEqual(sanitizeFilter({ section: "x", grade: 3, level: "Q" }, ["a"]), DEFAULT_FILTER);
  assert.equal(sanitizeFilter({ section: "a", grade: 9, gradeMode: "upto" }, ["a"]).grade, 9);
});
