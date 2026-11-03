// Нэг үл мэдэгдэгчтэй тэгшитгэл: ангилж, алхамтай бодно (вэбийн `solve/equation.ts`).
//
// F(x) = L - R = 0 гэж үзээд дарааллаар оролдоно:
//   олон гишүүнт → рационал (ОЗ) → модуль (завсрын арга) → иррациональ
//   (квадрат зэрэгт дэвшүүлж шалгах) → үзүүлэнт → логарифм → тригонометр.
// Олдсон язгуур бүрийг анхны тэгшитгэлд орлуулж ЯГ (эсвэл тоогоор) шалгана —
// шалгалт унавал хариу гаргахгүй. Чадахгүй бол үнэнээр хэлнэ.
import 'dart:math' as math;

import 'exact.dart';
import 'expr_ext.dart';
import 'mpoly.dart';
import 'poly.dart';
import 'q.dart';
import 'roots.dart';
import 'steps.dart';

/* ---------- Мод туслахууд ---------- */

/// Мод үүсгэх товчлол (вэбийн `N`).
abstract final class N {
  static Expr number(double v) => v < 0 ? mkNeg(mkNum(-v)) : mkNum(v);
  static Expr q(Q c) {
    final top = mkNum(c.n.abs());
    final body = c.d == 1 ? top : mkDiv(top, mkNum(c.d));
    return c.n < 0 ? mkNeg(body) : body;
  }

  static Expr sub(Expr a, Expr b) => mkSub(a, b);
  static Expr add(Expr a, Expr b) => mkAdd(a, b);
  static Expr mul(Expr a, Expr b) => mkMul(a, b);
  static Expr div(Expr a, Expr b) => mkDiv(a, b);
  static Expr pow(Expr a, Expr b) => mkPow(a, b);
  static Expr neg(Expr a) => mkNeg(a);
}

bool dep(Expr n, String v) => freeSymbols(n).contains(v);

List<Expr> collect(Expr n, bool Function(Expr n) pred, [List<Expr>? acc]) {
  final out = acc ?? <Expr>[];
  if (pred(n)) out.add(n);
  switch (n.kind) {
    case ExprKind.neg || ExprKind.fact:
      collect(n.a!, pred, out);
    case ExprKind.call:
      for (final a in n.args) {
        collect(a, pred, out);
      }
    case ExprKind.num || ExprKind.sym:
      break;
    default:
      collect(n.a!, pred, out);
      collect(n.b!, pred, out);
  }
  return out;
}

Expr _mapNode(Expr n, Expr? Function(Expr n) f) {
  final r = f(n);
  if (r != null) return r;
  switch (n.kind) {
    case ExprKind.neg:
      return mkNeg(_mapNode(n.a!, f));
    case ExprKind.fact:
      return mkFact(_mapNode(n.a!, f));
    case ExprKind.call:
      return mkCall(n.name, n.args.map((a) => _mapNode(a, f)).toList());
    case ExprKind.num || ExprKind.sym:
      return n;
    default:
      return Expr.bin(n.kind, _mapNode(n.a!, f), _mapNode(n.b!, f));
  }
}

/// Тоон утга (градусын горимтой).
double numAt(Expr f, String v, double x, [bool degrees = false]) {
  try {
    return compileExpr(f, degrees: degrees)({v: x});
  } catch (_) {
    return double.nan;
  }
}

/// ЯГ утгын үр дүн: [value] эсвэл [nan] (бодит биш), аль аль нь үгүй бол чадаагүй.
class ExactAt {
  const ExactAt(this.value, {this.nan = false});
  final X? value;
  final bool nan;
}

/// ЯГ утга; чадахгүй бол value=null, бодит биш бол nan=true.
ExactAt exactAt(Expr f, String v, X x, [bool degrees = false]) {
  try {
    return ExactAt(evalExact(f, scope: {v: x}, degrees: degrees));
  } on NotReal {
    return const ExactAt(null, nan: true);
  } catch (_) {
    return const ExactAt(null);
  }
}

/// Язгуурыг анхны тэгшитгэлд орлуулж шалгана.
bool checkRoot(Expr f, String v, Root r, [bool degrees = false]) {
  if (r.x != null) {
    final ex = exactAt(f, v, r.x!, degrees);
    if (ex.nan) return false;
    if (ex.value != null) return isZero(ex.value!);
  }
  final y = numAt(f, v, r.v, degrees);
  if (!y.isFinite) return false;
  final h = 1e-6 * math.max(1, r.v.abs());
  final s = [1.0, numAt(f, v, r.v + h, degrees).abs(), numAt(f, v, r.v - h, degrees).abs()].reduce(_jsMax);
  return y.abs() <= 1e-8 * s;
}

/// JS Math.max (NaN бол NaN).
double _jsMax(double a, double b) => (a.isNaN || b.isNaN) ? double.nan : math.max(a, b);

/* ---------- Үр дүнгийн бүтэц ---------- */

class Family {
  const Family(this.tex, this.sample);
  final String tex;
  final List<double> Function(int n) sample;
}

enum ZerosKind { finite, periodic, fail }

class Segment {
  const Segment(this.a, this.b);
  final Root a;
  final Root b;
}

class Zeros {
  const Zeros({
    required this.kind,
    this.roots = const [],
    this.complete = false,
    this.exact = false,
    this.all = false,
    this.except,
    this.segments,
    this.families,
    this.title,
  });

  final ZerosKind kind;
  final List<Root> roots;
  final bool complete;
  final bool exact;

  /// x дурын (except-ээс бусад)
  final bool all;
  final List<Root>? except;

  /// F ≡ 0 байх битүү завсрууд (модультай тэгшитгэлд)
  final List<Segment>? segments;
  final List<Family>? families;
  final String? title;

  Zeros withTitle(String t) => Zeros(
    kind: kind,
    roots: roots,
    complete: complete,
    exact: exact,
    all: all,
    except: except,
    segments: segments,
    families: families,
    title: t,
  );
}

class EqCtx {
  EqCtx({
    required this.v,
    required this.degrees,
    required this.steps,
    required this.quiet,
    this.rel,
    required this.depth,
  });
  final String v;
  final bool degrees;
  final List<Step> steps;
  final bool quiet;

  /// Дээд түвшний харьцаа — гоё хэлбэрийг таних
  final (Expr, Expr)? rel;
  final int depth;
}

const _fail = Zeros(kind: ZerosKind.fail);

Zeros _fromRoots(Roots r, [String? title]) =>
    Zeros(kind: ZerosKind.finite, roots: r.roots, complete: r.complete, exact: r.exact, all: r.all, title: title);

void _say(EqCtx c, Step s) {
  if (!c.quiet) c.steps.add(s);
}

EqCtx _sub(EqCtx c, [bool? quiet]) {
  final qt = quiet ?? c.quiet;
  return EqCtx(v: c.v, degrees: c.degrees, steps: qt ? <Step>[] : c.steps, quiet: qt, depth: c.depth + 1);
}

/* ---------- Гол хуваарилагч ---------- */

Zeros findZeros(Expr f, EqCtx c) {
  if (c.depth > 6) return _fail;
  if (!dep(f, c.v)) {
    try {
      final k = evalExact(f, degrees: c.degrees);
      return isZero(k)
          ? const Zeros(kind: ZerosKind.finite, complete: true, exact: true, all: true)
          : const Zeros(kind: ZerosKind.finite, complete: true, exact: true);
    } catch (_) {
      final k = numAt(f, c.v, 0, c.degrees);
      if (k.isFinite && k.abs() > 1e-9) return const Zeros(kind: ZerosKind.finite, complete: true, exact: true);
      return _fail;
    }
  }
  const methods = [
    _polyMethod,
    _ratMethod,
    _absMethod,
    _radicalMethod,
    _expMethod,
    _logMethod,
    _trigMethod,
    _quotientMethod,
    _productMethod,
  ];
  for (final m in methods) {
    Zeros? z;
    final mark = c.steps.length;
    try {
      z = m(f, c);
    } catch (_) {
      z = _fail;
    }
    if (z != null) {
      if (z.kind == ZerosKind.fail && c.steps.length > mark) c.steps.removeRange(mark, c.steps.length);
      return z;
    }
  }
  return _fail;
}

/* ---------- 1. Олон гишүүнт ---------- */

String _polyTitle(int d, Poly p) {
  if (d < 1) return 'Шугаман тэгшитгэл';
  if (d == 1) return 'Шугаман тэгшитгэл';
  if (d == 2) return 'Квадрат тэгшитгэл';
  if (d == 4 && isZ(qAt(p, 1)) && isZ(qAt(p, 3))) return 'Биквадрат тэгшитгэл';
  if (d == 3) return 'Куб тэгшитгэл';
  return '$d-р зэргийн тэгшитгэл';
}

Zeros? _polyMethod(Expr f, EqCtx c) {
  final p = polyFrom(f, c.v);
  if (p == null) return null;
  if (c.rel != null && !c.quiet) {
    final std = '${ptex(p, c.v)} = 0';
    final orig = '${toLatex(c.rel!.$1)}=${toLatex(c.rel!.$2)}';
    if (std.replaceAll(RegExp(r'\s'), '') != orig.replaceAll(RegExp(r'\s'), '')) {
      _say(c, Step(text: 'Бүх гишүүнийг зүүн тал руу шилжүүлж эмхэтгэвэл', tex: [std]));
    }
  }
  final r = solvePoly(p, c.steps, v: c.v, quiet: c.quiet);
  return _fromRoots(r, _polyTitle(deg(p), p));
}

/* ---------- 2. Рационал (бутархай) ---------- */

