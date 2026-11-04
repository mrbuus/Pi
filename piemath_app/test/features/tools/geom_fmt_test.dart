// Вэбийн plane/geom.test.mjs, fmt.test.mjs-ийн порт.
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/domain/fmt.dart';
import 'package:piemath_app/features/tools/domain/geom.dart';

void near(double a, double b, [double eps = 1e-9]) => expect((a - b).abs() < eps, isTrue, reason: '$a ≈ $b');
void nearPt(Pt? p, Pt q) {
  near(p!.x, q.x);
  near(p.y, q.y);
}

void main() {
  test('3-4-5 гурвалжин: талбай 6, R=5/2, r=1', () {
    near(heron(3, 4, 5), 6);
    near(circumradius(3, 4, 5), 2.5);
    near(inradius(3, 4, 5), 1);
    near(heightTo(5, 3, 4), 2.4);
    near(medianTo(5, 3, 4), 2.5);
  });

  test('Герон ба Гауссын томьёо таарна', () {
    final t = placeTriangle(7, 8, 9);
    near(polygonArea([t.A, t.B, t.C]), heron(7, 8, 9));
    near(heron(7, 8, 9), 12 * math.sqrt(5));
    near(dist(t.B, t.C), 7);
    near(dist(t.C, t.A), 8);
    near(dist(t.A, t.B), 9);
    expect(heron(1, 2, 5).isNaN, isTrue);
  });

  test('косинусын теорем', () {
    near(cosineSide(3, 4, 90), 5);
    near(cosineSide(1, 1, 60), 1);
    near(cosineAngle(5, 3, 4), 90);
    near(cosineSide(5, 8, 120), math.sqrt(129));
  });

  test('SSS: байхгүй гурвалжинг монголоор тайлбарлана', () {
    final r = solveSSS(2, 3, 7);
    expect(r.ok, isFalse);
    expect(r.reason, contains('нийлбэр'));
    expect(solveSSS(1, 2, 3).ok, isFalse);
    final ok = solveSSS(3, 4, 5);
    expect(ok.ok, isTrue);
    near(ok.tri!.A + ok.tri!.B + ok.tri!.C, 180);
    near(ok.tri!.A, 36.86989764584402);
  });

  test('SAS, ASA, AAS', () {
    final sas = solveSAS(4, 90, 3);
    near(sas.tri!.a, 5);
    final asa = solveASA(60, 5, 60);
    near(asa.tri!.b, 5);
    near(asa.tri!.c, 5);
    near(asa.tri!.A, 60);
    final aas = solveAAS(30, 90, 1);
    near(aas.tri!.b, 2);
    near(aas.tri!.c, math.sqrt(3));
    expect(solveASA(100, 3, 80).ok, isFalse);
    expect(solveSAS(3, 180, 4).ok, isFalse);
  });

  test('SSA: 0, 1, 2 шийд', () {
    expect(solveSSA(1, 4, 60).ok, isFalse);
    final two = solveSSA(4, 5, 40);
    expect(two.alt, isNotNull);
    near(two.tri!.B + two.alt!.B, 180);
    final one = solveSSA(5, 4, 40);
    expect(one.ok && one.alt == null, isTrue);
    final right = solveSSA(1, 2, 30);
    expect(right.alt, isNull);
    near(right.tri!.B, 90);
  });

  test('гурвалжны төвүүд', () {
    const a = Pt(0, 3), b = Pt(0, 0), c = Pt(4, 0);
    nearPt(circumcenter(a, b, c), const Pt(2, 1.5));
    nearPt(orthocenter(a, b, c), b);
    nearPt(incenter(a, b, c), const Pt(1, 1));
    nearPt(centroid(a, b, c), const Pt(4 / 3, 1));
    expect(circumcenter(const Pt(0, 0), const Pt(1, 1), const Pt(2, 2)), isNull);
    const p = Pt(1, 5), q = Pt(-2, 0), r = Pt(6, 1);
    final o = circumcenter(p, q, r)!, h = orthocenter(p, q, r)!, g = centroid(p, q, r);
    near(dist(h, g), 2 * dist(g, o));
  });

  test('биссектрисийн суурь харьцаагаар хуваана', () {
    final t = placeTriangle(5, 4, 3);
    final l = bisectorFoot(t.A, t.B, t.C);
    near(dist(t.B, l) / dist(l, t.C), 3 / 4);
    near(dist(t.A, l), bisectorTo(5, 4, 3));
  });

  test('огтлолцол: шулуун, тойрог, шүргэгч', () {
    nearPt(lineLine(const Pt(0, 0), const Pt(1, 1), const Pt(0, 2), const Pt(1, -1))!.p, const Pt(1, 1));
    expect(lineLine(const Pt(0, 0), const Pt(1, 0), const Pt(0, 1), const Pt(2, 0)), isNull);
    final lc = lineCircle(const Pt(-10, 0), const Pt(1, 0), const Pt(0, 0), 5);
    expect(lc.length, 2);
    nearPt(lc[0].p, const Pt(-5, 0));
    nearPt(lc[1].p, const Pt(5, 0));
    expect(lineCircle(const Pt(0, 5), const Pt(1, 0), const Pt(0, 0), 5).length, 1);
    expect(lineCircle(const Pt(0, 6), const Pt(1, 0), const Pt(0, 0), 5).length, 0);
    final cc = circleCircle(const Pt(0, 0), 5, const Pt(8, 0), 5);
    nearPt(cc[0], const Pt(4, 3));
    nearPt(cc[1], const Pt(4, -3));
    expect(circleCircle(const Pt(0, 0), 1, const Pt(5, 0), 1), isEmpty);
    final tp = tangentPoints(const Pt(10, 0), const Pt(0, 0), 5);
    expect(tp.length, 2);
    for (final t in tp) {
      near(dist(t, const Pt(0, 0)), 5);
      near(dot(t, const Pt(10, 0) - t), 0);
      near(dist(t, const Pt(10, 0)), tangentLength(10, 5));
    }
    near(tangentLength(5, 3), 4);
  });

  test('зөв олон өнцөгт', () {
    final h = regularPolygon(6, 2);
    near(h.S, 3 * math.sqrt(3) / 2 * 4);
    near(h.R, 2);
    near(h.r, math.sqrt(3));
    near(h.interior, 120);
    near(polygonArea(h.pts), h.S);
    near(dist(h.pts[0], h.pts[1]), 2);
    for (var n = 3; n <= 12; n++) {
      final p = regularPolygon(n, 1.5);
      near(polygonArea(p.pts), p.S);
      near(perimeter(p.pts), p.P);
      near(p.S, 0.5 * p.P * p.r);
    }
  });

  test('тойргийн элементүүд', () {
    near(chordLength(5, 60), 5);
    near(chordLength(5, 180), 10);
    near(arcLength(6, 90), 3 * math.pi);
    near(sectorArea(6, 90), 9 * math.pi);
    near(segmentArea(2, 90), math.pi - 2);
  });

  test('дөрвөн өнцөгт: параллелограмм, трапец', () {
    near(polygonArea(parallelogram(6, 4, 30)), 12);
    final t = trapezoidFromLegs(10, 4, 5, 5)!;
    near(t.p, 3);
    near(t.h, 4);
    final pts = trapezoidPts(10, 4, t.p, t.h);
    near(polygonArea(pts), 28);
    near(dist(pts[2], pts[3]), 5);
    expect(trapezoidFromLegs(10, 4, 1, 1), isNull);
    final up = trapezoidFromLegs(4, 10, 5, 5)!;
    near(up.h, 4);
    near(up.p, -3);
  });

  test('fitView: хүрээг багтаана', () {
    final v = fitView(const Box(0, 0, 10, 5), 400, 300, 20);
    near(v.s, 36);
    near(v.ox + 5 * v.s, 200);
    near(v.oy - 2.5 * v.s, 150);
  });

  test('тоог LaTeX-ээр харуулах', () {
    expect(exactTex(6), '6');
    expect(exactTex(math.sqrt(41)), r'\sqrt{41}');
    expect(exactTex(6 * math.sqrt(3)), r'6\sqrt{3}');
    expect(exactTex(3 * math.sqrt(3) / 2), r'\frac{3\sqrt{3}}{2}');
    expect(exactTex(2.5), r'\frac{5}{2}');
    expect(exactTex(math.pi), isNull);
    expect(res(6), '=6');
    expect(res(math.sqrt(41)), r'=\sqrt{41}\approx 6.4');
    expect(res(math.pi), r'\approx 3.14');
    expect(res(2.5), r'=\frac{5}{2}=2.5');
    expect(piRes(25), r'=25\pi\approx 78.54');
    expect(piRes(0.5), r'=\frac{\pi}{2}\approx 1.57');
    expect(dec(-0.0001), '0');
  });

  test('яг хэлбэр эхэнд, ойролцоо 2 орон', () {
    expect(val(2.4), const Val(exact: r'\frac{12}{5}', dec: '2.4', eq: true));
    expect(val(math.sqrt(13)).exact, r'\sqrt{13}');
    expect(val(math.sqrt(13)).dec, '3.61');
    expect(val(math.sqrt(73) / 2).exact, r'\frac{\sqrt{73}}{2}');
    expect(val(12 * math.sqrt2 / 7).exact, r'\frac{12\sqrt{2}}{7}');
    expect(val(math.pi).exact, isNull);
    expect(valTex(val(math.sqrt(13))), r'=\sqrt{13}\approx 3.61');
    expect(valTex(val(6)), '=6');
    expect(needsApprox(val(6)), isFalse);
    expect(needsApprox(val(2.4)), isTrue);
  });

  test('өнцөг: цэвэр бол бүхэл, бусад 1 орон', () {
    expect(degVal(90).exact, r'90^\circ');
    expect(degVal(53.130102).dec, r'53.1^\circ');
    expect(degVal(53.130102).exact, isNull);
    expect(valTex(degVal(36.8699)), r'\approx 36.9^\circ');
  });

  test('π, орлуулах тоо, шошго', () {
    expect(piVal(25).exact, r'25\pi');
    expect(piVal(2.5).exact, r'\frac{5\pi}{2}');
    expect(num(2.5), '2.5');
    expect(num(math.sqrt2), r'\sqrt{2}');
    expect(lenLabel(3.605551), '3.61');
  });
}
