// Матанализ (вэбийн `solve/calculus.ts`): уламжлал (дүрмийн тайлбартай), тодорхой
// бус ба тодорхой интеграл, хязгаар, функцийн судалгаа. Хариу бүрийг тоогоор тулгана.
import 'dart:math' as math;

import 'equation.dart';
import 'exact.dart';
import 'expr_ext.dart';
import 'ineq.dart';
import 'poly.dart';
import 'pretty.dart';
import 'q.dart';
import 'roots.dart';
import 'steps.dart';

const _v0 = 'x';
String _t(Expr n) => toLatex(n);
String _p(Expr n) =>
    n.kind == ExprKind.sym || n.kind == ExprKind.num || n.kind == ExprKind.call ? _t(n) : '\\left(${_t(n)}\\right)';

bool _hasCyr(String s) => RegExp('[А-Яа-яӨөҮү]').hasMatch(s);

/// Үр дүнг цэвэр LaTeX болгоно: олон гишүүнт бол эрэмбэлсэн хэлбэр.
String tidy(Expr n, [String v = _v0]) {
  final s = prettify(n);
  final p = polyFrom(s, v);
  if (p != null) return ptex(p, v);
  if (s.kind == ExprKind.div) {
    final np = polyFrom(s.a!, v);
    if (np != null && np.length > 2) return '\\frac{${ptex(np, v)}}{${prettyTex(s.b!)}}';
  }
  return prettyTex(s);
}

String _asciiPoly(Poly p, String v) {
  final t = trim(p);
  if (t.isEmpty) return '0';
  return [for (var i = 0; i < t.length; i++) '(${t[i].n})/(${t[i].d})*$v^$i'].join('+');
}

/* ---------- Уламжлал ---------- */

const _table = <String, String>{
  'sin': r"(\sin x)' = \cos x",
  'cos': r"(\cos x)' = -\sin x",
  'tan': r"(\operatorname{tg} x)' = \frac{1}{\cos^2 x}",
  'cot': r"(\operatorname{ctg} x)' = -\frac{1}{\sin^2 x}",
  'ln': r"(\ln x)' = \frac{1}{x}",
  'lg': r"(\lg x)' = \frac{1}{x\ln 10}",
  'log': r"(\log_a x)' = \frac{1}{x\ln a}",
  'exp': r"(e^x)' = e^x",
  'sqrt': r"(\sqrt{x})' = \frac{1}{2\sqrt{x}}",
  'asin': r"(\arcsin x)' = \frac{1}{\sqrt{1-x^2}}",
  'acos': r"(\arccos x)' = -\frac{1}{\sqrt{1-x^2}}",
  'atan': r"(\operatorname{arctg} x)' = \frac{1}{1+x^2}",
  'acot': r"(\operatorname{arcctg} x)' = -\frac{1}{1+x^2}",
  'abs': r"(|x|)' = \frac{x}{|x|}",
};

Expr _parseSafe(String tex) {
  // зөвхөн хаалт хэрэгтэй эсэхийг шийдэхэд: олон гишүүнт бичлэг бол нийлбэр гэж үзнэ
  return RegExp('[+-]').hasMatch(tex.length > 1 ? tex.substring(1) : '')
      ? mkAdd(mkSym(tex), mkNum(0))
      : mkSym(tex);
}

void _explain(Expr n, String v, List<Step> steps, int depth) {
  if (depth > 2 || !dep(n, v)) return;
  String d(Expr x) => tidy(diff(x, v), v);
  String line(Expr x) => "\\left(${_t(x)}\\right)' = ${d(x)}";
  bool isConst(Expr x) => !dep(x, v);
  if (polyFrom(n, v) != null && depth > 0) return;
  switch (n.kind) {
    case ExprKind.add || ExprKind.sub:
      if (depth == 0) {
        final terms = <Expr>[];
        void flat(Expr x) {
          if ((x.kind == ExprKind.add || x.kind == ExprKind.sub) && polyFrom(x, v) == null) {
            flat(x.a!);
            flat(x.b!);
          } else {
            terms.add(x);
          }
        }

        flat(n);
        steps.add(
          Step(
            text: r"Нийлбэрийн уламжлал $(u\pm v)' = u'\pm v'$ — гишүүн бүрийг тусад нь",
            tex: terms.where((t) => dep(t, v)).map(line).toList(),
          ),
        );
        for (final t in terms) {
          _explain(t, v, steps, depth + 1);
        }
      }
      return;
    case ExprKind.neg:
      _explain(n.a!, v, steps, depth);
      return;
    case ExprKind.mul:
      if (isConst(n.a!) || isConst(n.b!)) {
        final c = isConst(n.a!) ? n.a! : n.b!;
        final u = isConst(n.a!) ? n.b! : n.a!;
        steps.add(
          Step(
            text: r"Тогтмолыг уламжлалын гадна гаргана $(c\cdot u)' = c\cdot u'$",
            tex: ["\\left(${_t(n)}\\right)' = ${_p(c)}\\cdot\\left(${_t(u)}\\right)' = ${d(n)}"],
          ),
        );
        _explain(u, v, steps, depth + 1);
        return;
      }
      steps.add(
        Step(
          text: r"Үржвэрийн уламжлал $(uv)' = u'v+uv'$",
          tex: [
            "u = ${_t(n.a!)},\\ v = ${_t(n.b!)},\\quad u' = ${d(n.a!)},\\ v' = ${d(n.b!)}",
            "\\left(${_t(n)}\\right)' = ${_p(_parseSafe(d(n.a!)))}\\cdot ${_p(n.b!)}+${_p(n.a!)}\\cdot ${_p(_parseSafe(d(n.b!)))} = ${d(n)}"
                .replaceAll(RegExp(r'\\cdot \\left\(1\\right\)|\\left\(1\\right\)\\cdot '), ''),
          ],
        ),
      );
      _explain(n.a!, v, steps, depth + 1);
      _explain(n.b!, v, steps, depth + 1);
      return;
    case ExprKind.div:
      if (isConst(n.b!)) {
        steps.add(Step(text: r"Тогтмолд хуваасан $\left(\frac{u}{c}\right)' = \frac{u'}{c}$", tex: [line(n)]));
        _explain(n.a!, v, steps, depth + 1);
        return;
      }
      steps.add(
        Step(
          text: r"Ноогдворын уламжлал $\left(\frac{u}{v}\right)' = \frac{u'v-uv'}{v^2}$",
          tex: [
            "u = ${_t(n.a!)},\\ v = ${_t(n.b!)},\\quad u' = ${d(n.a!)},\\ v' = ${d(n.b!)}",
            "\\left(${_t(n)}\\right)' = \\frac{${_p(_parseSafe(d(n.a!)))}\\cdot ${_p(n.b!)}-${_p(n.a!)}\\cdot ${_p(_parseSafe(d(n.b!)))}}{${_p(n.b!)}^2} = ${d(n)}",
          ],
        ),
      );
      _explain(n.a!, v, steps, depth + 1);
      _explain(n.b!, v, steps, depth + 1);
      return;
    case ExprKind.pow:
      if (!dep(n.b!, v)) {
        if (n.a!.kind == ExprKind.sym) {
          steps.add(Step(text: r"Зэргийн уламжлал $(x^n)' = nx^{n-1}$", tex: [line(n)]));
          return;
        }
        steps.add(
          Step(
            text: r"Нийлмэл функц: $(u^n)' = n u^{n-1}\cdot u'$",
            tex: ["u = ${_t(n.a!)},\\ u' = ${d(n.a!)}", line(n)],
          ),
        );
        _explain(n.a!, v, steps, depth + 1);
        return;
      }
      if (!dep(n.a!, v)) {
        steps.add(Step(text: r"Илтгэгч функц: $(a^u)' = a^u\ln a\cdot u'$", tex: [line(n)]));
        _explain(n.b!, v, steps, depth + 1);
        return;
      }
      steps.add(Step(text: r'$u^w = e^{w\ln u}$ гэж бичээд дифференциална', tex: [line(n)]));
      return;
    case ExprKind.call:
      final u = n.name == 'log' || n.name == 'root' ? n.args[1] : n.args[0];
      final tb = _table[n.name];
      if (u.kind == ExprKind.sym && u.name == v) {
        if (tb != null) steps.add(Step(text: 'Хүснэгтийн томьёо', tex: [tb]));
        return;
      }
      steps.add(
        Step(
          text: "Нийлмэл функцийн уламжлал \$(f(u))' = f'(u)\\cdot u'\$${tb != null ? ', \$$tb\$' : ''}",
          tex: ["u = ${_t(u)},\\ u' = ${d(u)}", line(n)],
        ),
      );
      _explain(u, v, steps, depth + 1);
      return;
    default:
      return;
  }
}

