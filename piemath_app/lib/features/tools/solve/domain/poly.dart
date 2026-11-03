// Нэг хувьсагчийн олон гишүүнт — рационал коэффициенттэй, ЯГ (вэбийн `solve/poly.ts`).
// Poly = коэффициентийн жагсаалт, индекс = зэрэг (p[0] — сул гишүүн).
import 'dart:math' as math;

import 'exact.dart';
import 'expr_ext.dart';
import 'q.dart';

typedef Poly = List<Q>;

class RatFn {
  const RatFn(this.num, this.den);
  final Poly num;
  final Poly den;
}

Poly trim(Poly p) {
  var n = p.length;
  while (n > 0 && isZ(p[n - 1])) {
    n--;
  }
  return p.sublist(0, n);
}

/// Тэг олон гишүүнт: -1.
int deg(Poly p) => trim(p).length - 1;

Q lead(Poly p) {
  final t = trim(p);
  return t.isNotEmpty ? t.last : qZero;
}

bool isZeroP(Poly p) => trim(p).isEmpty;
Poly constP(Q c) => trim([c]);
const Poly x1Poly = [qZero, qOne];

Poly padd(Poly a, Poly b) {
  final n = math.max(a.length, b.length);
  return trim([for (var i = 0; i < n; i++) qadd(qAt(a, i), qAt(b, i))]);
}

Poly pneg(Poly a) => a.map(qneg).toList();
Poly psub(Poly a, Poly b) => padd(a, pneg(b));
Poly pscale(Poly a, Q k) => trim(a.map((c) => qmul(c, k)).toList());

Poly pmul(Poly a0, Poly b0) {
  final a = trim(a0), b = trim(b0);
  if (a.isEmpty || b.isEmpty) return [];
  final r = List<Q>.filled(a.length + b.length - 1, qZero);
  for (var i = 0; i < a.length; i++) {
    if (isZ(a[i])) continue;
    for (var j = 0; j < b.length; j++) {
      r[i + j] = qadd(r[i + j], qmul(a[i], b[j]));
    }
  }
  return trim(r);
}

Poly ppow(Poly a, int k) {
  if (k > 64) throw ExactFail('degree too big');
  Poly r = [qOne];
  for (var i = 0; i < k; i++) {
    r = pmul(r, a);
  }
  return r;
}

({Poly q, Poly r}) pdivmod(Poly a0, Poly b0) {
  final a = trim(a0), b = trim(b0);
  if (b.isEmpty) throw ExactFail('division by zero polynomial');
  var r = List<Q>.of(a);
  final qq = List<Q>.filled(math.max(0, a.length - b.length + 1), qZero);
  final lb = b.last;
  while (trim(r).length >= b.length) {
    r = trim(r);
    final k = r.length - b.length;
    final c = qdiv(r.last, lb);
    qq[k] = c;
    for (var i = 0; i < b.length; i++) {
      r[i + k] = qsub(r[i + k], qmul(c, b[i]));
    }
    r = trim(r);
  }
  return (q: trim(qq), r: trim(r));
}

Poly monic(Poly p) => isZeroP(p) ? <Q>[] : pscale(p, qdiv(qOne, lead(p)));

Poly pgcd(Poly a0, Poly b0) {
  var a = trim(a0), b = trim(b0);
  while (b.isNotEmpty) {
    final t = pdivmod(a, b).r;
    a = b;
    b = t;
  }
  return monic(a);
}

Poly pderiv(Poly p) => trim([for (var i = 1; i < p.length; i++) qmul(p[i], q(i))]);

Q pevalQ(Poly p, Q x) {
  var r = qZero;
  for (var i = p.length - 1; i >= 0; i--) {
    r = qadd(qmul(r, x), p[i]);
  }
  return r;
}

X pevalX(Poly p, X x) {
  X r = xZero;
  for (var i = p.length - 1; i >= 0; i--) {
    r = xadd(xmul(r, x), xq(p[i]));
  }
  return r;
}

