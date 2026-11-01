// Чөлөөт байгуулалт (цэвэр логик): цэг тавих, хоёр цэгийг шулуунаар холбох,
// хүрээ хаагдахад шинэ олон өнцөгт үүсэх, сонгох, устгах, торонд наалдах.
// Вэбийн `plane/free.ts`-ийн хялбаршуулсан хувилбар (горим: Цэг / Шулуун / Сонгох).
import 'dart:collection';
import 'dart:math' as math;

import 'figure.dart';
import 'fmt.dart';
import 'geom.dart';

enum FreeMode {
  point('Цэг'),
  segment('Шулуун'),
  select('Сонгох');

  const FreeMode(this.label);
  final String label;
}

enum FreeKind { point, segment, polygon }

class FreePoint {
  const FreePoint(this.id, this.p, this.name);
  final int id;
  final Pt p;
  final String name;
}

class FreeSeg {
  const FreeSeg(this.id, this.a, this.b);
  final int id;
  final int a, b;
  bool has(int p) => a == p || b == p;
  bool joins(int x, int y) => (a == x && b == y) || (a == y && b == x);
}

class FreePoly {
  const FreePoly(this.id, this.pts);
  final int id;
  final List<int> pts;
}

typedef FreeSel = ({FreeKind kind, int id});

/// Байгуулалтын бүтэн төлөв (өөрчлөгддөггүй — буцаах/давтахад хялбар).
class FreeState {
  const FreeState({this.points = const [], this.segs = const [], this.polys = const [], this.pending, this.selected});

  final List<FreePoint> points;
  final List<FreeSeg> segs;
  final List<FreePoly> polys;

  /// Шулуун горимд үргэлжилж буй хүрээний сүүлийн цэг.
  final int? pending;
  final FreeSel? selected;

  bool get isEmpty => points.isEmpty;

  FreeState copyWith({
    List<FreePoint>? points,
    List<FreeSeg>? segs,
    List<FreePoly>? polys,
    int? Function()? pending,
    FreeSel? Function()? selected,
  }) => FreeState(
    points: points ?? this.points,
    segs: segs ?? this.segs,
    polys: polys ?? this.polys,
    pending: pending == null ? this.pending : pending(),
    selected: selected == null ? this.selected : selected(),
  );

  FreePoint? point(int id) {
    for (final p in points) {
      if (p.id == id) return p;
    }
    return null;
  }

  int get _nextId {
    var m = 0;
    for (final p in points) {
      m = math.max(m, p.id);
    }
    for (final s in segs) {
      m = math.max(m, s.id);
    }
    for (final s in polys) {
      m = math.max(m, s.id);
    }
    return m + 1;
  }

  /// Ашиглагдаагүй дараагийн нэр: A…Z, дараа нь A_1…
  String nextName() {
    final used = {for (final p in points) p.name};
    for (var k = 0; k < 100; k++) {
      for (var i = 0; i < 26; i++) {
        final n = String.fromCharCode(65 + i) + (k > 0 ? '_$k' : '');
        if (!used.contains(n)) return n;
      }
    }
    return 'P_${points.length}';
  }

  /// Шинэ цэг. Буцаах: (төлөв, id).
  (FreeState, int) addPoint(Pt p) {
    final id = _nextId;
    return (copyWith(points: [...points, FreePoint(id, p, nextName())]), id);
  }

  FreeState movePoint(int id, Pt p) =>
      copyWith(points: [for (final q in points) q.id == id ? FreePoint(id, p, q.name) : q]);

  /// Хоёр цэгийг хэрчмээр холбоно. Хүрээ хаагдвал олон өнцөгт нэмэгдэнэ.
  /// Буцаах: (төлөв, шинэ олон өнцөгтийн id эсвэл null).
  (FreeState, int?) connect(int a, int b) {
    if (a == b || segs.any((s) => s.joins(a, b))) return (this, null);
    final segId = _nextId;
    var st = copyWith(segs: [...segs, FreeSeg(segId, a, b)]);
    final cycle = st._path(b, a, skipSeg: segId);
    if (cycle != null && cycle.length >= 3) {
      final key = ([...cycle]..sort()).join(',');
      final exists = st.polys.any((p) => ([...p.pts]..sort()).join(',') == key);
      if (!exists) {
        final polyId = st._nextId;
        st = st.copyWith(polys: [...st.polys, FreePoly(polyId, cycle)]);
        return (st, polyId);
      }
    }
    return (st, null);
  }

