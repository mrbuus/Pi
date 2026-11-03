// Биетийн огтлол: хавтгайг гарнаас бичсэн утгаар тодорхойлно (өндөр y, налуу α,
// эргэлт β, шилжилт s), биетийг огтолж олон өнцөгт/муруйг олно, хэлбэрийг монголоор нэрлэнэ,
// талбайг тооцно. Вэбийн `solid/section.ts`, `body.ts`-ийн порт (гурван цэгийн горимгүй).
// Тооцоо биетийн «вэбийн хүрээ»-д: суурь y = 0, тэнхлэг y; бөмбөрцгийн төв (0, R, 0).
import 'dart:math' as math;

import '../../../shared/math_keyboard/math_input_controller.dart';
import 'figure.dart';
import 'fmt.dart';
import 'shapes.dart' show ParamSpec;
import 'solids.dart';

/* ---------------- 3D туслахууд ---------------- */

double _len(Vec3 a) => math.sqrt(a.dot(a));
double _dist(Vec3 a, Vec3 b) => _len(a - b);
Vec3 _unit(Vec3 a) {
  final l = _len(a);
  return l < 1e-15 ? const Vec3(0, 0, 0) : a * (1 / l);
}

Vec3 _lerp(Vec3 a, Vec3 b, double t) => a + (b - a) * t;

/// Ньюэллийн нормаль (урт = 2·талбай).
Vec3 _newell(List<Vec3> pts) {
  var n = const Vec3(0, 0, 0);
  for (var i = 0; i < pts.length; i++) {
    n = n + pts[i].cross(pts[(i + 1) % pts.length]);
  }
  return n;
}

Vec3 _centroid(List<Vec3> pts) {
  var s = const Vec3(0, 0, 0);
  for (final p in pts) {
    s = s + p;
  }
  return s * (1 / pts.length);
}

/* ---------------- Параметр ---------------- */

/// Хавтгайн утгууд: y — хавтгайн суурь цэгийн өндөр, α — хэвтээтэй үүсгэх өнцөг,
/// β — налуу чиглэлийн эргэлт, s — тэнхлэгээс шилжилт.
List<ParamSpec> sectionParams(SolidKind k) {
  final h = solidHeight(k, {for (final s in solidParams(k)) s.key: s.def});
  return [
    ParamSpec('y', 'y', 'Хавтгайн өндөр', h / 2),
    const ParamSpec('alpha', r'\alpha', 'Налуу өнцөг', 30, kind: MathInputKind.angle),
    const ParamSpec('beta', r'\beta', 'Эргэлт', 0, kind: MathInputKind.angle),
    const ParamSpec('s', 's', 'Шилжилт', 0),
  ];
}

/// Биетийн өндөр (вэбийн хүрээнд, бөмбөрцөг 2R).
double solidHeight(SolidKind k, Map<String, double> p) => switch (k) {
  SolidKind.cube => p['a'] ?? 0,
  SolidKind.cuboid => p['c'] ?? 0,
  SolidKind.sphere => 2 * (p['R'] ?? 0),
  _ => p['h'] ?? 0,
};

String? sectionError(Map<String, double> p) {
  for (final k in const ['y', 'alpha', 'beta', 's']) {
    final v = p[k];
    if (v == null || !v.isFinite) return 'Хавтгайн утгаа бичнэ үү';
  }
  if (p['alpha']! < 0 || p['alpha']! > 90) return 'Налуу өнцөг 0°-аас 90° хүртэл байна';
  if (p['y']! < 0) return 'Хавтгайн өндөр сөрөг байж болохгүй';
  return null;
}

/// Хавтгай: n·p = d, n нэгж, дээш чиглэсэн.
class SecPlane {
  const SecPlane(this.n, this.d);
  final Vec3 n;
  final double d;
}

