// Биетийн дэлгэмэл (дэлгээс): хавтгай дээр дэлгэсэн нүүрүүд, нугалах шугам тасархай.
// Вэбийн `solid/net.ts`-ийн хавтгай хувилбар — гулсуулагч, хөдөлгөөн байхгүй, хэмжээг гарнаас бичнэ.
// Зургийг [Prim] жагсаалтаар өгнө (хавтгайн дүрстэй ижил FigurePainter зурна).
import 'dart:math' as math;

import 'figure.dart';
import 'fmt.dart';
import 'geom.dart';
import 'solids.dart';

/// Бөмбөрцгийн дэлгэмэл байхгүй.
bool hasNet(SolidKind k) => k != SolidKind.sphere;

class NetBuilder {
  final prims = <Prim>[];

  /// Нүүр: дүүргэлт + ирмэг бүр. [folds] — нугалах (эцэг нүүртэй нийлэх) ирмэгийн индекс, тасархай.
  void face(List<Pt> pts, {Set<int> folds = const {}}) {
    prims.add(PolyPrim(pts, width: 0));
    for (var i = 0; i < pts.length; i++) {
      final a = pts[i], b = pts[(i + 1) % pts.length];
      final fold = folds.contains(i);
      prims.add(SegPrim(a, b, tone: fold ? Tone.dim : Tone.ink, dash: fold, width: fold ? 1.4 : 2.2));
    }
  }

  void polyline(List<Pt> pts, {bool close = true, Tone tone = Tone.ink, double width = 2.2}) {
    final n = close ? pts.length : pts.length - 1;
    for (var i = 0; i < n; i++) {
      prims.add(SegPrim(pts[i], pts[(i + 1) % pts.length], tone: tone, width: width));
    }
  }

  /// Хэрчмийн үсэг [toward] цэг рүү чиглэсэн талд.
  void label(Pt a, Pt b, String text, Pt toward) {
    final m = mid(a, b);
    prims.add(SidePrim(a, b, text, m * 2 - toward, italic: true));
  }

  /// Хэмжээсийн хэрчим (радиус, апофем): тасархай брэнд өнгө + үсэг.
  void radius(Pt a, Pt b, String text, Pt toward) {
    prims.add(SegPrim(a, b, tone: Tone.brand, dash: true, width: 1.6));
    label(a, b, text, toward);
  }
}

/// Хөрвөлтгүй дэлгэмэл зураг.
class NetModel {
  const NetModel(this.prims, this.faces);
  final List<Prim> prims;

  /// Нүүрийн тоо (олон талстад; муруй биетэд хажуу + суурь).
  final int faces;
}

/// n өнцөгтийн доод тал хэвтээ, зүүнээс баруун (цагийн зүүний эсрэг): төв (0, 0).
List<Pt> _ccwRing(int n, double a) => regularPolygon(n, a).pts;

/// Босоо талд a-аас b рүү хөдөлж байгаа олон өнцөгтийн гадагш нормаль.
Pt _outward(Pt a, Pt b) {
  final d = b - a;
  return norm(Pt(d.y, -d.x));
}

/// a→b ирмэг дээр, [normal] чиглэлд суурилсан зөв n өнцөгт (a, b-ээр эхэлнэ).
List<Pt> _polyOnEdge(Pt a, Pt b, Pt normal, int n) {
  final side = dist(a, b);
  final inr = side / (2 * math.tan(math.pi / n));
  final c = mid(a, b) + normal * inr;
  final out = <Pt>[];
  for (final sign in [1.0, -1.0]) {
    out.clear();
    for (var k = 0; k < n; k++) {
      final ang = sign * 2 * math.pi * k / n;
      final v = a - c;
      out.add(c + Pt(v.x * math.cos(ang) - v.y * math.sin(ang), v.x * math.sin(ang) + v.y * math.cos(ang)));
    }
    if (dist(out[1], b) < 1e-7 * math.max(1, side)) break;
  }
  return out;
}

/// Дугуй хүрээний цэгүүд (радиан), apex-аас r зайд.
List<Pt> _arcPts(Pt c, double r, double a0, double a1, [int? steps]) {
  final n = steps ?? math.max(24, ((a1 - a0).abs() * 180 / math.pi / 3).ceil());
  return [for (var i = 0; i <= n; i++) polar(c, r, a0 + (a1 - a0) * i / n)];
}