  /// Хэрчмийн графаар from-оос to хүртэлх хамгийн богино зам (оройн жагсаалт).
  List<int>? _path(int from, int to, {required int skipSeg}) {
    final prev = <int, int>{from: from};
    final q = Queue<int>()..add(from);
    while (q.isNotEmpty) {
      final v = q.removeFirst();
      if (v == to) break;
      for (final s in segs) {
        if (s.id == skipSeg || !s.has(v)) continue;
        final w = s.a == v ? s.b : s.a;
        if (prev.containsKey(w)) continue;
        prev[w] = v;
        q.add(w);
      }
    }
    if (!prev.containsKey(to)) return null;
    final out = <int>[to];
    var v = to;
    while (v != from) {
      v = prev[v]!;
      out.add(v);
    }
    return out.reversed.toList();
  }

  /// Сонгосон объект ба түүнээс хамаарах бүгдийг хасна.
  FreeState removeSelected() {
    final sel = selected;
    if (sel == null) return this;
    switch (sel.kind) {
      case FreeKind.point:
        final goneSegs = {
          for (final s in segs)
            if (s.has(sel.id)) s.id,
        };
        return copyWith(
          points: points.where((p) => p.id != sel.id).toList(),
          segs: segs.where((s) => !goneSegs.contains(s.id)).toList(),
          polys: polys.where((p) => !p.pts.contains(sel.id)).toList(),
          pending: () => pending == sel.id ? null : pending,
          selected: () => null,
        );
      case FreeKind.segment:
        final seg = segs.where((s) => s.id == sel.id).firstOrNull;
        if (seg == null) return copyWith(selected: () => null);
        bool usesEdge(FreePoly p) {
          for (var i = 0; i < p.pts.length; i++) {
            if (seg.joins(p.pts[i], p.pts[(i + 1) % p.pts.length])) return true;
          }
          return false;
        }

        return copyWith(
          segs: segs.where((s) => s.id != sel.id).toList(),
          polys: polys.where((p) => !usesEdge(p)).toList(),
          selected: () => null,
        );
      case FreeKind.polygon:
        return copyWith(polys: polys.where((p) => p.id != sel.id).toList(), selected: () => null);
    }
  }

  /* ---------------- Онох ---------------- */

  /// Хамгийн ойр цэг (tol доторх).
  int? hitPoint(Pt p, double tol) {
    int? best;
    var bd = tol;
    for (final q in points) {
      final d = dist(q.p, p);
      if (d <= bd) {
        bd = d;
        best = q.id;
      }
    }
    return best;
  }

  /// Цэг → хэрчим → олон өнцөгт (дотор нь) дарааллаар.
  FreeSel? hitTest(Pt p, double tolPt, double tolLine) {
    final pt = hitPoint(p, tolPt);
    if (pt != null) return (kind: FreeKind.point, id: pt);
    FreeSeg? bestSeg;
    var bd = tolLine;
    for (final s in segs) {
      final a = point(s.a)!.p, b = point(s.b)!.p;
      final d = distToSegment(p, a, b);
      if (d <= bd) {
        bd = d;
        bestSeg = s;
      }
    }
    if (bestSeg != null) return (kind: FreeKind.segment, id: bestSeg.id);
    for (final poly in polys.reversed) {
      if (_inside(p, polyPts(poly))) return (kind: FreeKind.polygon, id: poly.id);
    }
    return null;
  }

  List<Pt> polyPts(FreePoly poly) => [for (final id in poly.pts) point(id)!.p];
  String polyName(FreePoly poly) => poly.pts.map((id) => point(id)!.name).join();

