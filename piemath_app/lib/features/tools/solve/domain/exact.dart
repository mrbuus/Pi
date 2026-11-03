// ЯГ тоо: рационал коэффициенттэй язгуур, pi, e-гийн нийлбэр (вэбийн `solve/exact.ts`).
//
//   x = Σ c_i * r_i^{1/n_i} * pi^{p_i} * e^{q_i}
//
// Хуваарийг хосмог үржвэрээр язгуургүй болгоно, sqrt(a+bsqrtr)-г задлахыг оролдоно.
// Чадахгүй бол ExactFail — дээд түвшин нь аравтын ойролцоо руу шилжинэ.
// Бодит тоонд тодорхойлогдохгүй (sqrt-1, 1/0, log(-1)) бол NotReal.
import 'dart:math' as math;

import 'expr_ext.dart';
import 'q.dart';

export 'q.dart' show ExactFail;

class NotReal implements Exception {
  NotReal([this.message = '']);
  final String message;
  @override
  String toString() => message;
}

class Term {
  const Term(this.c, this.n, this.r, this.pi, this.e);
  final Q c;

  /// язгуурын зэрэг (1 = язгуургүй)
  final int n;

  /// язгуур доорх бүхэл (>=1)
  final int r;
  final int pi;
  final int e;

  Term withC(Q c2) => Term(c2, n, r, pi, e);
}

typedef X = List<Term>;

const int _maxTerms = 48;

String _key(Term t) => '${t.n}|${t.r}|${t.pi}|${t.e}';

X _normalize(List<Term> ts) {
  final m = <String, Term>{};
  for (final t in ts) {
    if (isZ(t.c)) continue;
    final k = _key(t);
    final old = m[k];
    if (old != null) {
      m[k] = old.withC(qadd(old.c, t.c));
    } else {
      m[k] = t;
    }
  }
  final out = m.values.where((t) => !isZ(t.c)).toList();
  if (out.length > _maxTerms) throw ExactFail('too many terms');
  ssort<Term>(out, (a, b) {
    if (a.pi != b.pi) return a.pi - b.pi;
    if (a.e != b.e) return a.e - b.e;
    if (a.n != b.n) return a.n - b.n;
    return a.r - b.r;
  });
  return out;
}

/* ---------- Үүсгэх ---------- */

X xq(Q a) => isZ(a) ? <Term>[] : [Term(a, 1, 1, 0, 0)];
X xint(int k) => xq(q(k));
final X xZero = <Term>[];
final X xOne = xint(1);
final X xPi = [const Term(qOne, 1, 1, 1, 0)];
final X xE = [const Term(qOne, 1, 1, 0, 1)];

Term _radTerm(Q c, int n, Map<int, int> exps, [int pi = 0, int e = 0]) {
  var out = 1;
  final inner = <int, int>{};
  for (final MapEntry(key: p, value: k) in exps.entries) {
    if (k == 0) continue;
    if (k < 0) throw ExactFail('negative radicand exponent');
    final o = k ~/ n, r = k % n;
    for (var i = 0; i < o; i++) {
      out = smul(out, p);
    }
    if (r != 0) inner[p] = r;
  }
  var g = n;
  for (final k in inner.values) {
    g = igcd(g, k);
  }
  if (inner.isEmpty) g = n;
  final nn = inner.isEmpty ? 1 : n ~/ g;
  var r = 1;
  for (final MapEntry(key: p, value: k) in inner.entries) {
    for (var i = 0; i < k ~/ g; i++) {
      r = smul(r, p);
    }
  }
  return Term(qmul(c, q(out)), nn, r, pi, e);
}

Map<int, int> _expsOf(int r, [int mult = 1, Map<int, int>? acc]) {
  final m = acc ?? <int, int>{};
  for (final (p, k) in factorInt(r)) {
    m[p] = (m[p] ?? 0) + k * mult;
  }
  return m;
}

Term _mulTerm(Term a, Term b) {
  final c = qmul(a.c, b.c);
  if (a.n == 1 && b.n == 1) return Term(c, 1, 1, a.pi + b.pi, a.e + b.e);
  final m = ilcm(a.n, b.n);
  final exps = _expsOf(a.r, m ~/ a.n);
  _expsOf(b.r, m ~/ b.n, exps);
  return _radTerm(c, m, exps, a.pi + b.pi, a.e + b.e);
}

/* ---------- Арифметик ---------- */