List<Expr> _denominators(Expr f, String v) {
  final out = <Expr>[];
  collect(f, (n) {
    if (n.kind == ExprKind.div && dep(n.b!, v)) out.add(n.b!);
    if (n.kind == ExprKind.pow && dep(n.a!, v) && !dep(n.b!, v)) {
      try {
        final e = asQ(evalExact(n.b!));
        if (e != null && e.n < 0) out.add(n.a!);
      } catch (_) {}
    }
    return false;
  });
  final uq = <Expr>[];
  for (final d in out) {
    if (!uq.any((u) => same(u, d))) uq.add(d);
  }
  return uq;
}

({List<Root> pts, bool ok, List<String> tex}) _excluded(Expr f, EqCtx c) {
  final pts = <Root>[];
  final tex = <String>[];
  var ok = true;
  for (final d in _denominators(f, c.v)) {
    final z = findZeros(d, _sub(c, true));
    if (z.kind != ZerosKind.finite || !z.complete || z.all) {
      ok = false;
      continue;
    }
    pts.addAll(z.roots);
    tex.add('${toLatex(d)} \\ne 0');
  }
  return (pts: mergeRoots(pts), ok: ok, tex: tex);
}

bool _inList(Root r, List<Root> list) => list.any(
  (e) => e.x != null && r.x != null ? xeq(e.x!, r.x!) : (e.v - r.v).abs() < 1e-9 * math.max(1, r.v.abs()),
);

Zeros? _ratMethod(Expr f, EqCtx c) {
  final rf = ratFrom(f, c.v);
  if (rf == null || deg(rf.den) < 1) return null;
  final ex = _excluded(f, c);
  if (!ex.ok) return _fail;
  if (ex.tex.isNotEmpty) {
    _say(
      c,
      Step(
        text: 'Тодорхойлогдох муж (ОЗ): хуваарь тэгээс ялгаатай',
        tex: [
          ex.tex.join(r',\quad ') +
              (ex.pts.isNotEmpty ? '\\ \\Rightarrow\\ ${c.v} \\ne ${ex.pts.map((p) => p.tex).join(r',\ ')}' : ''),
        ],
      ),
    );
  }
  final numr = rf.num;
  _say(
    c,
    Step(
      text: 'Ерөнхий хуваарьт оруулбал бутархай тэгтэй тэнцэх нь хүртвэр тэг байх явдал',
      tex: ['${ptex(numr, c.v)} = 0'],
    ),
  );
  const title = 'Бутархай-рационал тэгшитгэл';
  if (isZeroP(numr)) {
    return Zeros(kind: ZerosKind.finite, complete: true, exact: true, all: true, except: ex.pts, title: title);
  }
  final r = solvePoly(numr, c.steps, v: c.v, quiet: c.quiet);
  final good = <Root>[];
  for (final root in r.roots) {
    if (_inList(root, ex.pts)) {
      _say(c, Step(text: '\$${c.v} = ${root.tex}\$ нь ОЗ-д харьяалагдахгүй тул гаднах язгуур', tone: Tone.bad));
    } else {
      good.add(root);
    }
  }
  if (r.all) {
    return Zeros(kind: ZerosKind.finite, complete: true, exact: true, all: true, except: ex.pts, title: title);
  }
  return Zeros(kind: ZerosKind.finite, roots: good, complete: r.complete, exact: r.exact, title: title);
}

/* ---------- 3. Модуль ---------- */

bool _isAbs(Expr n, String v) => n.kind == ExprKind.call && n.name == 'abs' && dep(n.args[0], v);

bool _inside(Root r, Root? lo, Root? hi) {
  bool ge(Root a, Root b) =>
      a.x != null && b.x != null ? xcmp(a.x!, b.x!) >= 0 : a.v >= b.v - 1e-9 * math.max(1, b.v.abs());
  return (lo == null || ge(r, lo)) && (hi == null || ge(hi, r));
}

String _negTex(String kt) => '-${kt.startsWith('-') ? '($kt)' : kt}';

Zeros? _absMethod(Expr f, EqCtx c) {
  final absNodes = collect(f, (n) => _isAbs(n, c.v));
  if (absNodes.isEmpty) return null;
  const title = 'Модультай тэгшитгэл';

  if (c.rel != null) {
    final (lhs, rhs) = c.rel!;
    Expr? aN, bN;
    if (_isAbs(lhs, c.v)) {
      aN = lhs;
      bN = rhs;
    } else if (_isAbs(rhs, c.v)) {
      aN = rhs;
      bN = lhs;
    }
    if (aN != null && bN != null && aN.kind == ExprKind.call) {
      final u = aN.args[0];
      final b = bN;
      if (!dep(b, c.v) && collect(u, (n) => _isAbs(n, c.v)).isEmpty) {
        X? k;
        try {
          k = evalExact(b);
        } catch (_) {
          k = null;
        }
        if (k != null) {
          final kt = xtex(k);
          if (xsign(k) < 0) {
            _say(c, Step(text: 'Модуль сөрөг тоотой тэнцэхгүй (\$$kt < 0\$) тул шийдгүй'));
            return const Zeros(kind: ZerosKind.finite, complete: true, exact: true, title: title);
          }
          if (isZero(k)) {
            _say(c, Step(text: 'Модуль тэгтэй тэнцвэл доторх илэрхийлэл тэг', tex: ['${toLatex(u)} = 0']));
            final z = findZeros(u, _sub(c));
            return z.kind == ZerosKind.fail ? _fail : z.withTitle(title);
          }
          _say(c, Step(text: '\$|a| = $kt\$ \$($kt > 0)\$ бол \$a = $kt\$ эсвэл \$a = ${_negTex(kt)}\$'));
          final all = <Root>[];
          var complete = true;
          for (final (i, sgn) in const [(1, 1), (2, -1)]) {
            final target = sgn > 0 ? b : N.neg(b);
            _say(c, Step(text: '$i) \$${toLatex(u)} = ${sgn > 0 ? kt : _negTex(kt)}\$'));
            final z = findZeros(N.sub(u, target), _sub(c));
            if (z.kind != ZerosKind.finite || z.all) return _fail;
            complete = complete && z.complete;
            all.addAll(z.roots);
          }
          final roots = mergeRoots(all);
          return Zeros(
            kind: ZerosKind.finite,
            roots: roots,
            complete: complete,
            exact: roots.every((r) => r.x != null),
            title: title,
          );
        }
      }
      if (_isAbs(b, c.v) && b.kind == ExprKind.call) {
        final w = b.args[0];
        if (collect(u, (n) => _isAbs(n, c.v)).isEmpty && collect(w, (n) => _isAbs(n, c.v)).isEmpty) {
          _say(c, const Step(text: r'$|a| = |b|$ бол $a = b$ эсвэл $a = -b$'));
          final all = <Root>[];
          var complete = true;
          for (final (i, g) in [(1, N.sub(u, w)), (2, N.add(u, w))]) {
            _say(
              c,
              Step(text: '$i) \$${toLatex(u)} = ${i == 1 ? toLatex(w) : '-\\left(${toLatex(w)}\\right)'}\$'),
            );
            final z = findZeros(g, _sub(c));
            if (z.kind != ZerosKind.finite) return _fail;
            if (z.all) return _fail;
            complete = complete && z.complete;
            all.addAll(z.roots);
          }
          final roots = mergeRoots(all);
          return Zeros(
            kind: ZerosKind.finite,
            roots: roots,
            complete: complete,
            exact: roots.every((r) => r.x != null),
            title: title,
          );
        }
      }
    }
  }

  // Ерөнхий: завсрын арга
  final crit = <Root>[];
  for (final a in absNodes) {
    if (a.kind != ExprKind.call) continue;
    final z = findZeros(a.args[0], _sub(c, true));
    if (z.kind != ZerosKind.finite || !z.complete || z.all) return _fail;
    crit.addAll(z.roots);
  }
  final pts = mergeRoots(crit).map((r) => r.copy(mult: 1)).toList();
  _say(
    c,
    Step(
      text: 'Модулийн доторх илэрхийллийг тэгтэй тэнцүүлж, тоон шулууныг завсруудад хуваана',
      tex: pts.isNotEmpty ? ['${c.v} = ${pts.map((p) => p.tex).join(r',\ ')}'] : null,
    ),
  );
  final roots = <Root>[];
  final segments = <Segment>[];
  var complete = true;
  for (var i = 0; i <= pts.length; i++) {
    final lo = i > 0 ? pts[i - 1] : null, hi = i < pts.length ? pts[i] : null;
    final t = lo != null && hi != null
        ? (lo.v + hi.v) / 2
        : (lo != null ? lo.v + 1 : (hi != null ? hi.v - 1 : 0.0));
    final signOf = Map<Expr, double>.identity();
    for (final a in absNodes) {
      if (a.kind == ExprKind.call) {
        final s = jsSign(numAt(a.args[0], c.v, t, c.degrees));
        signOf[a] = (s == 0 || s.isNaN) ? 1 : s;
      }
    }
    Expr repl(Expr n) => _mapNode(n, (m) {
      final s = signOf[m];
      if (s == null || m.kind != ExprKind.call) return null;
      final inner = repl(m.args[0]);
      return s > 0 ? inner : N.neg(inner);
    });
    final g = repl(f);
    final lab = '${lo != null ? '[${lo.tex}' : r'(-\infty'};\\ ${hi != null ? '${hi.tex}]' : r'+\infty)'}';
    final z = findZeros(g, _sub(c, true));
    if (z.kind != ZerosKind.finite) return _fail;
    complete = complete && z.complete;
    if (z.all) {
      if (lo == null || hi == null || (z.except != null && z.except!.isNotEmpty)) return _fail;
      segments.add(Segment(lo, hi));
      _say(c, Step(text: '\$${c.v}\\in $lab\$ үед тэгшитгэл адилтгал болж, завсар бүхэлдээ шийд'));
      continue;
    }
    final inI = z.roots.where((r) => _inside(r, lo, hi)).toList();
    final out = z.roots.where((r) => !_inside(r, lo, hi)).toList();
    roots.addAll(inI);
    _say(
      c,
      Step(
        text: '\$${c.v}\\in $lab\$ үед модулийг тэмдгээр нь задлавал',
        tex: [
          '${toLatex(g)} = 0',
          if (inI.isNotEmpty) '${c.v} = ${inI.map((r) => r.tex).join(r',\ ')}',
        ],
      ),
    );
    for (final r in out) {
      _say(c, Step(text: '\$${c.v} = ${r.tex}\$ энэ завсарт орохгүй', tone: Tone.bad));
    }
    if (z.roots.isEmpty) _say(c, const Step(text: 'Энэ завсарт шийдгүй'));
  }
  final merged = mergeRoots(roots).where((r) => !segments.any((s) => _inside(r, s.a, s.b))).toList();
  return Zeros(
    kind: ZerosKind.finite,
    roots: merged,
    complete: complete,
    exact: merged.every((r) => r.x != null),
    segments: segments.isNotEmpty ? segments : null,
    title: title,
  );
}