/// Олон талстын «од» дэлгэмэл: суурь дунд, нүүр бүр ирмэгтээ гадагш,
/// дээд суурь 0-р хажуугийн (доод) ирмэгт. Суурь: доод тал хэвтээ, CCW.
NetModel _starNet(
  List<Pt> base,
  List<Pt> Function(int i, Pt a, Pt b, Pt n) side, {
  required List<Pt> Function(List<Pt> side0) top,
  void Function(NetBuilder b, List<List<Pt>> sides, List<Pt> topPoly)? labels,
}) {
  final b = NetBuilder();
  final n = base.length;
  final sides = <List<Pt>>[];
  b.face(base, folds: {for (var i = 0; i < n; i++) i});
  for (var i = 0; i < n; i++) {
    final a = base[i], c = base[(i + 1) % n];
    final f = side(i, a, c, _outward(a, c));
    sides.add(f);
    // Нугалах ирмэг: f[0]→f[1] (суурьтай нийлэх), 0-р хажуугийнх дээд ирмэг мөн нугалах.
    b.face(f, folds: {0, if (i == 0) 2});
  }
  final t = top(sides[0]);
  b.face(t, folds: {0});
  labels?.call(b, sides, t);
  return NetModel(b.prims, n + 2);
}

/// Нүүр ба дэлгэмэлийн ерөнхий барилга. Параметр шалгагдсан гэж үзнэ ([solidError] == null).
NetModel? buildNet(SolidKind k, Map<String, double> p) {
  switch (k) {
    case SolidKind.cube:
    case SolidKind.cuboid:
      final a = p['a']!, b = k == SolidKind.cube ? a : p['b']!, c = k == SolidKind.cube ? a : p['c']!;
      final base = [Pt(-a / 2, -b / 2), Pt(a / 2, -b / 2), Pt(a / 2, b / 2), Pt(-a / 2, b / 2)];
      return _starNet(
        base,
        (i, s, e, n) => [s, e, e + n * c, s + n * c],
        top: (s0) => [s0[3], s0[2], s0[2] + Pt(0, -b), s0[3] + Pt(0, -b)],
        labels: (nb, sides, t) {
          nb.label(base[0], base[1], 'a', const Pt(0, 0));
          if (k == SolidKind.cuboid) {
            nb.label(base[1], base[2], 'b', const Pt(0, 0));
            nb.label(sides[1][1], sides[1][2], 'c', centroidOf(sides[1]));
          }
        },
      );
    case SolidKind.prism:
      final n = p['n']!.round(), a = p['a']!, h = p['h']!;
      final base = _ccwRing(n, a);
      return _starNet(
        base,
        (i, s, e, nn) => [s, e, e + nn * h, s + nn * h],
        top: (s0) => _polyOnEdge(s0[3], s0[2], const Pt(0, -1), n),
        labels: (nb, sides, t) {
          nb.label(base[0], base[1], 'a', const Pt(0, 0));
          nb.label(sides[0][1], sides[0][2], 'h', centroidOf(sides[0]));
        },
      );
    case SolidKind.pyramid:
      final n = p['n']!.round(), a = p['a']!, h = p['h']!;
      final r = a / (2 * math.tan(math.pi / n));
      final m = math.sqrt(h * h + r * r);
      final base = _ccwRing(n, a);
      final b = NetBuilder();
      b.face(base, folds: {for (var i = 0; i < n; i++) i});
      for (var i = 0; i < n; i++) {
        final s = base[i], e = base[(i + 1) % n];
        final apex = mid(s, e) + _outward(s, e) * m;
        b.face([s, e, apex], folds: {0});
      }
      final s0 = base[0], e0 = base[1];
      final apex0 = mid(s0, e0) + _outward(s0, e0) * m;
      b.label(s0, e0, 'a', const Pt(0, 0));
      b.radius(mid(s0, e0), apex0, 'm', Pt(apex0.x - 1, apex0.y));
      return NetModel(b.prims, n + 1);
    case SolidKind.frustum:
      final n = p['n']!.round(), a = p['a']!, bTop = p['b']!, h = p['h']!;
      final tg = math.tan(math.pi / n);
      final r1 = a / (2 * tg), r2 = bTop / (2 * tg);
      final m = math.sqrt(h * h + (r1 - r2) * (r1 - r2));
      final base = _ccwRing(n, a);
      final nb = NetBuilder();
      nb.face(base, folds: {for (var i = 0; i < n; i++) i});
      List<Pt>? side0;
      for (var i = 0; i < n; i++) {
        final s = base[i], e = base[(i + 1) % n];
        final nn = _outward(s, e);
        final mp = mid(s, e) + nn * m;
        final dir = norm(e - s);
        final f = [s, e, mp + dir * (bTop / 2), mp - dir * (bTop / 2)];
        nb.face(f, folds: {0, if (i == 0) 2});
        if (i == 0) side0 = f;
      }
      final topPoly = _polyOnEdge(side0![3], side0[2], const Pt(0, -1), n);
      nb.face(topPoly, folds: {0});
      nb.label(base[0], base[1], 'a', const Pt(0, 0));
      nb.label(topPoly[0], topPoly[1], 'b', centroidOf(topPoly));
      final mb = mid(base[0], base[1]);
      nb.radius(mb, mid(side0[2], side0[3]), 'm', Pt(mb.x - 1, mb.y));
      return NetModel(nb.prims, n + 2);
    case SolidKind.cylinder:
      return _cylinderNet(p['r']!, p['h']!);
    case SolidKind.cone:
      return _coneNet(p['r']!, p['h']!);
    case SolidKind.fcone:
      return _fconeNet(p['R']!, p['r']!, p['h']!);
    case SolidKind.sphere:
      return null;
  }
}