SecPlane planeFrom(Map<String, double> p) {
  final a = p['alpha']!.clamp(0.0, 90.0) * math.pi / 180, t = p['beta']! * math.pi / 180;
  var n = Vec3(math.sin(a) * math.cos(t), math.cos(a), math.sin(a) * math.sin(t));
  if (n.y < -1e-12) n = n * -1;
  final p0 = Vec3(p['s']! * math.cos(t), p['y']!, p['s']! * math.sin(t));
  return SecPlane(n, n.dot(p0));
}

/* ---------------- Тор (mesh) ---------------- */

class MeshFace {
  const MeshFace(this.pts, this.cap);
  final List<Vec3> pts;

  /// Суурь/дээд суурь (муруй биетийн хажуугаас ялгах).
  final bool cap;
}

class Mesh {
  Mesh(this.faces) {
    final all = [for (final f in faces) ...f.pts];
    center = _centroid(all);
    normals = [
      for (final f in faces)
        () {
          var n = _unit(_newell(f.pts));
          if (n.dot(_centroid(f.pts) - center) < 0) n = n * -1;
          return n;
        }(),
    ];
    for (final p in all) {
      radius = math.max(radius, _dist(p, center));
    }
  }

  final List<MeshFace> faces;
  late final Vec3 center;
  late final List<Vec3> normals;
  double radius = 0;
}

List<Vec3> _circle(double r, double y, int n) => [
  for (var i = 0; i < n; i++) Vec3(r * math.cos(2 * math.pi * i / n), y, r * math.sin(2 * math.pi * i / n)),
];

Mesh? meshOf(SolidKind k, Map<String, double> p, {int segs = 360}) {
  switch (k) {
    case SolidKind.sphere:
      return null;
    case SolidKind.cylinder:
    case SolidKind.fcone:
      final r1 = k == SolidKind.cylinder ? p['r']! : p['R']!;
      final r2 = p['r']!;
      final h = p['h']!;
      final b = _circle(r1, 0, segs), t = _circle(r2, h, segs);
      return Mesh([
        MeshFace(b.reversed.toList(), true),
        MeshFace(t, true),
        for (var i = 0; i < segs; i++) MeshFace([b[i], b[(i + 1) % segs], t[(i + 1) % segs], t[i]], false),
      ]);
    case SolidKind.cone:
      final b = _circle(p['r']!, 0, segs);
      final apex = Vec3(0, p['h']!, 0);
      return Mesh([
        MeshFace(b.reversed.toList(), true),
        for (var i = 0; i < segs; i++) MeshFace([b[i], b[(i + 1) % segs], apex], false),
      ]);
    default:
      final m = buildSolid(k, p);
      return Mesh([
        for (final f in m.faces) MeshFace([for (final n in f) m.pts[n]!], false),
      ]);
  }
}

/* ---------------- Огтлол ---------------- */

class SectionPoly {
  const SectionPoly(this.pts, this.normals, this.area);

  /// Эрэмбэтэй оройнууд (вэбийн хүрээнд).
  final List<Vec3> pts;

  /// pts[i]→pts[i+1] хэрчим орших нүүрүүдийн гадагш нормаль (харагдах эсэхэд).
  final List<List<Vec3>> normals;
  final double area;
}

String _key(Vec3 p) => '${(p.x * 1e5).round()},${(p.y * 1e5).round()},${(p.z * 1e5).round()}';

/// Хавтгайн дагуу цэгүүдийг өнцгөөр эрэмбэлнэ.
List<Vec3> orderOnPlane(List<Vec3> pts, Vec3 n) {
  final uniq = <Vec3>[];
  for (final p in pts) {
    if (!uniq.any((q) => _dist(p, q) < 1e-7)) uniq.add(p);
  }
  if (uniq.length < 3) return uniq;
  final c = _centroid(uniq);
  final u = _unit(n.cross(n.x.abs() < 0.9 ? const Vec3(1, 0, 0) : const Vec3(0, 1, 0)));
  final w = n.cross(u);
  final withAng = [
    for (final p in uniq) (p, math.atan2((p - c).dot(w), (p - c).dot(u))),
  ]..sort((a, b) => a.$2.compareTo(b.$2));
  return [for (final e in withAng) e.$1];
}