/* ---------- 4. Иррациональ ---------- */

class _Rad {
  const _Rad(this.q, this.r);
  final Poly q;
  final Poly r;
}

class _RadSum {
  const _RadSum(this.s, this.rads);
  final Poly s;
  final Map<String, _Rad> rads;
}

String _rkey(Poly r) => r.map((x) => '${x.n}/${x.d}').join(',');

_RadSum _radAdd(_RadSum a, _RadSum b, [int sgn = 1]) {
  final rads = <String, _Rad>{...a.rads};
  for (final MapEntry(key: k, value: r) in b.rads.entries) {
    final qb = sgn > 0 ? r.q : pscale(r.q, q(-1));
    final o = rads[k];
    if (o != null) {
      final qs = padd(o.q, qb);
      if (isZeroP(qs)) {
        rads.remove(k);
      } else {
        rads[k] = _Rad(qs, o.r);
      }
    } else {
      rads[k] = _Rad(qb, r.r);
    }
  }
  return _RadSum(sgn > 0 ? padd(a.s, b.s) : psub(a.s, b.s), rads);
}

_RadSum _radMul(_RadSum a, _RadSum b) {
  var out = _RadSum(pmul(a.s, b.s), {});
  void addRad(Poly qq, Poly r) {
    if (isZeroP(qq)) return;
    out = _radAdd(out, _RadSum(const [], {_rkey(r): _Rad(qq, r)}));
  }

  for (final r in b.rads.values) {
    addRad(pmul(a.s, r.q), r.r);
  }
  for (final r in a.rads.values) {
    addRad(pmul(b.s, r.q), r.r);
  }
  for (final r1 in a.rads.values) {
    for (final r2 in b.rads.values) {
      if (_rkey(r1.r) == _rkey(r2.r)) {
        out = _RadSum(padd(out.s, pmul(pmul(r1.q, r2.q), r1.r)), out.rads);
      } else {
        addRad(pmul(r1.q, r2.q), pmul(r1.r, r2.r));
      }
    }
  }
  if (out.rads.length > 3) throw ExactFail('too many radicals');
  return out;
}

_RadSum? _radParse(Expr n, String v) {
  final p = polyFrom(n, v);
  if (p != null) return _RadSum(p, {});
  _RadSum? sqrtOf(Expr arg) {
    final r = polyFrom(arg, v);
    if (r == null || deg(r) < 1) return null;
    return _RadSum(const [], {_rkey(r): _Rad(const [qOne], r)});
  }

  switch (n.kind) {
    case ExprKind.call:
      if (n.name == 'sqrt') return sqrtOf(n.args[0]);
      if (n.name == 'root') {
        try {
          final k = asQ(evalExact(n.args[0]));
          if (k != null && k.n == 2 && k.d == 1) return sqrtOf(n.args[1]);
        } catch (_) {}
      }
      return null;
    case ExprKind.neg:
      final a = _radParse(n.a!, v);
      return a == null ? null : _radAdd(const _RadSum([], {}), a, -1);
    case ExprKind.add || ExprKind.sub:
      final a = _radParse(n.a!, v), b = _radParse(n.b!, v);
      return a == null || b == null ? null : _radAdd(a, b, n.kind == ExprKind.add ? 1 : -1);
    case ExprKind.mul:
      final a = _radParse(n.a!, v), b = _radParse(n.b!, v);
      return a == null || b == null ? null : _radMul(a, b);
    case ExprKind.div:
      final a = _radParse(n.a!, v), d = polyFrom(n.b!, v);
      if (a == null || d == null || deg(d) != 0) return null;
      final k = qdiv(qOne, d[0]);
      final rads = <String, _Rad>{};
      for (final MapEntry(key: key, value: r) in a.rads.entries) {
        rads[key] = _Rad(pscale(r.q, k), r.r);
      }
      return _RadSum(pscale(a.s, k), rads);
    case ExprKind.pow:
      if (dep(n.b!, v)) return null;
      Q? e;
      try {
        e = asQ(evalExact(n.b!));
      } catch (_) {
        e = null;
      }
      if (e == null) return null;
      if (e.n == 1 && e.d == 2) return sqrtOf(n.a!);
      if (e.d != 1 || e.n < 1 || e.n > 6) return null;
      final a = _radParse(n.a!, v);
      if (a == null) return null;
      var r = const _RadSum([qOne], {});
      for (var i = 0; i < e.n; i++) {
        r = _radMul(r, a);
      }
      return r;
    default:
      return null;
  }
}

String _radTex(_Rad r, String v) {
  final qt = ptex(r.q, v);
  final co = qt == '1'
      ? ''
      : qt == '-1'
      ? '-'
      : (deg(r.q) >= 1 && r.q.where((x) => !isZ(x)).length > 1 ? '\\left($qt\\right)' : qt);
  return '$co\\sqrt{${ptex(r.r, v)}}';
}

Zeros? _radicalMethod(Expr f, EqCtx c) {
  bool fracPow(Expr n) {
    if (n.kind != ExprKind.pow || !dep(n.a!, c.v) || dep(n.b!, c.v)) return false;
    try {
      final e = asQ(evalExact(n.b!));
      return e != null && e.d == 2;
    } catch (_) {
      return false;
    }
  }

  final rootNodes = collect(
    f,
    (n) => (n.kind == ExprKind.call && (n.name == 'sqrt' || n.name == 'root') && dep(n, c.v)) || fracPow(n),
  );
  if (rootNodes.isEmpty) return null;
  final rs = _radParse(f, c.v);
  if (rs == null || rs.rads.isEmpty) return null;
  if (rs.rads.length > 2) return _fail;
  final v = c.v;
  final conds = rootNodes
      .where((n) => n.kind == ExprKind.call)
      .map((n) => '${toLatex(n.name == 'root' ? n.args[1] : n.args[0])} \\ge 0')
      .toList();
  if (conds.isNotEmpty) {
    _say(
      c,
      Step(text: 'Тодорхойлогдох муж: язгуурын доорх илэрхийлэл сөрөг биш', tex: [uniq(conds).join(r',\quad ')]),
    );
  }
  final rads = rs.rads.values.toList();
  Poly fin;
  if (rads.length == 1) {
    final r = rads[0];
    _say(c, Step(text: 'Язгуурыг нэг талд үлдээвэл', tex: ['${_radTex(r, v)} = ${ptex(pscale(rs.s, q(-1)), v)}']));
    final l = pmul(pmul(r.q, r.q), r.r), rt = pmul(rs.s, rs.s);
    _say(c, Step(text: 'Хоёр талыг квадрат зэрэгт дэвшүүлбэл', tex: ['${ptex(l, v)} = ${ptex(rt, v)}']));
    fin = psub(l, rt);
  } else {
    final r1 = rads[0], r2 = rads[1];
    final s = rs.s;
    if (isZeroP(s)) {
      _say(
        c,
        Step(
          text: 'Язгууруудыг хоёр талд байрлуулбал',
          tex: ['${_radTex(r1, v)} = ${_radTex(_Rad(pscale(r2.q, q(-1)), r2.r), v)}'],
        ),
      );
      fin = psub(pmul(pmul(r1.q, r1.q), r1.r), pmul(pmul(r2.q, r2.q), r2.r));
      _say(
        c,
        Step(
          text: 'Квадрат зэрэгт дэвшүүлбэл',
          tex: ['${ptex(pmul(pmul(r1.q, r1.q), r1.r), v)} = ${ptex(pmul(pmul(r2.q, r2.q), r2.r), v)}'],
        ),
      );
    } else {
      final negS = pscale(s, q(-1));
      final r2t = _radTex(_Rad(pscale(r2.q, q(-1)), r2.r), v);
      _say(
        c,
        Step(
          text: 'Нэг язгуурыг тусгаарлавал',
          tex: ['${_radTex(r1, v)} = ${ptex(negS, v)}${r2t.startsWith('-') ? r2t : '+$r2t'}'],
        ),
      );
      final aa = pscale(pmul(s, r2.q), q(2));
      final bb = psub(psub(pmul(pmul(r1.q, r1.q), r1.r), pmul(s, s)), pmul(pmul(r2.q, r2.q), r2.r));
      _say(
        c,
        Step(
          text: 'Квадрат зэрэгт дэвшүүлж, үлдсэн язгуурыг тусгаарлавал',
          tex: ['${_radTex(_Rad(aa, r2.r), v)} = ${ptex(bb, v)}'],
        ),
      );
      fin = psub(pmul(pmul(aa, aa), r2.r), pmul(bb, bb));
      _say(
        c,
        Step(
          text: 'Дахин квадрат зэрэгт дэвшүүлбэл',
          tex: ['${ptex(pmul(pmul(aa, aa), r2.r), v)} = ${ptex(pmul(bb, bb), v)}'],
        ),
      );
    }
  }
  fin = trim(fin);
  if (isZeroP(fin)) return _fail;
  _say(c, Step(text: 'Эмхэтгэвэл', tex: ['${ptex(fin, v)} = 0']));
  final r = solvePoly(fin, c.steps, v: v, quiet: c.quiet);
  if (r.all) return _fail;
  final good = <Root>[];
  if (r.roots.isNotEmpty) {
    _say(
      c,
      const Step(text: 'Квадрат зэрэгт дэвшүүлэхэд гаднах язгуур гарч болох тул анхны тэгшитгэлд орлуулж шалгана'),
    );
  }
  for (final root in r.roots) {
    if (checkRoot(f, v, root, c.degrees)) {
      good.add(root);
      _say(c, Step(text: '\$$v = ${root.tex}\$: тэгшитгэл биелнэ', tone: Tone.ok));
    } else {
      _say(c, Step(text: '\$$v = ${root.tex}\$: биелэхгүй, гаднах язгуур', tone: Tone.bad));
    }
  }
  return Zeros(
    kind: ZerosKind.finite,
    roots: good,
    complete: r.complete,
    exact: good.every((x) => x.x != null),
    title: 'Иррациональ тэгшитгэл',
  );
}