/// Уламжлалыг тоон ялгавартай тулгана.
bool _derivOk(Expr f, Expr d, String v) {
  double ff(double x) => numAt(f, v, x);
  double dd(double x) => numAt(d, v, x);
  var good = 0;
  for (final x in const [0.37, 1.21, -0.83, 2.47, -1.93, 0.71, 3.1]) {
    final h = 1e-5 * math.max(1, x.abs());
    final fd = (ff(x + h) - ff(x - h)) / (2 * h), dv = dd(x);
    if (!fd.isFinite || !dv.isFinite) continue;
    if ((fd - dv).abs() > 1e-4 * math.max(1, dv.abs())) return false;
    good++;
  }
  return good >= 2;
}

String _primes(int k) => k <= 3 ? "'" * k : '^{($k)}';

Solution derivative(Expr f, {int order = 1, Expr? at, String v = _v0}) {
  final ord = order.clamp(1, 6);
  final primes = _primes(ord);
  final problem = '\\left(${_t(f)}\\right)$primes';
  final steps = <Step>[];
  var cur = f;
  try {
    for (var k = 1; k <= ord; k++) {
      final p = polyFrom(cur, v);
      if (k == 1) {
        if (p != null) {
          steps.add(
            Step(
              text: r"Олон гишүүнтийн уламжлал: гишүүн бүрт $(x^n)' = nx^{n-1}$, $(c)' = 0$",
              tex: ["\\left(${ptex(p, v)}\\right)' = ${ptex(pderiv(p), v)}"],
            ),
          );
        } else {
          _explain(cur, v, steps, 0);
        }
      }
      final dn = p != null ? parseExpr(_asciiPoly(pderiv(p), v)) : diff(cur, v);
      if (!_derivOk(cur, dn, v)) return failure('$cannot: уламжлалын тулгалт амжилтгүй').copyWith(problem: problem);
      cur = dn;
      if (k > 1) {
        steps.add(Step(text: '$k-р эрэмбийн уламжлал', tex: ['f${_primes(k)}($v) = ${tidy(cur, v)}']));
      }
    }
  } on ExprParseError catch (e) {
    return failure(_hasCyr(e.message) ? e.message : cannot).copyWith(problem: problem);
  } catch (_) {
    return failure(cannot).copyWith(problem: problem);
  }
  final res = tidy(cur, v);
  final answer = ['f$primes($v) = $res'];
  if (at != null) {
    X? x0;
    try {
      x0 = evalExact(at);
    } catch (_) {
      x0 = null;
    }
    final xv = x0 != null ? approx(x0) : numAt(at, v, 0);
    String val0;
    final ex = x0 != null ? exactAt(cur, v, x0) : null;
    if (ex != null && ex.value != null) {
      val0 = xWithApprox(ex.value!);
    } else {
      final y = numAt(cur, v, xv);
      if (!y.isFinite) return failure('Энэ цэгт уламжлал тодорхойлогдохгүй').copyWith(problem: problem);
      val0 = '\\approx ${decTex(y, 6)}';
    }
    answer.add(
      'f$primes\\left(${x0 != null ? xtex(x0) : _t(at)}\\right) ${val0.startsWith(r'\approx') ? '' : '= '}$val0',
    );
    steps.add(Step(text: 'Цэг дээрх утгыг олохдоо уламжлалд орлуулна', tex: [answer[1]]));
  }
  return Solution(
    ok: true,
    title: ord > 1 ? '$ord-р эрэмбийн уламжлал' : 'Уламжлал',
    problem: problem,
    steps: steps,
    answer: answer,
    graph: [toAscii(f), toAscii(simplify(cur))],
  );
}

/* ---------- Тодорхой бус интеграл ---------- */

Expr _num(Q c) => N.q(c);
Expr _call(String f, List<Expr> args) => mkCall(f, args);

class _IntCtx {
  _IntCtx(this.v);
  final String v;
  final rules = <String>{};
}

/// u = a x + b.
({Q a, Q b})? _linear(Expr u, String v) {
  final p = polyFrom(u, v);
  if (p == null || deg(p) != 1) return null;
  return (a: p[1], b: p.isNotEmpty ? p[0] : qZero);
}

Expr _divA(Expr n, Q a) => a.n == 1 && a.d == 1 ? n : N.mul(_num(qdiv(qOne, a)), n);

Q? _constQ(Expr n) {
  try {
    return asQ(evalExact(n));
  } catch (_) {
    return null;
  }
}