NetModel _cylinderNet(double r, double h) {
  final w = 2 * math.pi * r;
  final b = NetBuilder();
  // Тэгш өнцөгт: x ∈ [0, w], y ∈ [0, h]; доод ба дээд тойрог тэмдэглэх цэгээс шүргэнэ.
  b.face([const Pt(0, 0), Pt(w, 0), Pt(w, h), Pt(0, h)], folds: {0, 2});
  final cx = math.max(r, w * 0.25);
  final low = Pt(cx, -r), high = Pt(cx, h + r);
  b.prims
    ..add(CirclePrim(low, r, fill: true))
    ..add(CirclePrim(high, r, fill: true))
    ..add(DotPrim(Pt(cx, 0), tone: Tone.dim, radius: 2.2))
    ..add(DotPrim(Pt(cx, h), tone: Tone.dim, radius: 2.2));
  b.label(Pt(0, h), Pt(w, h), 'C', Pt(w / 2, 0));
  b.label(Pt(w, 0), Pt(w, h), 'h', Pt(w / 2, h / 2));
  b.radius(high, Pt(cx + r, h + r), 'r', Pt(cx, h + 2 * r));
  return NetModel(b.prims, 3);
}

/// Дугуй секторын нүүр (орой c, радиус r, a0..a1 радиан), хажуугийн радиусууд тасархай биш.
List<Pt> _sectorPoly(Pt c, double r, double a0, double a1) => [c, ..._arcPts(c, r, a0, a1)];

NetModel _coneNet(double r, double h) {
  final l = math.sqrt(r * r + h * h);
  final th = 2 * math.pi * r / l;
  final a0 = math.pi / 2 - th / 2, a1 = math.pi / 2 + th / 2;
  const apex = Pt(0, 0);
  final b = NetBuilder();
  final poly = _sectorPoly(apex, l, a0, a1);
  b.prims.add(PolyPrim(poly, width: 0));
  b.polyline(poly);
  final circ = Pt(0, l + r);
  b.prims
    ..add(CirclePrim(circ, r, fill: true))
    ..add(DotPrim(Pt(0, l), tone: Tone.dim, radius: 2.2));
  final left = polar(apex, l, a1);
  b.radius(apex, left, 'l', Pt(0, l / 2));
  b.radius(circ, Pt(r, l + r), 'r', Pt(0, l + 2 * r));
  return NetModel(b.prims, 2);
}