/// Нэг шулуун дээрх дундын цэгүүдийг хасч, булан л үлдээнэ.
List<Vec3> corners(List<Vec3> poly, [double eps = 1e-6]) {
  final cur = poly.toList();
  var changed = true;
  while (changed && cur.length > 3) {
    changed = false;
    for (var i = 0; i < cur.length; i++) {
      final p = cur[(i - 1 + cur.length) % cur.length], q = cur[i], r = cur[(i + 1) % cur.length];
      final c = _len((q - p).cross(r - q));
      if (c <= eps * _dist(p, q) * _dist(q, r) || _dist(p, q) < 1e-9) {
        cur.removeAt(i);
        changed = true;
        break;
      }
    }
  }
  return cur;
}

SectionPoly? sectionPolygon(Mesh mesh, SecPlane pl) {
  final n = pl.n;
  final eps = 1e-9 * math.max(1.0, mesh.radius);
  final seen = <String>{};
  final raw = <Vec3>[];
  double side(Vec3 p) => n.dot(p) - pl.d;
  Vec3 cut(Vec3 a, Vec3 b) {
    final swap = _key(a).compareTo(_key(b)) > 0;
    final p = swap ? b : a, q = swap ? a : b;
    final dp = side(p), dq = side(q);
    return _lerp(p, q, dp / (dp - dq));
  }

  for (final f in mesh.faces) {
    for (var i = 0; i < f.pts.length; i++) {
      final a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
      final ka = _key(a), kb = _key(b);
      if (ka == kb || !seen.add(ka.compareTo(kb) < 0 ? '$ka|$kb' : '$kb|$ka')) continue;
      final da = side(a), db = side(b);
      if (da.abs() <= eps) raw.add(a);
      if (db.abs() <= eps) raw.add(b);
      if ((da > eps && db < -eps) || (da < -eps && db > eps)) raw.add(cut(a, b));
    }
  }
  final pts = orderOnPlane(raw, n);
  if (pts.length < 3) return null;
  final area = _len(_newell(pts)) / 2;
  if (area < 1e-12 * math.max(1.0, mesh.radius * mesh.radius)) return null;
  final normals = <List<Vec3>>[];
  for (var i = 0; i < pts.length; i++) {
    final m = _lerp(pts[i], pts[(i + 1) % pts.length], 0.5);
    final out = <Vec3>[];
    for (var fi = 0; fi < mesh.faces.length; fi++) {
      final fn = mesh.normals[fi];
      if (fn.dot(m - mesh.faces[fi].pts[0]).abs() < 1e-7 * math.max(1.0, mesh.radius)) out.add(fn);
    }
    normals.add(out);
  }
  return SectionPoly(pts, normals, area);
}

/* ---------------- Нэрлэх ---------------- */

const _numNames = [
  '',
  '',
  '',
  'Гурвалжин',
  'Дөрвөн өнцөгт',
  'Таван өнцөгт',
  'Зургаан өнцөгт',
  'Долоон өнцөгт',
  'Найман өнцөгт',
  'Есөн өнцөгт',
  'Арван өнцөгт',
];