double pval(Poly p, double x) {
  var r = 0.0;
  for (var i = p.length - 1; i >= 0; i--) {
    r = r * x + qval(p[i]);
  }
  return r;
}

bool peq(Poly a, Poly b) => isZeroP(psub(a, b));

/// Бүхэл, анхны (коэффициентүүдийн ХИЕХ = 1), ахлах нь эерэг: p = k · prim.
({Q k, Poly prim}) primitive(Poly p0) {
  final p = trim(p0);
  if (p.isEmpty) return (k: qOne, prim: <Q>[]);
  var l = 1;
  for (final c in p) {
    l = ilcm(l, c.d);
  }
  final ints = p.map((c) => c.n * (l ~/ c.d)).toList();
  var g = 0;
  for (final v in ints) {
    g = igcd(g, v);
  }
  if (ints.last < 0) g = -g;
  return (k: q(g, l), prim: ints.map((v) => q(v ~/ g)).toList());
}

/* ---------- Модноос олон гишүүнт ---------- */

Q? _constOf(Expr node, String v) {
  if (freeSymbols(node).contains(v)) return null;
  try {
    return asQ(evalExact(node));
  } catch (_) {
    return null;
  }
}

/// Модыг v-ийн олон гишүүнт болгоно; боломжгүй бол null.
Poly? polyFrom(Expr node, [String v = 'x']) {
  try {
    return _pf(node, v);
  } catch (_) {
    return null;
  }
}

Poly? _pf(Expr n, String v) {
  final c = _constOf(n, v);
  if (c != null) return constP(c);
  switch (n.kind) {
    case ExprKind.sym:
      return n.name == v ? x1Poly : null;
    case ExprKind.neg:
      final a = _pf(n.a!, v);
      return a == null ? null : pneg(a);
    case ExprKind.add || ExprKind.sub || ExprKind.mul:
      final a = _pf(n.a!, v), b = _pf(n.b!, v);
      if (a == null || b == null) return null;
      return n.kind == ExprKind.add ? padd(a, b) : (n.kind == ExprKind.sub ? psub(a, b) : pmul(a, b));
    case ExprKind.div:
      final a = _pf(n.a!, v), b = _constOf(n.b!, v);
      if (a == null || b == null || isZ(b)) return null;
      return pscale(a, qdiv(qOne, b));
    case ExprKind.pow:
      final e = _constOf(n.b!, v);
      if (e == null || e.d != 1 || e.n < 0 || e.n > 64) return null;
      final a = _pf(n.a!, v);
      return a == null ? null : ppow(a, e.n);
    default:
      return null;
  }
}

/// Рационал функц N/D (хураахгүй — ОЗ-д хэрэгтэй).
RatFn? ratFrom(Expr node, [String v = 'x']) {
  try {
    return _rf(node, v);
  } catch (_) {
    return null;
  }
}

RatFn? _rf(Expr n, String v) {
  final c = _constOf(n, v);
  if (c != null) return RatFn(constP(c), const [qOne]);
  switch (n.kind) {
    case ExprKind.sym:
      return n.name == v ? const RatFn(x1Poly, [qOne]) : null;
    case ExprKind.neg:
      final a = _rf(n.a!, v);
      return a == null ? null : RatFn(pneg(a.num), a.den);
    case ExprKind.add || ExprKind.sub:
      final a = _rf(n.a!, v), b = _rf(n.b!, v);
      if (a == null || b == null) return null;
      final isAdd = n.kind == ExprKind.add;
      if (peq(a.den, b.den)) return RatFn(isAdd ? padd(a.num, b.num) : psub(a.num, b.num), a.den);
      final x = pmul(a.num, b.den), y = pmul(b.num, a.den);
      return RatFn(isAdd ? padd(x, y) : psub(x, y), pmul(a.den, b.den));
    case ExprKind.mul:
      final a = _rf(n.a!, v), b = _rf(n.b!, v);
      if (a == null || b == null) return null;
      return RatFn(pmul(a.num, b.num), pmul(a.den, b.den));
    case ExprKind.div:
      final a = _rf(n.a!, v), b = _rf(n.b!, v);
      if (a == null || b == null || isZeroP(b.num)) return null;
      return RatFn(pmul(a.num, b.den), pmul(a.den, b.num));
    case ExprKind.pow:
      final e = _constOf(n.b!, v);
      if (e == null || e.d != 1 || e.n.abs() > 32) return null;
      final a = _rf(n.a!, v);
      if (a == null) return null;
      final pn = ppow(a.num, e.n.abs()), pd = ppow(a.den, e.n.abs());
      if (e.n >= 0) return RatFn(pn, pd);
      return isZeroP(pn) ? null : RatFn(pd, pn);
    default:
      return null;
  }
}

