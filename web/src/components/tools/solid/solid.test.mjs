// Биетийн хэрэгслийн ЦЭВЭР логикийг жинхэнэ модулиар шалгана.
// Ажиллуулах: node --test src/components/tools/solid/
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSolid, SOLIDS, defaultParams, sanitizeParams } from "./solids.ts";
import { measures, totalArea, volume, exactTex, answerTex, measureTex } from "./measure.ts";
import { prepareBody, clipBody, bodyVolume, bodyArea, sectionPolygon } from "./body.ts";
import { planeFrom, sectionInfo, finePrepared, polygonName } from "./section.ts";
import { makeCamera, buildFrame, segmentVisible, faceFronts, PRESETS, convexHull } from "./project.ts";
import { buildNet, prepareNet, foldNet, netArea, netEdgeDrawn } from "./net.ts";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)), `${a} ≈ ${b}`);
const m = (kind, p) => measures(kind, p);
const val = (kind, p, sym) => m(kind, p).find((x) => x.sym === sym).value;

function section(kind, params, def) {
  const model = buildSolid(kind, params);
  const prep = prepareBody(model.body);
  const pl = planeFrom(model, def);
  assert.ok(pl.plane, pl.error);
  return { model, prep, pl, info: sectionInfo(model, prep, pl.plane, finePrepared(model)) };
}
const tilt = (y, deg = 0, turn = 0, shift = 0) => ({ how: "tilt", y, tilt: deg, turn, shift });
const pts = (...r) => ({ how: "points", pts: r });

/* ------------------------------------------------ V ба S -- */

test("куб a=2: V=8, S=24, d=2√3", () => {
  near(volume("cube", { a: 2 }), 8);
  near(totalArea("cube", { a: 2 }), 24);
  near(val("cube", { a: 2 }, "d"), 2 * Math.sqrt(3));
  const body = buildSolid("cube", { a: 2 }).body;
  near(bodyVolume(body), 8);
  near(bodyArea(body), 24);
});

test("зөв тетраэдр a=1: V=√2/12, S=√3", () => {
  near(volume("tetra", { a: 1 }), Math.SQRT2 / 12);
  near(totalArea("tetra", { a: 1 }), Math.sqrt(3));
  near(bodyVolume(buildSolid("tetra", { a: 1 }).body), Math.SQRT2 / 12);
  assert.equal(answerTex(volume("tetra", { a: 1 })), "\\frac{\\sqrt{2}}{12}\\approx 0.12");
});

test("конус r=3, h=4: l=5, V=12π, S=24π", () => {
  const p = { r: 3, h: 4 };
  near(val("cone", p, "l"), 5);
  near(volume("cone", p), 12 * Math.PI);
  near(totalArea("cone", p), 24 * Math.PI);
  const tex = m("cone", p).map(measureTex).join(" ");
  assert.match(tex, /=12\\pi\\approx 37\.7/);
  assert.match(tex, /=24\\pi\\approx 75\.4/);
});

test("бусад биетийн томьёо = торын тоон эзлэхүүн/талбай", () => {
  for (const s of SOLIDS) {
    const p = defaultParams(s.kind);
    const body = buildSolid(s.kind, p, { segments: 720 }).body;
    const V = volume(s.kind, p), S = totalArea(s.kind, p);
    const tol = s.curved ? 2e-3 : 1e-9;
    near(bodyVolume(body), V, tol);
    near(bodyArea(body), S, tol);
  }
});

test("цилиндр, тайрсан конус, бөмбөрцөг, призм, пирамид — гараар бодсон утга", () => {
  near(volume("cylinder", { r: 2, h: 5 }), 20 * Math.PI);
  near(totalArea("cylinder", { r: 2, h: 5 }), 28 * Math.PI);
  near(volume("sphere", { R: 3 }), 36 * Math.PI);
  near(totalArea("sphere", { R: 3 }), 36 * Math.PI);
  near(volume("fcone", { R: 4, r: 1, h: 4 }), (Math.PI * 4 * (16 + 4 + 1)) / 3); // 28π
  near(totalArea("fcone", { R: 4, r: 1, h: 4 }), Math.PI * 5 * 5 + Math.PI * 17); // l=5 → 42π
  near(volume("prism", { n: 6, a: 2, h: 3 }), ((3 * Math.sqrt(3)) / 2) * 4 * 3);
  near(volume("pyramid", { n: 4, a: 6, h: 4 }), 48);
  near(val("pyramid", { n: 4, a: 6, h: 4 }, "m"), 5);
  near(totalArea("pyramid", { n: 4, a: 6, h: 4 }), 36 + 60);
  near(volume("frustum", { n: 4, a: 4, b: 2, h: 3 }), (3 / 3) * (16 + 4 + 8));
  near(volume("octa", { a: 3 }), (27 * Math.SQRT2) / 3);
  near(volume("box", { a: 2, b: 3, c: 4 }), 24);
  near(totalArea("box", { a: 2, b: 3, c: 4 }), 52);
});

