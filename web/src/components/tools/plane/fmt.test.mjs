// fmt.ts — тоо форматлах
import assert from "node:assert/strict";
import { test } from "node:test";
import { val, degVal, piVal, valTex, needsApprox, num, niceStep, lenLabel } from "./fmt.ts";

test("яг хэлбэр эхэнд, ойролцоо 2 орон", () => {
  assert.deepEqual(val(2.4), { exact: "\\frac{12}{5}", dec: "2.4", eq: true });
  assert.equal(val(Math.sqrt(13)).exact, "\\sqrt{13}");
  assert.equal(val(Math.sqrt(13)).dec, "3.61");
  assert.equal(val(Math.sqrt(73) / 2).exact, "\\frac{\\sqrt{73}}{2}");
  assert.equal(val((12 * Math.SQRT2) / 7).exact, "\\frac{12\\sqrt{2}}{7}");
  assert.equal(val(Math.PI).exact, null);
  assert.equal(valTex(val(Math.sqrt(13))), "=\\sqrt{13}\\approx 3.61");
  assert.equal(valTex(val(6)), "=6");
  assert.equal(needsApprox(val(6)), false);
  assert.equal(needsApprox(val(2.4)), true);
});

test("өнцөг: цэвэр бол бүхэл, бусад 1 орон", () => {
  assert.equal(degVal(90).exact, "90^\\circ");
  assert.equal(degVal(53.130102).dec, "53.1^\\circ");
  assert.equal(degVal(53.130102).exact, null);
  assert.equal(valTex(degVal(36.8699)), "\\approx 36.9^\\circ");
});

test("π, орлуулах тоо, шошго", () => {
  assert.equal(piVal(25).exact, "25\\pi");
  assert.equal(piVal(2.5).exact, "\\frac{5\\pi}{2}");
  assert.equal(num(2.5), "2.5");
  assert.equal(num(Math.sqrt(2)), "\\sqrt{2}");
  assert.equal(lenLabel(3.605551, ""), "3.61");
  assert.equal(niceStep(3.96), 4);
  assert.equal(niceStep(3.73), 3.7);
});