/// Хураах: N/D-г ХИЕХ-ээр хувааж, хуваарийн ахлах коэффициентийг 1 болгоно.
RatFn ratReduce(RatFn r) {
  final g = pgcd(r.num, r.den);
  var numr = pdivmod(r.num, g).q, den = pdivmod(r.den, g).q;
  final l = lead(den);
  numr = pscale(numr, qdiv(qOne, l));
  den = pscale(den, qdiv(qOne, l));
  return RatFn(numr, den);
}

/* ---------- LaTeX / ASCII ---------- */

/// Коэффициент·хувьсагч: -\frac{1}{2}x^{2}+3x-1.
String ptex(Poly p0, [String v = 'x']) {
  final p = trim(p0);
  if (p.isEmpty) return '0';
  var s = '';
  for (var i = p.length - 1; i >= 0; i--) {
    final c = p[i];
    if (isZ(c)) continue;
    final negc = c.n < 0;
    final a = negc ? qneg(c) : c;
    final xs = i == 0 ? '' : (i == 1 ? v : '$v^{$i}');
    String body;
    if (i == 0) {
      body = qTex(a);
    } else if (a.n == 1 && a.d == 1) {
      body = xs;
    } else if (a.d == 1) {
      body = '${a.n}$xs';
    } else {
      body = '\\frac{${a.n}}{${a.d}}$xs';
    }
    s += negc ? '-$body' : (s.isNotEmpty ? '+$body' : body);
  }
  return s;
}

String pascii(Poly p0, [String v = 'x']) {
  final p = trim(p0);
  if (p.isEmpty) return '0';
  var s = '';
  for (var i = p.length - 1; i >= 0; i--) {
    final c = p[i];
    if (isZ(c)) continue;
    final a = c.n < 0 ? qneg(c) : c;
    final xs = i == 0 ? '' : (i == 1 ? v : '$v^$i');
    final coef = i == 0 ? qAscii(a) : (a.n == 1 && a.d == 1 ? '' : (a.d == 1 ? '${a.n}' : '(${qAscii(a)})'));
    final body = i == 0 ? coef : (coef.isNotEmpty ? '$coef*$xs' : xs);
    s += c.n < 0 ? '-$body' : (s.isNotEmpty ? '+$body' : body);
  }
  return s;
}

/* ---------- Язгуур ---------- */

class RatRoot {
  const RatRoot(this.r, this.m);
  final Q r;
  final int m;
}

class RatRoots {
  const RatRoots({required this.roots, required this.rest, required this.candidates, required this.scaled});
  final List<RatRoot> roots;
  final Poly rest;
  final List<Q> candidates;

  /// бүхэл коэффициенттэй хувилбар
  final Poly scaled;
}