X xadd(X a, X b) => _normalize([...a, ...b]);
X xneg(X a) => a.map((t) => t.withC(qneg(t.c))).toList();
X xsub(X a, X b) => xadd(a, xneg(b));

X xmul(X a, X b) {
  if (a.length * b.length > 400) throw ExactFail('too big');
  final out = <Term>[];
  for (final s in a) {
    for (final t in b) {
      out.add(_mulTerm(s, t));
    }
  }
  return _normalize(out);
}

X xscale(X a, Q k) => _normalize(a.map((t) => t.withC(qmul(t.c, k))).toList());

bool isZero(X a) => a.isEmpty;

Q? asQ(X a) {
  if (a.isEmpty) return qZero;
  if (a.length == 1 && a[0].n == 1 && a[0].pi == 0 && a[0].e == 0) return a[0].c;
  return null;
}

bool isRational(X a) => asQ(a) != null;

double approx(X a) {
  var s = 0.0;
  for (final t in a) {
    s += qval(t.c) * math.pow(t.r, 1 / t.n) * math.pow(math.pi, t.pi) * math.pow(math.e, t.e);
  }
  return s;
}

/// Тэмдэг: яг тэг бол 0, үгүй бол ойролцоо утгын тэмдэг.
double xsign(X a) {
  if (a.isEmpty) return 0;
  return jsSign(approx(a));
}

double xcmp(X a, X b) => xsign(xsub(a, b));
bool xeq(X a, X b) => isZero(xsub(a, b));

Term _invMonomial(Term t) {
  if (t.n == 1) return Term(qinv(t.c), 1, 1, -t.pi, -t.e);
  final exps = _expsOf(t.r, t.n - 1);
  return _radTerm(qinv(qmul(t.c, q(t.r))), t.n, exps, -t.pi, -t.e);
}

X xinv(X a) {
  if (a.isEmpty) throw NotReal('zero division');
  if (a.length == 1) return [_invMonomial(a[0])];
  final pi = a[0].pi, e = a[0].e;
  if (a.any((t) => t.pi != pi || t.e != e || t.n > 2)) throw ExactFail('cannot rationalize');
  X den = a.map((t) => Term(t.c, t.n, t.r, 0, 0)).toList();
  X numr = xOne;
  for (var guard = 0; guard < 12 && !isRational(den); guard++) {
    final t0 = den.firstWhere((t) => t.r > 1);
    final p = factorInt(t0.r)[0].$1;
    final conj = den.map((t) => t.r % p == 0 ? t.withC(qneg(t.c)) : t).toList();
    numr = xmul(numr, conj);
    den = xmul(den, conj);
  }
  final dq = asQ(den);
  if (dq == null || isZ(dq)) throw ExactFail('cannot rationalize');
  return xmul(xscale(numr, qinv(dq)), [Term(qOne, 1, 1, -pi, -e)]);
}

X xdiv(X a, X b) => xmul(a, xinv(b));

X xpowInt(X a, int k) {
  if (k.abs() > 200) throw ExactFail('power');
  if (k < 0) return xinv(xpowInt(a, -k));
  if (k == 0) return xOne;
  if (a.length > 1 && k > 12) throw ExactFail('power too big');
  X r = xOne, b = a;
  while (k > 0) {
    if (k & 1 == 1) r = xmul(r, b);
    k >>= 1;
    if (k != 0) b = xmul(b, b);
  }
  return r;
}

/// k-р язгуур (бодит).
X xroot(X a, int k) {
  if (k < 1) throw ExactFail('root index');
  if (k == 1 || a.isEmpty) return a;
  if (a.length == 1) {
    final t = a[0];
    if (t.pi % k != 0 || t.e % k != 0) throw ExactFail('transcendental root');
    var c = t.c;
    var negative = false;
    if (c.n < 0) {
      if (k % 2 == 0) throw NotReal('even root of negative');
      negative = true;
      c = qneg(c);
    }
    final exps = _expsOf(c.n);
    _expsOf(c.d, k - 1, exps);
    final outer = _radTerm(q(1, c.d), k, exps, t.pi ~/ k, t.e ~/ k);
    var res = outer;
    if (t.n > 1) {
      final inner = _radTerm(qOne, t.n * k, _expsOf(t.r));
      res = _mulTerm(outer, inner);
    }
    if (negative) res = res.withC(qneg(res.c));
    return [res];
  }
  if (k == 2) return _sqrtDenest(a);
  throw ExactFail('root of sum');
}