Expr? _integ(Expr n, _IntCtx c) {
  final v = c.v;
  if (!dep(n, v)) {
    c.rules.add('const');
    return N.mul(n, mkSym(v));
  }
  if (n.kind == ExprKind.pow && !dep(n.b!, v)) {
    final l = _linear(n.a!, v), e = _constQ(n.b!);
    if (l != null && e != null && !(l.a.n == 1 && l.a.d == 1 && isZ(l.b))) {
      if (e.n == -1 && e.d == 1) {
        c.rules.add('log');
        return _divA(_call('ln', [_call('abs', [n.a!])]), l.a);
      }
      c.rules.add('lin');
      final m = qadd(e, qOne);
      return _divA(N.div(N.pow(n.a!, _num(m)), _num(m)), l.a);
    }
    // sin^2 u = (1-cos 2u)/2, cos^2 u = (1+cos 2u)/2
    final base = n.a!;
    if (e != null && e.n == 2 && e.d == 1 && base.kind == ExprKind.call && (base.name == 'sin' || base.name == 'cos')) {
      final l2 = _linear(base.args[0], v);
      if (l2 != null) {
        c.rules.add('trig2');
        final u2 = N.mul(mkNum(2), base.args[0]);
        final half = N.mul(_num(q(1, 2)), mkSym(v));
        final part = _divA(N.mul(_num(q(1, 4)), _call('sin', [u2])), l2.a);
        return base.name == 'sin' ? N.sub(half, part) : N.add(half, part);
      }
    }
  }
  final p = polyFrom(n, v);
  if (p != null) {
    c.rules.add('power');
    Expr r = mkNum(0);
    final tp = trim(p);
    for (var i = 0; i < tp.length; i++) {
      final co = tp[i];
      if (isZ(co)) continue;
      final k = qdiv(co, q(i + 1));
      r = N.add(r, N.mul(_num(k), N.pow(mkSym(v), mkNum(i + 1))));
    }
    return r;
  }
  switch (n.kind) {
    case ExprKind.neg:
      final a = _integ(n.a!, c);
      return a == null ? null : N.neg(a);
    case ExprKind.add || ExprKind.sub:
      c.rules.add('sum');
      final a = _integ(n.a!, c), b = _integ(n.b!, c);
      if (a == null || b == null) return null;
      return n.kind == ExprKind.add ? N.add(a, b) : N.sub(a, b);
    case ExprKind.mul:
      if (!dep(n.a!, v)) {
        c.rules.add('constmul');
        final b = _integ(n.b!, c);
        return b == null ? null : N.mul(n.a!, b);
      }
      if (!dep(n.b!, v)) {
        c.rules.add('constmul');
        final a = _integ(n.a!, c);
        return a == null ? null : N.mul(n.b!, a);
      }
      return _byParts(n, c);
    case ExprKind.div:
      if (!dep(n.b!, v)) {
        c.rules.add('constmul');
        final a = _integ(n.a!, c);
        return a == null ? null : N.div(a, n.b!);
      }
      if (!dep(n.a!, v)) {
        final k = n.a!;
        final den = n.b!;
        // 1/(ax+b) , 1/(ax+b)^n
        final l = _linear(den, v);
        if (l != null) {
          c.rules.add('log');
          return N.mul(k, _divA(_call('ln', [_call('abs', [den])]), l.a));
        }
        if (den.kind == ExprKind.pow && !dep(den.b!, v)) {
          final l2 = _linear(den.a!, v);
          final e = _constQ(den.b!);
          if (l2 != null && e != null && !(e.n == 1 && e.d == 1)) {
            c.rules.add('lin');
            final m = qsub(qOne, e); // 1-n
            return N.mul(k, _divA(N.div(N.pow(den.a!, _num(m)), _num(m)), l2.a));
          }
          // 1/cos^2(u), 1/sin^2(u)
          final da = den.a!;
          if (e != null &&
              e.n == 2 &&
              e.d == 1 &&
              da.kind == ExprKind.call &&
              (da.name == 'cos' || da.name == 'sin')) {
            final l3 = _linear(da.args[0], v);
            if (l3 != null) {
              c.rules.add('trig');
              final core = da.name == 'cos' ? _call('tan', [da.args[0]]) : N.neg(_call('cot', [da.args[0]]));
              return N.mul(k, _divA(core, l3.a));
            }
          }
        }
        // 1/sqrt(a^2 - x^2) → arcsin(x/a)
        if (den.kind == ExprKind.call && den.name == 'sqrt') {
          final r = polyFrom(den.args[0], v);
          if (r != null && deg(r) == 2 && isZ(r[1]) && r[2].n < 0 && r[0].n > 0) {
            final a2 = qdiv(r[0], qneg(r[2]));
            c.rules.add('arcsin');
            return N.mul(
              N.div(k, _call('sqrt', [_num(qneg(r[2]))])),
              _call('asin', [N.div(mkSym(v), _call('sqrt', [_num(a2)]))]),
            );
          }
          final l4 = _linear(den.args[0], v);
          if (l4 != null) {
            c.rules.add('lin');
            return N.mul(k, _divA(N.mul(mkNum(2), den), l4.a));
          }
        }
      }
      return _rationalInt(n, c);
    case ExprKind.pow:
      if (!dep(n.b!, v)) {
        final l = _linear(n.a!, v);
        final e = _constQ(n.b!);
        if (l != null && e != null) {
          if (e.n == -1 && e.d == 1) {
            c.rules.add('log');
            return _divA(_call('ln', [_call('abs', [n.a!])]), l.a);
          }
          c.rules.add('lin');
          final m = qadd(e, qOne);
          return _divA(N.div(N.pow(n.a!, _num(m)), _num(m)), l.a);
        }
        return null;
      }
      if (!dep(n.a!, v)) {
        final l = _linear(n.b!, v);
        if (l == null) return null;
        c.rules.add('exp');
        final isE = n.a!.kind == ExprKind.sym && n.a!.name == 'e';
        final core = isE ? n : N.div(n, _call('ln', [n.a!]));
        return _divA(core, l.a);
      }
      return null;
    case ExprKind.call:
      final u = n.args[0];
      final l = _linear(u, v);
      if (l == null) return null;
      switch (n.name) {
        case 'sqrt':
          c.rules.add('lin');
          return _divA(N.mul(_num(q(2, 3)), N.pow(u, _num(q(3, 2)))), l.a);
        case 'cbrt':
          c.rules.add('lin');
          return _divA(N.mul(_num(q(3, 4)), N.pow(u, _num(q(4, 3)))), l.a);
        case 'exp':
          c.rules.add('exp');
          return _divA(_call('exp', [u]), l.a);
        case 'sin':
          c.rules.add('trig');
          return _divA(N.neg(_call('cos', [u])), l.a);
        case 'cos':
          c.rules.add('trig');
          return _divA(_call('sin', [u]), l.a);
        case 'tan':
          c.rules.add('trig');
          return _divA(
            N.neg(
              _call('ln', [
                _call('abs', [
                  _call('cos', [u]),
                ]),
              ]),
            ),
            l.a,
          );
        case 'cot':
          c.rules.add('trig');
          return _divA(
            _call('ln', [
              _call('abs', [
                _call('sin', [u]),
              ]),
            ]),
            l.a,
          );
        case 'ln':
          c.rules.add('parts');
          return _divA(N.sub(N.mul(u, _call('ln', [u])), u), l.a);
      }
      return null;
    default:
      return null;
  }
}

/// Хэсэгчлэн: олон гишүүнт × (e^{u}, sin u, cos u), x^n ln x.
Expr? _byParts(Expr n, _IntCtx c) {
  if (n.kind != ExprKind.mul) return null;
  final v = c.v;
  Expr? tryPair(Expr pn, Expr g) {
    final p = polyFrom(pn, v);
    if (p == null) return null;
    // x^n · ln x
    if (g.kind == ExprKind.call && g.name == 'ln' && g.args[0].kind == ExprKind.sym && g.args[0].name == v) {
      if (trim(p).length - 1 > 6) return null;
      c.rules.add('parts');
      // ∫ P ln x = Q ln x - ∫ Q/x,  Q = ∫P
      final qn = _integ(pn, c);
      if (qn == null) return null;
      final qp = polyFrom(qn, v)!;
      final rest = trim(qp).skip(1).toList(); // Q/x (Q(0)=0)
      final inner = _integ(parseExpr(_asciiPoly(rest, v)), c);
      return inner == null ? null : N.sub(N.mul(qn, g), inner);
    }
    // Хүснэгтийн арга: Σ (-1)^k P^{(k)} · G_{k+1}
    Expr? gg = g;
    var pk = p;
    Expr res = mkNum(0);
    var sgn = 1;
    for (var k = 0; k < 12 && !isZeroP(pk); k++) {
      gg = gg == null ? null : _integ(gg, _IntCtx(v));
      if (gg == null) return null;
      final term = N.mul(parseExpr(_asciiPoly(pk, v)), gg);
      res = sgn > 0 ? N.add(res, term) : N.sub(res, term);
      sgn = -sgn;
      pk = pderiv(pk);
    }
    c.rules.add('parts');
    return res;
  }

  bool okG(Expr g) =>
      (g.kind == ExprKind.call && const ['exp', 'sin', 'cos', 'ln'].contains(g.name)) ||
      (g.kind == ExprKind.pow && !dep(g.a!, v));
  if (okG(n.b!)) {
    final r = tryPair(n.a!, n.b!);
    if (r != null) return r;
  }
  if (okG(n.a!)) {
    final r = tryPair(n.b!, n.a!);
    if (r != null) return r;
  }
  return null;
}

