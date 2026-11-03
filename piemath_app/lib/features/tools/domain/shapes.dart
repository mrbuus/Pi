// Хавтгайн дүрсийн загвар: параметр → зураг + тооцоо (вэбийн `plane/shapes.ts`-ийн порт,
// гулсуургүй — утгыг гарнаас бичнэ). Тооцооны мөр бүр томьёо, орлуулга, хариутай.
import 'dart:math' as math;

import '../../../shared/math_keyboard/math_input_controller.dart';
import 'figure.dart';
import 'fmt.dart';
import 'geom.dart';

enum PlaneShape {
  triangle('Гурвалжин'),
  right('Тэгш өнцөгт гурвалжин'),
  rectangle('Тэгш өнцөгт'),
  square('Квадрат'),
  parallelogram('Параллелограмм'),
  rhombus('Ромб'),
  trapezoid('Трапец'),
  circle('Тойрог'),
  polygon('Зөв олон өнцөгт');

  const PlaneShape(this.label);
  final String label;
}

/// Гурвалжны өгөгдлийн хувилбар.
enum TriMode {
  sss('3 тал'),
  sas('2 тал, өнцөг'),
  asa('Тал, 2 өнцөг'),
  iso('Адил хажуут'),
  equi('Зөв');

  const TriMode(this.label);
  final String label;
}

enum TrapMode {
  iso('Адил хажуут'),
  right('Тэгш өнцөгт');

  const TrapMode(this.label);
  final String label;
}

/// Гурвалжны нэмэлт шугам: аль оройгоос гаргах + асаах/унтраах сонголтууд.
enum TriVertex {
  a('A'),
  b('B'),
  c('C'),
  all('Бүгд');

  const TriVertex(this.label);
  final String label;
}

class TriExtras {
  const TriExtras({
    this.from = TriVertex.a,
    this.height = false,
    this.median = false,
    this.bisector = false,
    this.incircle = false,
    this.circumcircle = false,
  });

  final TriVertex from;
  final bool height, median, bisector, incircle, circumcircle;

  /// Оройгоос гарах шугам (өндөр, медиан, биссектрис) асаалттай юу.
  bool get usesVertex => height || median || bisector;

  TriExtras copyWith({
    TriVertex? from,
    bool? height,
    bool? median,
    bool? bisector,
    bool? incircle,
    bool? circumcircle,
  }) => TriExtras(
    from: from ?? this.from,
    height: height ?? this.height,
    median: median ?? this.median,
    bisector: bisector ?? this.bisector,
    incircle: incircle ?? this.incircle,
    circumcircle: circumcircle ?? this.circumcircle,
  );
}

/// Нэг параметрийн тодорхойлолт.
class ParamSpec {
  const ParamSpec(this.key, this.tex, this.name, this.def, {this.kind = MathInputKind.length});
  final String key;

  /// LaTeX тэмдэг.
  final String tex;
  final String name;
  final double def;
  final MathInputKind kind;
}

const _ang = MathInputKind.angle;

/// Дүрс, хувилбар бүрийн бичих утгууд (дэлгэцийн дарааллаар).
List<ParamSpec> paramSpecs(PlaneShape s, {TriMode tri = TriMode.sss, TrapMode trap = TrapMode.iso}) {
  switch (s) {
    case PlaneShape.triangle:
      return switch (tri) {
        TriMode.sss => const [
          ParamSpec('a', 'a', 'BC тал', 5),
          ParamSpec('b', 'b', 'CA тал', 4),
          ParamSpec('c', 'c', 'AB тал', 3),
        ],
        TriMode.sas => const [
          ParamSpec('b', 'b', 'CA тал', 5),
          ParamSpec('c', 'c', 'AB тал', 4),
          ParamSpec('A', r'\angle A', 'A өнцөг', 60, kind: _ang),
        ],
        TriMode.asa => const [
          ParamSpec('a', 'a', 'BC тал', 6),
          ParamSpec('B', r'\angle B', 'B өнцөг', 50, kind: _ang),
          ParamSpec('C', r'\angle C', 'C өнцөг', 70, kind: _ang),
        ],
        TriMode.iso => const [ParamSpec('a', 'a', 'Суурь', 6), ParamSpec('b', 'b', 'Хажуу тал', 5)],
        TriMode.equi => const [ParamSpec('a', 'a', 'Тал', 4)],
      };
    case PlaneShape.right:
      return const [ParamSpec('a', 'a', 'Катет', 3), ParamSpec('b', 'b', 'Катет', 4)];
    case PlaneShape.rectangle:
      return const [ParamSpec('a', 'a', 'Урт', 6), ParamSpec('b', 'b', 'Өргөн', 4)];
    case PlaneShape.square:
      return const [ParamSpec('a', 'a', 'Тал', 4)];
    case PlaneShape.parallelogram:
      return const [
        ParamSpec('a', 'a', 'AB тал', 6),
        ParamSpec('b', 'b', 'AD тал', 4),
        ParamSpec('alpha', r'\alpha', 'A өнцөг', 60, kind: _ang),
      ];
    case PlaneShape.rhombus:
      return const [ParamSpec('a', 'a', 'Тал', 5), ParamSpec('alpha', r'\alpha', 'A өнцөг', 60, kind: _ang)];
    case PlaneShape.trapezoid:
      return const [
        ParamSpec('a', 'a', 'Доод суурь', 8),
        ParamSpec('b', 'b', 'Дээд суурь', 4),
        ParamSpec('h', 'h', 'Өндөр', 3),
      ];
    case PlaneShape.circle:
      return const [ParamSpec('r', 'r', 'Радиус', 4), ParamSpec('theta', r'\theta', 'Төв өнцөг', 100, kind: _ang)];
    case PlaneShape.polygon:
      return const [ParamSpec('n', 'n', 'Өнцгийн тоо', 6, kind: MathInputKind.integer), ParamSpec('a', 'a', 'Тал', 3)];
  }
}

