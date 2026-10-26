// Өнцөг/зай, шошгоны байрлал, картын хариуны ЦЭВЭР логик — жинхэнэ модулиар.
// Ажиллуулах: node --test src/components/tools/solid/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSolid, SOLIDS, defaultParams } from "./solids.ts";
import { measures, answerParts, measureSteps, keyMeasures } from "./measure.ts";
import { prepareBody } from "./body.ts";
import { angleValue, computeMeasure, defaultMeasureRefs, distValue, MEASURE_KINDS, slotCount } from "./angles.ts";
import { layoutLabels, labelsOverlap, segHitsBox, textBox } from "./labels.ts";
import { makeCamera, buildFrame, PRESETS } from "./project.ts";
import { modelCenter } from "./solids.ts";
import { measureOptions, validRefs } from "./state.ts";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)), `${a} ≈ ${b}`);
const N = (...xs) => xs.map((name) => ({ name }));
const run = (kind, params, mk, names) => {
  const model = buildSolid(kind, params);
  const R = prepareBody(model.body).radius;
  return computeMeasure(model, mk, N(...names), R);
};

/* ------------------------------------------------ өнцөг, зай -- */

test("куб a=1: биеийн диагональ ба суурийн хавтгайн өнцөг = arctg(√2/2)", () => {
  const r = run("cube", { a: 1 }, "lp", ["A", "C_1", "A", "B", "C"]);
  assert.equal(r.error, null);
  near(r.angle.deg, (Math.atan(Math.SQRT2 / 2) * 180) / Math.PI);
  assert.equal(r.angle.exact, "\\operatorname{arctg}\\frac{\\sqrt{2}}{2}");
  assert.equal(r.angle.approx, "\\approx 35.26^\\circ");
  // зураг: проекц AC, перпендикуляр C_1C, нум A дээр
  assert.equal(r.draw.arcs.length, 1);
  near(r.draw.arcs[0].o[1], 0);
});

test("куб a=1: A цэгээс A_1BD хавтгай хүртэлх зай = √3/3", () => {
  const r = run("cube", { a: 1 }, "dp", ["A", "A_1", "B", "D"]);
  assert.equal(r.error, null);
  near(r.dist.value, Math.sqrt(3) / 3);
  assert.equal(r.dist.exact, "\\frac{\\sqrt{3}}{3}");
  assert.equal(r.dist.approx, "\\approx 0.58");
  assert.equal(r.draw.rights.length, 1);
});

test("куб: A_1BD ба суурийн хоорондох өнцөг = arctg√2, AB_1 ба BC_1 = 60°", () => {
  const p = run("cube", { a: 2 }, "pp", ["A_1", "B", "D", "A", "B", "C"]);
  assert.equal(p.angle.exact, "\\operatorname{arctg}\\sqrt{2}");
  const l = run("cube", { a: 2 }, "ll", ["A", "B_1", "B", "C_1"]);
  assert.equal(l.angle.exact, "60^\\circ");
  assert.equal(l.angle.approx, null);
  // огтлолцдоггүй AB ба CC_1: зай = BC = 2, өнцөг 90°
  const s = run("cube", { a: 2 }, "ll", ["A", "B", "C", "C_1"]);
  assert.equal(s.angle.exact, "90^\\circ");
  assert.equal(s.dist.exact, "2");
});

test("зөв пирамид n=4, a=2, h=1: хажуу ирмэг-суурь arctg(√2/2), хажуу талс-суурь 45°", () => {
  assert.equal(run("pyramid", { n: 4, a: 2, h: 1 }, "lp", ["S", "A", "A", "B", "C"]).angle.exact, "\\operatorname{arctg}\\frac{\\sqrt{2}}{2}");
  assert.equal(run("pyramid", { n: 4, a: 2, h: 1 }, "pp", ["S", "A", "B", "A", "B", "C"]).angle.exact, "45^\\circ");
  // зөв тетраэдрийн эсрэг ирмэгүүд перпендикуляр
  assert.equal(run("tetra", { a: 3 }, "ll", ["D", "A", "B", "C"]).angle.exact, "90^\\circ");
});

test("конус r=3, h=4: байгуулагч ба суурийн өнцөг arctg(4/3), O-оос SAB хүртэл зай", () => {
  const r = run("cone", { r: 3, h: 4 }, "lp", ["S", "A", "O", "A", "B"]);
  assert.equal(r.angle.exact, "\\operatorname{arctg}\\frac{4}{3}");
  const d = run("cone", { r: 3, h: 4 }, "dp", ["O", "S", "A", "B"]);
  // OSAB: OA=OB=3, OS=4 тэгш өнцөгт тетраэдр → 1/d² = 1/9+1/9+1/16
  near(d.dist.value, 1 / Math.sqrt(2 / 9 + 1 / 16));
});

test("алдаа: нэг шулуун дээрх гурван цэг, давхцсан цэг", () => {
  assert.match(run("cube", { a: 1 }, "dp", ["A", "A", "B", "B"]).error, /нэг шулуун/);
  assert.match(run("cube", { a: 1 }, "ll", ["A", "A", "B", "C"]).error, /давхцаж/);
  const m = buildSolid("cube", { a: 1 });
  assert.match(computeMeasure(m, "lp", N("A"), 1).error, /сонгоно/);
});