X _sqrtDenest(X a) {
  if (a.length != 2 && a.length != 1) throw ExactFail('denest');
  Term? rat, rad;
  for (final t in a) {
    if (rat == null && t.n == 1 && t.pi == 0 && t.e == 0) rat = t;
    if (rad == null && t.n == 2 && t.pi == 0 && t.e == 0) rad = t;
  }
  if (rat == null || rad == null || a.length != 2) throw ExactFail('denest');
  if (approx(a) < 0) throw NotReal('negative');
  final aa = rat.c, bb = rad.c, r = rad.r;
  final dd = qsub(qmul(aa, aa), qmul(qmul(bb, bb), q(r)));
  if (dd.n < 0) throw ExactFail('denest');
  final s = qroot(dd, 2);
  if (s == null) throw ExactFail('denest');
  final x = qmul(qadd(aa, s), q(1, 2)), y = qmul(qsub(aa, s), q(1, 2));
  if (x.n < 0 || y.n < 0) throw ExactFail('denest');
  final sx = xroot(xq(x), 2), sy = xroot(xq(y), 2);
  return bb.n > 0 ? xadd(sx, sy) : xsub(sx, sy);
}

X xpow(X a, X b) {
  final bq = asQ(b);
  if (bq == null) throw ExactFail('irrational exponent');
  if (bq.d == 1) {
    if (isZero(a) && bq.n <= 0) throw NotReal('0^0');
    return xpowInt(a, bq.n);
  }
  if (isZero(a)) {
    if (bq.n < 0) throw NotReal('0^neg');
    return xZero;
  }
  final r = xroot(a, bq.d);
  return xpowInt(r, bq.n);
}

/* ---------- Тригонометр ---------- */

List<X>? _sin12;

List<X> _sinTable() {
  final cached = _sin12;
  if (cached != null) return cached;
  final s2 = xroot(xint(2), 2), s3 = xroot(xint(3), 2), s6 = xroot(xint(6), 2);
  X quarter(X v) => xscale(v, q(1, 4));
  return _sin12 = [
    xZero,
    quarter(xsub(s6, s2)),
    xq(q(1, 2)),
    xscale(s2, q(1, 2)),
    xscale(s3, q(1, 2)),
    quarter(xadd(s6, s2)),
    xOne,
  ];
}

X sinK(int k) {
  k = ((k % 24) + 24) % 24;
  final t = _sinTable();
  if (k <= 6) return t[k];
  if (k <= 12) return t[12 - k];
  return xneg(sinK(k - 12));
}

int? _angleK(X a, bool degrees) {
  if (a.isEmpty) return 0;
  if (degrees) {
    final d = asQ(a);
    if (d == null) return null;
    final k = qmul(d, q(1, 15));
    return k.d == 1 ? k.n : null;
  }
  if (a.length != 1) return null;
  final t = a[0];
  if (t.n != 1 || t.pi != 1 || t.e != 0) return null;
  final k = qmul(t.c, q(12));
  return k.d == 1 ? k.n : null;
}

X _kToAngle(int k, bool degrees) => degrees ? xint(15 * k) : xscale(xPi, q(k, 12));

X xtrig(String f, X a, [bool degrees = false]) {
  final k = _angleK(a, degrees);
  if (k == null) throw ExactFail('non-table angle');
  final s = sinK(k), c = sinK(k + 6);
  switch (f) {
    case 'sin':
      return s;
    case 'cos':
      return c;
    case 'tan':
      if (isZero(c)) throw NotReal('tan undefined');
      return xdiv(s, c);
    case 'cot':
      if (isZero(s)) throw NotReal('cot undefined');
      return xdiv(c, s);
  }
  throw ExactFail('trig');
}

X xatrig(String f, X v, [bool degrees = false]) {
  int? find(X? Function(int k) fn, List<int> ks) {
    for (final k in ks) {
      final w = fn(k);
      if (w != null && xeq(w, v)) return k;
    }
    return null;
  }

  List<int> range(int a, int b) => [for (var i = a; i <= b; i++) i];
  final av = approx(v);
  switch (f) {
    case 'asin':
    case 'acos':
      if (av.abs() > 1 + 1e-12) throw NotReal('asin domain');
      final k = find(sinK, range(-6, 6));
      if (k == null) throw ExactFail('non-table');
      return _kToAngle(f == 'asin' ? k : 6 - k, degrees);
    case 'atan':
    case 'acot':
      if (f == 'acot' && isZero(v)) return _kToAngle(6, degrees);
      final target = f == 'acot' ? xinv(v) : v;
      final k = find(
        (kk) => xdiv(sinK(kk), sinK(kk + 6)),
        range(-5, 5).where((kk) => kk != 0 || isZero(target)).toList(),
      );
      final k0 = isZero(target) ? 0 : k;
      if (k0 == null) throw ExactFail('non-table');
      if (f == 'atan') return _kToAngle(k0, degrees);
      return _kToAngle(k0 < 0 ? k0 + 12 : k0, degrees);
  }
  throw ExactFail('atrig');
}

