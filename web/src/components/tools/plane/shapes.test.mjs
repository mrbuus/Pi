// shapes.ts — загвар горимын зураг ба тооцоог шалгана
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildShape, DEFAULT_PARAMS, DEFAULT_OPTS, equalGroups, triangleKindText } from "./shapes.ts";

const P = (x) => ({ ...DEFAULT_PARAMS, ...x });
const O = (x) => ({ ...DEFAULT_OPTS, ...x });
const metric = (b, name) => b.metrics.find((m) => m.name === name);

test("тэнцүү бүлэг", () => {
  assert.deepEqual(equalGroups([3, 4, 5]), [0, 0, 0]);
  assert.deepEqual(equalGroups([5, 3, 5]), [1, 0, 1]);
  assert.deepEqual(equalGroups([2, 2, 2]), [1, 1, 1]);
  assert.deepEqual(equalGroups([1, 2, 1, 2]), [1, 2, 1, 2]);
});

test("3-4-5 гурвалжин: талбай 6, тэгш өнцгийн тэмдэг", () => {
  const b = buildShape(P({ shape: "triangle", triKind: "sss", a: 5, b: 4, c: 3 }), O({}));
  assert.ok(b.ok);
  assert.match(metric(b, "Талбай (Герон)").tex, /=6$/);
  assert.match(metric(b, "Периметр").tex, /=12$/);
  assert.match(metric(b, "Багтсан тойргийн радиус").tex, /=1$/);
  assert.match(metric(b, "Багтаасан тойргийн радиус").tex, /\\frac\{5\}\{2\}/);
  assert.ok(b.prims.some((p) => p.k === "angle" && p.right));
  assert.match(metric(b, "Төрөл").text, /тэгш өнцөгт/);
});

test("байхгүй гурвалжин — алдааны тайлбар", () => {
  const b = buildShape(P({ triKind: "sss", a: 1, b: 2, c: 7 }), O({}));
  assert.equal(b.ok, false);
  assert.ok(b.reason.length > 10);
  assert.equal(buildShape(P({ triKind: "iso", a: 10, b: 4 }), O({})).ok, false);
  assert.equal(buildShape(P({ triKind: "asa", B: 120, a: 3, C: 70 }), O({})).ok, false);
});

test("тусгай гурвалжнууд", () => {
  const r = buildShape(P({ triKind: "right", a: 6, b: 8 }), O({}));
  assert.ok(r.ok);
  assert.match(metric(r, "Гипотенуз (Пифагор)").tex, /=10$/);
  assert.match(metric(r, "Талбай").tex, /=24$/);
  const e = buildShape(P({ triKind: "equi", a: 2 }), O({}));
  assert.ok(e.ok);
  assert.match(metric(e, "Талбай").tex, /=\\sqrt\{3\}/);
  assert.equal(triangleKindText(e.tri), "зөв (адил талт), хурц өнцөгт");
  const iso = buildShape(P({ triKind: "iso", a: 6, b: 5 }), O({}));
  assert.ok(iso.ok);
  assert.match(metric(iso, "Суурь руу буусан өндөр").tex, /=4$/);
  assert.ok(iso.prims.filter((p) => p.k === "ticks").length >= 2);
});

test("SSA хоёр шийд — сонголт", () => {
  const a = buildShape(P({ triKind: "ssa", a: 4, b: 5, A: 40 }), O({}));
  const b = buildShape(P({ triKind: "ssa", a: 4, b: 5, A: 40, ssaAlt: true }), O({}));
  assert.ok(a.ok && b.ok && a.hasAlt);
  assert.notEqual(Math.round(a.tri.B), Math.round(b.tri.B));
});

test("нэмэлт шугамууд зурагдана", () => {
  const b = buildShape(P({ triKind: "sss", a: 7, b: 8, c: 9 }), O({ from: "all", height: true, median: true, bisector: true, perpBis: true, midline: true, incircle: true, circumcircle: true, orthoC: true, centroidC: true, euler: true }));
  assert.ok(b.ok);
  const labels = b.prims.filter((p) => p.k === "label").map((p) => p.text);
  for (const n of ["H_1", "H_2", "H_3", "A_1", "L_2", "G", "H", "I", "O"]) assert.ok(labels.includes(n), n);
  assert.equal(b.prims.filter((p) => p.k === "circle").length, 2);
});