/* ---------------- Зургийн туслах ---------------- */

class _Ctx {
  final prims = <Prim>[];
  final metrics = <Metric>[];

  void outline(List<Pt> pts, List<String> names) {
    prims.add(PolyPrim(pts));
    final g = centroidOf(pts);
    for (var i = 0; i < pts.length; i++) {
      prims.add(LabelPrim(pts[i], names[i], away: g));
    }
  }

  void side(Pt a, Pt b, Pt inside, double value) => prims.add(SidePrim(a, b, lenLabel(value), inside));

  void angle(Pt prev, Pt v, Pt next, double deg, {int arcs = 1, bool text = true}) {
    if ((deg - 90).abs() < 1e-9) {
      prims.add(AnglePrim(v, prev, next, right: true));
      return;
    }
    prims.add(AnglePrim(v, prev, next, degrees: text ? deg : null, arcs: math.max(1, arcs)));
  }

  void ticks(List<(Pt, Pt)> pairs, List<int> groups) {
    for (var i = 0; i < pairs.length; i++) {
      if (groups[i] > 0) prims.add(TicksPrim(pairs[i].$1, pairs[i].$2, groups[i]));
    }
  }

  /// Өндөр: from цэгээс ab шулуун руу (тасархай + тэгш өнцгийн тэмдэг + H).
  void height(Pt from, Pt a, Pt b, {String name = 'H', String? sub}) {
    final h = foot(from, a, b);
    final t = paramOn(h, a, b);
    if (t < -1e-9 || t > 1 + 1e-9) {
      prims.add(SegPrim(t < 0 ? a : b, h, tone: Tone.dim, dash: true, width: 1.4));
    }
    prims.add(SegPrim(from, h, tone: Tone.brand, dash: true, width: 1.6));
    final other = dist(h, a) > 1e-9 ? a : b;
    prims.add(AnglePrim(h, other, from, right: true));
    prims.add(DotPrim(h, tone: Tone.brand, radius: 2.5));
    prims.add(LabelPrim(h, name, sub: sub, dir: norm(h - from), tone: Tone.brand));
  }

  /// Оройгоос эсрэг талын дунд хүртэлх медиан (хоёр хагас нь тэнцүү зураастай).
  void median(Pt from, Pt a, Pt b, String name, int idx) {
    final m = mid(a, b);
    prims.add(SegPrim(from, m, tone: Tone.brand, width: 1.8));
    prims.add(TicksPrim(a, m, idx));
    prims.add(TicksPrim(m, b, idx));
    prims.add(DotPrim(m, tone: Tone.brand, radius: 2.5));
    prims.add(LabelPrim(m, name, sub: '1', dir: norm(m - from), tone: Tone.brand));
  }

  /// Оройн өнцгийн биссектрис (хоёр тэнцүү өнцөг нум).
  void bisector(Pt from, Pt a, Pt b, {String name = 'L', String? sub}) {
    final l = bisectorFoot(from, a, b);
    prims.add(SegPrim(from, l, tone: Tone.brand, width: 1.8));
    prims.add(AnglePrim(from, a, l));
    prims.add(AnglePrim(from, l, b));
    prims.add(DotPrim(l, tone: Tone.brand, radius: 2.5));
    prims.add(LabelPrim(l, name, sub: sub, dir: norm(l - from), tone: Tone.brand));
  }

  void push(String name, List<ResultRow> rows, {bool key = false}) => metrics.add(Metric(name, rows: rows, key: key));

  void metric(String name, String lhs, String subst, double value, {bool key = false}) =>
      push(name, [lenRow(lhs, subst, value)], key: key);

