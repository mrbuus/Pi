// График хэрэгслийн ЦЭВЭР логик (вэбийн `tools/graph/graphMath.ts`): оролтын ангилал,
// дасан зохицох дээжлэлт, далд тэгшитгэлийн контур (marching squares), тэнцэтгэл
// бишийн муж, тэг/экстремум/огтлолцол. Flutter-гүй — `flutter test`-ээр шалгагдана.
//
// Зам нь SVG мөр биш, полилинийн жагсаалт ([Polyline] — пикселийн x, y ээлжлэн):
// painter шууд `Path`/`drawRawPoints` болгоно.
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:piemath_app/shared/math_keyboard/expr.dart';

typedef Fn = double Function(Scope scope);

/* ---------- Ангилал ---------- */

enum ItemKind { empty, error, fn, vline, implicit, ineq, point }

class GraphItem {
  const GraphItem._(
    this.kind, {
    this.message = '',
    this.f,
    this.op,
    this.py,
    this.params = const [],
    this.tex = '',
  });

  const GraphItem.empty() : this._(ItemKind.empty);
  const GraphItem.error(String message) : this._(ItemKind.error, message: message);

  final ItemKind kind;
  final String message;

  /// fn: y = f(x); vline: x = c; implicit/ineq: F(x, y) (тэгтэй жиших); point: x координат.
  final Fn? f;

  /// Тэнцэтгэл бишийн тэмдэг.
  final RelOp? op;

  /// Цэгийн y координат.
  final Fn? py;

  /// x, y-ээс бусад үсэг (a, b, k …) — гулсуураар өөрчилнө.
  final List<String> params;

  /// LaTeX (`y=x^{2}`).
  final String tex;
}

bool _isSym(Expr n, String name) => n.kind == ExprKind.sym && n.name == name;
bool _has(Expr n, String s) => freeSymbols(n).contains(s);

List<String> _paramsOf(List<Expr> nodes) {
  final set = <String>{};
  for (final n in nodes) {
    freeSymbols(n, set);
  }
  set
    ..remove('x')
    ..remove('y');
  return set.toList()..sort();
}

/// «(2;3)» эсвэл «(1,5; -2)» хэлбэрийн цэг: хаалтын гаднах нэг л тусгаарлагч.
(String, String)? _splitPoint(String src) {
  final s = normalizeInput(src).trim();
  if (!s.startsWith('(') || !s.endsWith(')')) return null;
  // «;» байвал тусгаарлагч нь зөвхөн «;», таслал нь аравтын тэмдэг (1,5)
  final semi = s.contains(';');
  final sep = semi ? ';' : ',';
  var depth = 0;
  var cut = -1;
  for (var i = 0; i < s.length; i++) {
    final c = s[i];
    if (c == '(' || c == '[' || c == '{') {
      depth++;
    } else if (c == ')' || c == ']' || c == '}') {
      depth--;
      if (depth == 0 && i != s.length - 1) return null; // (a)+(b) гэх мэт
    } else if (c == sep && depth == 1) {
      if (cut >= 0) return null;
      cut = i;
    }
  }
  if (cut < 0 || depth != 0) return null;
  String fix(String t) => semi ? t.replaceAllMapped(RegExp(r'(\d),(\d)'), (m) => '${m[1]}.${m[2]}') : t;
  return (fix(s.substring(1, cut)), fix(s.substring(cut + 1, s.length - 1)));
}

final _fnPrefix = RegExp(r'^\s*[a-zA-Z]\s*\(\s*x\s*\)\s*=');