test("дөрвөн өнцөгт ба олон өнцөгт", () => {
  const rect = buildShape(P({ shape: "rectangle", rw: 6, rh: 8 }), O({}));
  assert.match(metric(rect, "Диагональ").tex, /=10$/);
  assert.match(metric(rect, "Талбай").tex, /=48$/);
  const sq = buildShape(P({ shape: "square", sq: 3 }), O({}));
  assert.match(metric(sq, "Диагональ").tex, /3\\sqrt\{2\}/);
  const par = buildShape(P({ shape: "parallelogram", pa: 6, pb: 4, palpha: 30 }), O({ qHeight: true }));
  assert.match(metric(par, "Талбай").tex, /=12$/);
  const rh = buildShape(P({ shape: "rhombus", rhKind: "diag", d1: 8, d2: 6 }), O({}));
  assert.match(metric(rh, "Тал").tex, /=5$/);
  assert.match(metric(rh, "Талбай").tex, /=24$/);
  const tr = buildShape(P({ shape: "trapezoid", trKind: "iso", ta: 10, tb: 4, th: 4 }), O({ midline: true }));
  assert.match(metric(tr, "Талбай").tex, /=28$/);
  assert.match(metric(tr, "Хажуу тал").tex, /=5$/);
  const bad = buildShape(P({ shape: "trapezoid", trKind: "legs", ta: 10, tb: 4, tc: 1, td: 1 }), O({}));
  assert.equal(bad.ok, false);
  const hex = buildShape(P({ shape: "polygon", n: 6, pside: 2 }), O({ pR: true, pr: true }));
  assert.match(metric(hex, "Талбай (зургаан өнцөгт)").tex, /=6\\sqrt\{3\}/);
  assert.equal(buildShape(P({ shape: "polygon", n: 13 }), O({})).ok, false);
});

test("тойрог", () => {
  const c = buildShape(P({ shape: "circle", r: 5, theta: 60, tanD: 13 }), O({ cChord: true, cSector: true, cSegment: true, cInscribed: true, cTangent: true, cTangentExt: true }));
  assert.ok(c.ok);
  assert.match(metric(c, "Дугуйн талбай").tex, /=25\\pi\\approx 78.54/);
  assert.match(metric(c, "Хөвч").tex, /=5$/);
  assert.match(metric(c, "Шүргэгчийн урт").tex, /=12$/);
  assert.match(metric(c, "Тойргийн (багтсан) өнцөг").tex, /30/);
  const d = buildShape(P({ shape: "circle", r: 10, rAsD: true }), O({}));
  assert.match(metric(d, "Радиус").tex, /=5$/);
  assert.equal(buildShape(P({ shape: "circle", r: 5, tanD: 3 }), O({ cTangentExt: true })).ok, false);
});

test("нэгж залгагдана", () => {
  const b = buildShape(P({ shape: "square", sq: 2 }), O({ unit: "см" }));
  assert.match(metric(b, "Талбай").tex, /\\text\{см\}\^2$/);
});

test("тестэд зориулж: зурагт тоо биш үсэг", () => {
  const b = buildShape(P({ triKind: "sss", a: 5, b: 4, c: 3 }), O({ exam: true }));
  const texts = b.prims.filter((p) => p.k === "side" || p.k === "angle").map((p) => p.text).filter(Boolean);
  assert.ok(texts.includes("a") && texts.includes("\\beta"));
  assert.ok(!texts.some((t) => /\d/.test(t)));
});

test("гол үр дүн ба мөрүүд: хэт олон оронтой тоогүй", () => {
  const b = buildShape(P({ triKind: "sss", a: 5, b: 4, c: 3 }), O({}));
  const keys = b.metrics.filter((m) => m.key).map((m) => m.name);
  for (const k of ["Өнцгүүд", "Периметр", "Талбай (Герон)"]) assert.ok(keys.includes(k), k);
  const med = metric(b, "Медианууд");
  assert.equal(med.rows[2].v.exact, "\\frac{\\sqrt{73}}{2}");
  assert.equal(metric(b, "Өндрүүд").rows[0].v.exact, "\\frac{12}{5}");
  for (const m of b.metrics) for (const r of m.rows ?? []) assert.ok(!/\d\.\d{3}/.test(r.v.dec), r.v.dec);
  assert.ok(b.handles.length === 3);
});