/// Рационал функц: олон гишүүнт хэсэг + ялгаатай рационал язгууртай хуваарь → ln.
Expr? _rationalInt(Expr n, _IntCtx c) {
  final v = c.v;
  final rf0 = ratFrom(n, v);
  if (rf0 == null) return null;
  final rf = ratReduce(rf0);
  if (deg(rf.den) < 1) return _integ(parseExpr(_asciiPoly(rf.num, v)), c);
  final dm = pdivmod(rf.num, rf.den);
  final qp = dm.q, r = dm.r;
  Expr? res = isZeroP(qp) ? mkNum(0) : _integ(parseExpr(_asciiPoly(qp, v)), c);
  if (res == null) return null;
  if (isZeroP(r)) return res;
  // x^2 + a (a>0) → arctg
  final dd = rf.den;
  if (deg(dd) == 2 && isZ(dd.length > 1 ? dd[1] : qZero) && deg(r) == 0) {
    final a = qdiv(dd[0], dd[2]);
    if (a.n > 0) {
      c.rules.add('arctan');
      final k = qdiv(r[0], dd[2]);
      final sa = _call('sqrt', [_num(a)]);
      return N.add(
        res,
        N.mul(N.div(_num(k), sa), _call('atan', [N.div(mkSym(v), sa)])),
      );
    }
  }
  RatRoots rr;
  try {
    rr = rationalRoots(dd);
  } catch (_) {
    return null;
  }
  if (deg(rr.rest) > 0 || rr.roots.any((x) => x.m > 1)) return null;
  final dD = pderiv(dd);
  c.rules.add('partial');
  for (final rt in rr.roots) {
    final a = qdiv(pevalQ(r, rt.r), pevalQ(dD, rt.r));
    if (isZ(a)) continue;
    res = N.add(
      res!,
      N.mul(
        _num(a),
        _call('ln', [
          _call('abs', [N.sub(mkSym(v), _num(rt.r))]),
        ]),
      ),
    );
  }
  return res;
}

const _rules = <String, String>{
  'power': r'$\int x^n\,dx = \frac{x^{n+1}}{n+1}+C$',
  'log': r'$\int \frac{dx}{x} = \ln|x|+C$',
  'lin': r'Шугаман орлуулга: $\int f(ax+b)\,dx = \frac{1}{a}F(ax+b)+C$',
  'exp': r'$\int e^x dx = e^x+C$, $\int a^x dx = \frac{a^x}{\ln a}+C$',
  'trig':
      r'$\int\sin x\,dx = -\cos x+C$, $\int\cos x\,dx = \sin x+C$, $\int\frac{dx}{\cos^2 x} = \operatorname{tg} x+C$',
  'parts': r'Хэсэгчлэн интегралчлах: $\int u\,dv = uv-\int v\,du$',
  'partial':
      r'Хялбар бутархайд задлах: $\frac{P(x)}{(x-a)(x-b)\ldots} = \frac{A}{x-a}+\frac{B}{x-b}+\ldots$',
  'arctan': r'$\int\frac{dx}{x^2+a^2} = \frac{1}{a}\operatorname{arctg}\frac{x}{a}+C$',
  'arcsin': r'$\int\frac{dx}{\sqrt{a^2-x^2}} = \arcsin\frac{x}{a}+C$',
  'trig2': r'Зэрэг бууруулах томьёо: $\sin^2 u = \frac{1-\cos 2u}{2}$, $\cos^2 u = \frac{1+\cos 2u}{2}$',
  'sum': 'Шугаман чанар: нийлбэрийн интеграл нь интегралуудын нийлбэр',
  'constmul': 'Тогтмол үржигдэхүүнийг интегралын гадна гаргана',
};

/// Эх функцийг дифференциалж f-тэй тулгана.
bool _antiderivOk(Expr F, Expr f, String v) {
  Expr dF;
  try {
    dF = diff(F, v);
  } catch (_) {
    return false;
  }
  var good = 0;
  for (final x in const [0.37, 1.21, -0.83, 2.47, -1.93, 0.71, 3.1, 0.13, 5.3]) {
    final a = numAt(dF, v, x), b = numAt(f, v, x);
    if (!a.isFinite || !b.isFinite) continue;
    if ((a - b).abs() > 1e-7 * math.max(1, b.abs())) return false;
    good++;
  }
  return good >= 3;
}

({Expr f, List<String> rules})? antiderivative(Expr f, [String v = _v0]) {
  final c = _IntCtx(v);
  Expr? F;
  try {
    F = _integ(f, c);
  } catch (_) {
    F = null;
  }
  if (F == null) return null;
  final fs = simplify(F);
  if (!_antiderivOk(fs, f, v)) return null;
  return (f: fs, rules: c.rules.toList());
}

Solution indefiniteIntegral(Expr f, [String v = _v0]) {
  final problem = '\\int ${_p(f)}\\,d$v';
  final r = antiderivative(f, v);
  if (r == null) {
    return failure(
      '$cannot: энэ интегралыг энгийн аргуудаар (хүснэгт, шугаман орлуулга, хэсэгчлэн, хялбар бутархай) олж чадсангүй',
    ).copyWith(problem: problem);
  }
  final steps = r.rules.where(_rules.containsKey).map((x) => Step(text: _rules[x])).toList();
  final polyOnly = r.rules.every((x) => const ['power', 'sum', 'constmul', 'const'].contains(x));
  final ft = polyOnly ? tidy(r.f, v) : prettyTex(prettify(r.f));
  steps.add(const Step(text: 'Үр дүнг дифференциалахад интеграл доорх функц гарч байна (шалгав)', tone: Tone.ok));
  return Solution(
    ok: true,
    title: 'Тодорхой бус интеграл',
    problem: problem,
    steps: steps,
    answer: ['$problem = $ft+C'],
    graph: [toAscii(f), toAscii(r.f)],
  );
}

/* ---------- Тодорхой интеграл ---------- */

double _simpson(double Function(double) f, double a, double b) {
  double rec(double a0, double b0, double fa, double fm, double fb, double whole, double eps, int depth) {
    final m = (a0 + b0) / 2, lm = (a0 + m) / 2, rm = (m + b0) / 2;
    final flm = f(lm), frm = f(rm);
    final left = ((m - a0) / 6) * (fa + 4 * flm + fm), right = ((b0 - m) / 6) * (fm + 4 * frm + fb);
    if (depth <= 0 || (left + right - whole).abs() <= 15 * eps) return left + right + (left + right - whole) / 15;
    return rec(a0, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b0, fm, frm, fb, right, eps / 2, depth - 1);
  }

  final fa = f(a), fb = f(b), fm = f((a + b) / 2);
  return rec(a, b, fa, fm, fb, ((b - a) / 6) * (fa + 4 * fm + fb), 1e-11, 40);
}