/// Бичвэрийг графикийн мөр болгон ангилна.
GraphItem analyzeGraph(String src, {bool degrees = false}) {
  if (src.trim().isEmpty) return const GraphItem.empty();
  Fn c(Expr n) => compileExpr(n, degrees: degrees);
  try {
    // Цэг
    final pt = _splitPoint(src);
    if (pt != null) {
      final a = parseExpr(pt.$1);
      final b = parseExpr(pt.$2);
      if (!_has(a, 'x') && !_has(a, 'y') && !_has(b, 'x') && !_has(b, 'y')) {
        return GraphItem._(
          ItemKind.point,
          f: c(a),
          py: c(b),
          params: _paramsOf([a, b]),
          tex: '\\left(${toLatex(a)};\\ ${toLatex(b)}\\right)',
        );
      }
    }
    // f(x)= угтварыг авч хаяна
    final stripped = normalizeInput(src).replaceFirst(_fnPrefix, 'y=');
    final rel = parseRelation(stripped);
    if (rel == null) {
      final node = parseExpr(stripped);
      if (_has(node, 'y')) {
        return GraphItem._(ItemKind.implicit, f: c(node), params: _paramsOf([node]), tex: '${toLatex(node)}=0');
      }
      return GraphItem._(ItemKind.fn, f: c(node), params: _paramsOf([node]), tex: 'y=${toLatex(node)}');
    }
    final lhs = rel.lhs, rhs = rel.rhs;
    if (rel.op == RelOp.eq) {
      if (_isSym(lhs, 'y') && !_has(rhs, 'y')) {
        return GraphItem._(ItemKind.fn, f: c(rhs), params: _paramsOf([rhs]), tex: 'y=${toLatex(rhs)}');
      }
      if (_isSym(rhs, 'y') && !_has(lhs, 'y')) {
        return GraphItem._(ItemKind.fn, f: c(lhs), params: _paramsOf([lhs]), tex: 'y=${toLatex(lhs)}');
      }
      if (_isSym(lhs, 'x') && !_has(rhs, 'x') && !_has(rhs, 'y')) {
        return GraphItem._(ItemKind.vline, f: c(rhs), params: _paramsOf([rhs]), tex: 'x=${toLatex(rhs)}');
      }
      if (_isSym(rhs, 'x') && !_has(lhs, 'x') && !_has(lhs, 'y')) {
        return GraphItem._(ItemKind.vline, f: c(lhs), params: _paramsOf([lhs]), tex: 'x=${toLatex(lhs)}');
      }
    }
    final f = c(Expr.bin(ExprKind.sub, lhs, rhs));
    final params = _paramsOf([lhs, rhs]);
    if (rel.op == RelOp.eq) return GraphItem._(ItemKind.implicit, f: f, params: params, tex: relationLatex(rel));
    return GraphItem._(ItemKind.ineq, f: f, op: rel.op, params: params, tex: relationLatex(rel));
  } on ExprParseError catch (e) {
    return GraphItem.error(e.message);
  } catch (_) {
    return const GraphItem.error('Илэрхийллийг ойлгосонгүй');
  }
}

/* ---------- Харагдац ---------- */

double clampD(double v, double a, double b) => math.min(b, math.max(a, v));

/// Координатын харагдац: төв (cx, cy), нэгж бүрийн пиксел (sx, sy), зургийн хэмжээ (w, h).
class GView {
  const GView({required this.cx, required this.cy, required this.sx, required this.sy, required this.w, required this.h});

  /// [xmin,xmax,ymin,ymax]-аас харагдац.
  factory GView.fromRange(double xmin, double xmax, double ymin, double ymax, double w, double h) =>
      GView(cx: (xmin + xmax) / 2, cy: (ymin + ymax) / 2, sx: w / (xmax - xmin), sy: h / (ymax - ymin), w: w, h: h);

  final double cx, cy, sx, sy, w, h;

  double xOf(double px) => cx + (px - w / 2) / sx;
  double yOf(double py) => cy - (py - h / 2) / sy;
  double pxOf(double x) => w / 2 + (x - cx) * sx;
  double pyOf(double y) => h / 2 - (y - cy) * sy;

  double get xMin => xOf(0);
  double get xMax => xOf(w);
  double get yMin => yOf(h);
  double get yMax => yOf(0);

