// Бодогчийн АВТОМАТ таних (вэбийн `solve/auto.ts`): нэг оруулга → төрөл ба тохирох
// үйлдлүүд. Хэрэглэгч горим сонгохгүй — анхдагч үйлдэл автоматаар, бусад нь чипээр.
import 'expr_ext.dart';
import 'implicit.dart';
import 'input.dart';
import 'mpoly.dart';
import 'solve.dart';
import 'steps.dart';

enum SolveAction { solve, calc, factor, expand, frac, div, deriv, int, defint, lim, study, prime, gcd }

enum InputKind {
  empty,
  number,
  intlist,
  equation,
  inequality,
  system,
  function,
  expression,
  calculus,
  invalid,

  /// x, y-тэй харьцаа — y-ээр шийдэгдэхгүй (тойрог г.м.): зөвхөн график
  implicit,
}

const actionLabel = <SolveAction, String>{
  SolveAction.solve: 'Бодох',
  SolveAction.calc: 'Бодох',
  SolveAction.factor: 'Задлах',
  SolveAction.expand: 'Хаалт задлах',
  SolveAction.frac: 'Хялбарчлах',
  SolveAction.div: 'Олон гишүүнт хуваах',
  SolveAction.deriv: 'Уламжлал',
  SolveAction.int: 'Интеграл',
  SolveAction.defint: 'Тодорхой интеграл',
  SolveAction.lim: 'Хязгаар',
  SolveAction.study: 'Функцийн судалгаа',
  SolveAction.prime: 'Анхны үржвэр',
  SolveAction.gcd: 'ХИЕХ, ХБЕХ',
};

class Analysis {
  const Analysis({
    required this.kind,
    this.actions = const [],
    this.primary = SolveAction.solve,
    this.body = '',
    this.extra = const {},
    this.graph = const [],
    this.inX = false,
    this.fromRelation,
  });

  final InputKind kind;

  /// Тохирох үйлдлүүд (чип), эхнийх нь анхдагч
  final List<SolveAction> actions;
  final SolveAction primary;

  /// Бодох бичвэр (функцэд y= -ийн баруун тал)
  final String body;
  final Map<String, String> extra;

  /// Графикт дамжуулж болох илэрхийллүүд
  final List<String> graph;

  /// Ганц хувьсагч x-ийн функц мөн эсэх
  final bool inX;

  /// x, y-тэй тэгшитгэлийг y-ээр илэрхийлсэн бол: (анхны харьцаа, y = …) LaTeX
  final (String, String)? fromRelation;
}

const _empty = Analysis(kind: InputKind.empty);

bool _hasVar(Expr n, [String? v]) {
  final s = freeSymbols(n);
  return v != null ? s.contains(v) : s.isNotEmpty;
}

/// Хаалт задлах хэрэгтэй юу: (…)(…), k(…), (…)^n — нийлбэр үржигдэхүүн дотор.
bool _needsExpand(Expr n) {
  bool isSum(Expr m) => (m.kind == ExprKind.add || m.kind == ExprKind.sub) && _hasVar(m);
  bool walk(Expr m) {
    switch (m.kind) {
      case ExprKind.mul:
        return isSum(m.a!) || isSum(m.b!) || walk(m.a!) || walk(m.b!);
      case ExprKind.pow:
        return (isSum(m.a!) && m.b!.kind == ExprKind.num) || walk(m.a!);
      case ExprKind.neg:
        return isSum(m.a!) || walk(m.a!);
      case ExprKind.add || ExprKind.sub || ExprKind.div:
        return walk(m.a!) || walk(m.b!);
      default:
        return false;
    }
  }

  return walk(n);
}

/// Хуваарьт хувьсагчтай бутархай байгаа эсэх.
bool _hasVarDenominator(Expr n) {
  switch (n.kind) {
    case ExprKind.div:
      return _hasVar(n.b!) || _hasVarDenominator(n.a!) || _hasVarDenominator(n.b!);
    case ExprKind.pow:
      return (n.b!.kind == ExprKind.neg || (n.b!.kind == ExprKind.num && n.b!.v < 0)) && _hasVar(n.a!);
    case ExprKind.add || ExprKind.sub || ExprKind.mul:
      return _hasVarDenominator(n.a!) || _hasVarDenominator(n.b!);
    case ExprKind.neg:
      return _hasVarDenominator(n.a!);
    default:
      return false;
  }
}

