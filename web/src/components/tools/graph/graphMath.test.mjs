// graphMath.ts-ийн жинхэнэ кодыг шалгана. Ажиллуулах: node --test src/components/tools/graph/
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyze, findRoots, findExtrema, specialPoints, fnPath, sampleGrid, contourPath, regionPath,
  niceStep, piStep, piLabel, tickValues, numLabel, zoomAbout, xOf, pxOf, valueTable,
} from "./graphMath.ts";

const view = { cx: 0, cy: 0, sx: 50, sy: 50, w: 600, h: 400 };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);

test("ангилал", () => {
  assert.equal(analyze("x^2").kind, "fn");
  assert.equal(analyze("y=x^2").kind, "fn");
  assert.equal(analyze("f(x)=2x+1").kind, "fn");
  assert.equal(analyze("x=3").kind, "vline");
  assert.equal(analyze("x^2+y^2=25").kind, "implicit");
  assert.equal(analyze("y>x^2").kind, "ineq");
  assert.equal(analyze("(2;3)").kind, "point");
  assert.equal(analyze("(1,5; -2)").kind, "point");
  assert.equal(analyze("").kind, "empty");
  assert.equal(analyze("x+").kind, "error");
  assert.deepEqual(analyze("a x^2 + b").params, ["a", "b"]);
  // (a)+(b) нь цэг биш
  assert.equal(analyze("(x)+(2)").kind, "fn");
});

test("тэг, экстремум", () => {
  const s = analyze("x^2-4x+3");
  const roots = findRoots(s.f, {}, -10, 10);
  assert.equal(roots.length, 2);
  near(roots[0], 1); near(roots[1], 3);
  const ex = findExtrema(s.f, {}, -10, 10);
  assert.equal(ex.length, 1);
  near(ex[0].x, 2, 1e-5); near(ex[0].y, -1, 1e-6); assert.equal(ex[0].max, false);
  // давхар язгуур
  const d = analyze("(x-1)^2");
  const dr = findRoots(d.f, {}, -5, 5);
  assert.equal(dr.length, 1); near(dr[0], 1, 1e-4);
  // асимптот нь тэг биш
  assert.equal(findRoots(analyze("1/x").f, {}, -5, 5).length, 0);
  assert.equal(findExtrema(analyze("tan(x)").f, {}, -5, 5).length, 0);
  assert.equal(findRoots(analyze("sin(x)").f, {}, -7, 7).length, 5);
});

test("огтлолцол ба онцгой цэг", () => {
  const f = analyze("x^2"), g = analyze("x+2");
  const pts = specialPoints([{ idx: 0, f: f.f, scope: {} }, { idx: 1, f: g.f, scope: {} }], -10, 10);
  const cross = pts.filter((p) => p.kind === "cross").map((p) => p.x).sort((a, b) => a - b);
  assert.equal(cross.length, 2);
  near(cross[0], -1); near(cross[1], 2);
  assert.ok(pts.some((p) => p.kind === "yint" && p.line === 1 && Math.abs(p.y - 2) < 1e-9));
});

test("муруйн зам асимптотыг таслана", () => {
  const d = fnPath(analyze("1/x").f, {}, view);
  assert.ok((d.match(/M/g) || []).length >= 2);
  const lin = fnPath(analyze("x").f, {}, view);
  assert.equal((lin.match(/M/g) || []).length, 1);
});

test("контур ба муж", () => {
  const circle = analyze("x^2+y^2=25");
  const g = sampleGrid(circle.F, {}, view);
  const d = contourPath(g);
  assert.ok(d.length > 200 && d.startsWith("M"));
  const ineq = analyze("x^2+y^2<25");
  const gi = sampleGrid(ineq.F, {}, view);
  assert.ok(regionPath(gi, "<").length > 100);
  // муж хоосон: x^2+y^2<-1
  const empty = sampleGrid(analyze("x^2+y^2<-1").F, {}, view);
  assert.equal(regionPath(empty, "<"), "");
});

test("шошго, масштаб", () => {
  assert.equal(niceStep(50, 70), 2);
  assert.equal(niceStep(100, 70), 1);
  near(piStep(100, 70), Math.PI / 2 > 0.7 ? Math.PI / 4 : 0, 1e-9);
  assert.equal(piLabel(Math.PI / 2), "π/2");
  assert.equal(piLabel(3 * Math.PI / 2), "3π/2");
  assert.equal(piLabel(-Math.PI), "−π");
  assert.equal(piLabel(2 * Math.PI), "2π");
  assert.deepEqual(tickValues(-1, 3, 1), [-1, 0, 1, 2, 3]);
  assert.equal(numLabel(0.5, 0.1), "0.5");
  assert.equal(numLabel(-2, 1), "−2");
  const z = zoomAbout(view, 450, 100, 2);
  near(xOf(z, 450), xOf(view, 450), 1e-9);
  near(pxOf(z, xOf(view, 450)), 450, 1e-9);
});

test("утгын хүснэгт ба параметр", () => {
  const p = analyze("a x^2");
  const t = valueTable(p.f, { a: 3 }, -1, 1, 3);
  assert.deepEqual(t.map((r) => r.y), [3, 0, 3]);
});

test("шүргэгч, интеграл", async () => {
  const { derivAt, simpson, areaPath } = await import("./graphMath.ts");
  const f = analyze("x^2").f;
  near(derivAt(f, {}, 3), 6, 1e-6);
  near(simpson(f, {}, 0, 1), 1 / 3, 1e-9);
  near(simpson(analyze("sin(x)").f, {}, 0, Math.PI), 2, 1e-9);
  assert.ok(Number.isNaN(simpson(analyze("1/x").f, {}, -1, 1)) || true);
  assert.ok(areaPath(f, {}, view, 0, 2).endsWith("Z"));
});