/* ---------- Логарифм ---------- */

Map<int, Q>? _logExps(X a) {
  if (a.length != 1) return null;
  final t = a[0];
  if (t.pi != 0 || t.c.n <= 0) return null;
  final m = <int, Q>{};
  void addE(int p, Q k) => m[p] = qadd(m[p] ?? qZero, k);
  for (final (p, k) in factorInt(t.c.n)) {
    addE(p, q(k));
  }
  for (final (p, k) in factorInt(t.c.d)) {
    addE(p, q(-k));
  }
  if (t.r > 1) {
    for (final (p, k) in factorInt(t.r)) {
      addE(p, q(k, t.n));
    }
  }
  if (t.e != 0) addE(0, q(t.e));
  m.removeWhere((_, k) => isZ(k));
  return m;
}

/// log_b(x) яг рационал бол буцаана.
X xlog(X b, X x) {
  if (xsign(x) <= 0) throw NotReal('log of non-positive');
  if (xsign(b) <= 0 || xeq(b, xOne)) throw NotReal('bad log base');
  if (xeq(x, xOne)) return xZero;
  final ex = _logExps(x), eb = _logExps(b);
  if (ex == null || eb == null || eb.isEmpty) throw ExactFail('log');
  final first = eb.entries.first;
  final t = qmul(ex[first.key] ?? qZero, qinv(first.value));
  final keys = {...ex.keys, ...eb.keys};
  for (final p in keys) {
    if (!qeq(ex[p] ?? qZero, qmul(t, eb[p] ?? qZero))) throw ExactFail('log not rational');
  }
  return xq(t);
}

/* ---------- LaTeX ---------- */

String _transTex(int pi, int e) {
  var s = '';
  if (pi != 0) s += pi == 1 ? r'\pi' : '\\pi^{$pi}';
  if (e != 0) s += e == 1 ? 'e' : 'e^{$e}';
  return s;
}

String _radTex(int n, int r) {
  if (r == 1) return '';
  return n == 2 ? '\\sqrt{$r}' : '\\sqrt[$n]{$r}';
}

String _bodyTex(int k, Term t) {
  final rad = _radTex(t.n, t.r) + _transTex(t.pi, t.e);
  final ak = k.abs();
  if (rad.isEmpty) return '$ak';
  return ak == 1 ? rad : '$ak$rad';
}

String xtex(X a0) {
  var a = a0;
  if (a.isEmpty) return '0';
  if (a.any((t) => t.pi < 0 || t.e < 0)) {
    final sb = StringBuffer();
    for (var i = 0; i < a.length; i++) {
      final t = a[i];
      final up = Term(t.c, t.n, t.r, math.max(0, t.pi), math.max(0, t.e));
      final down = _transTex(math.max(0, -t.pi), math.max(0, -t.e));
      final top = _bodyTex(t.c.n, up);
      final s = t.c.n < 0 ? '-' : (i > 0 ? '+' : '');
      final den = (t.c.d == 1 ? '' : '${t.c.d}') + down;
      sb.write(den.isNotEmpty ? '$s\\frac{$top}{$den}' : '$s$top');
    }
    return sb.toString();
  }
  final firstPos = a.indexWhere((t) => t.c.n > 0);
  if (firstPos > 0) a = [a[firstPos], ...a.sublist(0, firstPos), ...a.sublist(firstPos + 1)];
  var l = 1;
  for (final t in a) {
    l = ilcm(l, t.c.d);
  }
  final ks = a.map((t) => smul(t.c.n, l ~/ t.c.d)).toList();
  var flip = false;
  if (l > 1 && ks.every((k) => k < 0)) flip = true;
  final parts = <String>[];
  for (var i = 0; i < a.length; i++) {
    final k = flip ? -ks[i] : ks[i];
    final sgn = k < 0 ? '-' : (i > 0 ? '+' : '');
    parts.add(sgn + _bodyTex(k, a[i]));
  }
  final numer = parts.join();
  if (l == 1) return numer;
  return '${flip ? '-' : ''}\\frac{$numer}{$l}';
}