bool _isPoly(Expr n) => mfrom(n) != null;

const _calcActions = [SolveAction.deriv, SolveAction.int, SolveAction.study, SolveAction.lim];

Analysis _analyzeExpr(String text0, Expr node0) {
  var text = text0;
  var node = node0;
  final vars = freeSymbols(node).toList();
  if (vars.isEmpty) {
    final actions = [SolveAction.calc];
    final n = RegExp(r'^\s*\d+\s*$').hasMatch(text) ? double.tryParse(text.trim()) : null;
    if (n != null && n > 1 && n < 1e12) actions.add(SolveAction.prime);
    return Analysis(kind: InputKind.number, actions: actions, primary: SolveAction.calc, body: text);
  }
  final inX = vars.length == 1 && vars[0] == 'x';
  final graph = inX ? [toAscii(node)] : <String>[];
  final actions = <SolveAction>[];
  SolveAction primary;
  if (_isPoly(node)) {
    final deg = mtotalDeg(mfrom(node)!);
    final ex = _needsExpand(node);
    if (ex) actions.add(SolveAction.expand);
    if (deg >= 2) actions.add(SolveAction.factor);
    if (!ex && deg < 2) actions.add(SolveAction.expand);
    primary = actions[0];
  } else if (_hasVarDenominator(node)) {
    // x^{-1} → 1/x: олон гишүүнтүүдийн харьцаа болгож хураана
    final nd = negPowToDiv(node);
    if (!same(nd, node)) {
      text = toAscii(nd);
      node = nd;
    }
    actions.add(SolveAction.frac);
    if (node.kind == ExprKind.div && _isPoly(node.a!) && _isPoly(node.b!)) actions.add(SolveAction.div);
    primary = SolveAction.frac;
  } else {
    if (_needsExpand(node)) actions.add(SolveAction.expand);
    primary = inX ? SolveAction.deriv : (actions.isNotEmpty ? actions[0] : SolveAction.expand);
    if (actions.isEmpty && !inX) actions.add(SolveAction.expand);
  }
  if (inX) {
    for (final a in _calcActions) {
      if (!actions.contains(a)) actions.add(a);
    }
  }
  if (!actions.contains(primary)) actions.insert(0, primary);
  final ordered = [primary, ...actions.where((a) => a != primary)];
  return Analysis(
    kind: InputKind.expression,
    actions: ordered,
    primary: primary,
    body: text,
    graph: graph,
    inX: inX,
  );
}

/// y = f(x) (body нь зөвхөн x-ийн) → функцийн шинжилгээ.
Analysis _functionAnalysis(String bodyText, Expr n, [(String, String)? fromRelation]) {
  final a = _analyzeExpr(bodyText.trim(), n);
  final extraActs = a.actions.where(
    (x) => x != SolveAction.study && x != SolveAction.lim && x != SolveAction.expand && x != SolveAction.frac,
  );
  final acts = <SolveAction>[];
  for (final x in [SolveAction.study, ...extraActs, SolveAction.lim]) {
    if (!acts.contains(x)) acts.add(x);
  }
  return Analysis(
    kind: InputKind.function,
    actions: acts,
    primary: SolveAction.study,
    body: a.body,
    graph: [toAscii(n)],
    inX: true,
    fromRelation: fromRelation,
  );
}

/// «y = …» эсвэл «f(x) = …» хэлбэр.
final _funcRe = RegExp(r'^\s*(?:y|f\s*\(\s*x\s*\))\s*=(?![=<>])([\s\S]+)$');