/* ---------- Нийтлэг суурь ---------- */

({X base, int k}) _primitiveBase(X c) {
  final cq = asQ(c);
  if (cq == null) return (base: c, k: 1);
  var b = cq;
  var k = 1;
  if (b.n < b.d && b.n > 0) {
    b = q(b.d, b.n);
    k = -1;
  }
  if (b.d == 1) {
    for (var e = 6; e >= 2; e--) {
      final r = iroot(b.n, e);
      if (r != null && r > 1) return (base: xq(q(r)), k: k * e);
    }
  }
  return (base: xq(b), k: k);
}

Q _qGcd(List<Q> list) {
  var l = 1;
  for (final s in list) {
    l = ilcm(l, s.d);
  }
  var g = 0;
  for (final s in list) {
    g = igcd(g, s.n * (l ~/ s.d));
  }
  return q(g.abs(), l);
}

String _baseTex(X b) => xeq(b, xE) ? 'e' : xtex(b);
String _logTex(X b, String arg) =>
    xeq(b, xE) ? '\\ln $arg' : (xeq(b, xint(10)) ? '\\lg $arg' : '\\log_{${xtex(b)}} $arg');
String _argTex(String s) => RegExp(r'^[\w.]+$').hasMatch(s) ? s : '\\left($s\\right)';

/* ---------- 5. Үзүүлэнт ---------- */

class _ExpTerm {
  const _ExpTerm(this.k, this.base, this.u);
  final X k;
  final X base;
  final Expr u;
}

class _ExpLin {
  const _ExpLin(this.kk, this.terms);
  final X kk;
  final List<_ExpTerm> terms;
}

_ExpLin? _expLin(Expr n, String v) {
  if (!dep(n, v)) {
    try {
      return _ExpLin(evalExact(n), const []);
    } catch (_) {
      return null;
    }
  }
  _ExpLin scale(_ExpLin a, X k) =>
      _ExpLin(xmul(a.kk, k), a.terms.map((t) => _ExpTerm(xmul(t.k, k), t.base, t.u)).toList());
  bool single(_ExpLin a) => a.terms.length == 1 && isZero(a.kk);
  _ExpLin? inv(_ExpLin a) => single(a)
      ? _ExpLin(xZero, [_ExpTerm(xdiv(xint(1), a.terms[0].k), a.terms[0].base, N.neg(a.terms[0].u))])
      : null;
  _ExpLin? mul2(_ExpLin a, _ExpLin b) {
    if (a.terms.isEmpty) return scale(b, a.kk);
    if (b.terms.isEmpty) return scale(a, b.kk);
    if (!single(a) || !single(b)) return null;
    final s = a.terms[0], t = b.terms[0];
    X tq;
    try {
      tq = xlog(s.base, t.base);
    } catch (_) {
      return null;
    }
    final tr = asQ(tq);
    if (tr == null) return null;
    return _ExpLin(xZero, [_ExpTerm(xmul(s.k, t.k), s.base, N.add(s.u, N.mul(N.q(tr), t.u)))]);
  }

  switch (n.kind) {
    case ExprKind.pow:
      if (!dep(n.a!, v)) {
        X b;
        try {
          b = evalExact(n.a!);
        } catch (_) {
          return null;
        }
        if (xsign(b) <= 0 || xeq(b, xint(1))) return null;
        return _ExpLin(xZero, [_ExpTerm(xint(1), b, n.b!)]);
      }
      if (dep(n.b!, v)) return null;
      Q? e;
      try {
        e = asQ(evalExact(n.b!));
      } catch (_) {
        return null;
      }
      final a = _expLin(n.a!, v);
      if (a == null || e == null || e.d != 1) return null;
      if (!single(a)) return null;
      final t = a.terms[0];
      return _ExpLin(xZero, [_ExpTerm(xpow(t.k, xq(e)), t.base, N.mul(N.q(e), t.u))]);
    case ExprKind.call:
      if (n.name == 'exp') return _ExpLin(xZero, [_ExpTerm(xint(1), xE, n.args[0])]);
      return null;
    case ExprKind.neg:
      final a = _expLin(n.a!, v);
      return a == null ? null : scale(a, xint(-1));
    case ExprKind.add || ExprKind.sub:
      final a = _expLin(n.a!, v), b0 = _expLin(n.b!, v);
      if (a == null || b0 == null) return null;
      final b = n.kind == ExprKind.sub ? scale(b0, xint(-1)) : b0;
      return _ExpLin(xadd(a.kk, b.kk), [...a.terms, ...b.terms]);
    case ExprKind.mul:
      final a = _expLin(n.a!, v), b = _expLin(n.b!, v);
      return a == null || b == null ? null : mul2(a, b);
    case ExprKind.div:
      final a = _expLin(n.a!, v), b = _expLin(n.b!, v);
      if (a == null || b == null) return null;
      if (b.terms.isEmpty) return isZero(b.kk) ? null : scale(a, xdiv(xint(1), b.kk));
      final ib = inv(b);
      return ib == null ? null : mul2(a, ib);
    default:
      return null;
  }
}