  void piMetric(String name, String lhs, String subst, double k, {bool key = false}) =>
      push(name, [piRow(lhs, subst, k)], key: key);
}

bool _near(double x, double y, [double tol = 1e-7]) => (x - y).abs() <= tol * math.max(1, math.max(x.abs(), y.abs()));

/* ---------------- Гурвалжин ---------------- */

/// Нэмэлт шугамууд: өндөр, медиан, биссектрис (A/B/C/бүгд оройгоос), багтсан ба багтаасан тойрог.
void _triExtras(_Ctx c, TriExtras ex, Pt a, Pt b, Pt cP, Tri t) {
  final verts = ex.from == TriVertex.all ? const [0, 1, 2] : [ex.from.index];
  final single = verts.length == 1;
  final p = [a, b, cP];
  for (final k in verts) {
    final v = p[k], u = p[(k + 1) % 3], w = p[(k + 2) % 3];
    final idx = k + 1;
    if (ex.height) {
      if (single) {
        c.height(v, u, w);
      } else {
        c.height(v, u, w, name: 'H', sub: '$idx');
      }
    }
    if (ex.median) c.median(v, u, w, const ['A', 'B', 'C'][k], idx);
    if (ex.bisector) {
      if (single) {
        c.bisector(v, u, w);
      } else {
        c.bisector(v, u, w, sub: '$idx');
      }
    }
  }
  final g = centroid(a, b, cP);
  if (ex.incircle) {
    final i = incenter(a, b, cP);
    final r = inradius(t.a, t.b, t.c);
    final f = foot(i, b, cP);
    c.prims
      ..add(CirclePrim(i, r, tone: Tone.brand, width: 1.8))
      ..add(SegPrim(i, f, tone: Tone.brand, dash: true, width: 1.4))
      ..add(SidePrim(i, f, 'r', cP, italic: true))
      ..add(DotPrim(i, tone: Tone.accent, radius: 2.5))
      ..add(LabelPrim(i, 'I', away: g, tone: Tone.accent));
  }
  if (ex.circumcircle) {
    final o = circumcenter(a, b, cP);
    if (o != null) {
      final r = circumradius(t.a, t.b, t.c);
      c.prims
        ..add(CirclePrim(o, r, tone: Tone.brand, width: 1.8))
        ..add(SegPrim(o, a, tone: Tone.brand, dash: true, width: 1.4))
        ..add(SidePrim(o, a, 'R', cP, italic: true))
        ..add(DotPrim(o, tone: Tone.accent, radius: 2.5))
        ..add(LabelPrim(o, 'O', away: g, tone: Tone.accent));
    }
  }
}

