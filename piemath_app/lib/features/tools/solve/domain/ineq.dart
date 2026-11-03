// Нэг хувьсагчтай тэнцэтгэл биш — интервалын арга (вэбийн `solve/ineq.ts`).
//
// F = L - R-ийн тэг, тасралтын цэгүүдээр тоон шулууныг хувааж, завсар бүрийн
// тэмдгийг тогтооно. Хилийн цэг бүрийг ЯГ утгаар шалгаж оруулах эсэхийг шийднэ.
import 'equation.dart';
import 'exact.dart';
import 'expr_ext.dart';
import 'poly.dart';
import 'q.dart';
import 'roots.dart';
import 'steps.dart';

class Piece {
  const Piece({required this.a, required this.b, required this.aClosed, required this.bClosed});

  /// null = -∞ / +∞
  final Root? a;
  final Root? b;
  final bool aClosed;
  final bool bClosed;
}

String opTex(RelOp op) => relOpTex(op);

RelOp flipOp(RelOp op) => switch (op) {
  RelOp.lt => RelOp.gt,
  RelOp.gt => RelOp.lt,
  RelOp.le => RelOp.ge,
  RelOp.ge => RelOp.le,
  RelOp.eq => RelOp.eq,
};

bool _sat(double s, RelOp op) {
  if (s.isNaN) return false;
  return switch (op) {
    RelOp.lt => s < 0,
    RelOp.gt => s > 0,
    RelOp.le => s <= 0,
    RelOp.ge => s >= 0,
    RelOp.eq => s == 0,
  };
}

/// Завсрын нэгдлийг LaTeX: (-\infty;-2)\cup[1;+\infty)
String piecesTex(List<Piece> ps) {
  if (ps.isEmpty) return r'\varnothing';
  return ps
      .map((p) {
        if (p.a != null && p.b != null && p.aClosed && p.bClosed && (p.a!.v - p.b!.v).abs() < 1e-12) {
          return '\\left\\{${p.a!.tex}\\right\\}';
        }
        final l = p.a != null ? '${p.aClosed ? r'\left[' : r'\left('}${p.a!.tex}' : r'\left(-\infty';
        final r = p.b != null ? '${p.b!.tex}${p.bClosed ? r'\right]' : r'\right)'}' : r'+\infty\right)';
        return '$l;\\ $r';
      })
      .join(r'\cup ');
}

/// Тасралт / тодорхойлогдох мужийн хилийн илэрхийллүүд.
List<Expr> breakExprs(Expr f, String v) {
  final out = <Expr>[];
  collect(f, (n) {
    if (n.kind == ExprKind.div && dep(n.b!, v)) out.add(n.b!);
    if (n.kind == ExprKind.call &&
        const ['sqrt', 'ln', 'lg', 'abs', 'tan', 'cot'].contains(n.name) &&
        dep(n.args[0], v)) {
      out.add(n.args[0]);
    }
    if (n.kind == ExprKind.call && (n.name == 'log' || n.name == 'root') && dep(n.args[1], v)) out.add(n.args[1]);
    if (n.kind == ExprKind.pow && dep(n.a!, v) && !dep(n.b!, v)) out.add(n.a!);
    return false;
  });
  return out;
}

class SignAnalysis {
  const SignAnalysis({required this.points, required this.signs, required this.pointSigns, required this.zeros});
  final List<Root> points;

  /// завсар бүрийн тэмдэг (+1, -1, 0, NaN), points.length + 1
  final List<double> signs;

  /// цэг бүрийн утгын тэмдэг (NaN = тодорхойгүй)
  final List<double> pointSigns;
  final List<Root> zeros;
}