  GView copyWith({double? cx, double? cy, double? sx, double? sy, double? w, double? h}) =>
      GView(cx: cx ?? this.cx, cy: cy ?? this.cy, sx: sx ?? this.sx, sy: sy ?? this.sy, w: w ?? this.w, h: h ?? this.h);

  /// (px,py) цэгийн доорх координатыг тогтоосон хэвээр factor-оор томруулна.
  GView zoomAbout(double px, double py, double fx, [double? fy]) {
    final x = xOf(px), y = yOf(py);
    final nsx = clampD(sx * fx, 1e-6, 1e9), nsy = clampD(sy * (fy ?? fx), 1e-6, 1e9);
    return copyWith(sx: nsx, sy: nsy, cx: x - (px - w / 2) / nsx, cy: y + (py - h / 2) / nsy);
  }

  /// Пикселээр чирэх.
  GView panBy(double dx, double dy) => copyWith(cx: cx - dx / sx, cy: cy + dy / sy);

  /// Хэмжээ өөрчлөгдөхөд масштабыг хадгална.
  GView resized(double nw, double nh) => copyWith(w: nw, h: nh);
}

/* ---------- Тэнхлэгийн шошго ---------- */

/// 1, 2, 5 x 10^k хэлбэрийн алхам; хоёр шошгоны хоорондох зай >= targetPx.
double niceStep(double pxPerUnit, [double targetPx = 70]) {
  final raw = targetPx / pxPerUnit;
  final p = math.pow(10, (math.log(raw) / math.ln10).floor()).toDouble();
  final m = raw / p;
  final f = m <= 1 ? 1 : (m <= 2 ? 2 : (m <= 5 ? 5 : 10));
  return f * p;
}

/// pi-ийн хэсгүүдээр алхам (x тэнхлэгт тригонометр): pi/12 ... 50pi.
double piStep(double pxPerUnit, [double targetPx = 70]) {
  const steps = [
    math.pi / 12,
    math.pi / 6,
    math.pi / 4,
    math.pi / 3,
    math.pi / 2,
    math.pi,
    2 * math.pi,
    5 * math.pi,
    10 * math.pi,
    50 * math.pi,
  ];
  for (final s in steps) {
    if (s * pxPerUnit >= targetPx) return s;
  }
  return steps.last;
}

/// Градусын алхам: 15°, 30°, 45°, 90° … (тригонометр градусаар).
double degStep(double pxPerUnit, [double targetPx = 70]) {
  const steps = <double>[1, 5, 15, 30, 45, 90, 180, 360, 720, 1800];
  for (final s in steps) {
    if (s * pxPerUnit >= targetPx) return s;
  }
  return niceStep(pxPerUnit, targetPx);
}

List<double> tickValues(double min, double max, double step) {
  final out = <double>[];
  final start = (min / step - 1e-9).ceil();
  final end = (max / step + 1e-9).floor();
  if (end - start > 400) return out;
  for (var k = start; k <= end; k++) {
    out.add(k * step);
  }
  return out;
}

/// Тэнхлэгийн тоо: алхмын нарийвчлалаар, хасах тэмдэг нь «-» (бичгийн хасах).
String numLabel(double v, double step) {
  if (v.abs() < step * 1e-6) return '0';
  if (v.abs() >= 1e6 || (v.abs() < 1e-4 && v != 0)) {
    final parts = v.toStringAsExponential(2).split('e');
    return '${_trimNum(double.parse(parts[0]))}e${int.parse(parts[1])}'.replaceFirst('-', '\u2212');
  }
  final digits = math.max(0, math.min(8, -((math.log(step) / math.ln10) + 1e-9).floor()));
  var s = v.toStringAsFixed(digits);
  if (s.contains('.')) s = s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  return s.replaceFirst('-', '\u2212');
}

