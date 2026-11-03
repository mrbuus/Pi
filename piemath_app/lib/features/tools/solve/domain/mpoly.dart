// Олон хувьсагчийн олон гишүүнт (рационал коэффициент, ЯГ) — вэбийн `solve/mpoly.ts`.
// Хаалт задлах, үржигдэхүүнд задлах, систем, тригонометрийн орлуулгад.
import 'dart:math' as math;

import 'exact.dart';
import 'expr_ext.dart';
import 'poly.dart';
import 'q.dart';

typedef Mono = Map<String, int>;

class MTerm {
  const MTerm(this.m, this.c);
  final Mono m;
  final Q c;
}

typedef MPoly = Map<String, MTerm>;

String monoKey(Mono m) {
  final ks = m.keys.where((k) => m[k] != 0).toList()..sort();
  return ks.map((k) => '$k^${m[k]}').join('*');
}

Mono _clean(Mono m) {
  final ks = m.keys.toList()..sort();
  return {for (final k in ks) if (m[k] != 0) k: m[k]!};
}

MPoly mconst(Q c) => isZ(c) ? <String, MTerm>{} : {'': MTerm(const {}, c)};
MPoly mvar(String v) => {'$v^1': MTerm({v: 1}, qOne)};

MPoly mterm(Mono m, Q c) {
  final cm = _clean(m);
  return isZ(c) ? <String, MTerm>{} : {monoKey(cm): MTerm(cm, c)};
}

MPoly madd(MPoly a, MPoly b) {
  final r = <String, MTerm>{...a};
  for (final MapEntry(key: k, value: t) in b.entries) {
    final o = r[k];
    if (o != null) {
      final c = qadd(o.c, t.c);
      if (isZ(c)) {
        r.remove(k);
      } else {
        r[k] = MTerm(o.m, c);
      }
    } else {
      r[k] = t;
    }
  }
  return r;
}

MPoly mneg(MPoly a) => {for (final e in a.entries) e.key: MTerm(e.value.m, qneg(e.value.c))};
MPoly msub(MPoly a, MPoly b) => madd(a, mneg(b));

MPoly mscale(MPoly a, Q k) {
  if (isZ(k)) return {};
  return {for (final e in a.entries) e.key: MTerm(e.value.m, qmul(e.value.c, k))};
}

Mono mmulMono(Mono a, Mono b) {
  final r = <String, int>{...a};
  for (final k in b.keys) {
    r[k] = (r[k] ?? 0) + b[k]!;
  }
  return _clean(r);
}

MPoly mmul(MPoly a, MPoly b) {
  MPoly r = {};
  if (a.length * b.length > 20000) throw StateError('too big');
  for (final s in a.values) {
    for (final t in b.values) {
      r = madd(r, mterm(mmulMono(s.m, t.m), qmul(s.c, t.c)));
    }
  }
  return r;
}

MPoly mpow(MPoly a, int k) {
  if (k > 40) throw StateError('too big');
  var r = mconst(qOne);
  for (var i = 0; i < k; i++) {
    r = mmul(r, a);
  }
  return r;
}

bool misZero(MPoly a) => a.isEmpty;
bool mequal(MPoly a, MPoly b) => misZero(msub(a, b));

List<String> mvars(MPoly a) {
  final s = <String>{};
  for (final t in a.values) {
    s.addAll(t.m.keys);
  }
  return s.toList()..sort();
}

int tdeg(Mono m) => m.values.fold(0, (s, e) => s + e);

int mtotalDeg(MPoly a) {
  var d = -1;
  for (final t in a.values) {
    d = math.max(d, tdeg(t.m));
  }
  return d;
}

int mdegIn(MPoly a, String v) {
  var d = 0;
  for (final t in a.values) {
    d = math.max(d, t.m[v] ?? 0);
  }
  return d;
}

/// v-ийн зэргээр коэффициентууд: p = Σ c_k v^k.
List<MPoly> mcoeffs(MPoly a, String v) {
  final out = <MPoly>[];
  for (final t in a.values) {
    final k = t.m[v] ?? 0;
    final m = <String, int>{...t.m}..remove(v);
    while (out.length <= k) {
      out.add({});
    }
    out[k] = madd(out[k], mterm(m, t.c));
  }
  return out;
}

/// Индексээр (хэтэрвэл тэг).
MPoly mcoeffAt(MPoly a, String v, int k) {
  final cs = mcoeffs(a, v);
  return k < cs.length ? cs[k] : {};
}

/// v-г өөр олон гишүүнтээр орлуулна.
MPoly msubst(MPoly a, String v, MPoly b) {
  MPoly r = {};
  final cs = mcoeffs(a, v);
  var pw = mconst(qOne);
  for (var k = 0; k < cs.length; k++) {
    if (k > 0) pw = mmul(pw, b);
    r = madd(r, mmul(cs[k], pw));
  }
  return r;
}