/// F-ийн тэмдгийн хүснэгт. Чадахгүй бол null.
SignAnalysis? signAnalysis(Expr f, String v, bool degrees, [List<Step>? zeroSteps]) {
  final z = findZeros(f, EqCtx(v: v, degrees: degrees, steps: zeroSteps ?? <Step>[], quiet: zeroSteps == null, depth: 0));
  if (z.kind != ZerosKind.finite || !z.complete) return null;
  final pts = <Root>[...z.roots];
  for (final s in z.segments ?? const <Segment>[]) {
    pts
      ..add(s.a)
      ..add(s.b);
  }
  for (final e in breakExprs(f, v)) {
    if (e.kind == ExprKind.call && (e.name == 'tan' || e.name == 'cot')) return null;
    final bz = findZeros(e, EqCtx(v: v, degrees: degrees, steps: <Step>[], quiet: true, depth: 0));
    if (bz.kind != ZerosKind.finite || !bz.complete) {
      // хувьсагчгүй эсвэл тэггүй хил — зүгээр
      if (bz.kind == ZerosKind.finite && bz.all) continue;
      return null;
    }
    pts.addAll(bz.roots);
    for (final s in bz.segments ?? const <Segment>[]) {
      pts
        ..add(s.a)
        ..add(s.b);
    }
  }
  final points = mergeRoots(pts).map((r) => r.copy(mult: 1)).toList();
  final signs = <double>[];
  for (var i = 0; i <= points.length; i++) {
    final lo = i > 0 ? points[i - 1].v : null, hi = i < points.length ? points[i].v : null;
    final t = lo != null && hi != null
        ? (lo + hi) / 2
        : lo != null
        ? lo + (lo.abs() > 1 ? lo.abs() : 1)
        : hi != null
        ? hi - (hi.abs() > 1 ? hi.abs() : 1)
        : 0.5;
    final y = numAt(f, v, t, degrees);
    signs.add(y.isFinite ? (y.abs() < 1e-13 ? 0 : y.sign) : double.nan);
  }
  final zeroSet = z.roots;
  final pointSigns = points.map((p) {
    if (p.x != null) {
      final ex = exactAt(f, v, p.x!, degrees);
      if (ex.nan) return double.nan;
      if (ex.value != null) return isZero(ex.value!) ? 0.0 : xsign(ex.value!);
    }
    if (zeroSet.any((r) => (r.v - p.v).abs() < 1e-9 * (p.v.abs() > 1 ? p.v.abs() : 1))) return 0.0;
    final y = numAt(f, v, p.v, degrees);
    return y.isFinite ? y.sign : double.nan;
  }).toList();
  return SignAnalysis(points: points, signs: signs, pointSigns: pointSigns, zeros: z.roots);
}

/// Тэмдгийн хүснэгтээс хариуны завсрууд.
List<Piece> piecesFrom(SignAnalysis sa, RelOp op) {
  final points = sa.points;
  // (цэг эсэх, индекс, тохирох эсэх)
  final items = <(bool, int, bool)>[];
  for (var i = 0; i <= points.length; i++) {
    items.add((false, i, _sat(sa.signs[i], op)));
    if (i < points.length) items.add((true, i, _sat(sa.pointSigns[i], op)));
  }
  final out = <Piece>[];
  var k = 0;
  while (k < items.length) {
    if (!items[k].$3) {
      k++;
      continue;
    }
    var j = k;
    while (j + 1 < items.length && items[j + 1].$3) {
      j++;
    }
    final s = items[k], e = items[j];
    final a = s.$1 ? points[s.$2] : (s.$2 > 0 ? points[s.$2 - 1] : null);
    final b = e.$1 ? points[e.$2] : (e.$2 < points.length ? points[e.$2] : null);
    out.add(Piece(a: a, b: b, aClosed: s.$1, bClosed: e.$1));
    k = j + 1;
  }
  return out;
}

NumberLineData numberLineFrom(SignAnalysis sa, List<Piece> pieces) {
  String label(Root r) => r.x != null ? xlabel(r.x!) : jsStr(jsNumber(toFixed(r.v, 2)));
  final points = <NumberLinePoint>[
    for (var i = 0; i < sa.points.length; i++)
      NumberLinePoint(
        v: sa.points[i].v,
        label: label(sa.points[i]),
        filled:
            pieces.any(
              (pc) =>
                  (identical(pc.a, sa.points[i]) && pc.aClosed) || (identical(pc.b, sa.points[i]) && pc.bClosed),
            ) &&
            !sa.pointSigns[i].isNaN,
      ),
  ];
  int? idx(Root? r) => r == null ? null : sa.points.indexWhere((p) => identical(p, r));
  final segments = <NumberLineSegment>[];
  final isolated = <int>[];
  for (final pc in pieces) {
    if (pc.a != null && pc.b != null && identical(pc.a, pc.b)) {
      isolated.add(idx(pc.a)!);
    } else {
      segments.add(NumberLineSegment(idx(pc.a), idx(pc.b)));
    }
  }
  final signs = sa.signs.map((s) => s > 0 ? '+' : (s < 0 ? '-' : '')).toList();
  return NumberLineData(points: points, segments: segments, signs: signs, isolated: isolated);
}