String _trimNum(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

int _gcdInt(int a, int b) {
  a = a.abs();
  b = b.abs();
  while (b != 0) {
    final t = b;
    b = a % b;
    a = t;
  }
  return a == 0 ? 1 : a;
}

/// k*pi/q-ийн LaTeX: `\frac{\pi}{2}`, `\frac{3\pi}{2}`, `-\pi`, `2\pi`.
String piLabelTex(double v) {
  final k12 = (v / math.pi * 12).round();
  if (k12 == 0) return '0';
  final g = _gcdInt(k12.abs(), 12);
  final num = k12 ~/ g, den = 12 ~/ g;
  final sign = num < 0 ? '-' : '';
  final a = num.abs();
  final top = a == 1 ? r'\pi' : '$a\\pi';
  return den == 1 ? '$sign$top' : '$sign\\frac{$top}{$den}';
}

/// Канваст шууд зурах pi шошгоны бичвэр (KaTeX фонтоор): «pi/2», «3pi/2», «-pi».
/// [piLabelTex]-тэй ижил утга; pi тэмдэгт KaTeX_Math фонтоор зурагдана.
(String sign, String top, String? den) piLabelParts(double v) {
  final k12 = (v / math.pi * 12).round();
  if (k12 == 0) return ('', '0', null);
  final g = _gcdInt(k12.abs(), 12);
  final num = k12 ~/ g, den = 12 ~/ g;
  final a = num.abs();
  return (num < 0 ? '\u2212' : '', a == 1 ? '' : '$a', den == 1 ? null : '$den');
}

/* ---------- Функцийн дээжлэлт ---------- */

/// Пикселийн полилин: [x0, y0, x1, y1, …].
typedef Polyline = Float64List;

class _PolyBuilder {
  final out = <Polyline>[];
  final _cur = <double>[];

  void add(double x, double y) => _cur
    ..add(x)
    ..add(y);

  void lift() {
    if (_cur.length >= 4) out.add(Float64List.fromList(_cur));
    _cur.clear();
  }

  List<Polyline> done() {
    lift();
    return out;
  }
}

/// y = f(x) муруй — ДАСАН ЗОХИЦОХ дээжлэлт: 2px тутамд суурь цэг, огцом
/// өөрчлөгдөх хэсэгт (налуу >= 6px) дунд цэг нэмж 4 хүртэл хуваана. Асимптотыг
/// дамжих үсрэлт (>= 3h) болон тодорхойгүй хэсэгт тасална.
List<Polyline> fnPolylines(Fn f, Scope scope, GView v, {double basePx = 2}) {
  final xa = v.xMin, xb = v.xMax;
  final n = math.max(40, (v.w / basePx).ceil());
  final h = v.h;
  final lim = 6 * h;
  final b = _PolyBuilder();
  double fAt(double x) {
    scope['x'] = x;
    return f(scope);
  }

  var prevX = xa;
  var prevY = fAt(xa);
  var pen = false;
  void emit(double x, double y) {
    final py = v.pyOf(y);
    b.add(v.pxOf(x), clampD(py, -lim, h + lim));
    pen = true;
  }

  void segment(double x0, double y0, double x1, double y1, int depth) {
    final p0 = v.pyOf(y0), p1 = v.pyOf(y1);
    if (depth < 4 && (p1 - p0).abs() > 6) {
      final xm = (x0 + x1) / 2, ym = fAt(xm);
      if (!ym.isFinite) {
        // тодорхойгүй завсар дундуур: таслана
        b.lift();
        pen = false;
        return;
      }
      segment(x0, y0, xm, ym, depth + 1);
      segment(xm, ym, x1, y1, depth + 1);
      return;
    }
    if ((p1 - p0).abs() > 3 * h) {
      // асимптотыг дамжих үсрэлт: зам таслах
      b.lift();
      pen = false;
    }
    if (!pen) emit(x0, y0);
    emit(x1, y1);
  }

  if (prevY.isFinite) emit(prevX, prevY);
  for (var i = 1; i <= n; i++) {
    final x = xa + (xb - xa) * i / n;
    final y = fAt(x);
    if (!y.isFinite) {
      b.lift();
      pen = false;
      prevX = x;
      prevY = y;
      continue;
    }
    if (!prevY.isFinite) {
      emit(x, y);
    } else {
      segment(prevX, prevY, x, y, 0);
    }
    prevX = x;
    prevY = y;
  }
  return b.done();
}

/* ---------- Далд тэгшитгэл (marching squares) ---------- */

class Grid {
  const Grid(this.nx, this.ny, this.cell, this.vals);
  final int nx, ny;
  final double cell;
  final Float64List vals;
}

/// F(x, y)-ийн утгыг торын зангилаанд. [maxCells] — хөдөлгөөний үед бага.
Grid sampleGrid(Fn f, Scope scope, GView v, {int maxCells = 60000, double minCell = 4}) {
  final cell = math.max(minCell, math.sqrt((v.w * v.h) / maxCells));
  final nx = (v.w / cell).ceil() + 1;
  final ny = (v.h / cell).ceil() + 1;
  final vals = Float64List(nx * ny);
  for (var j = 0; j < ny; j++) {
    scope['y'] = v.yOf(j * cell);
    for (var i = 0; i < nx; i++) {
      scope['x'] = v.xOf(i * cell);
      vals[j * nx + i] = f(scope);
    }
  }
  return Grid(nx, ny, cell, vals);
}

// Нүдний сегментүүд: [ирмэг, ирмэг]; ирмэг 0=дээд 1=баруун 2=доод 3=зүүн
const _seg = <List<List<int>>>[
  [],
  [
    [3, 2],
  ],
  [
    [1, 2],
  ],
  [
    [3, 1],
  ],
  [
    [0, 1],
  ],
  [],
  [
    [0, 2],
  ],
  [
    [3, 0],
  ],
  [
    [3, 0],
  ],
  [
    [0, 2],
  ],
  [],
  [
    [0, 1],
  ],
  [
    [3, 1],
  ],
  [
    [1, 2],
  ],
  [
    [3, 2],
  ],
  [],
];

/// F=0 контурын хэрчмүүд: [x1, y1, x2, y2, …] (хэрчим бүр 4 тоо).
Float64List contourSegments(Grid g) {
  final nx = g.nx, ny = g.ny, cell = g.cell, vals = g.vals;
  final out = <double>[];
  double t(double p, double q) => p == q ? 0.5 : clampD(p / (p - q), 0, 1);
  for (var j = 0; j < ny - 1; j++) {
    for (var i = 0; i < nx - 1; i++) {
      final a = vals[j * nx + i]; // зүүн дээд
      final b = vals[j * nx + i + 1]; // баруун дээд
      final c = vals[(j + 1) * nx + i + 1]; // баруун доод
      final e = vals[(j + 1) * nx + i]; // зүүн доод
      if (!(a.isFinite && b.isFinite && c.isFinite && e.isFinite)) continue;
      final idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (e > 0 ? 1 : 0);
      if (idx == 0 || idx == 15) continue;
      // Хэт том үсрэлт (асимптот): гарцыг зурахгүй
      final big = math.max(math.max(a.abs(), b.abs()), math.max(c.abs(), e.abs()));
      final small = math.min(math.min(a.abs(), b.abs()), math.min(c.abs(), e.abs()));
      if (big > 1e6 && small > 1e3) continue;
      var segs = _seg[idx];
      if (idx == 5 || idx == 10) {
        final mid = (a + b + c + e) / 4 > 0;
        if (idx == 5) {
          segs = mid
              ? const [
                  [3, 0],
                  [1, 2],
                ]
              : const [
                  [0, 1],
                  [3, 2],
                ];
        } else {
          segs = mid
              ? const [
                  [0, 1],
                  [3, 2],
                ]
              : const [
                  [3, 0],
                  [1, 2],
                ];
        }
      }
      final x0 = i * cell, y0 = j * cell;
      (double, double) pt(int edge) => switch (edge) {
        0 => (x0 + t(a, b) * cell, y0),
        1 => (x0 + cell, y0 + t(b, c) * cell),
        2 => (x0 + t(e, c) * cell, y0 + cell),
        _ => (x0, y0 + t(a, e) * cell),
      };
      for (final s in segs) {
        final p = pt(s[0]), q = pt(s[1]);
        out.addAll([p.$1, p.$2, q.$1, q.$2]);
      }
    }
  }
  return Float64List.fromList(out);
}

/// Тэнцэтгэл бишийн мужийн хэвтээ нүднүүдийг нийлүүлсэн тэгш өнцөгтүүд: [x, y, w, h, …].
Float64List regionRects(Grid g, RelOp op) {
  final nx = g.nx, ny = g.ny, cell = g.cell, vals = g.vals;
  final want = op == RelOp.gt || op == RelOp.ge ? 1 : -1;
  final out = <double>[];
  for (var j = 0; j < ny - 1; j++) {
    var start = -1;
    for (var i = 0; i <= nx - 1; i++) {
      var inside = false;
      if (i < nx - 1) {
        final a = vals[j * nx + i], b = vals[j * nx + i + 1];
        final c = vals[(j + 1) * nx + i + 1], e = vals[(j + 1) * nx + i];
        if (a.isFinite && b.isFinite && c.isFinite && e.isFinite) {
          final m = (a + b + c + e) / 4;
          inside = want > 0 ? m > 0 : m < 0;
        }
      }
      if (inside && start < 0) start = i;
      if (!inside && start >= 0) {
        out.addAll([start * cell, j * cell, (i - start) * cell, cell]);
        start = -1;
      }
    }
  }
  return Float64List.fromList(out);
}

/* ---------- Онцгой цэгүүд ---------- */

enum SpecialKind { zero, yint, max, min, cross }

const specialKindLabel = <SpecialKind, String>{
  SpecialKind.zero: 'Тэг',
  SpecialKind.yint: 'y тэнхлэгтэй огтлолцол',
  SpecialKind.max: 'Дээд цэг',
  SpecialKind.min: 'Доод цэг',
  SpecialKind.cross: 'Огтлолцол',
};

class Special {
  const Special(this.kind, this.x, this.y, this.line, [this.other]);
  final SpecialKind kind;
  final double x, y;

  /// цэг аль мөрнөөс гарсан (cross бол эхний мөр)
  final int line;
  final int? other;
}

(Float64List, Float64List) _sample(Fn f, Scope scope, double a, double b, int n) {
  final xs = Float64List(n + 1), ys = Float64List(n + 1);
  for (var i = 0; i <= n; i++) {
    final x = a + (b - a) * i / n;
    scope['x'] = x;
    xs[i] = x;
    ys[i] = f(scope);
  }
  return (xs, ys);
}

List<double> findRoots(Fn f, Scope scope, double a, double b, [int n = 800]) {
  final (xs, ys) = _sample(f, scope, a, b, n);
  final out = <double>[];
  void add(double x) {
    if (!out.any((r) => (r - x).abs() < (b - a) * 1e-6)) out.add(x);
  }

  for (var i = 0; i < n; i++) {
    final y0 = ys[i], y1 = ys[i + 1];
    if (!y0.isFinite || !y1.isFinite) continue;
    if (y0 == 0) {
      add(xs[i]);
      continue;
    }
    if (y0 * y1 < 0) {
      var lo = xs[i], hi = xs[i + 1], flo = y0;
      for (var k = 0; k < 70; k++) {
        final mid = (lo + hi) / 2;
        scope['x'] = mid;
        final fm = f(scope);
        if (!fm.isFinite) break;
        if (fm == 0) {
          lo = hi = mid;
          break;
        }
        if (flo * fm < 0) {
          hi = mid;
        } else {
          lo = mid;
          flo = fm;
        }
      }
      final r = (lo + hi) / 2;
      scope['x'] = r;
      final fr = f(scope);
      if (fr.isFinite && fr.abs() < 1e-6) add(r);
    }
  }
  if (ys[n].isFinite && ys[n] == 0) add(xs[n]);
  // Давхар язгуур (шүргэх): экстремум дээр функц ~0
  for (final e in findExtrema(f, scope, a, b, n)) {
    if (e.y.abs() < 1e-7) add(e.x);
  }
  return out..sort();
}

List<({double x, double y, bool max})> findExtrema(Fn f, Scope scope, double a, double b, [int n = 800]) {
  final (xs, ys) = _sample(f, scope, a, b, n);
  final diffs = <double>[];
  for (var i = 1; i <= n; i++) {
    final d = ys[i] - ys[i - 1];
    if (d.isFinite) diffs.add(d.abs());
  }
  if (diffs.length < 10) return const [];
  diffs.sort();
  final med = diffs[diffs.length ~/ 2];
  if (diffs.last < 1e-12) return const []; // тогтмол
  var scale = 1.0;
  for (final y in ys) {
    if (y.isFinite) scale = math.max(scale, y.abs());
  }
  final out = <({double x, double y, bool max})>[];
  const phi = 0.6180339887498949;
  for (var i = 1; i < n; i++) {
    final y0 = ys[i - 1], y1 = ys[i], y2 = ys[i + 1];
    if (!(y0.isFinite && y1.isFinite && y2.isFinite)) continue;
    final d0 = y1 - y0, d1 = y2 - y1;
    final isMax = d0 > 0 && d1 < 0;
    final isMin = d0 < 0 && d1 > 0;
    if (!isMax && !isMin) continue;
    if (math.max(d0.abs(), d1.abs()) > 30 * med + 1e-9 * scale) continue;
    // алтан огтлолоор нарийвчлах
    var lo = xs[i - 1], hi = xs[i + 1];
    final sign = isMax ? -1 : 1;
    double g(double x) {
      scope['x'] = x;
      return sign * f(scope);
    }

    var c = hi - phi * (hi - lo), e = lo + phi * (hi - lo);
    var gc = g(c), ge = g(e);
    for (var k = 0; k < 80; k++) {
      if (gc < ge) {
        hi = e;
        e = c;
        ge = gc;
        c = hi - phi * (hi - lo);
        gc = g(c);
      } else {
        lo = c;
        c = e;
        gc = ge;
        e = lo + phi * (hi - lo);
        ge = g(e);
      }
    }
    final x = (lo + hi) / 2;
    scope['x'] = x;
    final y = f(scope);
    if (!y.isFinite) continue;
    if (!out.any((o) => (o.x - x).abs() < (b - a) * 1e-5)) out.add((x: x, y: y, max: isMax));
  }
  return out;
}

class FnLine {
  const FnLine(this.idx, this.f, this.scope);
  final int idx;
  final Fn f;
  final Scope scope;
}

/// Харагдаж буй x-хүрээнд: тэг, y-огтлол, экстремум, функц хоорондын огтлолцол.
List<Special> specialPoints(List<FnLine> lines, double a, double b, [int cap = 60]) {
  final out = <Special>[];
  for (final ln in lines) {
    for (final x in findRoots(ln.f, ln.scope, a, b)) {
      out.add(Special(SpecialKind.zero, x, 0, ln.idx));
    }
    ln.scope['x'] = 0;
    final y0 = ln.f(ln.scope);
    if (a <= 0 && b >= 0 && y0.isFinite) out.add(Special(SpecialKind.yint, 0, y0, ln.idx));
    for (final e in findExtrema(ln.f, ln.scope, a, b)) {
      out.add(Special(e.max ? SpecialKind.max : SpecialKind.min, e.x, e.y, ln.idx));
    }
    if (out.length > cap) break;
  }
  for (var i = 0; i < lines.length; i++) {
    for (var j = i + 1; j < lines.length; j++) {
      final p = lines[i], q = lines[j];
      final scope = Map<String, double>.of(p.scope);
      final sq = Map<String, double>.of(q.scope);
      double diff(Scope s) {
        sq['x'] = s['x']!;
        return p.f(s) - q.f(sq);
      }

      for (final x in findRoots(diff, scope, a, b, 600)) {
        scope['x'] = x;
        final y = p.f(scope);
        if (y.isFinite) out.add(Special(SpecialKind.cross, x, y, p.idx, q.idx));
      }
      if (out.length > cap) break;
    }
  }
  return out.length > cap ? out.sublist(0, cap) : out;
}

/// Утгын хүснэгт.
List<({double x, double y})> valueTable(Fn f, Scope scope, double start, double step, [int rows = 9]) {
  return [
    for (var i = 0; i < rows; i++)
      () {
        final x = ((start + i * step) * 1e9).roundToDouble() / 1e9;
        scope['x'] = x;
        return (x: x, y: f(scope));
      }(),
  ];
}

/// f'(x) — төв ялгавар (тоон).
double derivAt(Fn f, Scope scope, double x) {
  final h = 1e-5 * math.max(1, x.abs());
  scope['x'] = x + h;
  final a = f(scope);
  scope['x'] = x - h;
  final b = f(scope);
  return (a - b) / (2 * h);
}

/// ∫_a^b f dx — Симпсон (тасралттай бол NaN).
double simpson(Fn f, Scope scope, double a, double b, [int n = 2000]) {
  if (a == b) return 0;
  if (n.isOdd) n++;
  final h = (b - a) / n;
  var s = 0.0;
  for (var i = 0; i <= n; i++) {
    scope['x'] = a + i * h;
    final y = f(scope);
    if (!y.isFinite) return double.nan;
    s += y * (i == 0 || i == n ? 1 : (i.isOdd ? 4 : 2));
  }
  return s * h / 3;
}

/// ∫ f талбайн полигон (пикселийн x, y ээлжлэн): [a,b] завсар, y=0 суурьтай (вэбийн `areaPath`).
List<double> areaPolygon(Fn f, Scope scope, GView v, double a, double b) {
  final lo = math.min(a, b), hi = math.max(a, b);
  final n = math.max(20, math.min(600, (v.pxOf(hi) - v.pxOf(lo)).abs().ceil()));
  final y0 = v.pyOf(0);
  final out = <double>[v.pxOf(lo), y0];
  for (var i = 0; i <= n; i++) {
    final x = lo + (hi - lo) * i / n;
    scope['x'] = x;
    final y = f(scope);
    if (!y.isFinite) continue;
    out
      ..add(v.pxOf(x))
      ..add(clampD(v.pyOf(y), -5 * v.h, 6 * v.h));
  }
  out
    ..add(v.pxOf(hi))
    ..add(y0);
  return out;
}

/// y = kx + b-ийн цэвэр LaTeX (вэбийн `lineTex`).
String lineTex(double k, double b) {
  final kt = k.abs() < 1e-9
      ? ''
      : (k - 1).abs() < 1e-9
      ? 'x'
      : (k + 1).abs() < 1e-9
      ? '-x'
      : '${niceTex(k)}x';
  if (b.abs() < 1e-9) return kt.isEmpty ? '0' : kt;
  final bt = niceTex(b.abs());
  if (kt.isEmpty) return niceTex(b);
  return '$kt${b < 0 ? '-' : '+'}$bt';
}

/// Интегралын утга: «=3» эсвэл урт бутархай бол «\approx 2.67» (вэбийн `approxTex`).
String approxTex(double v) {
  final t = niceTex(v);
  if (RegExp(r'^-?\d+\.\d{3,}').hasMatch(t) || RegExp(r'\.\d{4}').hasMatch(t)) {
    final r = (v * 100).roundToDouble() / 100;
    return r'\approx ' + (r == r.roundToDouble() ? r.toInt().toString() : r.toString());
  }
  return '=$t';
}