/// Рационал язгуурын теорем + олон дахин хуваалт.
RatRoots rationalRoots(Poly p) {
  var rest = primitive(p).prim;
  final scaled = rest;
  final roots = <RatRoot>[];
  var zm = 0;
  while (rest.length > 1 && isZ(rest[0])) {
    rest = rest.sublist(1);
    zm++;
  }
  if (zm > 0) roots.add(RatRoot(qZero, zm));
  final candidates = <Q>[];
  if (deg(rest) >= 1) {
    final a0 = rest[0].n.abs(), an = lead(rest).n.abs();
    if (a0 > 1e12 || an > 1e12) throw ExactFail('coefficients too big');
    final ps = divisors(a0), qs = divisors(an);
    final seen = <String>{};
    for (final pp in ps) {
      for (final qq in qs) {
        for (final s in const [1, -1]) {
          final c = q(s * pp, qq);
          final k = '${c.n}/${c.d}';
          if (seen.add(k)) candidates.add(c);
        }
      }
    }
    ssort<Q>(candidates, (a, b) {
      final d = qval(a).abs() - qval(b).abs();
      return d != 0 ? d : qval(b) - qval(a);
    });
    for (final c in candidates) {
      if (deg(rest) < 1) break;
      var m = 0;
      while (deg(rest) >= 1 && isZ(pevalQ(rest, c))) {
        rest = pdivmod(rest, [qneg(c), qOne]).q;
        m++;
      }
      if (m > 0) roots.add(RatRoot(c, m));
    }
  }
  ssort<RatRoot>(roots, (a, b) => qval(a.r) - qval(b.r));
  return RatRoots(roots: roots, rest: rest, candidates: candidates, scaled: scaled);
}

/// Хорнерийн схем: p-г (x - r)-ээр хуваах мөрүүд.
({List<Q> top, List<Q> bottom, Q rem}) horner(Poly p, Q r) {
  final top = trim(p).reversed.toList();
  final bottom = <Q>[];
  var acc = qZero;
  for (final c in top) {
    acc = qadd(qmul(acc, r), c);
    bottom.add(acc);
  }
  final rem = bottom.removeLast();
  return (top: top, bottom: bottom, rem: rem);
}

String hornerTex(Poly p, Q r) {
  final h = horner(p, r);
  final cols = 'c' * h.top.length;
  return '\\begin{array}{c|$cols} & ${h.top.map(qTex).join(' & ')} \\\\ \\hline ${qTex(r)} & '
      '${h.bottom.map(qTex).join(' & ')} & \\mathbf{${qTex(h.rem)}} \\end{array}';
}

/// Бодит язгуурууд (тоон): уламжлалын язгуураар завсар хувааж хоёр хуваана.
List<double> realRootsNum(Poly p0) {
  final p = trim(p0);
  final d = p.length - 1;
  if (d < 1) return [];
  if (d == 1) return [-qval(p[0]) / qval(p[1])];
  final an = qval(p[d]).abs();
  var bb = 1.0;
  for (var i = 0; i < d; i++) {
    bb = math.max(bb, 1 + qval(p[i]).abs() / an);
  }
  final crit = realRootsNum(pderiv(p)).where((c) => c > -bb && c < bb);
  final pts = [-bb, ...crit, bb];
  double f(double x) => pval(p, x);
  var scale = 0.0;
  for (final c in p) {
    scale = math.max(scale, qval(c).abs());
  }
  final out = <double>[];
  void push(double x) {
    if (!out.any((y) => (y - x).abs() < 1e-7)) out.add(x);
  }

  for (var i = 0; i < pts.length - 1; i++) {
    var lo = pts[i], hi = pts[i + 1];
    var flo = f(lo);
    final fhi = f(hi);
    if (flo.abs() < 1e-11 * scale) {
      push(lo);
      continue;
    }
    if (flo * fhi < 0) {
      for (var k = 0; k < 200 && hi - lo > 1e-15 * math.max(1, lo.abs()); k++) {
        final mid = (lo + hi) / 2, fm = f(mid);
        if (fm == 0) {
          lo = hi = mid;
          break;
        }
        if (fm * flo < 0) {
          hi = mid;
        } else {
          lo = mid;
          flo = fm;
        }
      }
      push((lo + hi) / 2);
    }
  }
  if (f(bb).abs() < 1e-11 * scale) push(bb);
  ssort<double>(out, (a, b) => a - b);
  return out;
}
