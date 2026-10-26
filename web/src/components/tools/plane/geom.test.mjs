// geom.ts, fmt.ts-ийн жинхэнэ кодыг шалгана. Ажиллуулах: node --test src/components/tools/plane/
import assert from "node:assert/strict";
import { test } from "node:test";
import * as g from "./geom.ts";
import { exactTex, res, piRes, dec } from "./fmt.ts";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const nearPt = (p, q, eps = 1e-9) => { near(p.x, q.x, eps); near(p.y, q.y, eps); };

test("3-4-5 гурвалжин: талбай 6, R=5/2, r=1", () => {
  near(g.heron(3, 4, 5), 6);
  near(g.circumradius(3, 4, 5), 2.5);
  near(g.inradius(3, 4, 5), 1);
  near(g.heightTo(5, 3, 4), 2.4);
  near(g.medianTo(5, 3, 4), 2.5); // гипотенуз руу татсан медиан = R
});

test("Герон ба Гауссын томьёо таарна", () => {
  const { A, B, C } = g.placeTriangle({ a: 7, b: 8, c: 9 });
  near(g.polygonArea([A, B, C]), g.heron(7, 8, 9));
  near(g.heron(7, 8, 9), 12 * Math.sqrt(5));
  near(g.dist(B, C), 7); near(g.dist(C, A), 8); near(g.dist(A, B), 9);
  assert.ok(Number.isNaN(g.heron(1, 2, 5)));
});

test("косинусын теорем", () => {
  near(g.cosineSide(3, 4, 90), 5);
  near(g.cosineSide(1, 1, 60), 1);
  near(g.cosineAngle(5, 3, 4), 90);
  near(g.cosineSide(5, 8, 120), 7 * Math.sqrt(129) / 7, 1e-9); // √(25+64+40)=√129
});

test("SSS: байхгүй гурвалжинг монголоор тайлбарлана", () => {
  const r = g.solveSSS(2, 3, 7);
  assert.equal(r.ok, false);
  assert.match(r.reason, /нийлбэр/);
  assert.equal(g.solveSSS(1, 2, 3).ok, false); // доройтсон
  const ok = g.solveSSS(3, 4, 5);
  assert.ok(ok.ok);
  near(ok.tri.C + ok.tri.A + ok.tri.B, 180);
  near(ok.tri.A, 36.86989764584402); // a=3-ын эсрэг
});

test("SAS, ASA, AAS — бие биеэ баталгаажуулна", () => {
  const sas = g.solveSAS(4, 90, 3); // b=4, A=90, c=3 → a=5
  assert.ok(sas.ok);
  near(sas.tri.a, 5);
  const asa = g.solveASA(60, 5, 60); // зөв гурвалжин
  assert.ok(asa.ok);
  near(asa.tri.b, 5); near(asa.tri.c, 5); near(asa.tri.A, 60);
  const aas = g.solveAAS(30, 90, 1); // a=1 (30-ын эсрэг), B=90 → b=2
  assert.ok(aas.ok);
  near(aas.tri.b, 2); near(aas.tri.c, Math.sqrt(3));
  assert.equal(g.solveASA(100, 3, 80).ok, false);
  assert.equal(g.solveSAS(3, 180, 4).ok, false);
});

test("SSA: 0, 1, 2 шийд", () => {
  assert.equal(g.solveSSA(1, 4, 60).ok, false);
  const two = g.solveSSA(4, 5, 40);
  assert.ok(two.ok && two.alt);
  near(two.tri.B + two.alt.B, 180);
  const one = g.solveSSA(5, 4, 40); // a > b — нэг шийд
  assert.ok(one.ok && !one.alt);
  const right = g.solveSSA(1, 2, 30); // sinB = 1
  assert.ok(right.ok && !right.alt);
  near(right.tri.B, 90);
});

test("гурвалжны төвүүд", () => {
  const A = g.pt(0, 3), B = g.pt(0, 0), C = g.pt(4, 0);
  nearPt(g.circumcenter(A, B, C), g.pt(2, 1.5)); // гипотенузын дунд
  nearPt(g.orthocenter(A, B, C), B); // тэгш өнцгийн орой
  nearPt(g.incenter(A, B, C), g.pt(1, 1));
  nearPt(g.centroid(A, B, C), g.pt(4 / 3, 1));
  assert.equal(g.circumcenter(g.pt(0, 0), g.pt(1, 1), g.pt(2, 2)), null);
  // Эйлерийн шулуун: O, G, H нэг шулуун дээр, HG = 2GO
  const P = g.pt(1, 5), Q = g.pt(-2, 0), R = g.pt(6, 1);
  const O = g.circumcenter(P, Q, R), H = g.orthocenter(P, Q, R), G = g.centroid(P, Q, R);
  near(g.dist(H, G), 2 * g.dist(G, O));
});

test("биссектрисийн суурь харьцаагаар хуваана", () => {
  const { A, B, C } = g.placeTriangle({ a: 5, b: 4, c: 3 });
  const L = g.bisectorFoot(A, B, C);
  near(g.dist(B, L) / g.dist(L, C), 3 / 4);
  near(g.dist(A, L), g.bisectorTo(5, 4, 3));
});