String triangleKindText(Tri t) {
  final maxA = [t.A, t.B, t.C].reduce(math.max);
  final byAngle = _near(maxA, 90)
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

TriResult _solveTri(PlaneShape s, TriMode m, Map<String, double> p) {
  double g(String k) => p[k] ?? double.nan;
  if (s == PlaneShape.right) {
    if (!(g('a') > 0 && g('b') > 0)) return const TriResult.bad('Катетын урт эерэг тоо байх ёстой');
    return solveSSS(g('a'), g('b'), math.sqrt(g('a') * g('a') + g('b') * g('b')));
  }
  switch (m) {
    case TriMode.sss:
      return solveSSS(g('a'), g('b'), g('c'));
    case TriMode.sas:
      return solveSAS(g('b'), g('A'), g('c'));
    case TriMode.asa:
      return solveASA(g('B'), g('a'), g('C'));
    case TriMode.iso:
      final r = solveSSS(g('a'), g('b'), g('b'));
      if (!r.ok && g('a') > 0 && g('b') > 0) {
        return const TriResult.bad('Хажуу талын хоёрын нийлбэр сууриас их байх ёстой', '2b>a');
      }
      return r;
    case TriMode.equi:
      return solveSSS(g('a'), g('a'), g('a'));
  }
}

Built _buildTriangle(PlaneShape shape, TriMode mode, Map<String, double> p, TriExtras ex) {
  final r = _solveTri(shape, mode, p);
  if (!r.ok) return Built.bad(r.reason!, r.tex);
  final t = r.tri!;
  final pl = placeTriangle(t.a, t.b, t.c);
  final a = pl.A, b = pl.B, cP = pl.C;
  final c = _Ctx();
  final g = centroid(a, b, cP);
  c.outline([a, b, cP], const ['A', 'B', 'C']);
  final sides = equalGroups([t.a, t.b, t.c]);
  c.side(b, cP, g, t.a);
  c.side(cP, a, g, t.b);
  c.side(a, b, g, t.c);
  c.ticks([(b, cP), (cP, a), (a, b)], sides);
  final angG = equalGroups([t.A, t.B, t.C]);
  c.angle(b, a, cP, t.A, arcs: angG[0]);
  c.angle(cP, b, a, t.B, arcs: angG[1]);
  c.angle(a, cP, b, t.C, arcs: angG[2]);
  // Нэмэлт шугам байхгүй үед A оройн өндөр — тооцооны h-тэй холбоотой.
  if (shape != PlaneShape.right && !ex.height) c.height(a, b, cP);
  _triExtras(c, ex, a, b, cP, t);

  final s = heron(t.a, t.b, t.c);
  final per = t.a + t.b + t.c;
  final pp = per / 2;
  String sinOf(double x) => '\\sin ${degTex(x)}';
  final na = num(t.a), nb = num(t.b), nc = num(t.c), nS = num(s);
  final isRight = shape == PlaneShape.right;
  if (isRight) {
    c.metric('Гипотенуз (Пифагор)', 'c', '\\sqrt{a^2+b^2}=\\sqrt{$na^2+$nb^2}', t.c, key: true);
  } else {
    switch (mode) {
      case TriMode.sas:
        c.metric(
          'a тал (косинусын теорем)',
          'a',
          '\\sqrt{b^2+c^2-2bc\\cos A}=\\sqrt{$nb^2+$nc^2-2\\cdot $nb\\cdot $nc\\cos ${degTex(t.A)}}',
          t.a,
          key: true,
        );
      case TriMode.asa:
        c.push('Гурав дахь өнцөг', [
          angRow(r'\angle A', '180^\\circ-\\angle B-\\angle C=180^\\circ-${degTex(t.B)}-${degTex(t.C)}', t.A),
        ], key: true);
        c.metric(
          'b тал (синусын теорем)',
          'b',
          '\\frac{a\\sin B}{\\sin A}=\\frac{$na\\cdot ${sinOf(t.B)}}{${sinOf(t.A)}}',
          t.b,
        );
        c.metric(
          'c тал (синусын теорем)',
          'c',
          '\\frac{a\\sin C}{\\sin A}=\\frac{$na\\cdot ${sinOf(t.C)}}{${sinOf(t.A)}}',
          t.c,
        );
      case TriMode.iso:
        c.metric(
          'Суурь руу буусан өндөр',
          'h_a',
          '\\sqrt{b^2-\\frac{a^2}{4}}=\\sqrt{$nb^2-\\frac{$na^2}{4}}',
          math.sqrt(t.b * t.b - t.a * t.a / 4),
          key: true,
        );
      default:
        break;
    }
  }
  c.metric('Периметр', 'P', 'a+b+c=$na+$nb+$nc', per, key: true);
  var areaKey = true;
  if (isRight) {
    c.metric('Талбай', 'S', '\\frac{ab}{2}=\\frac{$na\\cdot $nb}{2}', s, key: true);
  } else if (mode == TriMode.equi) {
    c.metric('Талбай', 'S', '\\frac{\\sqrt{3}}{4}a^2=\\frac{\\sqrt{3}}{4}\\cdot $na^2', s, key: true);
  } else if (mode == TriMode.sas) {
    c.metric('Талбай', 'S', '\\frac{1}{2}bc\\sin A=\\frac{1}{2}\\cdot $nb\\cdot $nc\\cdot ${sinOf(t.A)}', s, key: true);
  } else if (mode == TriMode.iso) {
    c.metric(
      'Талбай',
      'S',
      '\\frac{1}{2}a\\,h_a=\\frac{1}{2}\\cdot $na\\cdot ${num(math.sqrt(t.b * t.b - t.a * t.a / 4))}',
      s,
      key: true,
    );
  } else if (mode == TriMode.asa) {
    c.metric('Талбай', 'S', '\\frac{1}{2}ab\\sin C=\\frac{1}{2}\\cdot $na\\cdot $nb\\cdot ${sinOf(t.C)}', s, key: true);
  } else {
    areaKey = false;
  }
  c.push('Талбай (Герон)', [
    lenRow('p', '\\frac{a+b+c}{2}=\\frac{${num(per)}}{2}', pp),
    lenRow(
      'S',
      '\\sqrt{p(p-a)(p-b)(p-c)}=\\sqrt{${num(pp)}\\cdot ${num(pp - t.a)}\\cdot ${num(pp - t.b)}\\cdot ${num(pp - t.c)}}',
      s,
    ),
  ], key: !areaKey);
  c.push('Талууд', [lenRow('a', '', t.a), lenRow('b', '', t.b), lenRow('c', '', t.c)]);
  c.push('Өнцгүүд', [
    angRow(r'\angle A', '', t.A),
    angRow(r'\angle B', '', t.B),
    angRow(r'\angle C', '', t.C),
  ], key: mode != TriMode.equi && mode != TriMode.asa);
  c.push('Өндрүүд', [
    lenRow('h_a', '\\frac{2S}{a}=\\frac{2\\cdot $nS}{$na}', 2 * s / t.a),
    lenRow('h_b', '\\frac{2S}{b}=\\frac{2\\cdot $nS}{$nb}', 2 * s / t.b),
    lenRow('h_c', '\\frac{2S}{c}=\\frac{2\\cdot $nS}{$nc}', 2 * s / t.c),
  ]);
  c.push('Медианууд', [
    lenRow('m_a', '\\frac{1}{2}\\sqrt{2b^2+2c^2-a^2}', medianTo(t.a, t.b, t.c)),
    lenRow('m_b', '\\frac{1}{2}\\sqrt{2a^2+2c^2-b^2}', medianTo(t.b, t.c, t.a)),
    lenRow('m_c', '\\frac{1}{2}\\sqrt{2a^2+2b^2-c^2}', medianTo(t.c, t.a, t.b)),
  ]);
  c.push('Биссектрисууд', [
    lenRow('l_a', '\\frac{\\sqrt{bc((b+c)^2-a^2)}}{b+c}', bisectorTo(t.a, t.b, t.c)),
    lenRow('l_b', '\\frac{\\sqrt{ac((a+c)^2-b^2)}}{a+c}', bisectorTo(t.b, t.c, t.a)),
    lenRow('l_c', '\\frac{\\sqrt{ab((a+b)^2-c^2)}}{a+b}', bisectorTo(t.c, t.a, t.b)),
  ]);
  c.metric('Багтсан тойргийн радиус', 'r', '\\frac{S}{p}=\\frac{$nS}{${num(pp)}}', s / pp);
  c.metric(
    'Багтаасан тойргийн радиус',
    'R',
    '\\frac{abc}{4S}=\\frac{$na\\cdot $nb\\cdot $nc}{4\\cdot $nS}',
    t.a * t.b * t.c / (4 * s),
  );
  c.metrics.add(Metric('Төрөл', text: triangleKindText(t), key: true));
  return Built.ok(c.prims, c.metrics);
}

/* ---------------- Дөрвөн өнцөгт ---------------- */

Built _buildRectangle(double w, double h, bool square) {
  if (!(w > 0 && h > 0)) return const Built.bad('Талын урт эерэг тоо байх ёстой');
  final pts = [const Pt(0, 0), Pt(w, 0), Pt(w, h), Pt(0, h)];
  final c = _Ctx();
  c.outline(pts, const ['A', 'B', 'C', 'D']);
  final g = centroidOf(pts);
  for (var i = 0; i < 4; i++) {
    c.prims.add(AnglePrim(pts[i], pts[(i + 3) % 4], pts[(i + 1) % 4], right: true));
  }
  c.prims.add(SegPrim(pts[0], pts[2], tone: Tone.dim, dash: true, width: 1.4));
  c.side(pts[0], pts[1], g, w);
  if (square) {
    c.ticks([(pts[0], pts[1]), (pts[1], pts[2]), (pts[2], pts[3]), (pts[3], pts[0])], const [1, 1, 1, 1]);
  } else {
    c.side(pts[1], pts[2], g, h);
  }
  final d = math.sqrt(w * w + h * h);
  if (square) {
    c.metric('Периметр', 'P', '4a=4\\cdot ${num(w)}', 4 * w, key: true);
    c.metric('Талбай', 'S', 'a^2=${num(w)}^2', w * w, key: true);
    c.metric('Диагональ', 'd', 'a\\sqrt{2}=${num(w)}\\sqrt{2}', d, key: true);
    c.metric('Багтсан тойргийн радиус', 'r', '\\frac{a}{2}=\\frac{${num(w)}}{2}', w / 2);
    c.metric('Багтаасан тойргийн радиус', 'R', '\\frac{d}{2}=\\frac{a\\sqrt{2}}{2}', d / 2);
  } else {
    c.metric('Периметр', 'P', '2(a+b)=2(${num(w)}+${num(h)})', 2 * (w + h), key: true);
    c.metric('Талбай', 'S', 'ab=${num(w)}\\cdot ${num(h)}', w * h, key: true);
    c.metric('Диагональ', 'd', '\\sqrt{a^2+b^2}=\\sqrt{${num(w)}^2+${num(h)}^2}', d, key: true);
    c.metric('Багтаасан тойргийн радиус', 'R', '\\frac{d}{2}', d / 2);
  }
  return Built.ok(c.prims, c.metrics);
}

Built _buildParallelogram(double a, double b, double alpha, {required bool rhombus}) {
  if (!(a > 0 && b > 0)) return const Built.bad('Талын урт эерэг тоо байх ёстой');
  if (!(alpha > 0 && alpha < 180)) {
    return const Built.bad('Өнцөг 0-ээс их, 180-аас бага байх ёстой', r'0^\circ<\alpha<180^\circ');
  }
  final pts = parallelogram(a, b, alpha);
  final c = _Ctx();
  final g = centroidOf(pts);
  c.outline(pts, const ['A', 'B', 'C', 'D']);
  final beta = 180 - alpha;
  final isRect = _near(alpha, 90);
  final groups = isRect ? const [0, 0, 0, 0] : const [1, 2, 1, 2];
  final angs = [alpha, beta, alpha, beta];
  for (var i = 0; i < 4; i++) {
    c.angle(pts[(i + 3) % 4], pts[i], pts[(i + 1) % 4], angs[i], arcs: groups[i], text: i < 2);
  }
  c.side(pts[0], pts[1], g, a);
  if (rhombus) {
    c.ticks([(pts[0], pts[1]), (pts[1], pts[2]), (pts[2], pts[3]), (pts[3], pts[0])], const [1, 1, 1, 1]);
  } else {
    c.side(pts[3], pts[0], g, b);
  }
  if (!isRect) c.height(pts[3], pts[0], pts[1]);
  final h = b * math.sin(toRad(alpha));
  final d1 = math.sqrt(a * a + b * b + 2 * a * b * math.cos(toRad(alpha)));
  final d2 = math.sqrt(math.max(0, a * a + b * b - 2 * a * b * math.cos(toRad(alpha))));
  if (rhombus) {
    c.metric('Периметр', 'P', '4a=4\\cdot ${num(a)}', 4 * a, key: true);
    c.metric(
      'Талбай',
      'S',
      'a^2\\sin\\alpha=${num(a)}^2\\cdot\\sin ${degTex(alpha)}',
      a * a * math.sin(toRad(alpha)),
      key: true,
    );
    c.metric('Өндөр', 'h', 'a\\sin\\alpha=${num(a)}\\cdot\\sin ${degTex(alpha)}', h, key: true);
    c.push('Диагоналиуд', [lenRow('d_1', 'AC', d1), lenRow('d_2', 'BD', d2)], key: true);
    c.metric('Талбай (диагоналиар)', 'S', '\\frac{d_1d_2}{2}', d1 * d2 / 2);
    c.metric('Багтсан тойргийн радиус', 'r', '\\frac{h}{2}', h / 2);
  } else {
    c.metric('Периметр', 'P', '2(a+b)=2(${num(a)}+${num(b)})', 2 * (a + b), key: true);
    c.metric('Өндөр', 'h', 'b\\sin\\alpha=${num(b)}\\cdot\\sin ${degTex(alpha)}', h, key: true);
    c.metric(
      'Талбай',
      'S',
      'ah=ab\\sin\\alpha=${num(a)}\\cdot ${num(b)}\\cdot\\sin ${degTex(alpha)}',
      a * h,
      key: true,
    );
    c.metric('Урт диагональ', 'd_1', '\\sqrt{a^2+b^2+2ab\\cos\\alpha}', d1);
    c.metric('Богино диагональ', 'd_2', '\\sqrt{a^2+b^2-2ab\\cos\\alpha}', d2);
  }
  c.push('Өнцгүүд', [angRow(r'\alpha', '', alpha), angRow(r'\beta', '180^\\circ-\\alpha', beta)]);
  return Built.ok(c.prims, c.metrics);
}

Built _buildTrapezoid(double a, double b, double h, TrapMode mode) {
  if (!(a > 0 && b > 0)) return const Built.bad('Суурийн урт эерэг тоо байх ёстой');
  if (!(h > 0)) return const Built.bad('Өндөр эерэг тоо байх ёстой');
  final off = mode == TrapMode.iso ? (a - b) / 2 : 0.0;
  final pts = trapezoidPts(a, b, off, h);
  final pa = pts[0], pb = pts[1], pc = pts[2], pd = pts[3];
  final c = _Ctx();
  final g = centroidOf(pts);
  c.outline(pts, const ['A', 'B', 'C', 'D']);
  final cLen = dist(pa, pb), dLen = dist(pc, pd);
  final iso = _near(cLen, dLen);
  final angs = [angleAt(pb, pa, pd), angleAt(pa, pb, pc), angleAt(pb, pc, pd), angleAt(pc, pd, pa)].map(toDeg).toList();
  final ord = [pd, pa, pb, pc];
  for (var i = 0; i < 4; i++) {
    c.angle(ord[i], pts[i], pts[(i + 1) % 4], angs[i], arcs: iso ? const [1, 2, 2, 1][i] : 1, text: !iso || i < 2);
  }
  c.side(pd, pa, g, a);
  c.side(pb, pc, g, b);
  if (iso) c.ticks([(pa, pb), (pc, pd)], const [1, 1]);
  c.height(mode == TrapMode.right ? pc : pb, pa, pd);
  final m = (a + b) / 2;
  if (mode == TrapMode.iso) {
    c.metric(
      'Хажуу тал',
      'c',
      '\\sqrt{h^2+\\frac{(a-b)^2}{4}}=\\sqrt{${num(h)}^2+\\frac{${num((a - b).abs())}^2}{4}}',
      cLen,
      key: true,
    );
  } else {
    c.metric('Хажуу тал', 'c', 'h', cLen);
    c.metric('Хажуу тал', 'd', '\\sqrt{h^2+(a-b)^2}=\\sqrt{${num(h)}^2+${num((a - b).abs())}^2}', dLen, key: true);
  }
  c.metric('Дундаж шугам', 'm', '\\frac{a+b}{2}=\\frac{${num(a)}+${num(b)}}{2}', m, key: true);
  c.metric('Талбай', 'S', '\\frac{a+b}{2}\\cdot h=\\frac{${num(a)}+${num(b)}}{2}\\cdot ${num(h)}', m * h, key: true);
  c.metric('Периметр', 'P', 'a+b+c+d=${num(a)}+${num(b)}+${num(cLen)}+${num(dLen)}', a + b + cLen + dLen, key: true);
  c.push('Диагоналиуд', [lenRow('AC', '', dist(pa, pc)), lenRow('BD', '', dist(pb, pd))]);
  c.push('Өнцгүүд', [
    angRow(r'\angle A', '', angs[0]),
    angRow(r'\angle B', '', angs[1]),
    angRow(r'\angle C', '', angs[2]),
    angRow(r'\angle D', '', angs[3]),
  ]);
  return Built.ok(c.prims, c.metrics);
}

/* ---------------- Зөв олон өнцөгт ---------------- */

const _names = 'ABCDEFGHIJKL';

Built _buildPolygon(double nRaw, double a) {
  final n = nRaw.round();
  if (!(n >= 3 && n <= 12) || (nRaw - n).abs() > 1e-9) {
    return const Built.bad('Өнцгийн тоо 3-аас 12 хүртэлх бүхэл тоо байна');
  }
  if (!(a > 0)) return const Built.bad('Талын урт эерэг тоо байх ёстой');
  final rp = regularPolygon(n, a);
  final c = _Ctx();
  c.outline(rp.pts, [for (var i = 0; i < n; i++) _names[i]]);
  const o = Pt(0, 0);
  c.ticks([for (var i = 0; i < n; i++) (rp.pts[i], rp.pts[(i + 1) % n])], List.filled(n, 1));
  c.side(rp.pts[0], rp.pts[1], o, a);
  c.prims.add(SegPrim(o, rp.pts[1], tone: Tone.brand, dash: true, width: 1.4));
  c.prims.add(SegPrim(o, mid(rp.pts[0], rp.pts[1]), tone: Tone.dim, dash: true, width: 1.4));
  c.prims.add(const DotPrim(o, tone: Tone.brand, radius: 2.5));
  c.prims.add(const LabelPrim(o, 'O', dir: Pt(-0.6, 0.8), tone: Tone.brand));
  c.angle(rp.pts[n - 1], rp.pts[0], rp.pts[1], rp.interior);
  final tg = '\\operatorname{tg}\\frac{180^\\circ}{$n}';
  c.metric('Периметр', 'P', 'na=$n\\cdot ${num(a)}', rp.P, key: true);
  c.metric('Талбай', 'S', '\\frac{na^2}{4$tg}=\\frac{$n\\cdot ${num(a)}^2}{4$tg}', rp.S, key: true);
  if (n == 6) {
    c.metric('Талбай (зургаан өнцөгт)', 'S', '\\frac{3\\sqrt{3}}{2}a^2=\\frac{3\\sqrt{3}}{2}\\cdot ${num(a)}^2', rp.S);
  }
  c.push('Дотоод өнцөг', [
    angRow(r'\alpha', '\\frac{180^\\circ(n-2)}{n}=\\frac{180^\\circ\\cdot ${n - 2}}{$n}', rp.interior),
  ], key: true);
  c.metric('Багтаасан тойргийн радиус', 'R', '\\frac{a}{2\\sin\\frac{180^\\circ}{$n}}', rp.R);
  c.metric('Багтсан тойргийн радиус (апофем)', 'r', '\\frac{a}{2$tg}', rp.r);
  c.push('Төв өнцөг', [angRow(r'\varphi', '\\frac{360^\\circ}{n}=\\frac{360^\\circ}{$n}', rp.central)]);
  c.push('Диагоналийн тоо', [lenRow('N', '\\frac{n(n-3)}{2}=\\frac{$n\\cdot ${n - 3}}{2}', n * (n - 3) / 2)]);
  return Built.ok(c.prims, c.metrics);
}

/* ---------------- Тойрог ---------------- */

Built _buildCircle(double r, double th) {
  if (!(r > 0)) return const Built.bad('Радиус эерэг тоо байх ёстой');
  if (!(th > 0 && th < 360)) {
    return const Built.bad('Төв өнцөг 0-ээс их, 360-аас бага байх ёстой', r'0^\circ<\theta<360^\circ');
  }
  const o = Pt(0, 0);
  final c = _Ctx();
  final a0 = toRad(-90 - th / 2), a1 = toRad(-90 + th / 2);
  final pa = polar(o, r, a0), pb = polar(o, r, a1);
  c.prims.add(SectorPrim(o, r, a0, a1));
  c.prims.add(CirclePrim(o, r));
  c.prims.add(SegPrim(o, pa, tone: Tone.brand, width: 1.8));
  c.prims.add(SegPrim(o, pb, tone: Tone.brand, width: 1.8));
  c.prims.add(SegPrim(pa, pb, tone: Tone.dim, dash: true, width: 1.4));
  final k = polar(o, r, toRad(130));
  c.prims.add(SegPrim(o, k, width: 1.8));
  c.prims.add(SidePrim(o, k, 'r', const Pt(1, -1), italic: true));
  c.prims.add(AnglePrim(o, pa, pb, degrees: th));
  for (final (p, n) in [(o, 'O'), (pa, 'A'), (pb, 'B'), (k, 'K')]) {
    c.prims.add(DotPrim(p, radius: 3));
    c.prims.add(LabelPrim(p, n, away: n == 'O' ? const Pt(0, -1) : o));
  }
  final rT = num(r);
  c.metric('Диаметр', 'd', '2r=2\\cdot $rT', 2 * r, key: true);
  c.piMetric('Тойргийн урт', 'C', '2\\pi r=2\\pi\\cdot $rT', 2 * r, key: true);
  c.piMetric('Дугуйн талбай', 'S', '\\pi r^2=\\pi\\cdot $rT^2', r * r, key: true);
  c.push('Төв өнцөг', [angRow(r'\angle AOB', r'\theta', th)]);
  c.metric('Хөвч', 'AB', '2r\\sin\\frac{\\theta}{2}=2\\cdot $rT\\cdot\\sin ${degTex(th / 2)}', chordLength(r, th));
  c.piMetric(
    'Нумын урт',
    'l',
    '\\frac{\\pi r\\theta}{180^\\circ}=\\frac{\\pi\\cdot $rT\\cdot ${num(th)}}{180}',
    r * th / 180,
  );
  c.piMetric(
    'Секторын талбай',
    'S_{AOB}',
    '\\frac{\\pi r^2\\theta}{360^\\circ}=\\frac{\\pi\\cdot $rT^2\\cdot ${num(th)}}{360}',
    r * r * th / 360,
  );
  c.metric(
    'Сегментийн талбай',
    'S',
    '\\frac{r^2}{2}\\left(\\frac{\\pi\\theta}{180^\\circ}-\\sin\\theta\\right)',
    segmentArea(r, th),
  );
  return Built.ok(c.prims, c.metrics);
}

/// Нэгдсэн оролт. Утга дутуу (NaN) бол тайлбартай алдаа.
Built buildPlane(
  PlaneShape s,
  Map<String, double> p, {
  TriMode tri = TriMode.sss,
  TrapMode trap = TrapMode.iso,
  TriExtras extras = const TriExtras(),
}) {
  for (final spec in paramSpecs(s, tri: tri, trap: trap)) {
    final v = p[spec.key];
    if (v == null || !v.isFinite) return Built.bad('${spec.name}: утгаа бичнэ үү');
  }
  double g(String k) => p[k]!;
  switch (s) {
    case PlaneShape.triangle:
    case PlaneShape.right:
      return _buildTriangle(s, tri, p, extras);
    case PlaneShape.rectangle:
      return _buildRectangle(g('a'), g('b'), false);
    case PlaneShape.square:
      return _buildRectangle(g('a'), g('a'), true);
    case PlaneShape.parallelogram:
      return _buildParallelogram(g('a'), g('b'), g('alpha'), rhombus: false);
    case PlaneShape.rhombus:
      return _buildParallelogram(g('a'), g('a'), g('alpha'), rhombus: true);
    case PlaneShape.trapezoid:
      return _buildTrapezoid(g('a'), g('b'), g('h'), trap);
    case PlaneShape.circle:
      return _buildCircle(g('r'), g('theta'));
    case PlaneShape.polygon:
      return _buildPolygon(g('n'), g('a'));
  }
}