/// Нэг хувьсагчтай бол Poly (v-ээр).
Poly? toUni(MPoly a, String v) {
  final vs = mvars(a);
  if (vs.any((x) => x != v)) return null;
  final p = <Q>[];
  for (final t in a.values) {
    final k = t.m[v] ?? 0;
    while (p.length <= k) {
      p.add(qZero);
    }
    p[k] = qadd(p[k], t.c);
  }
  return trim(p);
}

MPoly fromUni(Poly p, String v) {
  MPoly r = {};
  for (var i = 0; i < p.length; i++) {
    r = madd(r, mterm(i > 0 ? {v: i} : {}, p[i]));
  }
  return r;
}

/// Тогтмол бол Q.
Q? masConst(MPoly a) {
  if (a.isEmpty) return qZero;
  if (a.length == 1 && a.containsKey('')) return a['']!.c;
  return null;
}

/* ---------- Модноос ---------- */

MPoly? mfrom(Expr node, {String? Function(Expr n)? map, Set<String>? vars}) {
  try {
    return _mf(node, map, vars);
  } catch (_) {
    return null;
  }
}

Q? _constQ(Expr n) {
  try {
    return asQ(evalExact(n));
  } catch (_) {
    return null;
  }
}

MPoly? _mf(Expr n, String? Function(Expr n)? map, Set<String>? vars) {
  final sym = map?.call(n);
  if (sym != null && sym.isNotEmpty) return mvar(sym);
  if (freeSymbols(n).isEmpty) {
    final c = _constQ(n);
    return c != null ? mconst(c) : null;
  }
  switch (n.kind) {
    case ExprKind.sym:
      if (n.name == 'pi' || n.name == 'e') return null;
      if (vars != null && !vars.contains(n.name)) return null;
      return mvar(n.name);
    case ExprKind.neg:
      final a = _mf(n.a!, map, vars);
      return a == null ? null : mneg(a);
    case ExprKind.add || ExprKind.sub || ExprKind.mul:
      final a = _mf(n.a!, map, vars), b = _mf(n.b!, map, vars);
      if (a == null || b == null) return null;
      return n.kind == ExprKind.add ? madd(a, b) : (n.kind == ExprKind.sub ? msub(a, b) : mmul(a, b));
    case ExprKind.div:
      final a = _mf(n.a!, map, vars);
      final b = freeSymbols(n.b!).isEmpty ? _constQ(n.b!) : null;
      if (a == null || b == null || isZ(b)) return null;
      return mscale(a, qdiv(qOne, b));
    case ExprKind.pow:
      final e = freeSymbols(n.b!).isEmpty ? _constQ(n.b!) : null;
      if (e == null || e.d != 1 || e.n < 0 || e.n > 40) return null;
      final a = _mf(n.a!, map, vars);
      return a == null ? null : mpow(a, e.n);
    default:
      return null;
  }
}

/* ---------- Эрэмбэ ба LaTeX ---------- */

/// Нийт зэргээр буурах, дараа нь үсгийн дарааллаар (x^2+2xy+y^2).
List<MTerm> sortedTerms(MPoly a, [List<String>? order]) {
  final vs = order ?? mvars(a);
  return sortedCopy<MTerm>(a.values, (s, t) {
    final d = tdeg(t.m) - tdeg(s.m);
    if (d != 0) return d;
    for (final v in vs) {
      final e = (t.m[v] ?? 0) - (s.m[v] ?? 0);
      if (e != 0) return e;
    }
    return 0;
  });
}

String monoTex(Mono m) {
  final ks = m.keys.toList()..sort();
  return ks.map((k) => m[k] == 1 ? k : '$k^{${m[k]}}').join();
}

String mtex(MPoly a, [List<String>? order]) {
  if (a.isEmpty) return '0';
  var s = '';
  for (final t in sortedTerms(a, order)) {
    final negc = t.c.n < 0;
    final c = negc ? qneg(t.c) : t.c;
    final mt = monoTex(t.m);
    String body;
    if (mt.isEmpty) {
      body = qTex(c);
    } else if (c.n == 1 && c.d == 1) {
      body = mt;
    } else if (c.d == 1) {
      body = '${c.n}$mt';
    } else {
      body = '\\frac{${c.n}}{${c.d}}$mt';
    }
    s += negc ? '-$body' : (s.isNotEmpty ? '+$body' : body);
  }
  return s;
}

String mascii(MPoly a) {
  if (a.isEmpty) return '0';
  var s = '';
  for (final t in sortedTerms(a)) {
    final negc = t.c.n < 0;
    final c = negc ? qneg(t.c) : t.c;
    final ks = t.m.keys.toList()..sort();
    final mt = ks.map((k) => t.m[k] == 1 ? k : '$k^${t.m[k]}').join('*');
    final cs = c.d == 1 ? '${c.n}' : '(${qAscii(c)})';
    final body = mt.isEmpty ? qAscii(c) : (c.n == 1 && c.d == 1 ? mt : '$cs*$mt');
    s += negc ? '-$body' : (s.isNotEmpty ? '+$body' : body);
  }
  return s;
}

/// Хоёр нэг гишүүнт ижил эсэх.
bool monoEq(Mono a, Mono b) => monoKey(a) == monoKey(b);