test("гоё хэлбэр: бутархай, язгуур, p+q√r, kπ", () => {
  assert.equal(exactTex(8), "8");
  assert.equal(exactTex(2.5), "\\frac{5}{2}");
  assert.equal(exactTex(4 * Math.SQRT2), "4\\sqrt{2}");
  assert.equal(exactTex(4 + 4 * Math.SQRT2), "4+4\\sqrt{2}");
  assert.equal(exactTex(29 + 7 * Math.sqrt(73)), "29+7\\sqrt{73}");
  assert.equal(answerTex(12 * Math.PI, true), "12\\pi\\approx 37.7");
  assert.equal(answerTex((4 / 3) * Math.PI, true), "\\frac{4}{3}\\pi\\approx 4.19");
  assert.equal(answerTex(Math.PI * (9 + 3 * Math.sqrt(13)), true), "(9+3\\sqrt{13})\\pi\\approx 62.26");
});

test("параметрийг хязгаарлана, тайрсан биетийн дээд суурь бага", () => {
  assert.deepEqual(sanitizeParams("cube", { a: 999 }), { a: 20 });
  assert.equal(sanitizeParams("prism", { n: 3.6 }).n, 4);
  const f = sanitizeParams("fcone", { R: 2, r: 3, h: 1 });
  assert.ok(f.r < f.R);
});

/* ------------------------------------------------ огтлол -- */

test("куб дундуур хэвтээ огтлол → квадрат, талбай a²", () => {
  const { info } = section("cube", { a: 2 }, tilt(1));
  assert.equal(info.name, "Квадрат");
  near(info.area, 4);
  assert.equal(info.corners.length, 4);
});

test("кубын диагональ хавтгай (A, C, A_1) → тэгш өнцөгт a·a√2", () => {
  const { info } = section("cube", { a: 2 }, pts({ name: "A" }, { name: "C" }, { name: "A_1" }));
  assert.equal(info.name, "Тэгш өнцөгт");
  near(info.area, 2 * 2 * Math.SQRT2);
  assert.equal(info.areaTex, "4\\sqrt{2}\\approx 5.66");
});

test("куб: ирмэгүүдийн дундаар → зөв зургаан өнцөгт, талбай 3√3 (a=2)", () => {
  // хажуу s = a√2/2 = √2, талбай = (3√3/2)s² = 3√3
  const { info } = section("cube", { a: 2 }, pts({ a: "B", b: "C", t: 0.5 }, { a: "A", b: "B", t: 0.5 }, { a: "A_1", b: "D_1", t: 0.5 }));
  assert.equal(info.name, "Зөв зургаан өнцөгт");
  near(info.area, 3 * Math.sqrt(3));
  assert.equal(info.areaTex, "3\\sqrt{3}\\approx 5.2");
});

test("куб: A_1, B, D оройгоор → зөв гурвалжин, талбай 2√3 (a=2)", () => {
  // тал = a√2 = 2√2, талбай = √3/4 · 8 = 2√3
  const { info } = section("cube", { a: 2 }, pts({ name: "A_1" }, { name: "B" }, { name: "D" }));
  assert.equal(info.name, "Зөв гурвалжин");
  near(info.area, 2 * Math.sqrt(3));
});

test("кубыг налуу хавтгай: трапец ба тав өнцөгт", () => {
  // A, B ба C_1D_1-ийн дунд биш — AB ба D_1C_1 ирмэгийн цэгүүд → тэгш өнцөгт (AB ∥ D_1C_1)
  const r = section("cube", { a: 2 }, pts({ name: "A" }, { name: "B" }, { a: "D_1", b: "D", t: 0.5 }));
  assert.equal(r.info.name, "Тэгш өнцөгт");
  // B_1, D_1 ба AB-ийн дунд → адил хажуут трапец
  const t = section("cube", { a: 2 }, pts({ name: "B_1" }, { name: "D_1" }, { a: "A", b: "B", t: 0.5 }));
  assert.match(t.info.name, /трапец/);
  // AB, BC-ийн дунд ба D_1 → таван өнцөгт (гараар: 2x+3y+2z=2, AB, BC, AA_1, CC_1 ирмэг + D_1)
  const p = section("cube", { a: 2 }, pts({ a: "A", b: "B", t: 0.5 }, { a: "B", b: "C", t: 0.5 }, { name: "D_1" }));
  assert.equal(p.info.name, "Таван өнцөгт");
  // AB, BC-ийн дунд ба CC_1-ийн дээд дөрөвний нэг → зургаан өнцөгт (6 ирмэг огтлогдоно)
  const h = section("cube", { a: 2 }, pts({ a: "A", b: "B", t: 0.5 }, { a: "B", b: "C", t: 0.5 }, { a: "C_1", b: "C", t: 0.25 }));
  assert.equal(h.info.name, "Зургаан өнцөгт");
});

