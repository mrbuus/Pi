// Матанализын хариуг сурах бичгийн хэлбэрт оруулах (вэбийн `solve/pretty.ts`):
// төстэй гишүүд нэгтгэх, коэффициентийг урд, сөрөг зэргийг хуваарьт, ln|u|.
import 'expr_ext.dart';
import 'q.dart';

class _Fac {
  _Fac(this.b, this.e);
  final Expr b;
  Q e;
}

class _Term {
  _Term(this.c, this.f);
  Q c;
  final List<_Fac> f;
}

Expr _qNode(Q c) => c.d == 1 ? mkNum(c.n) : mkDiv(mkNum(c.n), mkNum(c.d));

Q? _numQ(Expr n) {
  if (n.kind == ExprKind.num) {
    try {
      return decToQ(n.v);
    } catch (_) {
      return null;
    }
  }
  if (n.kind == ExprKind.neg) {
    final a = _numQ(n.a!);
    return a == null ? null : qneg(a);
  }
  if (n.kind == ExprKind.div) {
    final a = _numQ(n.a!), b = _numQ(n.b!);
    return a != null && b != null && !isZ(b) ? qdiv(a, b) : null;
  }
  return null;
}

_Term _mulTerms(_Term a, _Term b) => _Term(qmul(a.c, b.c), [...a.f, ...b.f]);

_Term _negT(_Term t) => _Term(qneg(t.c), t.f);

List<_Term> _toTerms(Expr n) {
  switch (n.kind) {
    case ExprKind.add:
      return [..._toTerms(n.a!), ..._toTerms(n.b!)];
    case ExprKind.sub:
      return [..._toTerms(n.a!), ..._toTerms(n.b!).map(_negT)];
    case ExprKind.neg:
      return _toTerms(n.a!).map(_negT).toList();
    default:
      return [_toProd(n)];
  }
}

_Term _asFactor(Expr n) {
  final p = prettify(n);
  final c = _numQ(p);
  if (c != null) return _Term(c, []);
  if (p.kind == ExprKind.pow) {
    final e = _numQ(p.b!);
    if (e != null) return _Term(qOne, [_Fac(p.a!, e)]);
  }
  return _Term(qOne, [_Fac(p, qOne)]);
}

_Term _toProd(Expr n) {
  final c = _numQ(n);
  if (c != null) return _Term(c, []);
  switch (n.kind) {
    case ExprKind.neg:
      return _negT(_toProd(n.a!));
    case ExprKind.mul:
      return _mulTerms(_single(n.a!), _single(n.b!));
    case ExprKind.div:
      final a = _single(n.a!), b = _single(n.b!);
      if (isZ(b.c)) return _asFactor(n);
      return _Term(qdiv(a.c, b.c), [...a.f, ...b.f.map((x) => _Fac(x.b, qneg(x.e)))]);
    default:
      return _asFactor(n);
  }
}

/// Хүчин зүйлийг ганц гишүүн болгоно; нийлбэр бол тунгалаг үржигдэхүүн.
_Term _single(Expr n) {
  if (n.kind == ExprKind.add || n.kind == ExprKind.sub) {
    final p = prettify(n);
    if (p.kind != ExprKind.add && p.kind != ExprKind.sub) return _toProd(p);
    return _Term(qOne, [_Fac(p, qOne)]);
  }
  return _toProd(n);
}

_Term _combine(_Term t) {
  final out = <_Fac>[];
  for (final f in t.f) {
    _Fac? e;
    for (final o in out) {
      if (same(o.b, f.b)) {
        e = o;
        break;
      }
    }
    if (e != null) {
      e.e = qadd(e.e, f.e);
    } else {
      out.add(_Fac(f.b, f.e));
    }
  }
  return _Term(t.c, out.where((x) => !isZ(x.e)).toList());
}

int _rank(Expr b) => b.kind == ExprKind.sym
    ? 0
    : (b.kind == ExprKind.pow && b.a!.kind == ExprKind.sym ? 1 : (b.kind == ExprKind.call ? 3 : 2));

Expr _powNode(Expr b, Q e) => e.n == 1 && e.d == 1 ? b : mkPow(b, _qNode(e));