Analysis analyzeInput(String text) {
  final src = text.trim();
  if (src.isEmpty) return _empty;

  // систем: олон мөр эсвэл «;»
  final lines = splitLines(src);
  if (lines.length > 1) {
    final allRel = lines.every((l) => RegExp('[=<>]').hasMatch(l));
    if (allRel) {
      var graph = <String>[];
      try {
        final ok = lines.every((l) {
          final r = parseRelation(prepare(l));
          if (r == null) return false;
          final vs = {...freeSymbols(r.lhs), ...freeSymbols(r.rhs)};
          return vs.every((v) => v == 'x' || v == 'y');
        });
        if (ok) graph = lines.map(prepare).toList();
      } catch (_) {
        graph = [];
      }
      return Analysis(
        kind: InputKind.system,
        actions: const [SolveAction.solve],
        body: lines.join('\n'),
        graph: graph,
      );
    }
  }

  // ХИЕХ: «12; 18», «12, 18, 30»
  if (RegExp(r'^\s*\d+(\s*[,;]\s*\d+)+\s*$').hasMatch(src)) {
    return Analysis(kind: InputKind.intlist, actions: const [SolveAction.gcd], primary: SolveAction.gcd, body: src);
  }

  // y = f(x)
  final fm = _funcRe.firstMatch(src);
  if (fm != null) {
    try {
      final n = parseExpr(prepare(fm.group(1)!));
      if (freeSymbols(n).every((v) => v == 'x')) return _functionAnalysis(fm.group(1)!, n);
    } catch (_) {
      // доор энгийн тэгшитгэл гэж үзнэ
    }
  }

  Relation? rel;
  try {
    rel = parseRelation(prepare(src));
  } catch (_) {
    return Analysis(kind: InputKind.invalid, actions: const [SolveAction.solve], body: src);
  }
  if (rel != null) {
    final ineq = rel.op != RelOp.eq;
    final vs = {...freeSymbols(rel.lhs), ...freeSymbols(rel.rhs)};
    // x ба y-тэй: y-ээр шийдэгдвэл функц, үгүй бол зөвхөн график
    if (vs.contains('x') && vs.contains('y') && vs.every((v) => v == 'x' || v == 'y')) {
      final fy = solveForY(rel);
      if (fy != null) {
        try {
          final fn = parseExpr(prepare(fy));
          return _functionAnalysis(fy, fn, (relTex(rel), 'y = ${toLatex(fn)}'));
        } catch (_) {
          // доор далд муруй гэж үзнэ
        }
      }
      return Analysis(kind: InputKind.implicit, body: src, graph: [prepare(src)]);
    }
    final inX = vs.length == 1 && vs.contains('x');
    final graph = inX
        ? [toAscii(rel.lhs), toAscii(rel.rhs)].indexed.where((e) => !(e.$1 == 1 && e.$2 == '0')).map((e) => e.$2).toList()
        : <String>[];
    return Analysis(
      kind: ineq ? InputKind.inequality : InputKind.equation,
      actions: const [SolveAction.solve],
      body: src,
      graph: graph,
      inX: inX,
    );
  }

  Expr node;
  try {
    node = parseExpr(prepare(src));
  } catch (_) {
    return Analysis(kind: InputKind.invalid, actions: const [SolveAction.calc], primary: SolveAction.calc, body: src);
  }
  return _analyzeExpr(src, node);
}

/// Үйлдлийг бодогчийн хүсэлт болгоно.
SolveRequest toRequest(Analysis a, SolveAction action, Map<String, String> extra, bool degrees) {
  final ex = {...a.extra, ...extra};
  switch (action) {
    case SolveAction.solve:
      return SolveRequest(
        mode: a.kind == InputKind.system ? SolveMode.sys : SolveMode.eq,
        input: a.body,
        degrees: degrees,
      );
    case SolveAction.calc:
      return SolveRequest(mode: SolveMode.calc, input: a.body, degrees: degrees);
    case SolveAction.factor ||
        SolveAction.expand ||
        SolveAction.frac ||
        SolveAction.div ||
        SolveAction.gcd ||
        SolveAction.prime:
      return SolveRequest(mode: SolveMode.alg, sub: action.name, input: a.body, degrees: degrees);
    case SolveAction.deriv || SolveAction.int || SolveAction.defint || SolveAction.lim || SolveAction.study:
      return SolveRequest(mode: SolveMode.an, sub: action.name, input: a.body, extra: ex, degrees: degrees);
  }
}