test("пирамид: хагас өндрөөр хэвтээ → a/2 талтай квадрат", () => {
  const { info } = section("pyramid", { n: 4, a: 4, h: 6 }, tilt(3));
  assert.equal(info.name, "Квадрат");
  near(info.area, 4);
  const tri = section("pyramid", { n: 3, a: 4, h: 6 }, tilt(3));
  assert.equal(tri.info.name, "Зөв гурвалжин");
  near(tri.info.area, (Math.sqrt(3) / 4) * 4);
});

test("пирамид: S ба диагональ AC-аар → адил хажуут гурвалжин", () => {
  const { info } = section("pyramid", { n: 4, a: 4, h: 6 }, pts({ name: "S" }, { name: "A" }, { name: "C" }));
  assert.equal(info.name, "Адил хажуут гурвалжин");
  near(info.area, 0.5 * 4 * Math.SQRT2 * 6);
});

test("гурван цэг нэг шулуун дээр бол алдааны мессеж", () => {
  const model = buildSolid("cube", { a: 2 });
  const r = planeFrom(model, pts({ name: "A" }, { a: "A", b: "B", t: 0.5 }, { name: "B" }));
  assert.equal(r.plane, null);
  assert.equal(r.error, "Гурван цэг нэг шулуун дээр байна");
});

test("биетийн гадна хавтгай → огтлолгүй", () => {
  const { info } = section("cube", { a: 2 }, tilt(5));
  assert.equal(info, null);
});

test("цилиндр: тойрог, эллипс, тэгш өнцөгт, эллипсийн хэсэг", () => {
  const p = { r: 2, h: 6 };
  let s = section("cylinder", p, tilt(3));
  assert.equal(s.info.name, "Тойрог");
  near(s.info.area, 4 * Math.PI);
  s = section("cylinder", p, tilt(3, 30));
  assert.equal(s.info.name, "Эллипс");
  near(s.info.area, (4 * Math.PI) / Math.cos(Math.PI / 6));
  s = section("cylinder", p, tilt(3, 90));
  assert.equal(s.info.name, "Тэгш өнцөгт");
  near(s.info.area, 4 * 6);
  s = section("cylinder", p, tilt(1, 60));
  assert.equal(s.info.name, "Эллипсийн хэсэг");
});

test("конус: тойрог, гурвалжин, эллипс, парабол, гипербол", () => {
  const p = { r: 3, h: 4 };
  let s = section("cone", p, tilt(2));
  assert.equal(s.info.name, "Тойрог");
  near(s.info.area, Math.PI * 1.5 * 1.5);
  s = section("cone", p, tilt(4 * 0.5, 90)); // тэнхлэгээр дайрсан босоо → оройгоор
  assert.equal(s.info.name, "Адил хажуут гурвалжин");
  near(s.info.area, 3 * 4);
  s = section("cone", p, tilt(1.5, 20));
  assert.equal(s.info.name, "Эллипс");
  const beta = (Math.atan2(4, 3) * 180) / Math.PI;
  s = section("cone", p, tilt(1, beta));
  assert.equal(s.info.name, "Параболын хэсэг");
  s = section("cone", p, tilt(1, 90, 0, 1));
  assert.equal(s.info.name, "Гиперболын хэсэг");
});

test("бөмбөрцөг: төвөөс d зайд → π(R²−d²)", () => {
  const { info } = section("sphere", { R: 5 }, tilt(8)); // төв y=5, d=3 → ρ=4
  assert.equal(info.name, "Тойрог");
  near(info.area, 16 * Math.PI);
  assert.equal(info.areaTex, "16\\pi\\approx 50.27");
});

test("тайрсан конус: тэнхлэгээр → адил хажуут трапец", () => {
  const { info } = section("fcone", { R: 4, r: 2, h: 3 }, tilt(1, 90));
  assert.equal(info.name, "Адил хажуут трапец");
  near(info.area, ((8 + 4) / 2) * 3);
});