  static bool _inside(Pt p, List<Pt> pts) {
    var c = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      final a = pts[i], b = pts[j];
      if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }
}

/// Торонд наалдуулах.
Pt snap(Pt p, double step) => Pt((p.x / step).round() * step, (p.y / step).round() * step);

/// Шулуун горимд нэг товшилт: цэг онох эсвэл шинээр тавих, өмнөх цэгтэй холбох.
/// Хүрээ хаагдвал (олон өнцөгт үүсвэл) гинж дуусна. Өмнөх цэгээ дахин товшвол гинж дуусна.
FreeState tapSegment(FreeState s, Pt p, {required double tol, double? grid}) {
  var st = s;
  var id = st.hitPoint(p, tol);
  if (id == null) {
    final r = st.addPoint(grid == null ? p : snap(p, grid));
    st = r.$1;
    id = r.$2;
  }
  final prev = st.pending;
  if (prev == null) return st.copyWith(pending: () => id, selected: () => null);
  if (prev == id) return st.copyWith(pending: () => null);
  final (next, poly) = st.connect(prev, id);
  if (poly != null) {
    return next.copyWith(pending: () => null, selected: () => (kind: FreeKind.polygon, id: poly));
  }
  return next.copyWith(pending: () => id);
}

/// Цэг горимд товшилт: хоосон газар шинэ цэг, байгаа цэгийг сонгоно.
FreeState tapPoint(FreeState s, Pt p, {required double tol, double? grid}) {
  final hit = s.hitPoint(p, tol);
  if (hit != null) return s.copyWith(selected: () => (kind: FreeKind.point, id: hit));
  final (st, id) = s.addPoint(grid == null ? p : snap(p, grid));
  return st.copyWith(selected: () => (kind: FreeKind.point, id: id), pending: () => null);
}

/* ---------------- Зураг ---------------- */

List<Prim> freePrims(FreeState s) {
  final out = <Prim>[];
  final sel = s.selected;
  for (final poly in s.polys) {
    final on = sel?.kind == FreeKind.polygon && sel?.id == poly.id;
    out.add(PolyPrim(s.polyPts(poly), fill: true, tone: on ? Tone.accent : Tone.ink, width: 0.01));
    if (on) {
      final pts = s.polyPts(poly);
      final n = pts.length;
      final orient = signedArea(pts) >= 0 ? 1 : -1;
      for (var i = 0; i < n; i++) {
        final deg = _interior(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], orient);
        if (deg < 180 - 1e-9) {
          out.add(
            AnglePrim(pts[i], pts[(i + n - 1) % n], pts[(i + 1) % n], degrees: deg, right: (deg - 90).abs() < 1e-6),
          );
        }
      }
    }
  }
  for (final seg in s.segs) {
    final on = sel?.kind == FreeKind.segment && sel?.id == seg.id;
    final a = s.point(seg.a)!.p, b = s.point(seg.b)!.p;
    out.add(SegPrim(a, b, tone: on ? Tone.accent : Tone.ink, width: on ? 3 : 2.2));
    if (on) {
      out.add(
        SidePrim(a, b, lenLabel(dist(a, b)), centroidOf(s.points.map((p) => p.p).toList()) + const Pt(0.001, 0.001)),
      );
    }
  }
  final g = s.points.isEmpty ? const Pt(0, 0) : centroidOf(s.points.map((p) => p.p).toList());
  for (final p in s.points) {
    final on = (sel?.kind == FreeKind.point && sel?.id == p.id) || s.pending == p.id;
    out.add(DotPrim(p.p, tone: on ? Tone.accent : Tone.ink, radius: on ? 6 : 4.5));
    final parts = p.name.split('_');
    out.add(
      LabelPrim(
        p.p,
        parts[0],
        sub: parts.length > 1 ? parts[1] : null,
        away: dist(g, p.p) < 1e-6 ? null : g,
        dir: dist(g, p.p) < 1e-6 ? const Pt(0.7, 0.7) : null,
      ),
    );
  }
  return out;
}