Solution definiteIntegral(Expr f, Expr aN, Expr bN, [String v = _v0]) {
  final problem = '\\int_{${_t(aN)}}^{${_t(bN)}} ${_p(f)}\\,d$v';
  X? ax, bx;
  try {
    ax = evalExact(aN);
  } catch (_) {
    ax = null;
  }
  try {
    bx = evalExact(bN);
  } catch (_) {
    bx = null;
  }
  final a = ax != null ? approx(ax) : numAt(aN, v, 0), b = bx != null ? approx(bx) : numAt(bN, v, 0);
  if (!a.isFinite || !b.isFinite) {
    return failure('Хязгаар нь төгсгөлөг тоо байх ёстой (өргөтгөсөн интеграл бодохгүй)').copyWith(problem: problem);
  }
  double fn(double x) => numAt(f, v, x);
  // Завсарт тасралтгүй эсэх
  for (var i = 0; i <= 400; i++) {
    final x = a + ((b - a) * i) / 400;
    if (!fn(x).isFinite) {
      return failure(
        'Интеграл доорх функц энэ завсарт тодорхойлогдохгүй эсвэл тасралттай — өргөтгөсөн интегралыг бодохгүй',
      ).copyWith(problem: problem);
    }
  }
  final s = a == b ? 0.0 : _simpson(fn, math.min(a, b), math.max(a, b)) * (a < b ? 1 : -1);
  final steps = <Step>[];
  final r = antiderivative(f, v);
  if (r != null) {
    final ft = tidy(r.f, v);
    steps.add(Step(text: 'Эх функц', tex: ['F($v) = $ft']));
    X? exact;
    if (ax != null && bx != null) {
      final fa = exactAt(r.f, v, ax), fb = exactAt(r.f, v, bx);
      if (fa.value != null && fb.value != null) exact = xsub(fb.value!, fa.value!);
    }
    final nl = numAt(r.f, v, b) - numAt(r.f, v, a);
    if ((nl - s).abs() > 1e-6 * math.max(1, s.abs())) {
      return failure('$cannot: тулгалт амжилтгүй').copyWith(problem: problem);
    }
    final valTex = exact != null ? xtex(exact) : '\\approx ${decTex(nl, 8)}';
    steps
      ..add(
        Step(
          text: r'Ньютон–Лейбницийн томьёо $\int_a^b f\,dx = F(b)-F(a)$',
          tex: ['F\\left(${_t(bN)}\\right)-F\\left(${_t(aN)}\\right) = $valTex'],
        ),
      )
      ..add(Step(text: 'Симпсоны тоон аргаар тулгавал \$\\approx ${decTex(s, 8)}\$', tone: Tone.ok));
    return Solution(
      ok: true,
      title: 'Тодорхой интеграл',
      problem: problem,
      steps: steps,
      answer: ['$problem ${exact != null ? '=' : ''} $valTex'],
      approx: exact != null && asQ(exact) == null ? ['\\approx ${decTex(approx(exact), 8)}'] : null,
      graph: [toAscii(f)],
    );
  }
  steps.add(
    const Step(text: 'Эх функцийг энгийн аргаар олж чадаагүй тул Симпсоны (тоон) аргаар бодов', tone: Tone.note),
  );
  return Solution(
    ok: true,
    title: 'Тодорхой интеграл (тоон)',
    problem: problem,
    steps: steps,
    answer: ['$problem \\approx ${decTex(s, 8)}'],
    notes: const ['Тоон аргаар олсон ойролцоо утга'],
    graph: [toAscii(f)],
  );
}

/* ---------- Хязгаар ---------- */

/// Хязгаарын цэг: төгсгөлөг ([inf] = 0) эсвэл ±∞ ([inf] = ±1).
class LimitTarget {
  const LimitTarget.point(this.x, this.v, this.tex) : inf = 0;
  const LimitTarget.infinity(this.inf) : x = null, v = 0, tex = '';
  final int inf;
  final X? x;
  final double v;
  final String tex;
  bool get isPoint => inf == 0;
}

LimitTarget? parseTarget(String src) {
  final s = src.trim().replaceAll(RegExp(r'\s'), '').replaceAll('\u221E', 'inf');
  if (RegExp(r'^\+?inf(inity)?$', caseSensitive: false).hasMatch(s)) return const LimitTarget.infinity(1);
  if (RegExp(r'^-inf(inity)?$', caseSensitive: false).hasMatch(s)) return const LimitTarget.infinity(-1);
  try {
    final n = parseExpr(s);
    try {
      final x = evalExact(n);
      return LimitTarget.point(x, approx(x), xtex(x));
    } catch (_) {
      final v = compileExpr(n)(const {});
      return v.isFinite ? LimitTarget.point(null, v, _t(n)) : null;
    }
  } catch (_) {
    return null;
  }
}

double _near(Expr f, String v, double a, int side, double h) => numAt(f, v, a + side * h * math.max(1, a.abs()));

/// Хариуг цэгийн орчим тоогоор тулгана: L (тоо) эсвэл ±∞.
bool _limitOk(Expr f, String v, LimitTarget t, double l) {
  final vals = <double>[];
  if (t.isPoint) {
    for (final s in const [1, -1]) {
      for (final h in const [1e-5, 1e-6, 1e-7]) {
        vals.add(_near(f, v, t.v, s, h));
      }
    }
  } else {
    for (final x0 in const [1e5, 1e6, 1e7]) {
      vals.add(numAt(f, v, t.inf * x0));
    }
  }
  final fin = vals.where((y) => y.isFinite).toList();
  if (fin.length < 2) return false;
  if (!l.isFinite) return fin.every((y) => y.sign == l.sign && y.abs() > 1e3);
  return fin.every((y) => (y - l).abs() < 2e-3 * math.max(1, l.abs()));
}