/* ---------- Дээд түвшин ---------- */

Solution solveInequality(Expr lhs, RelOp op, Expr rhs, {String? v, bool degrees = false}) {
  final problem = relTex(Relation(lhs, op, rhs));
  final pv = pickVar([lhs, rhs], v);
  final vv = pv.v;
  if (vv == null) return failure('Тэнцэтгэл бишид үл мэдэгдэгч алга');
  if (pv.extra.isNotEmpty) {
    return failure('Нэг үл мэдэгдэгчтэй тэнцэтгэл биш оруулна уу (\$${pv.extra.join(r',\ ')}\$ илүү байна)');
  }
  final f = N.sub(lhs, rhs);
  final steps = <Step>[];
  final graph = [toAscii(lhs), toAscii(rhs)].indexed.where((e) => !(e.$1 == 1 && e.$2 == '0')).map((e) => e.$2).toList();
  final p = polyFrom(f, vv);
  var title = 'Тэнцэтгэл биш';
  final hasAbs = collect(f, (n) => n.kind == ExprKind.call && n.name == 'abs' && dep(n, vv)).isNotEmpty;
  final hasRad = collect(
    f,
    (n) => n.kind == ExprKind.call && (n.name == 'sqrt' || n.name == 'root') && dep(n, vv),
  ).isNotEmpty;
  final hasLogExp = collect(
    f,
    (n) =>
        (n.kind == ExprKind.call && const ['ln', 'lg', 'log', 'exp'].contains(n.name) && dep(n, vv)) ||
        (n.kind == ExprKind.pow && dep(n.b!, vv)),
  ).isNotEmpty;
  final hasTrig = collect(
    f,
    (n) => n.kind == ExprKind.call && const ['sin', 'cos', 'tan', 'cot'].contains(n.name) && dep(n, vv),
  ).isNotEmpty;
  if (hasTrig) {
    return failure('$cannot: тригонометрийн тэнцэтгэл бишийг одоогоор бодохгүй').copyWith(problem: problem, graph: graph);
  }

  final linear = p != null && deg(p) == 1;
  // Шугаман: тусгай тодорхой алхам
  if (linear) {
    final b = p[0], a = p[1];
    final r = qdiv(qneg(b), a);
    final op2 = a.n < 0 ? flipOp(op) : op;
    final lines = ['${ptex(p, vv)} ${opTex(op)} 0'];
    if (!isZ(b)) lines.add('${ptex([qZero, a], vv)} ${opTex(op)} ${qTex(qneg(b))}');
    lines.add('$vv ${opTex(op2)} ${qTex(r)}');
    steps.add(
      Step(
        text: 'Шугаман тэнцэтгэл биш: үл мэдэгдэгчийг нэг талд шилжүүлээд коэффициентэд хуваана',
        tex: lines,
      ),
    );
    if (a.n < 0) {
      steps.add(const Step(text: 'Сөрөг тоонд хуваахад тэнцэтгэл бишийн тэмдэг эсрэгээр солигдоно', tone: Tone.note));
    }
    title = 'Шугаман тэнцэтгэл биш';
  }

  final zsteps = <Step>[];
  final sa = signAnalysis(f, vv, degrees, zsteps);
  if (sa == null) return failure(cannot, cannot, steps).copyWith(problem: problem, graph: graph);
  final pieces = piecesFrom(sa, op);

  if (!linear) {
    if (p != null && deg(p) == 2) {
      title = 'Квадрат тэнцэтгэл биш';
      steps
        ..add(Step(text: 'Харгалзах тэгшитгэл \$${ptex(p, vv)} = 0\$-ийг бодно'))
        ..addAll(zsteps);
      final a = p[2];
      steps.add(
        Step(
          text:
              '\$y = ${ptex(p, vv)}\$ парабол${a.n > 0 ? r'ын салаа дээшээ ($a>0$)' : r'ын салаа доошоо ($a<0$)'} тул тэмдэг нь язгууруудын хооронд ба гадна талд ялгаатай',
        ),
      );
    } else {
      if (hasAbs) {
        title = 'Модультай тэнцэтгэл биш';
      } else if (hasRad) {
        title = 'Иррациональ тэнцэтгэл биш';
      } else if (hasLogExp) {
        title = 'Үзүүлэнт, логарифм тэнцэтгэл биш';
      } else if (p != null) {
        title = '${deg(p)}-р зэргийн тэнцэтгэл биш';
      } else {
        title = 'Рационал тэнцэтгэл биш';
      }
      if (p == null && !hasAbs && !hasRad && !hasLogExp) title = 'Рационал тэнцэтгэл биш (интервалын арга)';
      steps
        ..add(Step(text: 'Зүүн тал руу шилжүүлбэл \$${toLatex(f)} ${opTex(op)} 0\$. Тэгтэй тэнцэх цэгүүдийг олно'))
        ..addAll(zsteps);
    }
    final crit = [
      for (var i = 0; i < sa.points.length; i++)
        '\$${sa.points[i].tex}\$ (${sa.pointSigns[i].isNaN ? 'тодорхойлогдохгүй' : (sa.pointSigns[i] == 0 ? 'тэг' : 'хил')})',
    ];
    if (sa.points.isNotEmpty) steps.add(Step(text: 'Тоон шулууныг хуваах цэгүүд: ${crit.join(', ')}'));
    final signTxt = [
      for (var i = 0; i < sa.signs.length; i++)
        () {
          final s = sa.signs[i];
          final lo = i > 0 ? sa.points[i - 1].tex : r'-\infty';
          final hi = i < sa.points.length ? sa.points[i].tex : r'+\infty';
          final st = s.isNaN ? 'тодорхойлогдохгүй' : (s > 0 ? r'$+$' : (s < 0 ? r'$-$' : r'$0$'));
          return '\$($lo;\\ $hi)\$: $st';
        }(),
    ];
    steps.add(Step(text: 'Завсар бүрт нэг цэгийг орлуулж тэмдгийг тогтооно: ${signTxt.join(', ')}'));
    if (op == RelOp.le || op == RelOp.ge) {
      steps.add(
        const Step(
          text: 'Тэнцэтгэл бишийн тэмдэг хатуу биш тул тэг болох цэгүүд орно (тасралтын цэг орохгүй)',
          tone: Tone.note,
        ),
      );
    }
  }

  final ans = piecesTex(pieces);
  final full = pieces.length == 1 && pieces[0].a == null && pieces[0].b == null;
  final answer = [full ? '$vv\\in\\mathbb{R}' : '$vv\\in $ans'];
  bool plainRational(X x) => x.length <= 1 && x.isNotEmpty && x[0].n == 1 && x[0].pi == 0 && x[0].e == 0;
  final ap = sa.points
      .where((x) => x.x != null && !plainRational(x.x!))
      .map((x) => '${x.tex} \\approx ${decTex(approx(x.x!), 4)}')
      .toList();
  final notes = <String>[];
  if (pieces.isEmpty) notes.add('Шийдгүй');
  if (sa.points.any((x) => x.x == null && x.tex.startsWith(r'\approx'))) {
    notes.add('Зарим хилийн цэгийг тоон аргаар (ойролцоогоор) олсон');
  }
  return Solution(
    ok: true,
    title: title,
    problem: problem,
    steps: steps,
    answer: answer,
    approx: ap.isNotEmpty ? ap : null,
    notes: notes.isNotEmpty ? notes : null,
    numberLine: numberLineFrom(sa, pieces),
    graph: graph,
  );
}