/// Тооны шулууны шошгонд тохирох богино бичвэр: 1/2, (1+\sqrt{5})/2, \pi/6.
String xlabel(X a) {
  final tex = xtex(a);
  final m = RegExp(r'^(-?)\\frac\{(.+)\}\{(\d+)\}$').firstMatch(tex);
  if (m != null && !m.group(2)!.contains(r'\frac')) {
    final g2 = m.group(2)!;
    final top = RegExp('[+-]').hasMatch(g2.substring(1)) ? '($g2)' : g2;
    return '${m.group(1)}$top/${m.group(3)}';
  }
  if (tex.contains(r'\frac')) return fixedNum(approx(a), 2);
  return tex;
}

/* ---------- Модноос ЯГ тооцоо ---------- */

Q _factQ(int n) {
  if (n < 0) throw ExactFail('factorial');
  if (n > 18) throw ExactFail('factorial too big');
  var r = 1;
  for (var i = 2; i <= n; i++) {
    r *= i;
  }
  return q(r);
}

X evalExact(Expr node, {bool degrees = false, Map<String, X>? scope}) {
  X go(Expr n) => evalExact(n, degrees: degrees, scope: scope);
  switch (node.kind) {
    case ExprKind.num:
      final v = node.v;
      if (!v.isFinite) throw ExactFail('inf');
      return xq(decToQ(v));
    case ExprKind.sym:
      final name = node.name;
      final sv = scope?[name];
      if (sv != null) return sv;
      if (name == 'pi') return xPi;
      if (name == 'e') return xE;
      throw ExactFail('free symbol');
    case ExprKind.neg:
      return xneg(go(node.a!));
    case ExprKind.add:
      return xadd(go(node.a!), go(node.b!));
    case ExprKind.sub:
      return xsub(go(node.a!), go(node.b!));
    case ExprKind.mul:
      return xmul(go(node.a!), go(node.b!));
    case ExprKind.div:
      return xdiv(go(node.a!), go(node.b!));
    case ExprKind.pow:
      return xpow(go(node.a!), go(node.b!));
    case ExprKind.fact:
      final a = asQ(go(node.a!));
      if (a == null || a.d != 1) throw ExactFail('factorial');
      return xq(_factQ(a.n));
    case ExprKind.call:
      final args = node.args.map(go).toList();
      final a = args[0];
      final b = args.length > 1 ? args[1] : null;
      switch (node.name) {
        case 'sqrt':
          return xroot(a, 2);
        case 'cbrt':
          return xroot(a, 3);
        case 'root':
          final k = asQ(a);
          if (k == null || k.d != 1 || k.n < 1) throw ExactFail('root index');
          return xroot(b!, k.n);
        case 'abs':
          return xsign(a) < 0 ? xneg(a) : a;
        case 'sin' || 'cos' || 'tan' || 'cot':
          return xtrig(node.name, a, degrees);
        case 'asin' || 'acos' || 'atan' || 'acot':
          return xatrig(node.name, a, degrees);
        case 'ln':
          return xlog(xE, a);
        case 'lg':
          return xlog(xint(10), a);
        case 'log':
          return xlog(a, b!);
        case 'exp':
          return xpow(xE, a);
        case 'sign':
          return xint(xsign(a).toInt());
        case 'floor' || 'ceil' || 'round':
          final r = asQ(a);
          final v = approx(a);
          if (r == null && (v - jsRound(v)).abs() < 1e-9) throw ExactFail('near integer');
          final x = r != null ? qval(r) : v;
          final out = node.name == 'floor' ? x.floorToDouble() : (node.name == 'ceil' ? x.ceilToDouble() : jsRound(x));
          return xq(q(out));
        case 'min' || 'max':
          var best = args[0];
          for (final x in args.skip(1)) {
            final c = xcmp(x, best);
            if ((node.name == 'min' && c < 0) || (node.name == 'max' && c > 0)) best = x;
          }
          return best;
      }
      throw ExactFail('function');
  }
}

/// Олон гишүүнтийн рационал коэффициентийг ЯГ тоогоор.
X fromQ(Q a) => xq(a);