Solution limit(Expr f, String target, [String v = _v0]) {
  final t = parseTarget(target);
  if (t == null) return failure(r'Хязгаарын цэгийг тоо, $\pi$-тэй илэрхийлэл эсвэл inf, -inf гэж оруулна уу');
  final tTex = t.isPoint ? t.tex : (t.inf > 0 ? r'+\infty' : r'-\infty');
  final problem = '\\lim_{$v\\to $tTex} ${_p(f)}';
  final steps = <Step>[];
  // L нь X (яг) эсвэл double.
  Solution done(Object l, [String? extra]) {
    final lv = l is double ? l : approx(l as X);
    if (!_limitOk(f, v, t, lv)) {
      return failure('$cannot: олсон утга тоон тулгалтад тэнцээгүй').copyWith(problem: problem, steps: const []);
    }
    final lt = l is double
        ? (l.isFinite ? '\\approx ${decTex(l, 6)}' : (l > 0 ? r'+\infty' : r'-\infty'))
        : xtex(l as X);
    steps.add(const Step(text: 'Цэгийн ойролцоох утгуудаар тоогоор шалгав', tone: Tone.ok));
    return Solution(
      ok: true,
      title: 'Хязгаар',
      problem: problem,
      steps: steps,
      answer: ['$problem ${lt.startsWith(r'\approx') ? '' : '='} $lt'],
      approx: l is! double && asQ(l as X) == null ? ['\\approx ${decTex(approx(l), 6)}'] : null,
      notes: extra != null ? [extra] : null,
      graph: [toAscii(f)],
    );
  }

  final rf = ratFrom(f, v);
  if (t.isPoint) {
    // 1. Шууд орлуулах
    if (t.x != null) {
      final ex = exactAt(f, v, t.x!);
      if (ex.value != null) {
        steps.add(
          Step(
            text: 'Функц энэ цэгт тасралтгүй тул шууд орлуулна',
            tex: ['f\\left(${t.tex}\\right) = ${xtex(ex.value!)}'],
          ),
        );
        final r = done(ex.value!);
        if (r.ok) return r;
        steps.clear();
      }
    }
    // 2. Рационал: (x-a)-аар хураах
    final aq = t.x != null ? asQ(t.x!) : null;
    if (rf != null && aq != null) {
      final a = aq;
      var numP = rf.num, den = rf.den;
      final na = pevalQ(numP, a), da = pevalQ(den, a);
      if (isZ(na) && isZ(da)) {
        final g = pgcd(numP, den);
        final gp = primitive(g).prim;
        numP = pdivmod(numP, g).q;
        den = pdivmod(den, g).q;
        final scaled = pmul(numP, [qdiv(lead(g), lead(gp))]);
        steps.add(
          Step(
            text: r'$\frac{0}{0}$ тодорхойгүй хэлбэр. Хүртвэр, хуваарийг нийтлэг үржигдэхүүнээр хураана',
            tex: [
              '\\frac{${ptex(rf.num, v)}}{${ptex(rf.den, v)}} = \\frac{\\left(${ptex(gp, v)}\\right)\\left(${ptex(scaled, v)}\\right)}{\\left(${ptex(gp, v)}\\right)\\left(${ptex(den, v)}\\right)} = \\frac{${ptex(scaled, v)}}{${ptex(den, v)}}',
            ],
          ),
        );
        final n2 = pevalQ(scaled, a), d2 = pevalQ(den, a);
        if (!isZ(d2)) {
          final l = qdiv(n2, d2);
          steps.add(Step(text: 'Одоо орлуулбал', tex: ['\\frac{${qTex(n2)}}{${qTex(d2)}} = ${qTex(l)}']));
          return done(xq(l));
        }
        numP = scaled;
      }
      if (!isZ(pevalQ(numP, a)) && isZ(pevalQ(den, a))) {
        final l = _near(f, v, t.v, -1, 1e-7), r = _near(f, v, t.v, 1, 1e-7);
        steps.add(Step(text: '\$\\frac{${qTex(pevalQ(numP, a))}}{0}\$ хэлбэр — нэг талын хязгаарыг шалгана'));
        if (l.sign == r.sign) return done(r.sign * double.infinity);
        return Solution(
          ok: true,
          title: 'Хязгаар',
          problem: problem,
          steps: steps,
          answer: [
            '\\lim_{$v\\to $tTex-0} = ${l > 0 ? '+' : '-'}\\infty,\\quad \\lim_{$v\\to $tTex+0} = ${r > 0 ? '+' : '-'}\\infty',
          ],
          notes: const ['Нэг талын хязгаарууд ялгаатай тул хязгаар оршихгүй'],
          graph: [toAscii(f)],
        );
      }
    }
    // 3. Лопиталь (0/0)
    if (f.kind == ExprKind.div) {
      var u = f.a!, w = f.b!;
      for (var k = 1; k <= 3; k++) {
        final ua = t.x != null ? exactAt(u, v, t.x!) : null, wa = t.x != null ? exactAt(w, v, t.x!) : null;
        final uz = ua != null && ua.value != null ? isZero(ua.value!) : numAt(u, v, t.v).abs() < 1e-12;
        final wz = wa != null && wa.value != null ? isZero(wa.value!) : numAt(w, v, t.v).abs() < 1e-12;
        if (!(uz && wz)) break;
        Expr du, dw;
        try {
          du = diff(u, v);
          dw = diff(w, v);
        } catch (_) {
          break;
        }
        steps.add(
          Step(
            text: r'$\frac{0}{0}$ хэлбэр — Лопиталийн дүрэм: хүртвэр, хуваарийн уламжлалын харьцаа',
            tex: ['\\lim_{$v\\to $tTex} \\frac{${tidy(du, v)}}{${tidy(dw, v)}}'],
          ),
        );
        u = du;
        w = dw;
        final q2 = N.div(u, w);
        if (t.x != null) {
          final ex = exactAt(simplify(q2), v, t.x!);
          if (ex.value != null) {
            steps.add(Step(text: 'Орлуулбал', tex: [xtex(ex.value!)]));
            return done(ex.value!);
          }
        }
      }
    }
  } else {
    // x → ±∞
    if (rf != null) {
      final n = deg(rf.num), d = deg(rf.den);
      if (n < 0) return done(xq(qZero));
      steps.add(Step(text: 'Хүртвэр, хуваарийг \$$v\$-ийн хамгийн их зэрэг \$$v^{${math.max(n, d)}}\$-д хуваана'));
      if (n < d) {
        steps.add(const Step(text: 'Хүртвэрийн зэрэг бага тул хязгаар 0'));
        return done(xq(qZero));
      }
      if (n == d) {
        final l = qdiv(lead(rf.num), lead(rf.den));
        steps.add(
          Step(
            text: 'Зэрэг тэнцүү тул ахлах коэффициентуудын харьцаа',
            tex: ['\\frac{${qTex(lead(rf.num))}}{${qTex(lead(rf.den))}} = ${qTex(l)}'],
          ),
        );
        return done(xq(l));
      }
      final s = qval(qdiv(lead(rf.num), lead(rf.den))).sign * ((n - d) % 2 == 1 ? t.inf : 1);
      steps.add(const Step(text: 'Хүртвэрийн зэрэг их тул хязгаар төгсгөлгүй'));
      return done(s * double.infinity);
    }
    // 1^∞ хэлбэр: (B)^E, B→1, E→∞ → e^{lim (B-1)E}
    if (f.kind == ExprKind.pow && dep(f.b!, v)) {
      final bv = numAt(f.a!, v, t.inf * 1e7), ev = numAt(f.b!, v, t.inf * 1e7);
      if ((bv - 1).abs() < 1e-4 && ev.abs() > 1e5) {
        final g = N.mul(N.sub(f.a!, mkNum(1)), f.b!);
        final gr = ratFrom(g, v);
        if (gr != null) {
          final n = deg(gr.num), d = deg(gr.den);
          Q? l;
          if (n < d) {
            l = qZero;
          } else if (n == d) {
            l = qdiv(lead(gr.num), lead(gr.den));
          }
          if (l != null) {
            steps.add(
              Step(
                text: r'$1^{\infty}$ хэлбэр: $\lim B^{E} = e^{\lim (B-1)E}$ (гайхамшигт хязгаар)',
                tex: ['\\lim_{$v\\to $tTex} ${_p(g)} = ${qTex(l)}'],
              ),
            );
            return done(evalExact(N.pow(mkSym('e'), _num(l))));
          }
        }
      }
    }
    // Лопиталь (∞/∞)
    if (f.kind == ExprKind.div) {
      var u = f.a!, w = f.b!;
      for (var k = 1; k <= 3; k++) {
        final uv = numAt(u, v, t.inf * 1e6), wv = numAt(w, v, t.inf * 1e6);
        if (!(uv.abs() > 1e3 && wv.abs() > 1e3)) break;
        try {
          u = diff(u, v);
          w = diff(w, v);
        } catch (_) {
          break;
        }
        steps.add(
          Step(
            text: r'$\frac{\infty}{\infty}$ хэлбэр — Лопиталийн дүрэм',
            tex: ['\\lim \\frac{${tidy(u, v)}}{${tidy(w, v)}}'],
          ),
        );
        final r2 = ratFrom(N.div(u, w), v);
        if (r2 != null) {
          final sub = limit(N.div(u, w), target, v);
          if (sub.ok) {
            steps.addAll(sub.steps.where((s) => s.tone != Tone.ok));
            return done(_parseLimitValue(sub, N.div(u, w), v, t));
          }
        }
        if (!dep(w, v) || !dep(u, v)) break;
      }
    }
  }
  // Тоон үнэлгээ
  final seq = <double>[];
  if (t.isPoint) {
    for (final s in const [1, -1]) {
      seq
        ..add(_near(f, v, t.v, s, 1e-6))
        ..add(_near(f, v, t.v, s, 1e-7));
    }
  } else {
    seq
      ..add(numAt(f, v, t.inf * 1e6))
      ..add(numAt(f, v, t.inf * 1e7));
  }
  if (seq.every((y) => y.isFinite) &&
      seq.reduce(math.max) - seq.reduce(math.min) < 1e-5 * math.max(1, seq[0].abs())) {
    final l = seq.last;
    return Solution(
      ok: true,
      title: 'Хязгаар (тоон)',
      problem: problem,
      steps: const [
        Step(text: 'Аналитик аргаар бодож чадаагүй тул цэгийн ойролцоох утгуудаар тоогоор үнэлэв', tone: Tone.note),
      ],
      answer: ['$problem \\approx ${decTex(l, 6)}'],
      notes: const ['Тоон үнэлгээ — ойролцоо утга'],
      graph: [toAscii(f)],
    );
  }
  return failure(
    '$cannot: хязгаар оршихгүй байж болно эсвэл энэ хэлбэрийг бодож чадсангүй',
  ).copyWith(problem: problem, graph: [toAscii(f)]);
}