Zeros? _expMethod(Expr f, EqCtx c) {
  final v = c.v;
  final hasExp = collect(
    f,
    (n) => (n.kind == ExprKind.pow && dep(n.b!, v)) || (n.kind == ExprKind.call && n.name == 'exp' && dep(n, v)),
  ).isNotEmpty;
  if (!hasExp) return null;
  final l = _expLin(f, v);
  if (l == null || l.terms.isEmpty) return null;
  final b0 = _primitiveBase(l.terms[0].base).base;
  final terms = <({X k, Expr u, Poly? p})>[];
  for (final t in l.terms) {
    Q? tq;
    try {
      tq = asQ(xlog(b0, t.base));
    } catch (_) {
      return _fail;
    }
    if (tq == null) return _fail;
    final u = N.mul(N.q(tq), t.u);
    terms.add((k: t.k, u: u, p: polyFrom(u, v)));
  }
  final bt = _baseTex(b0);
  const title = 'Үзүүлэнт тэгшитгэл';
  if (terms.every((t) => t.p != null && deg(t.p!) <= 1)) {
    final ss = terms.map((t) => qAt(t.p!, 1)).where((s) => !isZ(s)).toList();
    if (ss.isEmpty) return _fail;
    final g = _qGcd(ss);
    final poly = <Q>[];
    var minm = 0;
    final items = terms.map((t) {
      final s = qAt(t.p!, 1), tt = qAt(t.p!, 0);
      final m = qdiv(s, g);
      final coef = asQ(xmul(t.k, xpow(b0, xq(tt))));
      return (m: m.n, coef: coef);
    }).toList();
    if (items.any((i) => i.coef == null)) return _fail;
    final k0 = asQ(l.kk);
    if (k0 == null) return _fail;
    for (final it in items) {
      minm = math.min(minm, it.m);
    }
    for (final it in items) {
      final idx = it.m - minm;
      while (poly.length <= idx) {
        poly.add(qZero);
      }
      poly[idx] = qadd(poly[idx], it.coef!);
    }
    while (poly.length <= -minm) {
      poly.add(qZero);
    }
    poly[-minm] = qadd(poly[-minm], k0);
    final gx = g.n == 1 && g.d == 1 ? v : '${qTex(g)}$v';
    const yv = 'y';
    if (deg(trim(poly)) == 1 && terms.length == 1 && deg(terms[0].p!) >= 1 && !c.quiet) {
      _say(c, Step(text: 'Хоёр талыг \$$bt\$ суурьтай зэрэг болгож бодно'));
    }
    _say(
      c,
      Step(
        text:
            '\$$yv = $bt^{$gx}\$ \$($yv > 0)\$ гэж орлуулбал${minm < 0 ? ' (хоёр талыг \$$yv^{${-minm}}\$-аар үржүүлж)' : ''}',
        tex: ['${ptex(poly, yv)} = 0'],
      ),
    );
    final r = solvePoly(trim(poly), c.steps, v: yv, quiet: c.quiet);
    if (r.all) return _fail;
    final out = <Root>[];
    for (final y in r.roots) {
      if (y.v <= 0 || (y.x != null && xsign(y.x!) <= 0)) {
        _say(c, Step(text: '\$$yv = ${y.tex}\$ — эерэг биш тул тохирохгүй', tone: Tone.bad));
        continue;
      }
      Root? root;
      if (y.x != null) {
        try {
          final lx = xlog(b0, y.x!);
          root = rootX(xdiv(lx, xq(g)));
        } catch (_) {
          root = null;
        }
      }
      if (root == null) {
        final xv = math.log(y.v) / math.log(approx(b0)) / qval(g);
        final lt = _logTex(b0, _argTex(y.x != null ? xtex(y.x!) : decTex(y.v, 6)));
        final tex = g.n == 1 && g.d == 1 ? lt : '\\frac{$lt}{${qTex(g)}}';
        root = Root(x: null, v: xv, tex: y.x != null ? tex : '\\approx ${decTex(xv, 6)}', mult: 1);
      }
      _say(c, Step(text: '\$$bt^{$gx} = ${y.tex} \\Rightarrow $v = ${root.tex}\$'));
      out.add(root);
    }
    final roots = mergeRoots(out);
    return Zeros(
      kind: ZerosKind.finite,
      roots: roots,
      complete: r.complete,
      exact: roots.every((x) => !x.tex.startsWith(r'\approx')),
      title: title,
    );
  }
  Poly? pp;
  X? w;
  if (terms.length == 1 && terms[0].p != null) {
    pp = terms[0].p;
    w = xdiv(xneg(l.kk), terms[0].k);
  } else if (terms.length == 2 && isZero(l.kk) && terms[0].p != null && terms[1].p != null) {
    pp = psub(terms[0].p!, terms[1].p!);
    w = xdiv(xneg(terms[1].k), terms[0].k);
  }
  if (pp == null || w == null) return _fail;
  if (xsign(w) <= 0) {
    _say(c, Step(text: 'Зэрэг эерэг утгатай тул \$$bt^{\\ldots} = ${xtex(w)}\$ шийдгүй'));
    return const Zeros(kind: ZerosKind.finite, complete: true, exact: true, title: title);
  }
  Q? lq;
  try {
    lq = asQ(xlog(b0, w));
  } catch (_) {
    return _fail;
  }
  if (lq == null) return _fail;
  _say(
    c,
    Step(text: '\$${xtex(w)} = $bt^{${qTex(lq)}}\$ тул зэргийг тэнцүүлбэл', tex: ['${ptex(pp, v)} = ${qTex(lq)}']),
  );
  final r = solvePoly(psub(pp, constP(lq)), c.steps, v: v, quiet: c.quiet);
  return _fromRoots(r, title);
}

/* ---------- 6. Логарифм ---------- */

class _LogTerm {
  const _LogTerm(this.k, this.base, this.u, this.p);
  final X k;
  final X base;
  final Expr u;
  final int p;
}

class _LogLin {
  const _LogLin(this.kk, this.terms);
  final X kk;
  final List<_LogTerm> terms;
}

_LogLin? _logLin(Expr n, String v) {
  if (!dep(n, v)) {
    try {
      return _LogLin(evalExact(n), const []);
    } catch (_) {
      return null;
    }
  }
  _LogLin scale(_LogLin a, X k) =>
      _LogLin(xmul(a.kk, k), a.terms.map((t) => _LogTerm(xmul(t.k, k), t.base, t.u, t.p)).toList());
  switch (n.kind) {
    case ExprKind.call:
      if (n.name == 'ln') return _LogLin(xZero, [_LogTerm(xint(1), xE, n.args[0], 1)]);
      if (n.name == 'lg') return _LogLin(xZero, [_LogTerm(xint(1), xint(10), n.args[0], 1)]);
      if (n.name == 'log' && !dep(n.args[0], v)) {
        X b;
        try {
          b = evalExact(n.args[0]);
        } catch (_) {
          return null;
        }
        if (xsign(b) <= 0 || xeq(b, xint(1))) return null;
        return _LogLin(xZero, [_LogTerm(xint(1), b, n.args[1], 1)]);
      }
      return null;
    case ExprKind.neg:
      final a = _logLin(n.a!, v);
      return a == null ? null : scale(a, xint(-1));
    case ExprKind.add || ExprKind.sub:
      final a = _logLin(n.a!, v), b0 = _logLin(n.b!, v);
      if (a == null || b0 == null) return null;
      final b = n.kind == ExprKind.sub ? scale(b0, xint(-1)) : b0;
      return _LogLin(xadd(a.kk, b.kk), [...a.terms, ...b.terms]);
    case ExprKind.mul:
      final a = _logLin(n.a!, v), b = _logLin(n.b!, v);
      if (a == null || b == null) return null;
      if (a.terms.isEmpty) return scale(b, a.kk);
      if (b.terms.isEmpty) return scale(a, b.kk);
      if (a.terms.length == 1 && b.terms.length == 1 && isZero(a.kk) && isZero(b.kk)) {
        final s = a.terms[0], t = b.terms[0];
        if (same(s.u, t.u) && xeq(s.base, t.base)) {
          return _LogLin(xZero, [_LogTerm(xmul(s.k, t.k), s.base, s.u, s.p + t.p)]);
        }
      }
      return null;
    case ExprKind.div:
      final a = _logLin(n.a!, v);
      if (a == null || dep(n.b!, v)) return null;
      X k;
      try {
        k = evalExact(n.b!);
      } catch (_) {
        return null;
      }
      return isZero(k) ? null : scale(a, xdiv(xint(1), k));
    case ExprKind.pow:
      if (dep(n.b!, v)) return null;
      Q? e;
      try {
        e = asQ(evalExact(n.b!));
      } catch (_) {
        return null;
      }
      final a = _logLin(n.a!, v);
      if (a == null || e == null || e.d != 1 || e.n < 1 || e.n > 4 || a.terms.length != 1 || !isZero(a.kk)) {
        return null;
      }
      final t = a.terms[0];
      return _LogLin(xZero, [_LogTerm(xpow(t.k, xq(e)), t.base, t.u, t.p * e.n)]);
    default:
      return null;
  }
}

Q _qPow(Q b, int k) {
  var r = qOne;
  for (var i = 0; i < k; i++) {
    r = qmul(r, b);
  }
  return r;
}