NetModel _fconeNet(double bigR, double r, double h) {
  final l = math.sqrt(h * h + (bigR - r) * (bigR - r));
  final outerL = l * bigR / (bigR - r), innerL = l * r / (bigR - r);
  final th = 2 * math.pi * bigR / outerL;
  final a0 = math.pi / 2 - th / 2, a1 = math.pi / 2 + th / 2;
  const apex = Pt(0, 0);
  final b = NetBuilder();
  final poly = [..._arcPts(apex, outerL, a0, a1), ..._arcPts(apex, innerL, a1, a0)];
  b.prims.add(PolyPrim(poly, width: 0));
  b.polyline(poly);
  final big = Pt(0, outerL + bigR), small = Pt(0, innerL - r);
  b.prims
    ..add(CirclePrim(big, bigR, fill: true))
    ..add(CirclePrim(small, r, fill: true))
    ..add(DotPrim(Pt(0, outerL), tone: Tone.dim, radius: 2.2))
    ..add(DotPrim(Pt(0, innerL), tone: Tone.dim, radius: 2.2));
  final lo = polar(apex, innerL, a1), lh = polar(apex, outerL, a1);
  b.radius(lo, lh, 'l', Pt(0, (innerL + outerL) / 2));
  b.radius(big, Pt(bigR, big.y), 'R', Pt(0, big.y + bigR));
  b.radius(small, Pt(r, small.y), 'r', Pt(0, small.y + r));
  return NetModel(b.prims, 3);
}

/// Дэлгэмэлтэй холбоотой тооцоо: нийт талбай (= бүтэн гадаргуу) ба тусгай хэмжээс.
List<Metric> netMetrics(SolidKind k, Map<String, double> p) {
  final all = solidMetrics(k, p);
  final total = all.firstWhere((m) => m.name == 'Бүтэн гадаргуун талбай' || m.name == 'Гадаргуун талбай');
  Metric m(String name, ResultRow r, {bool key = false}) => Metric(name, rows: [r], key: key);
  final out = <Metric>[Metric('Дэлгэмэлийн нийт талбай', rows: total.rows, key: true)];
  switch (k) {
    case SolidKind.cylinder:
      final r = p['r']!, h = p['h']!;
      out.add(
        Metric(
          'Хажуугийн тэгш өнцөгт',
          rows: [
            piRow('C', '2\\pi r=2\\pi\\cdot ${num(r)}', 2 * r),
            lenRow('h', '', h),
          ],
          key: true,
        ),
      );
    case SolidKind.cone:
      final r = p['r']!, h = p['h']!;
      final l = math.sqrt(r * r + h * h);
      final nr = num(r), nl = num(l);
      out
        ..add(
          m(
            'Секторын өнцөг',
            angRow('\\theta', '\\frac{360^\\circ\\cdot r}{l}=\\frac{360^\\circ\\cdot $nr}{$nl}', 360 * r / l),
            key: true,
          ),
        )
        ..add(m('Секторын радиус (байгуулагч)', lenRow('l', '\\sqrt{r^2+h^2}', l)))
        ..add(m('Секторын нумын урт', piRow('2\\pi r', '2\\pi\\cdot $nr', 2 * r)));
    case SolidKind.fcone:
      final bigR = p['R']!, r = p['r']!, h = p['h']!;
      final l = math.sqrt(h * h + (bigR - r) * (bigR - r));
      final nR = num(bigR), nr = num(r), nl = num(l);
      out
        ..add(
          m(
            'Секторын өнцөг',
            angRow('\\theta', '\\frac{360^\\circ(R-r)}{l}=\\frac{360^\\circ\\cdot ($nR-$nr)}{$nl}', 360 * (bigR - r) / l),
            key: true,
          ),
        )
        ..add(m('Том нумын радиус', lenRow('L', '\\frac{lR}{R-r}=\\frac{$nl\\cdot $nR}{$nR-$nr}', l * bigR / (bigR - r))))
        ..add(m('Жижиг нумын радиус', lenRow('L_1', '\\frac{lr}{R-r}=\\frac{$nl\\cdot $nr}{$nR-$nr}', l * r / (bigR - r))));
    default:
      final n = k == SolidKind.cube || k == SolidKind.cuboid ? 4 : p['n']!.round();
      final faces = switch (k) {
        SolidKind.pyramid => n + 1,
        _ => n + 2,
      };
      out.add(Metric('Нүүрийн тоо', text: '$faces'));
  }
  return out;
}