double _interior(Pt prev, Pt v, Pt next, int orient) {
  final a = toDeg(angleAt(prev, v, next));
  final turn = cross(v - prev, next - v);
  return turn * orient >= 0 ? a : 360 - a;
}

/* ---------------- Хэмжээс ---------------- */

/// Сонгосон объектын (эсвэл сүүлийн олон өнцөгтийн) тооцоо.
List<Metric> freeMetrics(FreeState s) {
  final sel = s.selected;
  if (sel != null) {
    switch (sel.kind) {
      case FreeKind.point:
        final p = s.point(sel.id);
        if (p == null) break;
        final segs = s.segs.where((x) => x.has(p.id)).toList();
        return [
          Metric('Цэг ${p.name}', rows: [_coordRow(p)], key: true),
          if (segs.isNotEmpty) Metric('Холбогдсон хэрчим', rows: [for (final x in segs) _segRow(s, x)]),
        ];
      case FreeKind.segment:
        final seg = s.segs.where((x) => x.id == sel.id).firstOrNull;
        if (seg == null) break;
        final a = s.point(seg.a)!, b = s.point(seg.b)!;
        final dx = b.p.x - a.p.x, dy = b.p.y - a.p.y;
        return [
          Metric(
            'Хэрчмийн урт',
            rows: [lenRow('${_tex(a.name)}${_tex(b.name)}', '\\sqrt{${_sq(dx)}+${_sq(dy)}}', dist(a.p, b.p))],
            key: true,
          ),
          Metric('Дундаж цэг', rows: [_midRow(a, b)]),
        ];
      case FreeKind.polygon:
        final poly = s.polys.where((x) => x.id == sel.id).firstOrNull;
        if (poly != null) return polygonMetrics(s, poly);
    }
  }
  if (s.polys.isNotEmpty) return polygonMetrics(s, s.polys.last);
  if (s.segs.isNotEmpty) {
    return [
      Metric('Хэрчмүүд', rows: [for (final x in s.segs) _segRow(s, x)], key: true),
    ];
  }
  return const [];
}

String _tex(String name) => name;
// \left( нь \sqrt дотор flutter_math_fork-д алдаа өгдөг — энгийн хаалт.
String _sq(double d) => d < 0 ? '(${num(d)})^2' : '${num(d)}^2';

ResultRow _coordRow(FreePoint p) =>
    ResultRow(_tex(p.name), null, steps: ['\\left(${num(p.p.x)};\\ ${num(p.p.y)}\\right)']);

ResultRow _midRow(FreePoint a, FreePoint b) {
  final m = mid(a.p, b.p);
  return ResultRow('M', null, steps: ['\\left(${num(m.x)};\\ ${num(m.y)}\\right)']);
}

ResultRow _segRow(FreeState s, FreeSeg x) {
  final a = s.point(x.a)!, b = s.point(x.b)!;
  return lenRow('${_tex(a.name)}${_tex(b.name)}', '', dist(a.p, b.p));
}