/// Олон өнцөгтийн хэлбэрийн нэр (булангууд эрэмбэтэй).
String polygonName(List<Vec3> c) {
  final n = c.length;
  final l = [for (var i = 0; i < n; i++) _dist(c[i], c[(i + 1) % n])];
  final dir = [for (var i = 0; i < n; i++) _unit(c[(i + 1) % n] - c[i])];
  bool eqL(double x, double y) => (x - y).abs() <= 1e-6 * math.max(x, y);
  final allEq = l.every((x) => eqL(x, l[0]));
  bool perp(int i, int j) => dir[i].dot(dir[j]).abs() < 1e-6;
  bool par(int i, int j) => (dir[i].dot(dir[j]).abs() - 1).abs() < 1e-9;
  final ang = [for (var i = 0; i < n; i++) dir[i].dot(dir[(i + 1) % n])];
  final allAng = ang.every((x) => (x - ang[0]).abs() < 1e-6);
  if (n == 3) {
    if (allEq) return 'Зөв гурвалжин';
    final right = perp(0, 1) || perp(1, 2) || perp(2, 0);
    final iso = eqL(l[0], l[1]) || eqL(l[1], l[2]) || eqL(l[2], l[0]);
    if (right && iso) return 'Адил хажуут тэгш өнцөгт гурвалжин';
    if (right) return 'Тэгш өнцөгт гурвалжин';
    if (iso) return 'Адил хажуут гурвалжин';
    return 'Гурвалжин';
  }
  if (n == 4) {
    if (perp(0, 1) && perp(1, 2) && perp(2, 3)) return allEq ? 'Квадрат' : 'Тэгш өнцөгт';
    final p02 = par(0, 2), p13 = par(1, 3);
    if (p02 && p13) return allEq ? 'Ромб' : 'Параллелограмм';
    if (p02 || p13) {
      final legs = p02 ? [1, 3] : [0, 2];
      if (eqL(l[legs[0]], l[legs[1]])) return 'Адил хажуут трапец';
      final bases = p02 ? [0, 2] : [1, 3];
      if (perp(legs[0], bases[0]) || perp(legs[1], bases[0])) return 'Тэгш өнцөгт трапец';
      return 'Трапец';
    }
    return 'Дөрвөн өнцөгт';
  }
  final base = n < _numNames.length ? _numNames[n] : '$n өнцөгт';
  if (allEq && allAng) return 'Зөв ${base.substring(0, 1).toLowerCase()}${base.substring(1)}';
  return base;
}

/* ---------------- Үр дүн ---------------- */

/// Зурагт шилжүүлэх огтлол (зурагчийн хүрээнд: бөмбөрцгийн төв (0,0,0)).
class SectionView {
  const SectionView({required this.pts, required this.normals, required this.labels, required this.curved});
  final List<Vec3> pts;
  final List<List<Vec3>> normals;

  /// K, L, M … (олон талстын огтлолд); муруйд хоосон.
  final List<String> labels;
  final bool curved;
}

class SectionResult {
  const SectionResult({required this.name, required this.metrics, this.view});
  final String name;
  final List<Metric> metrics;

  /// null — хавтгай биетийг огтлохгүй.
  final SectionView? view;
}

const sectionLetters = ['K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T'];

const _d2r = math.pi / 180;

/// [p] — биетийн болон хавтгайн (y, alpha, beta, s) утгууд нэг зураглалд.
SectionResult sectionOf(SolidKind k, Map<String, double> p) {
  final sp = p;
  final pl = planeFrom(sp);
  final n = pl.n;
  final alpha = math.acos(math.min(1.0, n.y.abs())) / _d2r;
  const miss = SectionResult(
    name: 'Огтлол байхгүй',
    metrics: [Metric('Огтлол', text: 'Хавтгай биетийг огтлохгүй байна. Өндөр эсвэл налууг өөрчилнө үү', key: true)],
  );
  if (k == SolidKind.sphere) return _sphereSection(p['R']!, pl, miss);
  final mesh = meshOf(k, p, segs: k.curved ? 360 : 8);
  final poly = sectionPolygon(mesh!, pl);
  if (poly == null) return miss;

  final metrics = <Metric>[];
  String name;
  Metric areaMetric;
  List<Vec3> cs = const [];
  if (!k.curved) {
    cs = corners(poly.pts);
    name = polygonName(cs);
    areaMetric = Metric('Огтлолын талбай', rows: [lenRow('S', '', poly.area)], key: true);
  } else {
    final a = _curvedArea(k, p, pl, poly, mesh, alpha);
    name = a.$1;
    areaMetric = Metric('Огтлолын талбай', rows: [a.$2], key: true);
  }
  metrics
    ..add(Metric('Огтлолын хэлбэр', text: name, key: true))
    ..add(areaMetric);
  if (!k.curved) {
    final rows = <ResultRow>[];
    for (var i = 0; i < cs.length; i++) {
      final nx = (i + 1) % cs.length;
      rows.add(lenRow('${sectionLetters[i % 8]}${sectionLetters[nx % 8]}', '', _dist(cs[i], cs[nx])));
    }
    metrics
      ..add(Metric('Огтлолын талууд', rows: rows))
      ..add(
        Metric(
          'Огтлолын периметр',
          rows: [lenRow('P', '', _perimeter(cs))],
        ),
      );
  }
  metrics.add(
    Metric(
      'Хавтгайн байрлал',
      rows: [
        angRow(r'\alpha', '', alpha),
        lenRow('y', '', sp['y']!),
      ],
    ),
  );
  return SectionResult(
    name: name,
    metrics: metrics,
    view: SectionView(
      pts: poly.pts,
      normals: poly.normals,
      labels: k.curved ? const [] : _labelsFor(poly.pts, cs),
      curved: k.curved,
    ),
  );
}