test("огтлолцол: шулуун, тойрог, шүргэгч", () => {
  const x = g.lineLine(g.pt(0, 0), g.pt(1, 1), g.pt(0, 2), g.pt(1, -1));
  nearPt(x.p, g.pt(1, 1));
  assert.equal(g.lineLine(g.pt(0, 0), g.pt(1, 0), g.pt(0, 1), g.pt(2, 0)), null);
  const lc = g.lineCircle(g.pt(-10, 0), g.pt(1, 0), g.pt(0, 0), 5);
  assert.equal(lc.length, 2);
  nearPt(lc[0].p, g.pt(-5, 0)); nearPt(lc[1].p, g.pt(5, 0));
  assert.equal(g.lineCircle(g.pt(0, 5), g.pt(1, 0), g.pt(0, 0), 5).length, 1);
  assert.equal(g.lineCircle(g.pt(0, 6), g.pt(1, 0), g.pt(0, 0), 5).length, 0);
  const cc = g.circleCircle(g.pt(0, 0), 5, g.pt(8, 0), 5);
  assert.equal(cc.length, 2);
  nearPt(cc[0], g.pt(4, 3)); nearPt(cc[1], g.pt(4, -3));
  assert.equal(g.circleCircle(g.pt(0, 0), 1, g.pt(5, 0), 1).length, 0);
  const tp = g.tangentPoints(g.pt(10, 0), g.pt(0, 0), 5);
  assert.equal(tp.length, 2);
  for (const T of tp) {
    near(g.dist(T, g.pt(0, 0)), 5);
    near(g.dot(g.sub(T, g.pt(0, 0)), g.sub(g.pt(10, 0), T)), 0); // радиус ⟂ шүргэгч
    near(g.dist(T, g.pt(10, 0)), g.tangentLength(10, 5));
  }
  near(g.tangentLength(5, 3), 4);
});

test("зөв олон өнцөгт", () => {
  const h = g.regularPolygon(6, 2);
  near(h.S, (3 * Math.sqrt(3) / 2) * 4);
  near(h.R, 2); near(h.r, Math.sqrt(3)); near(h.interior, 120);
  near(g.polygonArea(h.pts), h.S);
  near(g.dist(h.pts[0], h.pts[1]), 2);
  const sq = g.regularPolygon(4, 3);
  near(sq.S, 9); near(sq.R, 3 / Math.SQRT2);
  const tri = g.regularPolygon(3, 2);
  near(tri.S, Math.sqrt(3)); near(tri.interior, 60);
  for (let n = 3; n <= 12; n++) {
    const p = g.regularPolygon(n, 1.5);
    near(g.polygonArea(p.pts), p.S, 1e-9);
    near(g.perimeter(p.pts), p.P, 1e-9);
    near(p.S, 0.5 * p.P * p.r, 1e-9);
  }
});

test("тойргийн элементүүд", () => {
  near(g.chordLength(5, 60), 5);
  near(g.chordLength(5, 180), 10);
  near(g.arcLength(6, 90), 3 * Math.PI);
  near(g.sectorArea(6, 90), 9 * Math.PI);
  near(g.segmentArea(2, 90), Math.PI - 2);
});

test("дөрвөн өнцөгт: параллелограмм, трапец", () => {
  const p = g.parallelogram(6, 4, 30);
  near(g.polygonArea(p), 6 * 4 * 0.5);
  const t = g.trapezoidFromLegs(10, 4, 5, 5); // адил хажуут: h=4
  near(t.p, 3); near(t.h, 4);
  const pts = g.trapezoidPts(10, 4, t.p, t.h);
  near(g.polygonArea(pts), 28);
  near(g.dist(pts[2], pts[3]), 5);
  assert.equal(g.trapezoidFromLegs(10, 4, 1, 1), null);
  const up = g.trapezoidFromLegs(4, 10, 5, 5); // дээд суурь урт
  near(up.h, 4); near(up.p, -3);
});

test("fitView: хүрээг багтаана", () => {
  const v = g.fitView({ minX: 0, minY: 0, maxX: 10, maxY: 5 }, 400, 300, 20);
  near(v.s, 36);
  near(v.ox + 5 * v.s, 200); near(v.oy - 2.5 * v.s, 150);
});

test("тоог LaTeX-ээр харуулах", () => {
  assert.equal(exactTex(6), "6");
  assert.equal(exactTex(Math.sqrt(41)), "\\sqrt{41}");
  assert.equal(exactTex(6 * Math.sqrt(3)), "6\\sqrt{3}");
  assert.equal(exactTex((3 * Math.sqrt(3)) / 2), "\\frac{3\\sqrt{3}}{2}");
  assert.equal(exactTex(2.5), "\\frac{5}{2}");
  assert.equal(exactTex(Math.PI), null);
  assert.equal(res(6), "=6");
  assert.equal(res(Math.sqrt(41)), "=\\sqrt{41}\\approx 6.4");
  assert.equal(res(Math.PI), "\\approx 3.14");
  assert.equal(res(2.5), "=\\frac{5}{2}=2.5");
  assert.equal(piRes(25), "=25\\pi\\approx 78.54");
  assert.equal(piRes(0.5), "=\\frac{\\pi}{2}\\approx 1.57");
  assert.equal(dec(-0.0001), "0");
});