/// Олон өнцөгтийн тооцоо: талууд, өнцгүүд, периметр, талбай; гурвалжинд өндөр, R, r;
/// дөрвөн өнцөгтөд диагональ ба төрөл.
List<Metric> polygonMetrics(FreeState s, FreePoly poly) {
  final pts = s.polyPts(poly);
  final names = [for (final id in poly.pts) _tex(s.point(id)!.name)];
  final n = pts.length;
  final sides = [for (var i = 0; i < n; i++) dist(pts[i], pts[(i + 1) % n])];
  final orient = signedArea(pts) >= 0 ? 1 : -1;
  final angs = [for (var i = 0; i < n; i++) _interior(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], orient)];
  final area = polygonArea(pts);
  final per = sides.fold(0.0, (a, b) => a + b);
  final convex = angs.every((a) => a < 180 + 1e-9);
  final nm = names.join();
  final out = <Metric>[];
  final kind = n == 3
      ? 'Гурвалжин'
      : n == 4
      ? _quadKind(pts, sides, angs)
      : '$n өнцөгт${convex ? '' : ' (гүдгэр биш)'}';
  out.add(Metric('Дүрс $nm', text: kind, key: true));
  out.add(Metric('Талбай', rows: [lenRow('S', '', area)], key: true));
  out.add(
    Metric(
      'Периметр',
      rows: [
        lenRow('P', [for (var i = 0; i < n; i++) num(sides[i])].join('+'), per),
      ],
      key: true,
    ),
  );
  out.add(
    Metric('Талууд', rows: [for (var i = 0; i < n; i++) lenRow('${names[i]}${names[(i + 1) % n]}', '', sides[i])]),
  );
  out.add(Metric('Өнцгүүд', rows: [for (var i = 0; i < n; i++) angRow('\\angle ${names[i]}', '', angs[i])]));
  out.add(
    Metric('Өнцгийн нийлбэр', rows: [angRow('\\Sigma', '180^\\circ(n-2)=180^\\circ\\cdot ${n - 2}', 180.0 * (n - 2))]),
  );
  if (n == 3) {
    final a = sides[1], b = sides[2], c = sides[0]; // a = BC, b = CA, c = AB
    final t = Tri(a: a, b: b, c: c, A: angs[0], B: angs[1], C: angs[2]);
    out.insert(1, Metric('Төрөл', text: _triKind(t), key: true));
    out.add(
      Metric(
        'Өндрүүд',
        rows: [
          lenRow('h_{${names[0]}}', '\\frac{2S}{${names[1]}${names[2]}}', 2 * area / a),
          lenRow('h_{${names[1]}}', '\\frac{2S}{${names[2]}${names[0]}}', 2 * area / b),
          lenRow('h_{${names[2]}}', '\\frac{2S}{${names[0]}${names[1]}}', 2 * area / c),
        ],
      ),
    );
    out.add(Metric('Багтсан тойргийн радиус', rows: [lenRow('r', '\\frac{S}{p}', area / (per / 2))]));
    out.add(Metric('Багтаасан тойргийн радиус', rows: [lenRow('R', '\\frac{abc}{4S}', a * b * c / (4 * area))]));
  }
  if (n == 4) {
    out.add(
      Metric(
        'Диагоналиуд',
        rows: [
          lenRow('${names[0]}${names[2]}', '', dist(pts[0], pts[2])),
          lenRow('${names[1]}${names[3]}', '', dist(pts[1], pts[3])),
        ],
      ),
    );
  }
  return out;
}

String _triKind(Tri t) {
  final maxA = [t.A, t.B, t.C].reduce(math.max);
  final byAngle = (maxA - 90).abs() < 1e-6
      ? 'тэгш өнцөгт'
      : maxA > 90
      ? 'мохоо өнцөгт'
      : 'хурц өнцөгт';
  final n = equalGroups([t.a, t.b, t.c]).where((x) => x > 0).length;
  final bySide = n == 3
      ? 'зөв (адил талт)'
      : n == 2
      ? 'адил хажуут'
      : 'элдэв талт';
  return '$bySide, $byAngle';
}

String _quadKind(List<Pt> p, List<double> sides, List<double> angs) {
  bool par(Pt a, Pt b, Pt c, Pt d) => cross(b - a, d - c).abs() < 1e-9 * math.max(1, len(b - a) * len(d - c));
  final p1 = par(p[0], p[1], p[3], p[2]);
  final p2 = par(p[1], p[2], p[0], p[3]);
  final allEq = equalGroups(sides).every((g) => g == 1);
  final right = angs.every((a) => (a - 90).abs() < 1e-6);
  if (p1 && p2) {
    if (right && allEq) return 'Квадрат';
    if (right) return 'Тэгш өнцөгт';
    if (allEq) return 'Ромб';
    return 'Параллелограмм';
  }
  if (p1 || p2) return 'Трапец';
  return angs.every((a) => a < 180) ? 'Дөрвөн өнцөгт' : 'Дөрвөн өнцөгт (гүдгэр биш)';
}