Zeros? _logMethod(Expr f, EqCtx c) {
  final v = c.v;
  final hasLog = collect(
    f,
    (n) => n.kind == ExprKind.call && (n.name == 'ln' || n.name == 'lg' || n.name == 'log') && dep(n, v),
  ).isNotEmpty;
  if (!hasLog) return null;
  final l = _logLin(f, v);
  if (l == null || l.terms.isEmpty) return null;
  const title = 'Логарифм тэгшитгэл';
  final pb = _primitiveBase(l.terms[0].base);
  final b0 = xeq(l.terms[0].base, xE) ? xE : pb.base;
  final terms = <({Q k, Expr u, int p})>[];
  for (final t in l.terms) {
    Q? beta;
    try {
      beta = asQ(xlog(b0, t.base));
    } catch (_) {
      return _fail;
    }
    if (beta == null || isZ(beta)) return _fail;
    final k = asQ(xdiv(t.k, xq(_qPow(beta, t.p))));
    if (k == null) return _fail;
    terms.add((k: k, u: t.u, p: t.p));
  }
  final k0 = asQ(l.kk);
  if (k0 == null) return _fail;
  final args = <Expr>[];
  for (final t in terms) {
    if (!args.any((a) => same(a, t.u))) args.add(t.u);
  }
  _say(
    c,
    Step(
      text: 'Тодорхойлогдох муж: логарифмын доорх илэрхийлэл эерэг',
      tex: [args.map((a) => '${toLatex(a)} > 0').join(r',\quad ')],
    ),
  );
  bool domainOk(Root r) => args.every((a) {
    if (r.x != null) {
      final ex = exactAt(a, v, r.x!, c.degrees);
      if (ex.value != null) return xsign(ex.value!) > 0;
      if (ex.nan) return false;
    }
    return numAt(a, v, r.v, c.degrees) > 0;
  });
  final bt = _baseTex(b0);
  final out = <Root>[];
  var complete = true;

  if (args.length == 1) {
    final u = args[0];
    final poly = <Q>[];
    for (final t in terms) {
      while (poly.length <= t.p) {
        poly.add(qZero);
      }
      poly[t.p] = qadd(poly[t.p], t.k);
    }
    if (poly.isEmpty) poly.add(qZero);
    poly[0] = qadd(poly[0], k0);
    final pp = trim(poly);
    final lt = _logTex(b0, _argTex(toLatex(u)));
    List<Root> ts;
    if (deg(pp) == 1) {
      final t0 = qdiv(qneg(pp[0]), pp[1]);
      _say(c, Step(text: 'Эмхэтгэвэл', tex: ['$lt = ${qTex(t0)}']));
      ts = [rootX(xq(t0))];
    } else {
      _say(c, Step(text: '\$t = $lt\$ гэж орлуулбал', tex: ['${ptex(pp, 't')} = 0']));
      final r = solvePoly(pp, c.steps, v: 't', quiet: c.quiet);
      if (r.all) return _fail;
      ts = r.roots;
      complete = complete && r.complete;
    }
    for (final t in ts) {
      X w;
      try {
        if (t.x == null) return _fail;
        w = xpow(b0, t.x!);
      } catch (_) {
        return _fail;
      }
      _say(c, Step(text: '\$$lt = ${t.tex} \\Rightarrow ${toLatex(u)} = $bt^{${t.tex}} = ${xtex(w)}\$'));
      final up = polyFrom(u, v);
      Zeros z;
      if (up != null && deg(up) == 1 && asQ(w) == null) {
        final x = xdiv(xsub(w, xq(up[0])), xq(up[1]));
        z = Zeros(kind: ZerosKind.finite, roots: [rootX(x)], complete: true, exact: true);
      } else {
        final wq = asQ(w);
        if (wq == null) return _fail;
        z = findZeros(N.sub(u, N.q(wq)), _sub(c));
      }
      if (z.kind != ZerosKind.finite || z.all) return _fail;
      complete = complete && z.complete;
      out.addAll(z.roots);
    }
  } else {
    if (terms.any((t) => t.p != 1)) return _fail;
    var lc = 1;
    for (final t in terms) {
      lc = ilcm(lc, t.k.d);
    }
    final ms = terms.map((t) => qmul(t.k, q(lc)).n).toList();
    final kp = qmul(k0, q(lc));
    Q? cc;
    try {
      cc = asQ(xpow(b0, xq(qneg(kp))));
    } catch (_) {
      return _fail;
    }
    if (cc == null) return _fail;
    Expr? pos, negN;
    for (var i = 0; i < terms.length; i++) {
      final t = terms[i];
      final m = ms[i];
      final fac = m.abs() == 1 ? t.u : N.pow(t.u, N.number(m.abs().toDouble()));
      if (m > 0) {
        pos = pos != null ? N.mul(pos, fac) : fac;
      } else {
        negN = negN != null ? N.mul(negN, fac) : fac;
      }
    }
    final lhsN = pos ?? N.number(1);
    final rhsN = negN != null ? N.mul(N.q(cc), negN) : N.q(cc);
    _say(
      c,
      Step(
        text: 'Логарифмын чанараар нэгтгэж, потенцчилбэл (суурь \$$bt\$)',
        tex: ['${toLatex(lhsN)} = ${toLatex(rhsN)}'],
      ),
    );
    final z = findZeros(N.sub(lhsN, rhsN), _sub(c));
    if (z.kind != ZerosKind.finite || z.all) return _fail;
    complete = complete && z.complete;
    out.addAll(z.roots);
  }
  final good = <Root>[];
  for (final r in mergeRoots(out)) {
    if (domainOk(r) && checkRoot(f, v, r, c.degrees)) {
      good.add(r);
      _say(c, Step(text: '\$$v = ${r.tex}\$: ОЗ-д харьяалагдана', tone: Tone.ok));
    } else {
      _say(c, Step(text: '\$$v = ${r.tex}\$: ОЗ-д харьяалагдахгүй, гаднах язгуур', tone: Tone.bad));
    }
  }
  return Zeros(
    kind: ZerosKind.finite,
    roots: good,
    complete: complete,
    exact: good.every((r) => r.x != null),
    title: title,
  );
}

/* ---------- 7. Тригонометр ---------- */

const _trig = ['sin', 'cos', 'tan', 'cot'];
const _tsym = {'sin': 'S', 'cos': 'C', 'tan': 'T', 'cot': 'K'};
const _tname = {'S': r'\sin', 'C': r'\cos', 'T': r'\operatorname{tg}', 'K': r'\operatorname{ctg}'};

class _Lin {
  const _Lin(this.a, this.b);
  final Q a;
  final X b;
}

/// u = a*x + b (a рационал, b ЯГ тоо).
_Lin? _linearArg(Expr u, String v) {
  try {
    X at(int k) => evalExact(u, scope: {v: xint(k)});
    final u0 = at(0), u1 = at(1), u2 = at(2);
    final a = asQ(xsub(u1, u0));
    if (a == null || isZ(a)) return null;
    if (!xeq(xsub(u2, u0), xq(qmul(a, q(2))))) return null;
    const t = 0.3719;
    if ((numAt(u, v, t) - (qval(a) * t + approx(u0))).abs() > 1e-9) return null;
    return _Lin(a, u0);
  } catch (_) {
    return null;
  }
}

String _joinTex(List<String> parts) {
  final ps = parts.where((p) => p.isNotEmpty && p != '0').toList();
  if (ps.isEmpty) return '0';
  return [for (var i = 0; i < ps.length; i++) i == 0 || ps[i].startsWith('-') ? ps[i] : '+${ps[i]}'].join();
}

Family? _basicFamily(String f, Root t, _Lin lin, bool degrees, String uTex, List<Step> steps, bool quiet) {
  final dg = degrees;
  final pI = dg ? xint(180) : xPi;
  String unit(X x) {
    if (!dg) return xtex(x);
    final r = asQ(x);
    if (r != null && r.d != 1 && const [2, 4, 5, 8, 10, 20, 25].contains(r.d)) {
      return '${decTex(qval(r), 4).replaceFirst('.', '{,}')}^\\circ';
    }
    final tt = xtex(x);
    return tt.startsWith(r'\frac') || tt.startsWith(r'-\frac') ? '\\left($tt\\right)^\\circ' : '$tt^\\circ';
  }

  final name = _tname[f]!;
  final tt = t.tex;
  final tv = t.v;
  if ((f == 'S' || f == 'C') &&
      (tv.abs() > 1 + 1e-12 ||
          (t.x != null && approx(t.x!).abs() > 1 && !xeq(t.x!, xint(1)) && !xeq(t.x!, xint(-1))))) {
    if (!quiet) {
      steps.add(
        Step(
          text: '\$$name $uTex = $tt\$: \$|${tt.replaceFirst(RegExp(r'^\\approx\s*'), '')}| > 1\$ тул шийдгүй',
          tone: Tone.bad,
        ),
      );
    }
    return null;
  }
  bool isK(int k) => t.x != null && xeq(t.x!, xint(k));
  var sgn = 'none';
  X? alpha;
  var alphaTex = '';
  var alphaV = 0.0;
  var period = pI;
  X two(X x) => xscale(x, q(2));
  if (f == 'S') {
    if (isK(0)) {
      alpha = xint(0);
    } else if (isK(1)) {
      alpha = xscale(pI, q(1, 2));
      period = two(pI);
    } else if (isK(-1)) {
      alpha = xscale(pI, q(-1, 2));
      period = two(pI);
    } else {
      sgn = 'alt';
    }
  } else if (f == 'C') {
    period = two(pI);
    if (isK(0)) {
      alpha = xscale(pI, q(1, 2));
      period = pI;
    } else if (isK(1)) {
      alpha = xint(0);
    } else if (isK(-1)) {
      alpha = pI;
    } else {
      sgn = 'pm';
    }
  }
  final inv = const {'S': 'asin', 'C': 'acos', 'T': 'atan', 'K': 'acot'}[f]!;
  final invTex = const {
    'S': r'\arcsin',
    'C': r'\arccos',
    'T': r'\operatorname{arctg}',
    'K': r'\operatorname{arcctg}',
  }[f]!;
  if (alpha == null && t.x != null) {
    try {
      alpha = xatrig(inv, t.x!, dg);
    } catch (_) {
      alpha = null;
    }
  }
  final kk = dg ? 180 / math.pi : 1.0;
  double numAlpha() {
    final x = tv;
    final r = f == 'S'
        ? math.asin(x)
        : (f == 'C' ? math.acos(x) : (f == 'T' ? math.atan(x) : math.pi / 2 - math.atan(x)));
    return r * kk;
  }

  if (alpha != null) {
    alphaV = approx(alpha);
    alphaTex = unit(alpha);
  } else {
    alphaV = numAlpha();
    alphaTex = t.x != null
        ? '$invTex${RegExp(r'^[\w.]+$').hasMatch(tt) ? ' $tt' : '\\left($tt\\right)'}'
        : '\\approx ${decTex(alphaV, 4)}';
  }
  final a = lin.a, aAbs = a.n < 0 ? qneg(a) : a;
  final bX = xdiv(xneg(lin.b), xq(a));
  final pX = xdiv(period, xq(aAbs));
  final pTex = () {
    final s = unit(pX);
    if (s == '1') return 'n';
    return RegExp(r'[a-zA-Z]$').hasMatch(s) ? '$s n' : '${s}n';
  }();
  String aTex;
  if (alpha != null) {
    aTex = unit(xdiv(alpha, xq(a)));
  } else if (t.x == null) {
    aTex = '\\approx ${decTex(alphaV / qval(a), 4)}';
  } else {
    aTex = a.n == 1 && a.d == 1
        ? alphaTex
        : (a.n == -1 && a.d == 1 ? '-$alphaTex' : '\\frac{$alphaTex}{${qTex(a)}}');
  }
  final bTex = isZero(bX) ? '' : unit(bX);
  String tex;
  if (sgn == 'none') {
    final sum = alpha != null ? xadd(xdiv(alpha, xq(a)), bX) : null;
    final first = sum != null ? (isZero(sum) ? '' : unit(sum)) : _joinTex([aTex, bTex]);
    tex = 'x = ${_joinTex([first, pTex])}';
  } else {
    var a0 = aTex, pw = 'n';
    if (alpha != null && sgn == 'alt' && xsign(xdiv(alpha, xq(a))) < 0) {
      a0 = unit(xneg(xdiv(alpha, xq(a))));
      pw = 'n+1';
    }
    if (alpha != null && sgn == 'pm' && xsign(xdiv(alpha, xq(a))) < 0) a0 = unit(xneg(xdiv(alpha, xq(a))));
    final at = RegExp('[+-]').hasMatch(a0.substring(1)) && !a0.startsWith(r'\frac') ? '\\left($a0\\right)' : a0;
    final lead = sgn == 'alt' ? '(-1)^{$pw}${at.startsWith('-') ? '\\left($at\\right)' : at}' : '\\pm $at';
    tex = 'x = ${_joinTex([lead, bTex, pTex])}';
  }
  tex += r',\ n\in\mathbb{Z}';
  if (!quiet) {
    final gen = sgn == 'alt' ? r'(-1)^{n}\arcsin a+\pi n' : (sgn == 'pm' ? r'\pm\arccos a+2\pi n' : '');
    steps.add(Step(text: '\$$name $uTex = $tt\$${gen.isNotEmpty ? ' — ерөнхий шийд \$$gen\$' : ''}', tex: [tex]));
  }
  final bV = approx(lin.b), pV = approx(period), aV = qval(a);
  final s0 = sgn;
  final av = alphaV;
  return Family(tex, (n) {
    final signs = s0 == 'alt' ? [n % 2 == 0 ? 1 : -1] : (s0 == 'pm' ? [1, -1] : [1]);
    return signs.map((s) => (s * av + pV * n - bV) / aV).toList();
  });
}