test("биет бүрийн жишээ цэгүүд алдаагүй үр дүн өгнө (бөмбөрцгөөс бусад)", () => {
  for (const s of SOLIDS) {
    if (s.kind === "sphere") continue;
    const model = buildSolid(s.kind, defaultParams(s.kind));
    const R = prepareBody(model.body).radius;
    const opts = measureOptions(model);
    for (const { value: mk } of MEASURE_KINDS) {
      const refs = defaultMeasureRefs(model, mk);
      assert.equal(refs.length, slotCount(mk), `${s.kind} ${mk}`);
      assert.ok(validRefs(model, refs, slotCount(mk), opts), `${s.kind} ${mk} цэг`);
      const r = computeMeasure(model, mk, refs, R);
      assert.equal(r.error, null, `${s.kind} ${mk}: ${r.error}`);
      assert.ok(r.angle || r.dist, `${s.kind} ${mk}`);
    }
  }
});

test("өнцгийн яг хэлбэр: бүхэл градус, arcsin/arccos-оос богино нь", () => {
  assert.equal(angleValue(Math.SQRT1_2, Math.SQRT1_2).exact, "45^\\circ");
  assert.equal(angleValue(1, 0).exact, "90^\\circ");
  assert.equal(angleValue(0.5, Math.sqrt(3) / 2).exact, "30^\\circ");
  // tg = 2
  const v = angleValue(2 / Math.sqrt(5), 1 / Math.sqrt(5));
  assert.equal(v.exact, "\\operatorname{arctg}2");
  assert.equal(distValue(2).approx, null);
  assert.equal(distValue(Math.sqrt(13)).exact, "\\sqrt{13}");
});

/* ------------------------------------------------ картын хариу -- */

test("карт: яг хэлбэр дээр, ойролцоо 2 оронтой доор", () => {
  assert.deepEqual(answerParts(12 * Math.PI, true), { exact: "12\\pi", approx: "37.7" });
  assert.deepEqual(answerParts(64), { exact: "64", approx: null });
  assert.deepEqual(answerParts(Math.SQRT2 / 12), { exact: "\\frac{\\sqrt{2}}{12}", approx: "0.12" });
  const cone = measures("cone", { r: 3, h: 4 });
  const V = cone.find((m) => m.sym === "V");
  const st = measureSteps(V);
  assert.equal(st.formula, "V=\\frac{1}{3}\\pi r^2h");
  assert.ok(st.subst.endsWith("=12\\pi"), st.subst);
  assert.equal(st.approx, "\\approx 37.7");
  assert.deepEqual(keyMeasures(measures("cube", { a: 4 })).map((m) => m.sym), ["V", "S_{\\text{бүтэн}}", "S_{\\text{хажуу}}", "d"]);
  // 7 өнцөгтийн суурь: 25.71° биш, \frac{180^\circ}{7}
  const sb = measures("prism", { n: 7, a: 2, h: 3 })[0];
  assert.ok(!/\d\.\d{2}/.test(sb.subst), sb.subst);
});

/* ------------------------------------------------ шошго -- */

test("шошго: хэрчим-хайрцаг огтлолцол", () => {
  const box = { x0: 0, y0: 0, x1: 10, y1: 10 };
  assert.ok(segHitsBox([-5, 5], [15, 5], box));
  assert.ok(!segHitsBox([-5, -5], [15, -1], box));
  assert.ok(segHitsBox([5, 5], [6, 6], box));
  assert.ok(textBox("B_1", 17).w > textBox("B", 17).w);
});

test("кубын оройн шошго: бие биетэйгээ, ирмэгтэй давхцахгүй, эргүүлэхэд тогтвортой", () => {
  const model = buildSolid("cube", { a: 4 });
  const prep = prepareBody(model.body);
  const mem = new Map();
  for (const yaw of [-28, -26, -24, 0, 30, 45, 90]) {
    const cam = makeCamera({ ...PRESETS.default, yaw, zoom: 1, proj: "persp" }, 390, 460, modelCenter(model), prep.radius);
    const fr = buildFrame(prep, cam);
    const cs = cam.screen(modelCenter(model));
    const segs = fr.edges.map((e) => ({ a: e.a, b: e.b }));
    const reqs = model.vertices.map((k) => {
      const p = cam.screen(model.points[k]);
      return { key: k, anchor: p, dir: [p[0] - cs[0], p[1] - cs[1]], text: k, size: 17 };
    });
    const dots = reqs.map((r) => r.anchor);
    const out = layoutLabels(reqs, segs, dots, 390, 460, mem);
    assert.equal(out.length, 8);
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) assert.ok(!labelsOverlap(out[i], out[j]), `${yaw}: ${out[i].key}-${out[j].key}`);
    for (const l of out) {
      const box = { x0: l.x - l.w / 2, y0: l.y - l.h / 2, x1: l.x + l.w / 2, y1: l.y + l.h / 2 };
      const hits = segs.filter((s) => segHitsBox(s.a, s.b, box));
      assert.equal(hits.length, 0, `${yaw}: ${l.key} ирмэгтэй давхцав`);
    }
  }
});