double _perimeter(List<Vec3> cs) {
  var s = 0.0;
  for (var i = 0; i < cs.length; i++) {
    s += _dist(cs[i], cs[(i + 1) % cs.length]);
  }
  return s;
}

/// Булан бүрт үсэг (поли дахь булангийн цэгт); дундын цэгт хоосон.
List<String> _labelsFor(List<Vec3> pts, List<Vec3> cs) {
  final out = <String>[];
  var next = 0;
  for (final q in pts) {
    final idx = cs.indexWhere((c) => _dist(c, q) < 1e-7);
    out.add(idx >= 0 ? sectionLetters[(next++) % 8] : '');
  }
  return out;
}

SectionResult _sphereSection(double bigR, SecPlane pl, SectionResult miss) {
  final c = Vec3(0, bigR, 0);
  final e = pl.n.dot(c) - pl.d;
  if (e.abs() >= bigR - 1e-9) return miss;
  final rho2 = bigR * bigR - e * e;
  final center = c - pl.n * e;
  final u = _unit(pl.n.cross(pl.n.x.abs() < 0.9 ? const Vec3(1, 0, 0) : const Vec3(0, 1, 0)));
  final w = pl.n.cross(u);
  final rho = math.sqrt(rho2);
  const steps = 120;
  final pts = [
    for (var i = 0; i < steps; i++)
      center + u * (rho * math.cos(2 * math.pi * i / steps)) + w * (rho * math.sin(2 * math.pi * i / steps)),
  ];
  final nr = num(bigR), ne = num(e.abs());
  final area = piRow('S', '\\pi\\rho^2=\\pi(R^2-e^2)=\\pi($nr^2-$ne^2)', rho2);
  final shift = Vec3(0, -bigR, 0);
  return SectionResult(
    name: 'Тойрог',
    metrics: [
      const Metric('Огтлолын хэлбэр', text: 'Тойрог', key: true),
      Metric('Огтлолын талбай', rows: [area], key: true),
      Metric('Огтлолын радиус', rows: [lenRow('\\rho', '\\sqrt{R^2-e^2}=\\sqrt{$nr^2-$ne^2}', rho)]),
      Metric('Төвөөс хавтгай хүртэлх зай', rows: [lenRow('e', '', e.abs())]),
    ],
    view: SectionView(
      pts: [for (final q in pts) q + shift],
      normals: [
        for (var i = 0; i < steps; i++)
          [_unit(_lerp(pts[i], pts[(i + 1) % steps], 0.5) - c)],
      ],
      labels: const [],
      curved: true,
    ),
  );
}