({X k, X m, String sym})? _trigLin(Expr f, String? Function(Expr n) map) {
  String? sym;
  ({X k, X m})? go(Expr n) {
    final s0 = map(n);
    if (s0 != null) {
      if (sym != null && sym != s0) return null;
      sym = s0;
      return (k: xint(1), m: xZero);
    }
    if (collect(n, (x) => map(x) != null).isEmpty) {
      try {
        return (k: xZero, m: evalExact(n));
      } catch (_) {
        return null;
      }
    }
    switch (n.kind) {
      case ExprKind.neg:
        final a = go(n.a!);
        return a == null ? null : (k: xneg(a.k), m: xneg(a.m));
      case ExprKind.add || ExprKind.sub:
        final a = go(n.a!), b = go(n.b!);
        if (a == null || b == null) return null;
        return n.kind == ExprKind.add
            ? (k: xadd(a.k, b.k), m: xadd(a.m, b.m))
            : (k: xsub(a.k, b.k), m: xsub(a.m, b.m));
      case ExprKind.mul:
        final a = go(n.a!), b = go(n.b!);
        if (a == null || b == null) return null;
        if (isZero(a.k)) return (k: xmul(a.m, b.k), m: xmul(a.m, b.m));
        if (isZero(b.k)) return (k: xmul(b.m, a.k), m: xmul(b.m, a.m));
        return null;
      case ExprKind.div:
        final a = go(n.a!), b = go(n.b!);
        if (a == null || b == null || !isZero(b.k) || isZero(b.m)) return null;
        return (k: xdiv(a.k, b.m), m: xdiv(a.m, b.m));
      default:
        return null;
    }
  }

  try {
    final r = go(f);
    if (r == null || isZero(r.k) || sym == null) return null;
    return (k: r.k, m: r.m, sym: sym!);
  } catch (_) {
    return null;
  }
}

Zeros? _trigMethod(Expr f, EqCtx c) {
  final v = c.v;
  final trigs = collect(f, (n) => n.kind == ExprKind.call && _trig.contains(n.name) && dep(n, v));
  if (trigs.isEmpty) return null;
  final u0 = trigs[0].args[0];
  final lin = _linearArg(u0, v);
  if (lin == null) return null;
  bool sameArg(Expr n) {
    if (n.kind != ExprKind.call) return false;
    final u = n.args[0];
    if (same(u, u0)) return true;
    final l = _linearArg(u, v);
    return l != null && xeq(xq(l.a), xq(lin.a)) && xeq(l.b, lin.b);
  }

  if (!trigs.every(sameArg)) return null;
  String? map(Expr n) =>
      n.kind == ExprKind.call && _trig.contains(n.name) && dep(n, v) && sameArg(n) ? _tsym[n.name] : null;
  var g = mfrom(f, map: map, vars: <String>{});
  final u0t = toLatex(u0);
  final uTex = RegExp(r'^[\w]+$').hasMatch(u0t) ? u0t : '\\left($u0t\\right)';
  const title = 'Тригонометрийн тэгшитгэл';
  if (g == null) {
    final tl = _trigLin(f, map);
    if (tl == null) return null;
    final t = xdiv(xneg(tl.m), tl.k);
    _say(c, Step(text: 'Эмхэтгэвэл', tex: ['${_tname[tl.sym]} $uTex = ${xtex(t)}']));
    final fam = _basicFamily(tl.sym, rootX(t), lin, c.degrees, uTex, c.steps, c.quiet);
    if (fam == null) return const Zeros(kind: ZerosKind.finite, complete: true, exact: true, title: title);
    for (var n = -2; n <= 2; n++) {
      for (final x in fam.sample(n)) {
        final y = numAt(f, v, x, c.degrees);
        if (!y.isFinite || y.abs() > 1e-7) return _fail;
      }
    }
    return Zeros(kind: ZerosKind.periodic, complete: true, exact: true, families: [fam], title: title);
  }
  if (g.isEmpty) return null;
  final fams = <Family>[];
  final steps = c.steps, quiet = c.quiet;
  final syms = mvars(g);
  final hasTK = syms.contains('T') || syms.contains('K'), hasSC = syms.contains('S') || syms.contains('C');
  if (hasTK && hasSC) return _fail;
  var excludeZero = false;
  if (syms.contains('T') && syms.contains('K')) {
    var maxK = 0;
    for (final t in g.values) {
      maxK = math.max(maxK, t.m['K'] ?? 0);
    }
    MPoly h = {};
    for (final t in g.values) {
      h = madd(h, mterm({'T': (t.m['T'] ?? 0) - (t.m['K'] ?? 0) + maxK}, t.c));
    }
    g = h;
    excludeZero = true;
    _say(
      c,
      const Step(
        text: r'$\operatorname{ctg} u = \frac{1}{\operatorname{tg} u}$ гэж бичээд хоёр талыг үржүүлбэл',
      ),
    );
  }
  for (final s in const ['S', 'C', 'T', 'K']) {
    if (s == 'T' && excludeZero) continue;
    var mn = 1 << 30;
    for (final t in g!.values) {
      mn = math.min(mn, t.m[s] ?? 0);
    }
    if (mn > 0 && mn < (1 << 30)) {
      MPoly h = {};
      for (final t in g.values) {
        h = madd(h, mterm({...t.m, s: (t.m[s] ?? 0) - mn}, t.c));
      }
      g = h;
      _say(c, Step(text: '\$${_tname[s]} $uTex\$ хүчин зүйлийг хаалтны гадна гаргавал нэг үржигдэхүүн нь тэг'));
      final fam = _basicFamily(s, rootX(xint(0)), lin, c.degrees, uTex, steps, quiet);
      if (fam != null) fams.add(fam);
    }
  }
  final rest = mvars(g!);
  String? tsym;
  Poly? pp;
  bool evenIn(String s) => g!.values.every((t) => (t.m[s] ?? 0) % 2 == 0);
  if (rest.isEmpty) {
    pp = null;
  } else if (rest.length == 1) {
    tsym = rest[0];
    pp = toUni(g, tsym);
  } else if (rest.contains('S') && rest.contains('C')) {
    MPoly conv(String from, String to) {
      MPoly h = {};
      final oneMinus = msub(mconst(qOne), mpow(mvar(to), 2));
      for (final t in g!.values) {
        final e = t.m[from] ?? 0;
        final m = <String, int>{...t.m}..remove(from);
        h = madd(h, mmul(mterm(m, t.c), mpow(oneMinus, e ~/ 2)));
      }
      return h;
    }

    if (evenIn('C')) {
      g = conv('C', 'S');
      tsym = 'S';
      _say(c, const Step(text: r'$\cos^2 u = 1-\sin^2 u$ гэж орлуулбал'));
    } else if (evenIn('S')) {
      g = conv('S', 'C');
      tsym = 'C';
      _say(c, const Step(text: r'$\sin^2 u = 1-\cos^2 u$ гэж орлуулбал'));
    } else {
      final ds = g.values.map((t) => tdeg(t.m)).toSet();
      if (ds.length != 1) return _fail;
      final d = ds.first;
      MPoly h = {};
      for (final t in g.values) {
        h = madd(h, mterm({'T': t.m['S'] ?? 0}, t.c));
      }
      g = h;
      tsym = 'T';
      _say(
        c,
        Step(
          text:
              'Нэгэн төрлийн тэгшитгэл: хоёр талыг \$\\cos^{$d} $uTex\$-д хуваавал (\$\\cos $uTex = 0\$ үед биелэхгүй)',
        ),
      );
    }
    pp = toUni(g, tsym);
  } else {
    return _fail;
  }
  if (rest.isNotEmpty && (pp == null || tsym == null)) return _fail;
  if (pp != null && tsym != null) {
    const tv = 't';
    if (deg(pp) >= 1) {
      _say(
        c,
        Step(
          text:
              '\$t = ${_tname[tsym]} $uTex\$${tsym == 'S' || tsym == 'C' ? r' $(|t|\le 1)$' : ''} гэж орлуулбал',
          tex: ['${ptex(pp, tv)} = 0'],
        ),
      );
      final r = solvePoly(pp, steps, v: tv, quiet: quiet);
      if (r.all) return _fail;
      for (final t in r.roots) {
        if (excludeZero && t.v.abs() < 1e-12) {
          _say(c, const Step(text: r'$t = 0$ үед $\operatorname{ctg}$ тодорхойлогдохгүй', tone: Tone.bad));
          continue;
        }
        final fam = _basicFamily(tsym, t, lin, c.degrees, uTex, steps, quiet);
        if (fam != null && !fams.any((x) => x.tex == fam.tex)) fams.add(fam);
      }
    } else if (deg(pp) < 0) {
      return _fail;
    }
  }
  for (final fm in fams) {
    for (var n = -2; n <= 2; n++) {
      for (final x in fm.sample(n)) {
        final y = numAt(f, v, x, c.degrees);
        if (!y.isFinite || y.abs() > 1e-7) return _fail;
      }
    }
  }
  if (fams.isEmpty) {
    _say(c, const Step(text: 'Шийдгүй'));
    return const Zeros(kind: ZerosKind.finite, complete: true, exact: true, title: title);
  }
  return Zeros(kind: ZerosKind.periodic, complete: true, exact: true, families: fams, title: title);
}