Expr? _prodNode(List<_Fac> fs) {
  if (fs.isEmpty) return null;
  final sorted = sortedCopy(fs, (a, b) => _rank(a.b) - _rank(b.b));
  return sorted.map((f) => _powNode(f.b, f.e)).reduce(mkMul);
}

(Expr, bool) _termNode(_Term t) {
  final negative = t.c.n < 0;
  final c = negative ? qneg(t.c) : t.c;
  final up = _prodNode(t.f.where((f) => f.e.n > 0).toList());
  final down = _prodNode(t.f.where((f) => f.e.n < 0).map((f) => _Fac(f.b, qneg(f.e))).toList());
  Expr node;
  if (down == null) {
    if (up == null) {
      node = _qNode(c);
    } else if (c.n == 1 && c.d == 1) {
      node = up;
    } else {
      node = mkMul(_qNode(c), up);
    }
  } else {
    final topC = mkNum(c.n);
    final top = up != null ? (c.n == 1 ? up : mkMul(topC, up)) : topC;
    final bot = c.d == 1 ? down : mkMul(mkNum(c.d), down);
    node = mkDiv(top, bot);
  }
  return (node, negative);
}

/// Үндсэн функц.
Expr prettify(Expr n) {
  try {
    return _pretty(simplify(n));
  } catch (_) {
    return n;
  }
}

String _termKey(_Term t) => t.f.map((f) => '${nodeKey(f.b)}^${f.e.n}/${f.e.d}').join('|');

Expr _pretty(Expr n) {
  switch (n.kind) {
    case ExprKind.num || ExprKind.sym:
      return n;
    case ExprKind.call:
      return mkCall(n.name, n.args.map(prettify).toList());
    case ExprKind.fact:
      return mkFact(prettify(n.a!));
    case ExprKind.pow:
      return mkPow(prettify(n.a!), prettify(n.b!));
    default:
      break;
  }
  final terms = _toTerms(n).map(_combine);
  // төстэй гишүүд
  final merged = <_Term>[];
  for (final t in terms) {
    final key = _termKey(t);
    _Term? e;
    for (final m in merged) {
      if (_termKey(m) == key) {
        e = m;
        break;
      }
    }
    if (e != null) {
      e.c = qadd(e.c, t.c);
    } else {
      merged.add(_Term(t.c, t.f));
    }
  }
  final live = merged.where((t) => !isZ(t.c)).toList();
  if (live.isEmpty) return mkNum(0);
  Expr? acc;
  for (final t in live) {
    final (node, negative) = _termNode(t);
    if (acc == null) {
      acc = negative ? mkNeg(node) : node;
    } else {
      acc = negative ? mkSub(acc, node) : mkAdd(acc, node);
    }
  }
  return acc!;
}

/// LaTeX: ln|u| гэх мэт сурах бичгийн тусгай хэлбэртэй.
String prettyTex(Expr n) {
  Expr mark(Expr m) {
    switch (m.kind) {
      case ExprKind.call:
        if (m.name == 'ln' && m.args[0].kind == ExprKind.call && m.args[0].name == 'abs') {
          return mkSym('\\ln\\left|${prettyTex(m.args[0].args[0])}\\right|');
        }
        return mkCall(m.name, m.args.map(mark).toList());
      case ExprKind.num || ExprKind.sym:
        return m;
      case ExprKind.neg:
        return mkNeg(mark(m.a!));
      case ExprKind.fact:
        return mkFact(mark(m.a!));
      default:
        return Expr.bin(m.kind, mark(m.a!), mark(m.b!));
    }
  }

  // Нийлбэрийн түвшинд хасах тэмдгийг хаалтгүй бичнэ: -\frac{x}{2}, a-2b
  String top(Expr m) {
    if (m.kind == ExprKind.neg && m.a!.kind != ExprKind.add && m.a!.kind != ExprKind.sub) {
      return '-${toLatex(mark(m.a!))}';
    }
    if (m.kind == ExprKind.add || m.kind == ExprKind.sub) {
      final b = m.b!;
      final bt = b.kind == ExprKind.add || b.kind == ExprKind.sub || b.kind == ExprKind.neg
          ? '\\left(${top(b)}\\right)'
          : toLatex(mark(b));
      return '${top(m.a!)}${m.kind == ExprKind.add ? '+' : '-'}$bt';
    }
    return toLatex(mark(m));
  }

  return top(n);
}
