// x, y-тэй харьцааг y = f(x) болгох (вэбийн `solve/implicit.ts`) — график руу дамжуулахад.
import 'expr_ext.dart';
import 'mpoly.dart';
import 'q.dart';
import 'steps.dart';

bool _hasY(Expr n) => freeSymbols(n).contains('y');

/// n = a + b·y хэлбэрт задлах (a, b нь y-гүй); y-ээр шугаман биш бол null.
(Expr, Expr)? _linY(Expr n) {
  if (!_hasY(n)) return (n, mkNum(0));
  switch (n.kind) {
    case ExprKind.sym:
      return n.name == 'y' ? (mkNum(0), mkNum(1)) : null;
    case ExprKind.neg:
      final r = _linY(n.a!);
      return r == null ? null : (mkNeg(r.$1), mkNeg(r.$2));
    case ExprKind.add || ExprKind.sub:
      final l = _linY(n.a!), r = _linY(n.b!);
      if (l == null || r == null) return null;
      return (Expr.bin(n.kind, l.$1, r.$1), Expr.bin(n.kind, l.$2, r.$2));
    case ExprKind.mul:
      if (!_hasY(n.a!)) {
        final r = _linY(n.b!);
        return r == null ? null : (mkMul(n.a!, r.$1), mkMul(n.a!, r.$2));
      }
      if (!_hasY(n.b!)) {
        final l = _linY(n.a!);
        return l == null ? null : (mkMul(l.$1, n.b!), mkMul(l.$2, n.b!));
      }
      return null;
    case ExprKind.div:
      if (_hasY(n.b!)) return null;
      final l = _linY(n.a!);
      return l == null ? null : (mkDiv(l.$1, n.b!), mkDiv(l.$2, n.b!));
    default:
      return null;
  }
}

String _polyAscii(MPoly p) => misZero(p) ? '0' : mascii(p);

/// x, y-тэй «=» харьцааг y = f(x) болгоно (f(x)-ийн ASCII). Чадахгүй бол null.
String? solveForY(Relation r) {
  if (r.op != RelOp.eq) return null;
  final vs = {...freeSymbols(r.lhs), ...freeSymbols(r.rhs)};
  if (!vs.contains('y') || !vs.every((v) => v == 'x' || v == 'y')) return null;
  final f = mkSub(r.lhs, r.rhs);

  // 1) Олон гишүүнт: F = c0(x) + c1(x)·y
  final p = mfrom(f, vars: {'x', 'y'});
  if (p != null && mdegIn(p, 'y') == 1) {
    final c0 = mcoeffAt(p, 'y', 0), c1 = mcoeffAt(p, 'y', 1);
    final k = masConst(c1);
    if (k != null) {
      if (k.n == 0) return null;
      return _polyAscii(mscale(c0, qneg(qdiv(q(1), k))));
    }
    // хуваарьт x-тэй: y = -c0 / c1
    return '(${_polyAscii(mneg(c0))})/(${_polyAscii(c1)})';
  }
  if (p != null) return null; // y^2 гэх мэт — шийд нь ганц функц биш

  // 2) Ерөнхий шугаман: (a_l - a_r) + (b_l - b_r) y = 0
  final l = _linY(r.lhs), rr = _linY(r.rhs);
  if (l == null || rr == null) return null;
  final b = simplify(mkSub(l.$2, rr.$2));
  if (_hasY(b) || (b.kind == ExprKind.num && b.v.abs() < 1e-12)) return null;
  final a = simplify(mkSub(rr.$1, l.$1));
  final Expr body;
  if (b.kind == ExprKind.num && b.v == 1) {
    body = a;
  } else if ((b.kind == ExprKind.num && b.v == -1) ||
      (b.kind == ExprKind.neg && b.a!.kind == ExprKind.num && b.a!.v == 1)) {
    body = simplify(mkNeg(a));
  } else {
    body = simplify(mkDiv(a, b));
  }
  if (_hasY(body)) return null;
  return toAscii(body);
}

/// x^{-k} → 1/x^k (бутархай хураахад олон гишүүнтүүдийн харьцаа болгоно).
Expr negPowToDiv(Expr n) {
  switch (n.kind) {
    case ExprKind.num || ExprKind.sym:
      return n;
    case ExprKind.neg:
      return mkNeg(negPowToDiv(n.a!));
    case ExprKind.fact:
      return mkFact(negPowToDiv(n.a!));
    case ExprKind.call:
      return mkCall(n.name, n.args.map(negPowToDiv).toList());
    case ExprKind.pow:
      final base = negPowToDiv(n.a!);
      final e = n.b!;
      final k = e.kind == ExprKind.neg && e.a!.kind == ExprKind.num
          ? e.a!.v
          : (e.kind == ExprKind.num && e.v < 0 ? -e.v : null);
      if (k != null && isInteger(k) && k > 0 && freeSymbols(base).isNotEmpty) {
        return mkDiv(mkNum(1), k == 1 ? base : mkPow(base, mkNum(k)));
      }
      return mkPow(base, negPowToDiv(e));
    default:
      return Expr.bin(n.kind, negPowToDiv(n.a!), negPowToDiv(n.b!));
  }
}