test("олон өнцөгтийн нэр", () => {
  assert.equal(polygonName([[0, 0, 0], [4, 0, 0], [3, 2, 0], [1, 2, 0]]), "Адил хажуут трапец");
  assert.equal(polygonName([[0, 0, 0], [4, 0, 0], [4, 2, 0], [1, 2, 0]]), "Тэгш өнцөгт трапец");
  assert.equal(polygonName([[0, 0, 0], [2, 0, 0], [3, 1, 0], [1, 1, 0]]), "Параллелограмм");
  assert.equal(polygonName([[0, 0, 0], [3, 0, 0], [0, 4, 0]]), "Тэгш өнцөгт гурвалжин");
});

/* ------------------------------------------------ тайрах -- */

test("огтлолоос дээш хэсгийг авахад эзлэхүүн зөв", () => {
  const model = buildSolid("cube", { a: 2 });
  const half = clipBody(model.body, planeFrom(model, tilt(1)).plane);
  near(bodyVolume(half), 4);
  assert.ok(half.faces.some((f) => f.tag === "section"));
  const diag = clipBody(model.body, planeFrom(model, pts({ name: "A" }, { name: "C" }, { name: "A_1" })).plane);
  near(bodyVolume(diag), 4);
  // пирамидын орой талыг тайрвал тайрсан пирамид: V = 32·(1 − 1/8) (a=4, h=6, хагас өндөр)
  const pyr = buildSolid("pyramid", { n: 4, a: 4, h: 6 });
  near(bodyVolume(clipBody(pyr.body, planeFrom(pyr, tilt(3)).plane)), 32 * (7 / 8));
  // хоёр дахь удаа огтлолын олон өнцөгт нь шинэ нүүрээр тогтоно
  const sec = sectionPolygon(prepareBody(half), { n: [1, 0, 0], d: 0 });
  near(sec.area, 2 * 1);
});

/* ------------------------------------------------ проекц -- */

test("куб: анхдагч өнцгөөс 3 нүүр, 3 нуугдсан ирмэг", () => {
  for (const proj of ["persp", "ortho", "oblique"]) {
    const prep = prepareBody(buildSolid("cube", { a: 2 }).body);
    const cam = makeCamera({ ...PRESETS.default, zoom: 1, proj }, 800, 600, [0, 1, 0], prep.radius);
    const fr = buildFrame(prep, cam);
    assert.equal(fr.front.filter(Boolean).length, 3, proj);
    assert.equal(fr.edges.filter((e) => e.hidden).length, 3, proj);
    assert.equal(fr.edges.length, 12);
  }
});

test("цилиндр: хоёр байгуулагч хүрээ, доод суурийн ар хагас тасархай", () => {
  const model = buildSolid("cylinder", { r: 2, h: 4 });
  const prep = prepareBody(model.body);
  const cam = makeCamera({ ...PRESETS.default, zoom: 1, proj: "ortho" }, 800, 600, [0, 2, 0], prep.radius);
  const fr = buildFrame(prep, cam);
  assert.equal(fr.edges.filter((e) => e.sil).length, 2);
  const hid = fr.edges.filter((e) => e.hidden).length;
  assert.ok(hid > 20 && hid < 52, `${hid}`);
  assert.ok(fr.hull && fr.hull.length > 8);
});

test("бөмбөрцөг: аналитик хүрээ ба экватор", () => {
  const model = buildSolid("sphere", { R: 2 });
  const prep = prepareBody(model.body);
  const cam = makeCamera({ ...PRESETS.default, zoom: 1, proj: "persp" }, 800, 600, [0, 2, 0], prep.radius);
  const fr = buildFrame(prep, cam);
  assert.equal(fr.curveSegs.filter((s) => s.sil).length, 160);
  const eq = fr.curveSegs.filter((s) => !s.sil);
  assert.ok(eq.some((s) => s.hidden) && eq.some((s) => !s.hidden));
  assert.equal(fr.edges.filter((e) => e.sil).length, 0); // торын шаталсан хүрээ зурагдахгүй
});