Object _parseLimitValue(Solution sol, Expr f, String v, LimitTarget t) {
  final s = sol.answer.isNotEmpty ? sol.answer[0] : '';
  if (s.endsWith(r'+\infty')) return double.infinity;
  if (s.endsWith(r'-\infty')) return double.negativeInfinity;
  final vals = !t.isPoint ? numAt(f, v, t.inf * 1e7) : _near(f, v, t.v, 1, 1e-7);
  final rf = ratFrom(f, v);
  if (rf != null && !t.isPoint) {
    final n = deg(rf.num), d = deg(rf.den);
    if (n < d) return xq(qZero);
    if (n == d) return xq(qdiv(lead(rf.num), lead(rf.den)));
  }
  return vals;
}

/* ---------- Функцийн судалгаа ---------- */

bool _definedAt(Expr f, String v, Root r) {
  if (r.x != null) {
    final ex = exactAt(f, v, r.x!);
    if (ex.nan) return false;
    if (ex.value != null) return true;
  }
  return numAt(f, v, r.v).isFinite;
}

List<Root>? _pointsOf(Expr f, String v) {
  final pts = <Root>[];
  for (final e in breakExprs(f, v)) {
    if (e.kind == ExprKind.call && (e.name == 'tan' || e.name == 'cot')) return null;
    final z = zerosOf(e, v);
    if (z.kind != ZerosKind.finite || !z.complete) {
      if (z.kind == ZerosKind.finite && z.all) continue;
      return null;
    }
    pts.addAll(z.roots);
  }
  return pts;
}

class _Mono {
  _Mono(this.lo, this.hi, this.s);
  final Root? lo;
  Root? hi;
  final double s;
}

