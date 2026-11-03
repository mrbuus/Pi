// Бодогчийн нэг цонх (вэбийн `solve/solve.ts`): горим + дэд үйлдэл + оролт → Solution.
// UI ба тест хоёулаа ЗӨВХӨН энэ функцийг дуудна. Ямар ч алдаа UI-г унагахгүй —
// монгол мессеж буцаана. Runtime AI/LLM хэрэглэхгүй — бүх бодолт энд, төхөөрөмж дээр.
import 'algebra.dart';
import 'calc.dart';
import 'calculus.dart';
import 'equation.dart';
import 'expr_ext.dart';
import 'ineq.dart';
import 'input.dart';
import 'seq.dart';
import 'steps.dart';
import 'system.dart';

enum SolveMode { calc, eq, sys, alg, an, seq }

class SolveRequest {
  const SolveRequest({required this.mode, this.sub, required this.input, this.extra = const {}, this.degrees = false});
  final SolveMode mode;

  /// alg: factor|expand|frac|div|gcd|prime; an: deriv|int|defint|lim|study;
  /// seq: arith|geom|comb|prob|bern
  final String? sub;
  final String input;

  /// Нэмэлт талбарууд: order, at, a, b, to, a1, d, b1, q, n, k, m, p
  final Map<String, String> extra;
  final bool degrees;
}

Expr _node(String src, [bool degrees = false]) => parseExpr(prepare(src, degrees: degrees));

Relation _mustRel(String line, bool degrees) {
  final r = parseRelation(prepare(line, degrees: degrees));
  if (r == null) throw InputError('«$line» мөр тэгшитгэл биш байна');
  return r;
}

Solution _run(SolveRequest req) {
  final degrees = req.degrees;
  final ex = req.extra;
  final input = req.input;
  switch (req.mode) {
    case SolveMode.calc:
      return calculate(input, degrees: degrees);
    case SolveMode.eq:
      final lines = splitLines(input);
      if (lines.length > 1) return solveSystem(lines.map((l) => _mustRel(l, degrees)).toList());
      final src = prepare(input, degrees: degrees);
      final r = parseRelation(src);
      if (r == null) return solveEquation(parseExpr(src), mkNum(0), degrees: degrees);
      if (r.op == RelOp.eq) return solveEquation(r.lhs, r.rhs, degrees: degrees);
      return solveInequality(r.lhs, r.op, r.rhs, degrees: degrees);
    case SolveMode.sys:
      return solveSystem(splitLines(input).map((l) => _mustRel(l, degrees)).toList());
    case SolveMode.alg:
      switch (req.sub) {
        case 'factor':
          return factorExpr(_node(input));
        case 'expand':
          return expandExpr(_node(input));
        case 'frac':
          return simplifyFraction(_node(input));
        case 'div':
          final n = _node(input);
          if (n.kind != ExprKind.div) {
            return failure(r'Хуваах олон гишүүнтүүдээ $A/B$ эсвэл $A : B$ хэлбэрээр оруулна уу, ж: (x^3-1)/(x-1)');
          }
          return polyDivide(n.a!, n.b!);
        case 'gcd':
          return gcdLcm(input);
        case 'prime':
          return primeFactorization(input);
      }
      return failure(cannot);
    case SolveMode.an:
      switch (req.sub) {
        case 'deriv':
          final order = double.tryParse((ex['order'] ?? '').isEmpty ? '1' : ex['order']!);
          final at = (ex['at'] ?? '').trim().isNotEmpty ? _node(ex['at']!) : null;
          return derivative(
            _node(input),
            order: order != null && order.isFinite ? order.truncate() : 1,
            at: at,
          );
        case 'int':
          return indefiniteIntegral(_node(input));
        case 'defint':
          if ((ex['a'] ?? '').trim().isEmpty || (ex['b'] ?? '').trim().isEmpty) {
            return failure('Интегралын доод ба дээд хязгаарыг оруулна уу');
          }
          return definiteIntegral(_node(input), _node(ex['a']!), _node(ex['b']!));
        case 'lim':
          if ((ex['to'] ?? '').trim().isEmpty) return failure(r'$x$ хаашаа тэмүүлэхийг оруулна уу (тоо, inf, -inf)');
          return limit(_node(input), prepare(ex['to']!));
        case 'study':
          return studyFunction(_node(input));
      }
      return failure(cannot);
    case SolveMode.seq:
      switch (req.sub) {
        case 'arith':
          return arithmetic(ex['a1'] ?? '', ex['d'] ?? '', ex['n'] ?? '');
        case 'geom':
          return geometric(ex['b1'] ?? '', ex['q'] ?? '', ex['n'] ?? '');
        case 'comb':
          return combinatorics(ex['n'] ?? '', ex['k'] ?? '');
        case 'prob':
          return classicalProbability(ex['m'] ?? '', ex['n'] ?? '');
        case 'bern':
          return bernoulli(ex['n'] ?? '', ex['k'] ?? '', ex['p'] ?? '');
      }
      return failure(cannot);
  }
}

Solution solve(SolveRequest req) {
  final needsInput = req.mode != SolveMode.seq;
  if (needsInput && req.input.trim().isEmpty) return failure('Бодлогоо оруулна уу');
  try {
    return _run(req);
  } on ExprParseError catch (e) {
    return failure(e.message, 'Оролтыг шалгана уу');
  } on InputError catch (e) {
    return failure(e.message, 'Оролтыг шалгана уу');
  } catch (_) {
    return failure(cannot);
  }
}