test("нэмэлт шугам: пирамидын өндөр нуугдана, урд талын диагональ харагдана", () => {
  const model = buildSolid("pyramid", { n: 4, a: 4, h: 5 });
  const prep = prepareBody(model.body);
  const cam = makeCamera({ ...PRESETS.default, zoom: 1, proj: "persp" }, 800, 600, [0, 2.5, 0], prep.radius);
  const front = faceFronts(prep, cam);
  assert.equal(segmentVisible(prep, front, model.points.S, model.points.O), false);
  assert.equal(segmentVisible(prep, front, model.points.S, model.points.M), true); // урд нүүрийн апофем
  const cube = buildSolid("cube", { a: 2 });
  const cp = prepareBody(cube.body);
  const cf = faceFronts(cp, makeCamera({ ...PRESETS.default, zoom: 1, proj: "persp" }, 800, 600, [0, 1, 0], cp.radius));
  assert.equal(segmentVisible(cp, cf, cube.points.A, cube.points.C), false); // доод суурь
  assert.equal(segmentVisible(cp, cf, cube.points.A_1, cube.points.C_1), true); // дээд суурь
  assert.equal(segmentVisible(cp, cf, cube.points.A, cube.points.C_1), false); // огторгуйн диагональ
});

test("гүдгэр бүрхүүл", () => {
  const h = convexHull([[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 0.5]]);
  assert.equal(h.length, 4);
});

/* ------------------------------------------------ дэлгээс -- */

function overlapArea2D(P, Q) {
  // P, Q гүдгэр (xz хавтгай). Сазерланд–Ходжман
  const area = (pts) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  const orientCCW = (pts) => (area(pts) < 0 ? pts.slice().reverse() : pts);
  let out = orientCCW(P);
  const clip = orientCCW(Q);
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const inside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-12;
    const inter = (p, q) => {
      const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const t = d1 / (d1 - d2);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const inp = out;
    out = [];
    for (let k = 0; k < inp.length; k++) {
      const cur = inp[k], prev = inp[(k + inp.length - 1) % inp.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(inter(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(inter(prev, cur));
    }
  }
  return out.length >= 3 ? Math.abs(area(out)) : 0;
}

test("дэлгээс: хавтгай, талбай = S, битүү үед анхны биет, давхцалгүй", () => {
  for (const s of SOLIDS) {
    const p = defaultParams(s.kind);
    const spec = buildNet(s.kind, p);
    if (s.kind === "sphere") {
      assert.equal(spec, null);
      continue;
    }
    const pn = prepareNet(spec);
    const flat = foldNet(pn, 0);
    for (const f of flat) for (const q of f) near(q[1], 0, 1e-9);
    const S = totalArea(s.kind, p);
    near(netArea(spec), S, s.curved ? 2e-3 : 1e-9);
    // битүү үед нүүрүүд хоорондоо таарна (ирмэг бүр яг хоёр нүүрт)
    const folded = foldNet(pn, 1);
    const prep = prepareBody({ faces: folded.map((pts, i) => ({ pts, kinds: spec.faces[i].kinds, tag: "side" })) });
    assert.ok(prep.edges.every((e) => e.faces.length === 2), `${s.kind}: битүү биш`);
    near(bodyVolume({ faces: folded.map((pts) => ({ pts, kinds: [], tag: "side" })) }), volume(s.kind, p), s.curved ? 3e-3 : 1e-9);
    // давхцалгүй (хавтгай дэлгээсэд хоёр нүүрийн огтлолцлын талбай ≈ 0)
    const poly2 = flat.map((f) => f.map((q) => [q[0], q[2]]));
    let worst = 0;
    for (let i = 0; i < poly2.length; i++) for (let j = i + 1; j < poly2.length; j++) worst = Math.max(worst, overlapArea2D(poly2[i], poly2[j]));
    assert.ok(worst < 1e-6 * S, `${s.kind}: давхцал ${worst}`);
  }
});

test("дэлгээс: хагас нугалсан үед ч нүүрийн хэмжээ хадгалагдана", () => {
  const spec = buildNet("prism", { n: 5, a: 2, h: 3 });
  const pn = prepareNet(spec);
  near(netArea({ faces: foldNet(pn, 0.37).map((pts) => ({ pts })) }), netArea(spec));
});

test("цилиндрийн дэлгээс: тууз 2πr × h, зөвхөн хүрээ зурагдана", () => {
  const spec = buildNet("cylinder", { r: 2, h: 5 });
  const pn = prepareNet(spec);
  const strip = spec.faces.slice(1, -1).reduce((s, f) => s + Math.hypot(f.pts[1][0] - f.pts[0][0], f.pts[1][2] - f.pts[0][2]), 0);
  near(strip, 4 * Math.PI);
  const a = spec.annos.find((x) => x.label === "2\\pi r");
  near(a.value, 4 * Math.PI);
  // туузын дотор нугас зурагдахгүй, ирмэгийн зүсэлт зурагдана
  assert.equal(netEdgeDrawn(pn, 2, 3), false);
  assert.equal(netEdgeDrawn(pn, 2, 0), true);
});
