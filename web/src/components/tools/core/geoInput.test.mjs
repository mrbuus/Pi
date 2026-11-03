// geoInput.ts — геометрийн утгын оролт. Ажиллуулах: node --test src/components/tools/core/geoInput.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { press, valueOf, displayTex, fromText, tokensOf, hintFor, allows, isSymbolic, keyFromKeyboard, plainOf } from "./geoInput.ts";

const near = (a, b, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const keys = (seq, opts) => seq.reduce((t, k) => press(t, k, opts), []);

test("цифр, аравтын цэг", () => {
  const t = keys(["1", "2", ".", "5"]);
  assert.deepEqual(t, ["1", "2", ".", "5"]);
  near(valueOf(t), 12.5);
  assert.deepEqual(keys([".", "5"]), ["0", ".", "5"]);
  assert.deepEqual(keys(["1", ".", "."]), ["1", "."], "нэг тоонд ганц цэг");
});

test("язгуур дараагийн тоог л хамарна, бутархай", () => {
  const t = keys(["2", "sqrt", "3"]);
  assert.equal(displayTex(t), "2\\sqrt{3}");
  near(valueOf(t), 2 * Math.sqrt(3));
  const f = keys(["sqrt", "3", "frac", "2"]);
  assert.equal(plainOf(f), "(sqrt(3))/(2)");
  assert.equal(displayTex(f), "\\frac{\\sqrt{3}}{2}");
  near(valueOf(f), Math.sqrt(3) / 2);
  const g = keys(["2", "sqrt", "3", "frac", "3"]);
  near(valueOf(g), (2 * Math.sqrt(3)) / 3);
});

test("дуусаагүй үед null, зураг эвдрэхгүй", () => {
  assert.equal(valueOf(keys(["3", "frac"])), null);
  assert.equal(displayTex(keys(["3", "frac"])), "\\frac{3}{\\square}");
  assert.equal(valueOf(keys(["sqrt"])), null);
  assert.equal(displayTex(keys(["sqrt"])), "\\sqrt{\\square}");
  assert.equal(valueOf([]), null);
  assert.equal(hintFor(keys(["3", "frac"]), null, 0.1, 100), "Хуваарийг бичнэ үү");
  assert.equal(hintFor([], null, 0.1, 100), "Утгаа бичнэ үү");
});

test("буцаах нь автомат хаалтыг хамт арилгана", () => {
  let t = keys(["sqrt", "3", "frac"]);
  assert.deepEqual(t, ["sqrt(", "3", ")", "/"]);
  t = press(t, "back");
  assert.deepEqual(t, ["sqrt(", "3"]);
  t = press(t, "5");
  near(valueOf(t), Math.sqrt(35));
  assert.deepEqual(press(t, "clear"), []);
});

test("квадрат, π", () => {
  near(valueOf(keys(["3", "sq"])), 9);
  near(valueOf(keys(["2", "pi"])), 2 * Math.PI);
  assert.equal(displayTex(keys(["2", "pi"])), "2\\pi");
  near(valueOf(keys(["sqrt", "pi"])), Math.sqrt(Math.PI));
  assert.deepEqual(keys(["3", "sq", "4"]), ["3", "^2"], "квадратын араас цифр бичихгүй");
});

test("өнцөг: градус тэмдэг, π радиан → градус", () => {
  const opts = { kind: "angle" };
  const t = keys(["6", "0", "deg"], opts);
  assert.equal(displayTex(t), "60^{\\circ}");
  near(valueOf(t, opts), 60);
  near(valueOf(keys(["pi", "frac", "3"], opts), opts), 60);
  assert.equal(allows("deg", { kind: "length" }), false);
  assert.deepEqual(keys(["6", "deg"], { kind: "length" }), ["6"]);
});

test("бүхэл тоо: зөвхөн цифр", () => {
  const opts = { kind: "integer" };
  assert.deepEqual(keys(["5", ".", "sqrt", "frac"], opts), ["5"]);
  assert.equal(hintFor(["5"], 5, 3, 12, opts), null);
  assert.equal(hintFor(["1", "5"], 15, 3, 12, opts), "Хамгийн ихдээ 12");
});

test("сөрөг утга", () => {
  const opts = { signed: true };
  const t = keys(["2", "neg"], opts);
  assert.deepEqual(t, ["-", "2"]);
  near(valueOf(t, opts), -2);
  assert.deepEqual(keys(["2", "neg"]), ["2"], "signed биш бол хасахгүй");
});

test("бичвэрээс: 2\\sqrt{3}, 3/4, \\frac, pi/3, 60°", () => {
  near(valueOf(fromText("2\\sqrt{3}")), 2 * Math.sqrt(3));
  near(valueOf(fromText("2sqrt3")), 2 * Math.sqrt(3));
  near(valueOf(fromText("3/4")), 0.75);
  near(valueOf(fromText("\\frac{\\sqrt{3}}{2}")), Math.sqrt(3) / 2);
  near(valueOf(fromText("2,5")), 2.5);
  near(valueOf(fromText("pi/3", { kind: "angle" }), { kind: "angle" }), 60);
  near(valueOf(fromText("45°", { kind: "angle" }), { kind: "angle" }), 45);
  near(valueOf(fromText("-1.5", { signed: true }), { signed: true }), -1.5);
});

test("тоог токен болгох, хязгаар", () => {
  assert.deepEqual(tokensOf(4), ["4"]);
  assert.deepEqual(tokensOf(2.5), ["2", ".", "5"]);
  assert.deepEqual(tokensOf(1 / 3), "0.333333".split(""));
  assert.equal(hintFor(["0"], 0, 0.1, 100), "Тэгээс их утга бичнэ үү");
  assert.equal(hintFor(["2", "0", "0"], 200, 0.1, 100), "Хамгийн ихдээ 100");
  assert.equal(isSymbolic(["2", "."]), false);
  assert.equal(isSymbolic(["sqrt(", "2"]), true);
});

test("компьютерийн гар", () => {
  assert.equal(keyFromKeyboard("7"), "7");
  assert.equal(keyFromKeyboard(","), ".");
  assert.equal(keyFromKeyboard("/"), "frac");
  assert.equal(keyFromKeyboard("r"), "sqrt");
  assert.equal(keyFromKeyboard("p"), "pi");
  assert.equal(keyFromKeyboard("Backspace"), "back");
  assert.equal(keyFromKeyboard("x"), null);
});
