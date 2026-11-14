// Бодолтын алхам, хариуны бүтэц ба LaTeX туслахууд (вэбийн `solve/steps.ts`).
import 'exact.dart';
import 'expr_ext.dart';
import 'q.dart';

/// Алхмын өнгө: ok — шалгалт тохирсон, bad — гаднах язгуур, note — анхааруулга.
enum Tone { ok, bad, note }

class Step {
  const Step({this.text, this.tex, this.tone});

  /// Тайлбар (дотор нь $...$ томьёо байж болно)
  final String? text;

  /// Тусдаа мөрийн томьёонууд
  final List<String>? tex;
  final Tone? tone;
}

class NumberLinePoint {
  const NumberLinePoint({required this.v, required this.label, required this.filled});
  final double v;
  final String label;

  /// дүүрэн (орно) эсвэл хоосон (орохгүй)
  final bool filled;
}

class NumberLineSegment {
  const NumberLineSegment(this.from, this.to);

  /// points-ийн индекс, null = ±inf
  final int? from;
  final int? to;
}

class NumberLineData {
  const NumberLineData({required this.points, required this.segments, this.signs, this.isolated});
  final List<NumberLinePoint> points;

  /// Будах хэсгүүд
  final List<NumberLineSegment> segments;

  /// Завсар бүрийн тэмдэг ('+', '-', ''), points.length+1 ширхэг
  final List<String>? signs;

  /// Ганц цэгүүд (тусгаарлагдсан шийд) — points-ийн индекс
  final List<int>? isolated;
}

class Solution {
  const Solution({
    required this.ok,
    required this.title,
    this.problem,
    required this.answer,
    this.approx,
    required this.steps,
    this.notes,
    this.numberLine,
    this.graph,
  });

  final bool ok;

  /// Бодлогын ангилал: «Квадрат тэгшитгэл»
  final String title;

  /// Бодлогыг LaTeX-ээр
  final String? problem;

  /// Хариу (LaTeX мөрүүд)
  final List<String> answer;

  /// Аравтын ойролцоо (LaTeX)
  final List<String>? approx;
  final List<Step> steps;

  /// Тэмдэглэл (бичвэр, $…$-тэй)
  final List<String>? notes;
  final NumberLineData? numberLine;

  /// «Графикт харах» — график хэрэгслийн илэрхийллүүд (ASCII)
  final List<String>? graph;

  static const _unset = Object();

  /// JS-ийн `{ ...sol, ... }`-тэй адил.
  Solution copyWith({
    bool? ok,
    String? title,
    Object? problem = _unset,
    List<String>? answer,
    Object? approx = _unset,
    List<Step>? steps,
    Object? notes = _unset,
    Object? numberLine = _unset,
    Object? graph = _unset,
  }) {
    return Solution(
      ok: ok ?? this.ok,
      title: title ?? this.title,
      problem: identical(problem, _unset) ? this.problem : problem as String?,
      answer: answer ?? this.answer,
      approx: identical(approx, _unset) ? this.approx : approx as List<String>?,
      steps: steps ?? this.steps,
      notes: identical(notes, _unset) ? this.notes : notes as List<String>?,
      numberLine: identical(numberLine, _unset) ? this.numberLine : numberLine as NumberLineData?,
      graph: identical(graph, _unset) ? this.graph : graph as List<String>?,
    );
  }
}

Solution failure(String message, [String title = 'Бодож чадсангүй', List<Step> steps = const []]) =>
    Solution(ok: false, title: title, answer: const [], steps: steps, notes: [message]);

const cannot = 'Энэ хэлбэрийг бодож чадсангүй';

/// Сөрөг бол хаалтанд: (-3).
String par(String s) => s.startsWith('-') ? '\\left($s\\right)' : s;
String qp(Q a) => par(qTex(a));

/// Аравтын тоог LaTeX-ээр (6 орон хүртэл).
String decTex(double v, [int digits = 6]) {
  if (!v.isFinite) return v > 0 ? r'+\infty' : (v < 0 ? r'-\infty' : r'\text{тодорхойгүй}');
  if (v.abs() < 1e-12) return '0';
  final a = v.abs();
  if (a >= 1e9 || a < 1e-5) {
    final parts = v.toStringAsExponential(digits - 1).split('e');
    return '${jsStr(jsNumber(parts[0]))}\\cdot 10^{${int.parse(parts[1])}}';
  }
  return fixedNum(v, digits);
}

/// Яг тоо, рационал биш бол «≈ аравтын» нэмнэ.
String xWithApprox(X x) {
  final t = xtex(x);
  return isRational(x) ? t : '$t\\approx ${decTex(approx(x), 4)}';
}

/* ---------- Модыг ASCII болгох (График хэрэгсэлд дамжуулна) ---------- */

int _prec(Expr n) => switch (n.kind) {
  ExprKind.add || ExprKind.sub => 1,
  ExprKind.mul || ExprKind.div => 2,
  ExprKind.neg => 3,
  ExprKind.pow => 4,
  ExprKind.fact => 5,
  _ => 6,
};

String toAscii(Expr n) {
  String wrap(Expr c, int p) {
    final s = toAscii(c);
    return _prec(c) < p || (c.kind == ExprKind.num && c.v < 0) ? '($s)' : s;
  }

  switch (n.kind) {
    case ExprKind.num:
      return isInteger(n.v) ? jsStr(n.v) : jsStr(jsNumber(n.v.toStringAsPrecision(12)));
    case ExprKind.sym:
      return n.name;
    case ExprKind.neg:
      return '-${wrap(n.a!, 3)}';
    case ExprKind.add:
      return '${toAscii(n.a!)}+${wrap(n.b!, 1)}';
    case ExprKind.sub:
      return '${toAscii(n.a!)}-${wrap(n.b!, 2)}';
    case ExprKind.mul:
      return '${wrap(n.a!, 2)}*${wrap(n.b!, 2)}';
    case ExprKind.div:
      return '${wrap(n.a!, 2)}/${wrap(n.b!, 3)}';
    case ExprKind.pow:
      return '${wrap(n.a!, 5)}^${wrap(n.b!, 5)}';
    case ExprKind.fact:
      return '${wrap(n.a!, 6)}!';
    case ExprKind.call:
      if (n.name == 'log') return 'log(${toAscii(n.args[0])},${toAscii(n.args[1])})';
      return '${n.name}(${n.args.map(toAscii).join(',')})';
  }
}

String relOpTex(RelOp op) => switch (op) {
  RelOp.eq => '=',
  RelOp.lt => '<',
  RelOp.gt => '>',
  RelOp.le => r'\le',
  RelOp.ge => r'\ge',
};

/// Харьцааг LaTeX (операторын хоёр талд зай).
String relTex(Relation r) => '${toLatex(r.lhs)} ${relOpTex(r.op)} ${toLatex(r.rhs)}';
