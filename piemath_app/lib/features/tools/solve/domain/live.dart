// Бичиж байх зуурх АВТОМАТ бодолт (вэбийн `solve/live.ts`), гэхдээ апп-ын гар ASCII
// бичвэр (`2x^(2)-5x+6=0`, `sqrt(x+3)`, `|x-2|`) өгдөг тул LaTeX уншихгүй.
//
//   empty       — юу ч бичээгүй
//   incomplete  — хаалт хаагдаагүй, «2+» гэх мэт: юу ч ХАРУУЛАХГҮЙ
//   error       — бүрэн бөгөөд буруу: зөөлөн мессеж
//   implicit    — x, y-тэй, y-ээр шийдэгдэхгүй: «Графикт харах»
//   need        — нэмэлт утга хэрэгтэй (хязгаарт x хаашаа г.м.)
//   done        — хариу бэлэн (sol.ok=false бол «бодож чадсангүй» үнэнээр)
import 'auto.dart';
import 'expr_ext.dart';
import 'input.dart';
import 'solve.dart';
import 'steps.dart';

enum LiveStatus { empty, incomplete, error, implicit, need, done }

class Live {
  const Live(this.status, {this.message, this.analysis, this.action, this.sol});
  final LiveStatus status;
  final String? message;
  final Analysis? analysis;
  final SolveAction? action;
  final Solution? sol;
}

Solution safeSolve(SolveRequest req) {
  try {
    return solve(req);
  } catch (_) {
    return failure(cannot);
  }
}

/// ASCII оруулга дутуу эсэх: хоосон, хаалт/модуль хаагдаагүй, төгсгөлд үйлдлийн тэмдэг, `?`.
bool isIncompletePlain(String src) {
  final s = src.trim();
  if (s.isEmpty) return true;
  if (s.contains('?')) return true;
  var depth = 0;
  for (final ch in s.split('')) {
    if (ch == '(' || ch == '[' || ch == '{') depth++;
    if (ch == ')' || ch == ']' || ch == '}') depth--;
  }
  if (depth > 0) return true;
  if ('|'.allMatches(s).length.isOdd) return true;
  final lines = s.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty);
  for (final l in lines) {
    if (RegExp(r'[+\-*/^_(,;=<>:]$').hasMatch(l)) return true;
    if (RegExp(r'^[=<>*/^]').hasMatch(l)) return true;
  }
  return false;
}

/// Үйлдэлд шаардлагатай нэмэлт утга; дутуу бол null.
Map<String, String>? paramsFor(SolveAction action, Analysis an, [Map<String, String> params = const {}]) {
  String p(String k) => (params[k] ?? '').trim();
  if (action == SolveAction.lim) {
    final to = an.extra['to'] ?? p('to');
    return to.isNotEmpty ? {'to': to} : null;
  }
  if (action == SolveAction.defint) {
    final a = an.extra['a'] ?? p('a'), b = an.extra['b'] ?? p('b');
    return a.isNotEmpty && b.isNotEmpty ? {'a': a, 'b': b} : null;
  }
  if (action == SolveAction.deriv) {
    final out = <String, String>{};
    if (an.extra['order'] != null) {
      out['order'] = an.extra['order']!;
    } else if (p('order').isNotEmpty && p('order') != '1') {
      out['order'] = p('order');
    }
    if (p('at').isNotEmpty) out['at'] = p('at');
    return out;
  }
  return {};
}

Solution _withYStep(Solution sol, (String, String) fr) => sol.copyWith(
  steps: [
    Step(text: r'$y$-ээр илэрхийлбэл', tex: [fr.$1, fr.$2]),
    ...sol.steps,
  ],
);

/// x-ийн илэрхийлэл ямар ч x-д ижил утгатай бол (sin^2 x + cos^2 x = 1) тэр утгаар хариулна.
Solution? _constantIdentity(Analysis an, bool degrees) {
  if (an.kind != InputKind.expression || !an.inX || an.primary != SolveAction.deriv) return null;
  try {
    final node = parseExpr(prepare(an.body, degrees: degrees));
    final f = compileExpr(node, degrees: degrees);
    const xs = [0.37, 1.3, 2.1, -0.8, 3.7, -2.45];
    final vs = xs.map((x) => f({'x': x})).toList();
    if (!vs.every((y) => y.isFinite)) return null;
    final v = vs[0];
    if (!vs.every((y) => (y - v).abs() < 1e-9 * (1 + v.abs()))) return null;
    final p = toLatex(node), r = niceTex(v);
    return Solution(
      ok: true,
      title: 'Хялбарчлах',
      problem: p,
      answer: ['$p = $r'],
      steps: [
        Step(text: r'$x$-ийн ямар ч утгад илэрхийлэл ижил утгатай (адилтгал)', tex: ['$p = $r']),
      ],
    );
  } catch (_) {
    return null;
  }
}

/// Задлагчийн мессеж дэх «*» → «×».
String _tidyMsg(String m) => m.replaceAll('«*»', r'«$\times$»');

Live liveSolve(String src, {bool degrees = false, SolveAction? action, Map<String, String> params = const {}}) {
  if (src.trim().isEmpty) return const Live(LiveStatus.empty);
  if (isIncompletePlain(src)) return const Live(LiveStatus.incomplete);
  Analysis analysis;
  try {
    analysis = analyzeInput(src);
  } on ExprParseError catch (e) {
    return Live(LiveStatus.error, message: _tidyMsg(e.message));
  } catch (_) {
    return const Live(LiveStatus.error, message: 'Бодлогыг ойлгосонгүй');
  }
  if (analysis.kind == InputKind.implicit) return Live(LiveStatus.implicit, analysis: analysis);
  final act = action != null && analysis.actions.contains(action) ? action : analysis.primary;
  final extra = paramsFor(act, analysis, params);
  if (extra == null) return Live(LiveStatus.need, analysis: analysis, action: act);
  final ident = action == null ? _constantIdentity(analysis, degrees) : null;
  if (ident != null) return Live(LiveStatus.done, analysis: analysis, action: act, sol: ident);
  var sol = safeSolve(toRequest(analysis, act, extra, degrees));
  if (analysis.fromRelation != null) sol = _withYStep(sol, analysis.fromRelation!);
  if (!sol.ok && (sol.title == 'Оролтыг шалгана уу' || analysis.kind == InputKind.invalid)) {
    final notes = sol.notes ?? const [];
    return Live(LiveStatus.error, message: _tidyMsg(notes.isNotEmpty ? notes[0] : 'Бодлогыг ойлгосонгүй'));
  }
  return Live(LiveStatus.done, analysis: analysis, action: act, sol: sol);
}