/// Муруй биетийн (цилиндр, конус, тайрсан конус) огтлолын нэр ба талбай.
(String, ResultRow) _curvedArea(
  SolidKind k,
  Map<String, double> p,
  SecPlane pl,
  SectionPoly poly,
  Mesh mesh,
  double alpha,
) {
  final n = pl.n;
  final h = p['h']!;
  bool near0(double x) => x.abs() <= 1e-7;
  final onCap = poly.pts.any((q) => near0(q.y) || near0(q.y - h));
  final caps = onCap && _touchesCap(poly, mesh);
  final horizontal = alpha < 0.05, vertical = alpha > 89.95;
  final y0 = horizontal ? pl.d / n.y : 0.0;
  var area = poly.area;
  ResultRow row(double a) => lenRow('S', '', a);

  if (k == SolidKind.cylinder) {
    final r = p['r']!, nr = num(r);
    if (horizontal) return ('Тойрог', piRow('S', '\\pi r^2=\\pi\\cdot $nr^2', r * r));
    if (vertical) {
      final e = pl.d.abs();
      area = 2 * math.sqrt(math.max(0, r * r - e * e)) * h;
      return (
        'Тэгш өнцөгт',
        lenRow('S', '2\\sqrt{r^2-e^2}\\cdot h=2\\sqrt{$nr^2-${num(e)}^2}\\cdot ${num(h)}', area),
      );
    }
    if (!caps) {
      return (
        'Эллипс',
        piRow('S', '\\frac{\\pi r^2}{\\cos\\alpha}=\\frac{\\pi\\cdot $nr^2}{\\cos ${degTex(alpha)}}', r * r / math.cos(alpha * _d2r)),
      );
    }
    return ('Эллипсийн хэсэг', row(area));
  }

  // Конус (r2 = 0) ба тайрсан конус
  final bigR = k == SolidKind.cone ? p['r']! : p['R']!;
  final rt = k == SolidKind.cone ? 0.0 : p['r']!;
  final apexH = h * bigR / (bigR - rt);
  final apex = Vec3(0, apexH, 0);
  final throughApex = (n.dot(apex) - pl.d).abs() < 1e-7 * math.max(1.0, apexH);
  final beta = math.atan2(h, bigR - rt) / _d2r;
  String name;
  if (horizontal) {
    final rho = bigR + (rt - bigR) * y0 / h;
    return ('Тойрог', piRow('S', '\\pi\\rho^2=\\pi\\cdot ${num(rho)}^2', rho * rho));
  } else if (throughApex) {
    name = k == SolidKind.cone ? 'Адил хажуут гурвалжин' : 'Адил хажуут трапец';
  } else if (alpha < beta - 0.05) {
    name = caps ? 'Эллипсийн хэсэг' : 'Эллипс';
  } else if (alpha <= beta + 0.05) {
    name = 'Параболын хэсэг';
  } else {
    name = 'Гиперболын хэсэг';
  }
  if (throughApex) {
    // Хавтгай дээрх хоёр хөвч: суурь (R) ба дээд (r).
    List<Vec3>? chord(double y, double rho) {
      final a = n.x, c = n.z, kk = pl.d - n.y * y;
      final hn = math.sqrt(a * a + c * c);
      if (hn < 1e-12) return null;
      final e = kk / hn;
      if (e.abs() > rho) return null;
      final ux = a / hn, uz = c / hn;
      final w = math.sqrt(rho * rho - e * e);
      return [Vec3(ux * e - uz * w, y, uz * e + ux * w), Vec3(ux * e + uz * w, y, uz * e - ux * w)];
    }

    final b = chord(0, bigR);
    if (b != null) {
      if (k == SolidKind.cone) {
        area = _len((b[0] - apex).cross(b[1] - apex)) / 2;
        return (name, row(area));
      }
      final t = chord(h, rt);
      if (t != null) {
        area = (_dist(b[0], b[1]) + _dist(t[0], t[1])) / 2 * (h / math.sin(alpha * _d2r));
        return (name, lenRow('S', '', area));
      }
    }
  }
  return (name, row(area));
}

bool _touchesCap(SectionPoly poly, Mesh mesh) {
  for (var i = 0; i < poly.pts.length; i++) {
    final m = _lerp(poly.pts[i], poly.pts[(i + 1) % poly.pts.length], 0.5);
    for (var fi = 0; fi < mesh.faces.length; fi++) {
      if (!mesh.faces[fi].cap) continue;
      if (mesh.normals[fi].dot(m - mesh.faces[fi].pts[0]).abs() < 1e-7 * math.max(1.0, mesh.radius)) return true;
    }
  }
  return false;
}