Solution studyFunction(Expr f, [String v = _v0]) {
  final problem = 'f($v) = ${_t(f)}';
  final trig = collect(f, (n) => n.kind == ExprKind.call && RegExp('sin|cos|tan|cot').hasMatch(n.name)).isNotEmpty;
  if (trig) {
    return failure(
      '$cannot: тригонометрийн функцийн бүрэн судалгааг хийхгүй (графикаар харна уу)',
    ).copyWith(problem: problem, graph: [toAscii(f)]);
  }
  final steps = <Step>[];
  final answer = <String>[];
  Expr d;
  try {
    d = diff(f, v);
  } catch (_) {
    return failure(cannot).copyWith(problem: problem);
  }
  if (!_derivOk(f, d, v)) return failure(cannot).copyWith(problem: problem);
  final fp = _pointsOf(f, v);
  final dz = zerosOf(d, v);
  final dp = _pointsOf(d, v);
  final fz = zerosOf(f, v);
  if (fp == null || dp == null || dz.kind != ZerosKind.finite || !dz.complete) {
    return failure(
      '$cannot: функцийн онцгой цэгүүдийг бүрэн олж чадсангүй',
    ).copyWith(problem: problem, graph: [toAscii(f)]);
  }
  // 1. Тодорхойлогдох муж
  final dom = mergeRoots(fp).map((r) => r.copy(mult: 1)).toList();
  final domSigns = <double>[];
  for (var i = 0; i <= dom.length; i++) {
    final lo = i > 0 ? dom[i - 1] : null, hi = i < dom.length ? dom[i] : null;
    final t = lo != null && hi != null
        ? (lo.v + hi.v) / 2
        : (lo != null ? lo.v + 1 : (hi != null ? hi.v - 1 : 0.5));
    domSigns.add(numAt(f, v, t).isFinite ? 1 : double.nan);
  }
  final domPieces = piecesFrom(
    SignAnalysis(
      points: dom,
      signs: domSigns,
      pointSigns: dom.map((p) => _definedAt(f, v, p) ? 1.0 : double.nan).toList(),
      zeros: const [],
    ),
    RelOp.gt,
  );
  final full = domPieces.length == 1 && domPieces[0].a == null && domPieces[0].b == null;
  final domTex = full ? r'\mathbb{R}' : piecesTex(domPieces);
  answer.add('D(f) = $domTex');
  steps.add(Step(text: '1. Тодорхойлогдох муж', tex: ['D(f) = $domTex']));
  bool inDom(double x) => numAt(f, v, x).isFinite;
  // 2. Тэг ба тэнхлэгтэй огтлолцол
  if (fz.kind == ZerosKind.finite && fz.complete) {
    final zs = fz.roots.where((r) => _definedAt(f, v, r)).toList();
    steps.add(
      Step(
        text: r'2. Функцийн тэг ($f(x) = 0$)',
        tex: [zs.isNotEmpty ? '$v = ${zs.map((r) => r.tex).join(r',\ ')}' : r'\text{тэггүй}'],
      ),
    );
    if (zs.isNotEmpty) answer.add('f($v) = 0:\\ $v = ${zs.map((r) => r.tex).join(r',\ ')}');
  }
  if (inDom(0)) {
    final y0 = exactAt(f, v, xq(qZero));
    steps.add(
      Step(
        text: r'$Oy$ тэнхлэгтэй огтлолцох цэг',
        tex: ['f(0) = ${y0.value != null ? xtex(y0.value!) : decTex(numAt(f, v, 0), 6)}'],
      ),
    );
  }
  // Тэгш, сондгой (зөвхөн рационал функцэд ЯГ)
  final rf = ratFrom(f, v);
  if (rf != null) {
    final fm = ratFrom(_mapX(f, v), v);
    if (fm != null) {
      bool crossEq(int s) =>
          peq(pmul(fm.num, rf.den), pmul(rf.num, fm.den).map((c) => s > 0 ? c : qneg(c)).toList());
      final symDom = dom.every((p) => dom.any((o) => (o.v + p.v).abs() < 1e-9));
      if (symDom && crossEq(1)) {
        steps.add(const Step(text: r'$f(-x) = f(x)$ — тэгш функц (графикаа $Oy$-ийн хувьд тэгш хэмтэй)'));
        answer.add(r'\text{тэгш функц}');
      } else if (symDom && crossEq(-1)) {
        steps.add(const Step(text: r'$f(-x) = -f(x)$ — сондгой функц (графикаа эх цэгийн хувьд тэгш хэмтэй)'));
        answer.add(r'\text{сондгой функц}');
      }
    }
  }
  // 3. Уламжлал, критик цэг
  steps.add(Step(text: '3. Уламжлал', tex: ["f'($v) = ${tidy(d, v)}"]));
  final crit = mergeRoots([...dz.roots, ...dp]).where((r) => _definedAt(f, v, r)).toList();
  final allPts = mergeRoots([...dom, ...dz.roots, ...dp]).map((r) => r.copy(mult: 1)).toList();
  if (crit.isNotEmpty) {
    steps.add(
      Step(
        text: r"Критик цэгүүд ($f'(x) = 0$ эсвэл $f'$ тодорхойлогдохгүй)",
        tex: ['$v = ${crit.map((r) => r.tex).join(r',\ ')}'],
      ),
    );
  }
  // 4. Монотон завсар
  final ivs = <_Mono>[];
  for (var i = 0; i <= allPts.length; i++) {
    final lo = i > 0 ? allPts[i - 1] : null, hi = i < allPts.length ? allPts[i] : null;
    final t = lo != null && hi != null
        ? (lo.v + hi.v) / 2
        : (lo != null
              ? lo.v + math.max(1, lo.v.abs())
              : (hi != null ? hi.v - math.max(1, hi.v.abs()) : 0.5));
    if (!inDom(t)) {
      ivs.add(_Mono(lo, hi, double.nan));
      continue;
    }
    final y = numAt(d, v, t);
    ivs.add(_Mono(lo, hi, y.isFinite ? y.sign : double.nan));
  }
  // нэгтгэх: дундах цэг мужид орж, тэмдэг ижил бол
  final merged = <_Mono>[];
  for (final iv in ivs) {
    final last = merged.isNotEmpty ? merged.last : null;
    if (last != null && last.s == iv.s && !iv.s.isNaN && last.hi != null && _definedAt(f, v, last.hi!)) {
      last.hi = iv.hi;
    } else {
      merged.add(_Mono(iv.lo, iv.hi, iv.s));
    }
  }
  String ivTex(_Mono m) =>
      '\\left(${m.lo != null ? m.lo!.tex : r'-\infty'};\\ ${m.hi != null ? m.hi!.tex : r'+\infty'}\\right)';
  final inc = merged.where((m) => m.s > 0).map(ivTex).toList();
  final dec = merged.where((m) => m.s < 0).map(ivTex).toList();
  final cons = merged.where((m) => m.s == 0).map(ivTex).toList();
  steps.add(
    Step(
      text: r"4. Уламжлалын тэмдгээр монотон завсар ($f'>0$ — өснө, $f'<0$ — буурна)",
      tex: [
        if (inc.isNotEmpty) '\\nearrow:\\ ${inc.join(r',\ ')}',
        if (dec.isNotEmpty) '\\searrow:\\ ${dec.join(r',\ ')}',
        if (cons.isNotEmpty) '\\text{тогтмол}:\\ ${cons.join(r',\ ')}',
      ],
    ),
  );
  if (inc.isNotEmpty) answer.add('\\text{өснө: } ${inc.join(r'\cup ')}');
  if (dec.isNotEmpty) answer.add('\\text{буурна: } ${dec.join(r'\cup ')}');
  // 5. Экстремум
  final ext = <String>[];
  for (final c in crit) {
    final i = ivs.indexWhere((iv) => iv.hi != null && (iv.hi!.v - c.v).abs() < 1e-12);
    if (i < 0 || i + 1 >= ivs.length) continue;
    final l = ivs[i].s, r = ivs[i + 1].s;
    if (l.isNaN || r.isNaN || l == r || l == 0 || r == 0) continue;
    final y = c.x != null ? exactAt(f, v, c.x!) : null;
    final yt = y != null && y.value != null ? xtex(y.value!) : '\\approx ${decTex(numAt(f, v, c.v), 6)}';
    final kind = l > 0 && r < 0 ? 'max' : 'min';
    ext.add('${v}_{\\$kind} = ${c.tex},\\ f_{\\$kind} = $yt'.replaceFirst(r'= \approx', r'\approx'));
  }
  steps.add(
    Step(
      text: r'5. Экстремум: уламжлалын тэмдэг $+\to-$ бол максимум, $-\to+$ бол минимум',
      tex: ext.isNotEmpty ? ext : const [r'\text{экстремумгүй}'],
    ),
  );
  answer.addAll(ext);
  // 6. Асимптот (рационал)
  if (rf != null) {
    final red = ratReduce(rf);
    final asym = <String>[];
    final vz = zerosOf(parseExpr(_asciiPoly(red.den, v)), v);
    if (vz.kind == ZerosKind.finite) {
      for (final r in vz.roots) {
        asym.add('$v = ${r.tex}');
      }
    }
    final n = deg(red.num), dd = deg(red.den);
    if (dd >= 1) {
      if (n < dd) {
        asym.add('y = 0');
      } else if (n == dd) {
        asym.add('y = ${qTex(qdiv(lead(red.num), lead(red.den)))}');
      } else if (n == dd + 1) {
        asym.add('y = ${ptex(pdivmod(red.num, red.den).q, v)}');
      }
    }
    if (asym.isNotEmpty) {
      steps.add(Step(text: '6. Асимптотууд', tex: asym));
      answer.add('\\text{асимптот: } ${asym.join(r',\ ')}');
    }
  }
  return Solution(
    ok: true,
    title: 'Функцийн судалгаа',
    problem: problem,
    steps: steps,
    answer: answer,
    graph: [toAscii(f)],
  );
}

Expr _mapX(Expr f, String v) {
  Expr go(Expr n) {
    switch (n.kind) {
      case ExprKind.sym:
        return n.name == v ? mkNeg(n) : n;
      case ExprKind.num:
        return n;
      case ExprKind.neg:
        return mkNeg(go(n.a!));
      case ExprKind.fact:
        return mkFact(go(n.a!));
      case ExprKind.call:
        return mkCall(n.name, n.args.map(go).toList());
      default:
        return Expr.bin(n.kind, go(n.a!), go(n.b!));
    }
  }

  return go(f);
}