/* ---------- 8. Бутархай ба үржвэр ---------- */

Zeros? _quotientMethod(Expr f, EqCtx c) {
  if (f.kind != ExprKind.div || !dep(f.b!, c.v)) return null;
  _say(
    c,
    Step(
      text: 'Бутархай тэгтэй тэнцэх нь хүртвэр тэг, хуваарь тэгээс ялгаатай байх явдал',
      tex: ['${toLatex(f.a!)} = 0'],
    ),
  );
  final z = findZeros(f.a!, _sub(c));
  if (z.kind != ZerosKind.finite || z.all) return _fail;
  final good = z.roots.where((r) => checkRoot(f, c.v, r, c.degrees)).toList();
  for (final r in z.roots) {
    if (!good.contains(r)) {
      _say(c, Step(text: '\$${c.v} = ${r.tex}\$ үед бутархай тодорхойлогдохгүй', tone: Tone.bad));
    }
  }
  return Zeros(
    kind: ZerosKind.finite,
    roots: good,
    complete: z.complete,
    exact: good.every((r) => r.x != null),
    title: z.title ?? 'Тэгшитгэл',
  );
}

Zeros? _productMethod(Expr f, EqCtx c) {
  if (f.kind != ExprKind.mul || !dep(f.a!, c.v) || !dep(f.b!, c.v)) return null;
  _say(
    c,
    const Step(text: 'Үржвэр тэгтэй тэнцэх нь аль нэг үржигдэхүүн тэг байх явдал (ОЗ-д харьяалагдах нөхцөлтэй)'),
  );
  final out = <Root>[];
  var complete = true;
  for (final part in [f.a!, f.b!]) {
    _say(c, Step(text: '', tex: ['${toLatex(part)} = 0']));
    final z = findZeros(part, _sub(c));
    if (z.kind != ZerosKind.finite || z.all) return _fail;
    complete = complete && z.complete;
    out.addAll(z.roots);
  }
  final good = mergeRoots(out).where((r) => checkRoot(f, c.v, r, c.degrees)).toList();
  return Zeros(
    kind: ZerosKind.finite,
    roots: good,
    complete: complete,
    exact: good.every((r) => r.x != null),
    title: 'Тэгшитгэл',
  );
}

/* ---------- Тоон хайлт (бусад бүх аргаар чадаагүй үед) ---------- */

List<double> numericScan(Expr f, String v, bool degrees, [double lo = -50, double hi = 50]) {
  const n = 40000;
  double fn(double x) => numAt(f, v, x, degrees);
  final out = <double>[];
  void push(double x) {
    if (!out.any((y) => (y - x).abs() < 1e-6)) out.add(x);
  }

  var px = lo, py = fn(lo);
  for (var i = 1; i <= n; i++) {
    final x = lo + ((hi - lo) * i) / n, y = fn(x);
    if (py.isFinite && py == 0) push(px);
    if (py.isFinite && y.isFinite && py * y < 0) {
      var a = px, b = x, fa = py;
      for (var k = 0; k < 100; k++) {
        final m = (a + b) / 2, fm = fn(m);
        if (!fm.isFinite) break;
        if (fm * fa <= 0) {
          b = m;
        } else {
          a = m;
          fa = fm;
        }
      }
      final r = (a + b) / 2;
      if (fn(r).abs() < 1e-8 * [1.0, py.abs(), y.abs()].reduce(math.max)) push(r);
    }
    px = x;
    py = y;
  }
  ssort<double>(out, (a, b) => a - b);
  return out;
}

/* ---------- Дээд түвшин ---------- */

/// Хувьсагчийг тодорхойлно: ганц бол түүнийг, олон бол x.
({String? v, List<String> extra}) pickVar(List<Expr> nodes, [String? prefer]) {
  final s = <String>{};
  for (final n in nodes) {
    s.addAll(freeSymbols(n));
  }
  final all = s.toList();
  if (prefer != null && s.contains(prefer)) return (v: prefer, extra: all.where((x) => x != prefer).toList());
  if (all.isEmpty) return (v: null, extra: const []);
  if (all.length == 1) return (v: all[0], extra: const []);
  for (final p in const ['x', 'y', 't']) {
    if (s.contains(p)) return (v: p, extra: all.where((x) => x != p).toList());
  }
  return (v: all[0], extra: all.sublist(1));
}

Zeros zerosOf(Expr f, String v, {bool degrees = false, bool quiet = true, List<Step>? steps}) =>
    findZeros(f, EqCtx(v: v, degrees: degrees, steps: steps ?? <Step>[], quiet: quiet, depth: 0));

Solution solveEquation(Expr lhs, Expr rhs, {String? v, bool degrees = false}) {
  final problem = relTex(Relation(lhs, RelOp.eq, rhs));
  final pv = pickVar([lhs, rhs], v);
  final vv = pv.v;
  if (vv == null) return failure('Тэгшитгэлд үл мэдэгдэгч алга. Тоо бодох бол «Тооцоолох» горимыг сонгоно уу');
  if (pv.extra.isNotEmpty) {
    return failure(
      'Нэг үл мэдэгдэгчтэй тэгшитгэл оруулна уу (\$${pv.extra.join(r',\ ')}\$ илүү байна). Системийг «Систем» горимоор бодно',
    );
  }
  final f = N.sub(lhs, rhs);
  final steps = <Step>[];
  final z = findZeros(f, EqCtx(v: vv, degrees: degrees, steps: steps, quiet: false, rel: (lhs, rhs), depth: 0));
  final graph0 = [toAscii(lhs), toAscii(rhs)];
  final graph = <String>[
    for (var i = 0; i < graph0.length; i++)
      if (!(i == 1 && RegExp(r'^-?\d+(\.\d+)?$').hasMatch(graph0[i]) && jsNumber(graph0[i]) == 0)) graph0[i],
  ];
  if (z.kind == ZerosKind.fail) {
    final nums = numericScan(f, vv, degrees);
    final base = Solution(ok: false, title: cannot, problem: problem, steps: const [], answer: const [], graph: graph);
    if (nums.isNotEmpty) {
      return base.copyWith(
        approx: nums.take(12).map((x) => '$vv \\approx ${decTex(x, 6)}').toList(),
        notes: [
          '$cannot. Аналитик шийд гаргаж чадаагүй тул \$[-50;\\ 50]\$ завсарт тоогоор хайж олсон ойролцоо утгуудыг харуулав — бүх шийд гэж баталгаажаагүй',
        ],
      );
    }
    return base.copyWith(notes: const [cannot]);
  }
  final title = z.title ?? 'Тэгшитгэл';
  if (z.kind == ZerosKind.periodic) {
    return Solution(
      ok: true,
      title: title,
      problem: problem,
      steps: steps,
      answer: z.families!.map((f) => f.tex).toList(),
      graph: graph,
    );
  }
  for (final r in z.roots) {
    if (!checkRoot(f, vv, r, degrees)) {
      return failure(
        '$cannot: олдсон утга шалгалтад тэнцээгүй тул хариу гаргахгүй',
      ).copyWith(problem: problem, graph: graph);
    }
  }
  List<String> answer;
  String? answerNote;
  if (z.all) {
    final ex = z.except;
    answer = [
      '$vv\\in\\mathbb{R}${ex != null && ex.isNotEmpty ? ',\\ $vv\\ne ${ex.map((e) => e.tex).join(r',\ ')}' : ''}',
    ];
  } else if (z.roots.isEmpty && z.segments == null) {
    answer = ['$vv\\in\\varnothing'];
    answerNote = 'Бодит шийдгүй';
  } else {
    final segs = (z.segments ?? const <Segment>[]).map(
      (s) => '$vv\\in\\left[${s.a.tex};\\ ${s.b.tex}\\right]',
    );
    answer = [...segs, if (z.roots.isNotEmpty) ...rootsTex(z.roots, vv)];
  }
  final approxs = z.roots
      .where((r) => (r.x != null && asQ(r.x!) == null) || (r.x == null && !r.tex.startsWith(r'\approx')))
      .map((r) => '${r.tex} \\approx ${decTex(r.v, 6)}')
      .toList();
  final notes = <String>[];
  if (answerNote != null) notes.add(answerNote);
  if (!z.complete) notes.add('Зарим язгуурыг тоон аргаар олсон');
  if (!z.exact) notes.add(r'$\approx$ тэмдэгтэй утгууд ойролцоо (тоон аргаар)');
  return Solution(
    ok: true,
    title: title,
    problem: problem,
    steps: steps,
    answer: answer,
    approx: approxs.isNotEmpty ? approxs : null,
    notes: notes.isNotEmpty ? notes : null,
    graph: graph,
  );
}
