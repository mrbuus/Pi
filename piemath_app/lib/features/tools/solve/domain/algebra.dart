// Алгебрийн хувиргалт (вэбийн `solve/algebra.ts`): үржигдэхүүнд задлах, хаалт
// задлах, бутархай хураах, олон гишүүнт хуваах, ХИЕХ/ХБЕХ, анхны үржвэр.
import 'dart:math' as math;

import 'expr_ext.dart';
import 'mpoly.dart';
import 'poly.dart';
import 'q.dart';
import 'steps.dart';

/* ---------- Үржигдэхүүнд задлах ---------- */

class FPart {
  FPart(this.p, this.m);
  final MPoly p;
  int m;
}

class Factored {
  Factored(this.k, this.factors);
  Q k;
  List<FPart> factors;
}

class _Content {
  const _Content(this.k, this.mono, this.prim);
  final Q k;
  final Mono mono;
  final MPoly prim;
}

/// Анхны (коэффициентийн ХИЕХ 1, ахлах гишүүн эерэг) + нэг гишүүнт хүчин зүйл.
_Content _content(MPoly p) {
  final ts = sortedTerms(p);
  if (ts.isEmpty) return _Content(qOne, const {}, p);
  var l = 1, g = 0;
  for (final t in ts) {
    l = ilcm(l, t.c.d);
  }
  for (final t in ts) {
    g = igcd(g, t.c.n * (l ~/ t.c.d));
  }
  var k = q(g, l);
  if (ts[0].c.n < 0) k = qneg(k);
  final mono = <String, int>{};
  for (final v in mvars(p)) {
    var mn = 1 << 30;
    for (final t in ts) {
      mn = math.min(mn, t.m[v] ?? 0);
    }
    if (mn > 0) mono[v] = mn;
  }
  MPoly prim = {};
  for (final t in ts) {
    final m = <String, int>{...t.m};
    for (final v in mono.keys) {
      m[v] = m[v]! - mono[v]!;
    }
    prim = madd(prim, mterm(m, qdiv(t.c, k)));
  }
  return _Content(k, mono, prim);
}

bool _isMono(MPoly p) => p.length == 1;

String _ftex(MPoly p, [List<String>? order]) {
  if (_isMono(p) && p.values.first.c.n == 1 && p.values.first.c.d == 1) return mtex(p, order);
  return '\\left(${mtex(p, order)}\\right)';
}

/// Нэг гишүүнтийн квадрат/куб язгуур (коэффициент рационал).
MPoly? _monoRoot(MTerm t, int k) {
  if (t.c.n < 0 && k.isEven) return null;
  final c = qroot(t.c, k);
  if (c == null) return null;
  final m = <String, int>{};
  for (final e in t.m.entries) {
    if (e.value % k != 0) return null;
    m[e.key] = e.value ~/ k;
  }
  return mterm(m, c);
}

MPoly _sumTerms(Iterable<MTerm> ts) => ts.fold(<String, MTerm>{}, (acc, t) => madd(acc, mterm(t.m, t.c)));

List<MPoly> _factorPrim(MPoly p, List<Step> steps, List<String> order, [int depth = 0]) {
  if (depth > 8 || mtotalDeg(p) <= 1) return [p];
  final vs = mvars(p);
  final ts = sortedTerms(p, order);
  String t(MPoly x) => mtex(x, order);

  // Хоёр гишүүнт: квадратуудын ялгавар, кубуудын нийлбэр/ялгавар
  if (ts.length == 2) {
    final aT = ts[0], bT = ts[1];
    if (aT.c.n > 0 && bT.c.n < 0) {
      final a = _monoRoot(aT, 2), b = _monoRoot(MTerm(bT.m, qneg(bT.c)), 2);
      if (a != null && b != null) {
        steps.add(
          Step(
            text: r'Квадратуудын ялгаврын томьёо $a^2-b^2=(a-b)(a+b)$',
            tex: ['${t(p)} = \\left(${t(msub(a, b))}\\right)\\left(${t(madd(a, b))}\\right)'],
          ),
        );
        return [
          ..._factorPrim(msub(a, b), steps, order, depth + 1),
          ..._factorPrim(madd(a, b), steps, order, depth + 1),
        ];
      }
    }
    final a3 = _monoRoot(aT, 3), b3 = _monoRoot(bT, 3);
    if (a3 != null && b3 != null) {
      final f1 = madd(a3, b3), f2 = madd(msub(mmul(a3, a3), mmul(a3, b3)), mmul(b3, b3));
      final plus = bT.c.n > 0;
      steps.add(
        Step(
          text: plus
              ? r'Кубуудын нийлбэрийн томьёо $a^3+b^3=(a+b)(a^2-ab+b^2)$'
              : r'Кубуудын ялгаврын томьёо $a^3-b^3=(a-b)(a^2+ab+b^2)$',
          tex: ['${t(p)} = \\left(${t(f1)}\\right)\\left(${t(f2)}\\right)'],
        ),
      );
      return [..._factorPrim(f1, steps, order, depth + 1), ..._factorPrim(f2, steps, order, depth + 1)];
    }
  }

  // Нэг хувьсагч
  if (vs.length == 1) return _factorUni(p, vs[0], steps, order, depth);

  // Хоёр хувьсагчийн нэгэн төрлийн: y = 1 гэж задлаад буцаана
  if (vs.length == 2) {
    final ds = {for (final tt in ts) tdeg(tt.m)};
    if (ds.length == 1) {
      final ordered = order.where(vs.contains).toList();
      final uw = ordered.length == 2 ? ordered : vs;
      final u = uw[0], w = uw[1];
      final d = ds.first;
      final uni = toUni(_mmapSet(p, w), u);
      if (uni != null) {
        final sub = <Step>[];
        final fs = _factorUni(fromUni(uni, u), u, sub, order, depth + 1);
        if (fs.length > 1) {
          final back = fs.map((f) => _homogenize(f, u, w)).toList();
          final prod = back.fold(mconst(qOne), mmul);
          if (mequal(prod, p)) {
            steps.add(
              Step(
                text: 'Нэгэн төрлийн олон гишүүнт ($d-р зэрэг): \$$w\$-ийг тогтмол гэж үзээд \$$u\$-ээр задлав',
                tex: ['${t(p)} = ${back.map((f) => _ftex(f, order)).join()}'],
              ),
            );
            return back;
          }
        }
      }
    }
  }

  // Бүлэглэх (4 гишүүн)
  if (ts.length == 4) {
    const pairings = [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 3],
      ],
      [
        [0, 3],
        [1, 2],
      ],
    ];
    for (final pr in pairings) {
      final p1 = _sumTerms(pr[0].map((i) => ts[i]));
      final p2 = _sumTerms(pr[1].map((i) => ts[i]));
      final c1 = _content(p1), c2 = _content(p2);
      final r1 = c1.prim, r2 = c2.prim;
      final m1 = mterm(c1.mono, c1.k), m2 = mterm(c2.mono, c2.k);
      MPoly? common, other;
      if (mequal(r1, r2)) {
        common = r1;
        other = madd(m1, m2);
      } else if (mequal(r1, mneg(r2))) {
        common = r1;
        other = msub(m1, m2);
      }
      if (common != null && other != null && mtotalDeg(common) >= 1) {
        steps.add(
          Step(
            text: 'Бүлэглэх арга',
            tex: [
              '${t(p)} = \\left(${t(p1)}\\right)+\\left(${t(p2)}\\right) = ${_ftex(m1, order)}${_ftex(r1, order)}${mtex(m2, order).startsWith('-') ? '' : '+'}${_ftex(m2, order)}${_ftex(r2, order)} = \\left(${t(common)}\\right)\\left(${t(other)}\\right)',
            ],
          ),
        );
        final oc = _content(other);
        final pre = oc.k.n == 1 && oc.k.d == 1 && oc.mono.isEmpty ? <MPoly>[] : [mterm(oc.mono, oc.k)];
        return [
          ..._factorPrim(common, steps, order, depth + 1),
          ...pre,
          ..._factorPrim(oc.prim, steps, order, depth + 1),
        ];
      }
    }
  }

  // Бүтэн квадрат хасах квадрат: (a ± b)^2 - c^2
  if (ts.length >= 4 && ts.length <= 6) {
    final n = ts.length;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        for (var k = j + 1; k < n; k++) {
          final tri = [ts[i], ts[j], ts[k]];
          final rest = [
            for (var x = 0; x < n; x++)
              if (x != i && x != j && x != k) ts[x],
          ];
          final s = _sqTrinomial(tri);
          if (s == null) continue;
          final negR = mneg(_sumTerms(rest));
          MPoly? c;
          if (negR.length == 1) {
            c = _monoRoot(negR.values.first, 2);
          } else if (negR.length == 3) {
            c = _sqTrinomial(sortedTerms(negR, order));
          }
          if (c == null) continue;
          final f1 = msub(s, c), f2 = madd(s, c);
          steps.add(
            Step(
              text: 'Бүтэн квадрат ялгаж, квадратуудын ялгавар болгов',
              tex: [
                '${t(p)} = \\left(${t(s)}\\right)^2-${_ftex(c, order)}^2 = \\left(${t(f1)}\\right)\\left(${t(f2)}\\right)',
              ],
            ),
          );
          return [..._factorPrim(f1, steps, order, depth + 1), ..._factorPrim(f2, steps, order, depth + 1)];
        }
      }
    }
  }
  return [p];
}

MPoly _mmapSet(MPoly p, String w) {
  MPoly r = {};
  for (final t in p.values) {
    final m = <String, int>{...t.m}..remove(w);
    r = madd(r, mterm(m, t.c));
  }
  return r;
}

MPoly _homogenize(MPoly f, String u, String w) {
  final d = mtotalDeg(f);
  MPoly r = {};
  for (final t in f.values) {
    r = madd(r, mterm({...t.m, w: d - tdeg(t.m)}, t.c));
  }
  return r;
}

/// a^2 ± 2ab + b^2 → a ± b.
MPoly? _sqTrinomial(List<MTerm> tri) {
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      if (i == j) continue;
      final k = 3 - i - j;
      final a = _monoRoot(tri[i], 2), b = _monoRoot(tri[j], 2);
      if (a == null || b == null) continue;
      final ab2 = mscale(mmul(a, b), q(2));
      final mid = mterm(tri[k].m, tri[k].c);
      if (mequal(mid, ab2)) return madd(a, b);
      if (mequal(mid, mneg(ab2))) return msub(a, b);
    }
  }
  return null;
}

List<MPoly> _factorUni(MPoly p, String v, List<Step> steps, List<String> order, int depth) {
  final up = toUni(p, v)!;
  final d = deg(up);
  String t(MPoly x) => mtex(x, order);
  if (d <= 1) return [p];
  if (d == 2) {
    final c = up[0], b = up[1], a = up[2];
    final dd = qsub(qmul(b, b), qmul(q(4), qmul(a, c)));
    final s = dd.n >= 0 ? qroot(dd, 2) : null;
    if (s == null) {
      steps.add(
        Step(
          text:
              '\$${t(p)}\$: \$D = ${qTex(dd)}\$ ${dd.n < 0 ? 'сөрөг' : 'рационал тооны квадрат биш'} тул рационал коэффициенттэй үржигдэхүүнд задрахгүй',
          tone: Tone.note,
        ),
      );
      return [p];
    }
    final x1 = qdiv(qsub(qneg(b), s), qmul(q(2), a)), x2 = qdiv(qadd(qneg(b), s), qmul(q(2), a));
    MPoly lin(Q r) => fromUni(primitive([qneg(r), qOne]).prim, v);
    final f1 = lin(x1), f2 = lin(x2);
    if (isZ(dd)) {
      steps.add(
        Step(text: r'Бүтэн квадрат: $a^2\pm 2ab+b^2=(a\pm b)^2$', tex: ['${t(p)} = \\left(${t(f1)}\\right)^2']),
      );
    } else {
      steps.add(
        Step(
          text: r'Квадрат гурван гишүүнт: $ax^2+bx+c=a(x-x_1)(x-x_2)$',
          tex: [
            'D = ${qp(b)}^2-4\\cdot ${qp(a)}\\cdot ${qp(c)} = ${qTex(dd)},\\quad ${v}_1 = ${qTex(x1)},\\ ${v}_2 = ${qTex(x2)}',
            '${t(p)} = \\left(${t(f1)}\\right)\\left(${t(f2)}\\right)',
          ],
        ),
      );
    }
    return [f1, f2];
  }
  // Рационал язгуур
  RatRoots rr;
  try {
    rr = rationalRoots(up);
  } catch (_) {
    return [p];
  }
  final nz = rr.roots.where((r) => !isZ(r.r)).toList();
  if (nz.isNotEmpty) {
    final out = <MPoly>[];
    var cur = primitive(up).prim;
    for (final rt in nz) {
      for (var i = 0; i < rt.m; i++) {
        final lf = primitive([qneg(rt.r), qOne]).prim; // q x - p
        steps.add(
          Step(
            text:
                '\$$v = ${qTex(rt.r)}\$ үед олон гишүүнт тэг болох тул \$(${ptex(lf, v)})\$-д хуваагдана. Хорнерийн схем',
            tex: [hornerTex(cur, rt.r)],
          ),
        );
        cur = pdivmod(cur, lf).q;
        out.add(fromUni(lf, v));
      }
    }
    final restP = fromUni(primitive(cur).prim, v);
    final rest = deg(cur) >= 1 ? _factorPrim(restP, steps, order, depth + 1) : <MPoly>[];
    return [...out, ...rest];
  }
  // x^4 + ... — хоёр квадрат гурван гишүүнтэд (бүхэл, ахлах коэффициент 1)
  final pr = primitive(up).prim;
  if (d == 4 && lead(pr).n == 1) {
    final e0 = pr[0].n, e1 = pr[1].n, e2 = pr[2].n, e3 = pr[3].n;
    final ds = e0 == 0 ? <int>[] : [for (final x in divisors(e0)) ...[x, -x]];
    for (final qq in ds) {
      final s = e0 ~/ qq;
      bool tryPR(int pp, int r2) => pp + r2 == e3 && pp * r2 + qq + s == e2 && pp * s + qq * r2 == e1;
      final cands = <(int, int)>[];
      if (s != qq) {
        final num = e1 - e3 * qq, den = s - qq;
        if (num % den == 0) {
          final pp = num ~/ den;
          cands.add((pp, e3 - pp));
        }
      } else {
        final disc = e3 * e3 - 4 * (e2 - 2 * qq);
        final sq = disc >= 0 ? iroot(disc, 2) : null;
        if (sq != null && (e3 + sq) % 2 == 0) cands.add(((e3 + sq) ~/ 2, (e3 - sq) ~/ 2));
      }
      for (final (pp, r2) in cands) {
        if (!tryPR(pp, r2)) continue;
        final f1 = fromUni([q(qq), q(pp), qOne], v), f2 = fromUni([q(s), q(r2), qOne], v);
        steps.add(
          Step(
            text: 'Хоёр квадрат гурван гишүүнтийн үржвэрт задлав (коэффициентыг тааруулж)',
            tex: ['${t(p)} = \\left(${t(f1)}\\right)\\left(${t(f2)}\\right)'],
          ),
        );
        return [..._factorPrim(f1, steps, order, depth + 1), ..._factorPrim(f2, steps, order, depth + 1)];
      }
    }
  }
  return [p];
}

Factored factorM(MPoly p, List<Step> steps, List<String> order) {
  final c = _content(p);
  final out = <FPart>[];
  void push(MPoly f, [int m = 1]) {
    for (final o in out) {
      if (mequal(o.p, f)) {
        o.m += m;
        return;
      }
    }
    out.add(FPart(f, m));
  }

  for (final v in (c.mono.keys.toList()..sort())) {
    push(mvar(v), c.mono[v]!);
  }
  if (!(c.k.n == 1 && c.k.d == 1) || c.mono.isNotEmpty) {
    final monoT = mtex(mterm(c.mono, c.k), order);
    steps.add(
      Step(
        text: 'Ерөнхий үржигдэхүүнийг хаалтны гадна гаргавал',
        tex: [
          '${mtex(p, order)} = ${monoT == '1' ? '' : (monoT == '-1' ? '-' : monoT)}\\left(${mtex(c.prim, order)}\\right)',
        ],
      ),
    );
  }
  var k = c.k;
  for (final f in _factorPrim(c.prim, steps, order)) {
    final cc = _content(f);
    k = qmul(k, cc.k);
    for (final v in cc.mono.keys) {
      push(mvar(v), cc.mono[v]!);
    }
    final pc = masConst(cc.prim);
    if (!(pc != null && isZ(qsub(pc, qOne)))) push(cc.prim);
  }
  return Factored(k, out);
}

String factoredTex(Factored f, [List<String>? order]) {
  if (f.factors.length == 1 && f.factors[0].m == 1 && f.k.n == 1 && f.k.d == 1) return mtex(f.factors[0].p, order);
  final parts = f.factors.map((x) {
    final base = _ftex(x.p, order);
    return x.m > 1 ? '$base^{${x.m}}' : base;
  });
  final k = f.k;
  final lead = k.n == 1 && k.d == 1 ? '' : (k.n == -1 && k.d == 1 ? '-' : qTex(k));
  final body = parts.join();
  return lead + (body.isEmpty ? '1' : body);
}

MPoly _expandFactored(Factored f) {
  var r = mconst(f.k);
  for (final x in f.factors) {
    r = mmul(r, mpow(x.p, x.m));
  }
  return r;
}

const _orderList = ['x', 'y', 'z', 'a', 'b', 'c', 'm', 'n', 'p', 't'];

List<String> _orderOf(MPoly p) {
  final vs = mvars(p);
  return [..._orderList.where(vs.contains), ...vs.where((x) => !_orderList.contains(x))];
}

Solution factorExpr(Expr node) {
  final p = mfrom(node);
  final problem = toLatex(node);
  if (p == null) {
    return failure(
      '$cannot: зөвхөн олон гишүүнтийг (рационал коэффициенттэй) үржигдэхүүнд задална',
    ).copyWith(problem: problem);
  }
  if (misZero(p)) {
    return Solution(ok: true, title: 'Үржигдэхүүнд задлах', problem: problem, steps: const [], answer: const ['0']);
  }
  final order = _orderOf(p);
  final steps = <Step>[];
  final pre = mtex(p, order);
  if (pre.replaceAll(RegExp(r'\s'), '') != problem.replaceAll(RegExp(r'\s'), '')) {
    steps.add(Step(text: 'Эхлээд хаалт задалж эмхэтгэвэл', tex: [pre]));
  }
  final f = factorM(p, steps, order);
  if (!mequal(_expandFactored(f), p)) {
    return failure('$cannot: задаргаа шалгалтад тэнцээгүй').copyWith(problem: problem);
  }
  final tex = factoredTex(f, order);
  final trivial = f.factors.length <= 1 && f.factors.every((x) => x.m == 1) && (f.k.n == 1 && f.k.d == 1);
  if (trivial) {
    steps.add(
      const Step(
        text: 'Рационал коэффициенттэй үржигдэхүүнд цааш задрахгүй (эсвэл эдгээр аргаар задлагдсангүй)',
        tone: Tone.note,
      ),
    );
  } else {
    steps.add(const Step(text: 'Буцааж үржүүлэхэд анхны илэрхийлэл гарч байна', tone: Tone.ok));
  }
  return Solution(
    ok: true,
    title: 'Үржигдэхүүнд задлах',
    problem: problem,
    steps: steps,
    answer: ['$problem = $tex'],
    graph: _graphOf(p),
  );
}

List<String>? _graphOf(MPoly p) {
  final vs = mvars(p);
  return vs.length == 1 && vs[0] == 'x' ? [mascii(p)] : null;
}

/* ---------- Хаалт задлах ---------- */

(MPoly, MPoly, String)? _binom(Expr n) {
  if (n.kind != ExprKind.add && n.kind != ExprKind.sub) return null;
  final a = mfrom(n.a!), b = mfrom(n.b!);
  if (a == null || b == null) return null;
  final plus = n.kind == ExprKind.add;
  return (a, plus ? b : mneg(b), plus ? '+' : '-');
}

Solution expandExpr(Expr node) {
  final p = mfrom(node);
  final problem = toLatex(node);
  if (p == null) return failure('$cannot: зөвхөн олон гишүүнтийн хаалтыг задална').copyWith(problem: problem);
  final order = _orderOf(p);
  final steps = <Step>[];
  final powNum = node.kind == ExprKind.pow && node.b!.kind == ExprKind.num;
  final pv = powNum ? node.b!.v : 0.0;
  if (powNum && (pv == 2 || pv == 3)) {
    final bn = _binom(node.a!);
    if (bn != null) {
      final (a, b, sgn) = bn;
      final fa = _ftex(a, order), fb = _ftex(sgn == '-' ? mneg(b) : b, order);
      if (pv == 2) {
        steps.add(
          Step(
            text: 'Товч үржвэрийн томьёо \$(a${sgn}b)^2=a^2${sgn}2ab+b^2\$',
            tex: ['$problem = $fa^2${sgn}2\\cdot $fa\\cdot $fb+$fb^2'],
          ),
        );
      } else {
        steps.add(
          Step(
            text: 'Товч үржвэрийн томьёо \$(a${sgn}b)^3=a^3${sgn}3a^2b+3ab^2${sgn}b^3\$',
            tex: ['$problem = $fa^3${sgn}3\\cdot $fa^2\\cdot $fb+3\\cdot $fa\\cdot $fb^2$sgn$fb^3'],
          ),
        );
      }
    }
  } else if (powNum && isInteger(pv) && pv >= 4 && pv <= 10) {
    steps.add(const Step(text: r'Ньютоны бином: $(a+b)^n=\sum_{k=0}^{n} C_n^k a^{n-k}b^k$'));
  } else if (node.kind == ExprKind.mul) {
    final b1 = _binom(node.a!), b2 = _binom(node.b!);
    if (b1 != null && b2 != null && mequal(b1.$1, b2.$1) && mequal(b1.$2, mneg(b2.$2))) {
      steps.add(const Step(text: r'Товч үржвэрийн томьёо $(a-b)(a+b)=a^2-b^2$'));
    } else {
      steps.add(const Step(text: 'Хаалт бүрийн гишүүн бүрийг нөгөө хаалтны гишүүн бүрээр үржүүлнэ'));
    }
  }
  final res = mtex(p, order);
  steps.add(Step(text: 'Төстэй гишүүдийг эмхэтгэвэл', tex: [res]));
  return Solution(
    ok: true,
    title: 'Хаалт задлах',
    problem: problem,
    steps: steps,
    answer: ['$problem = $res'],
    graph: _graphOf(p),
  );
}

/* ---------- Бутархай хураах ---------- */

class _MRat {
  const _MRat(this.num, this.den);
  final MPoly num;
  final MPoly den;
}

_MRat? _mrat(Expr n) {
  final m = mfrom(n);
  if (m != null) return _MRat(m, mconst(qOne));
  switch (n.kind) {
    case ExprKind.neg:
      final a = _mrat(n.a!);
      return a == null ? null : _MRat(mneg(a.num), a.den);
    case ExprKind.add || ExprKind.sub:
      final a = _mrat(n.a!), b = _mrat(n.b!);
      if (a == null || b == null) return null;
      final plus = n.kind == ExprKind.add;
      if (mequal(a.den, b.den)) return _MRat(plus ? madd(a.num, b.num) : msub(a.num, b.num), a.den);
      final x = mmul(a.num, b.den), y = mmul(b.num, a.den);
      return _MRat(plus ? madd(x, y) : msub(x, y), mmul(a.den, b.den));
    case ExprKind.mul:
      final a = _mrat(n.a!), b = _mrat(n.b!);
      return a == null || b == null ? null : _MRat(mmul(a.num, b.num), mmul(a.den, b.den));
    case ExprKind.div:
      final a = _mrat(n.a!), b = _mrat(n.b!);
      if (a == null || b == null || misZero(b.num)) return null;
      return _MRat(mmul(a.num, b.den), mmul(a.den, b.num));
    case ExprKind.pow:
      final e = n.b!;
      if (e.kind != ExprKind.num || !isInteger(e.v) || e.v.abs() > 12) return null;
      final a = _mrat(n.a!);
      if (a == null) return null;
      final k = e.v.abs().toInt();
      final r = _MRat(mpow(a.num, k), mpow(a.den, k));
      return e.v >= 0 ? r : _MRat(r.den, r.num);
    default:
      return null;
  }
}

Solution simplifyFraction(Expr node) {
  final problem = toLatex(node);
  final r = _mrat(node);
  if (r == null) {
    return failure('$cannot: олон гишүүнтүүдийн харьцаа (рационал бутархай) оруулна уу').copyWith(problem: problem);
  }
  final order = _orderOf(madd(r.num, r.den));
  final steps = <Step>[];
  final kd = masConst(r.den);
  if (kd != null) {
    final res = mscale(r.num, qdiv(qOne, kd));
    steps.add(Step(text: 'Хуваарь нь тоо тул гишүүн бүрийг хуваана', tex: [mtex(res, order)]));
    return Solution(
      ok: true,
      title: 'Бутархай хураах',
      problem: problem,
      steps: steps,
      answer: ['$problem = ${mtex(res, order)}'],
    );
  }
  final fs = <Step>[];
  final fn = factorM(r.num, fs, order), fd = factorM(r.den, fs, order);
  steps.add(
    Step(
      text: 'Хүртвэр ба хуваарийг үржигдэхүүнд задлавал',
      tex: ['\\frac{${factoredTex(fn, order)}}{${factoredTex(fd, order)}}'],
    ),
  );
  final cancelled = <String>[];
  for (final a in fn.factors) {
    FPart? b;
    for (final x in fd.factors) {
      if (mequal(x.p, a.p)) {
        b = x;
        break;
      }
    }
    if (b == null) continue;
    final m = math.min(a.m, b.m);
    a.m -= m;
    b.m -= m;
    cancelled.add(m > 1 ? '${_ftex(a.p, order)}^{$m}' : _ftex(a.p, order));
  }
  fn.factors = fn.factors.where((x) => x.m > 0).toList();
  fd.factors = fd.factors.where((x) => x.m > 0).toList();
  fn.k = qdiv(fn.k, fd.k);
  fd.k = qOne;
  final numT = factoredTex(fn, order), denT = factoredTex(fd, order);
  final res = fd.factors.isNotEmpty ? '\\frac{${numT.startsWith('-') ? numT.substring(1) : numT}}{$denT}' : numT;
  final resSigned = fd.factors.isNotEmpty && numT.startsWith('-') ? '-$res' : res;
  if (cancelled.isNotEmpty) {
    steps.add(Step(text: 'Нийтлэг үржигдэхүүн \$${cancelled.join(r',\ ')}\$-ийг хураавал', tex: [resSigned]));
  } else {
    steps.add(const Step(text: 'Нийтлэг үржигдэхүүнгүй тул цааш хураагдахгүй', tone: Tone.note));
  }
  return Solution(
    ok: true,
    title: 'Бутархай хураах',
    problem: problem,
    steps: steps,
    answer: ['$problem = $resSigned'],
    notes: cancelled.isNotEmpty
        ? const ['Хураасан үржигдэхүүн тэгээс ялгаатай байх нөхцөлд (анхны бутархайн ОЗ) тэнцүү']
        : null,
  );
}

/* ---------- Олон гишүүнт хуваах ---------- */

Solution polyDivide(Expr a, Expr b) {
  final problem = '\\frac{${toLatex(a)}}{${toLatex(b)}}';
  final pa = mfrom(a), pb = mfrom(b);
  final vs = {if (pa != null) ...mvars(pa), if (pb != null) ...mvars(pb)}.toList();
  if (pa == null || pb == null || vs.length > 1) {
    return failure('$cannot: нэг хувьсагчийн хоёр олон гишүүнт оруулна уу (ж: (x^3-1)/(x-1))').copyWith(problem: problem);
  }
  final v = vs.isNotEmpty ? vs[0] : 'x';
  final pP = toUni(pa, v)!, dP = toUni(pb, v)!;
  if (trim(dP).isEmpty) return failure('Тэгт хуваах боломжгүй').copyWith(problem: problem);
  final steps = <Step>[];
  final dm = pdivmod(pP, dP);
  final qP = dm.q, rP = dm.r;
  if (deg(dP) == 1 && lead(dP).n == 1 && lead(dP).d == 1) {
    final r0 = qneg(dP[0]);
    steps
      ..add(
        Step(
          text: 'Хуваагч \$${ptex(dP, v)}\$ тул Хорнерийн схемээр (\$$v = ${qTex(r0)}\$)',
          tex: [hornerTex(pP, r0)],
        ),
      )
      ..add(
        Step(
          text:
              'Доод мөрийн тоонууд нь ноогдворын коэффициент, сүүлийнх нь үлдэгдэл. Безугийн теоремоор \$P(${qTex(r0)}) = ${qTex(pevalQ(pP, r0))}\$',
        ),
      );
  } else {
    // Баганаар хуваах алхмууд
    var cur = trim(pP);
    final lines = <String>[];
    var guard = 0;
    while (deg(cur) >= deg(dP) && guard++ < 20) {
      final k = deg(cur) - deg(dP);
      final c = qdiv(lead(cur), lead(dP));
      final term = [for (var i = 0; i <= k; i++) i == k ? c : qZero];
      final prod = pmul(term, dP);
      final next = trim([for (var i = 0; i < cur.length; i++) qsub(cur[i], i < prod.length ? prod[i] : qZero)]);
      lines.add('${ptex(term, v)}:\\quad ${ptex(cur, v)} - \\left(${ptex(prod, v)}\\right) = ${ptex(next, v)}');
      cur = next;
    }
    steps.add(Step(text: 'Баганаар хуваах: ахлах гишүүнийг ахлах гишүүнд хувааж, үржүүлээд хасна', tex: lines));
  }
  final hasR = trim(rP).isNotEmpty;
  steps.add(
    Step(
      text: r'Шалгалт: хуваагдагч = хуваагч $\cdot$ ноогдвор + үлдэгдэл',
      tex: [
        '${ptex(pP, v)} = \\left(${ptex(dP, v)}\\right)\\left(${ptex(qP, v)}\\right)${hasR ? '+${par(ptex(rP, v))}' : ''}',
      ],
    ),
  );
  final rNeg = hasR && lead(rP).n < 0;
  final rt = rNeg ? ptex(rP.map(qneg).toList(), v) : ptex(rP, v);
  final answer = ['$problem = ${ptex(qP, v)}${hasR ? '${rNeg ? '-' : '+'}\\frac{$rt}{${ptex(dP, v)}}' : ''}'];
  return Solution(
    ok: true,
    title: 'Олон гишүүнт хуваах',
    problem: problem,
    steps: steps,
    answer: answer,
    notes: ['Ноогдвор: \$${ptex(qP, v)}\$, үлдэгдэл: \$${ptex(rP, v)}\$'],
  );
}

/* ---------- Тооны онол ---------- */

String primeTex(int n) {
  final f = factorInt(n);
  if (f.isEmpty) return '$n';
  return f.map((e) => e.$2 > 1 ? '${e.$1}^{${e.$2}}' : '${e.$1}').join(r'\cdot ');
}

List<int>? _parseInts(String src) {
  final parts = src.split(RegExp(r'[\s,;]+')).where((s) => s.isNotEmpty);
  final out = <int>[];
  for (final s in parts) {
    if (!RegExp(r'^-?\d+$').hasMatch(s)) return null;
    final v = int.tryParse(s);
    if (v == null || v.abs() > maxSafeInt) return null;
    out.add(v.abs());
  }
  return out;
}

Solution primeFactorization(String src) {
  final ns = _parseInts(src);
  if (ns == null || ns.length != 1) return failure('Нэг натурал тоо оруулна уу (ж: 360)');
  final n = ns[0];
  if (n < 2) return failure('2-оос их натурал тоо оруулна уу');
  if (n > 1e15) return failure(r'Хэт их тоо — $10^{15}$ хүртэл');
  final steps = <Step>[];
  final rows = <String>[];
  var m = n;
  for (final (p, e) in factorInt(n)) {
    for (var i = 0; i < e; i++) {
      rows.add('$m & $p');
      m ~/= p;
    }
  }
  rows.add('1 &');
  steps.add(
    Step(
      text: 'Хамгийн бага анхны хуваагчид дараалан хуваана',
      tex: ['\\begin{array}{r|l} ${rows.join(r' \\ ')} \\end{array}'],
    ),
  );
  final f = factorInt(n);
  final tau = f.fold(1, (s, e) => s * (e.$2 + 1));
  final ds = tau <= 64 ? divisors(n) : null;
  steps.add(Step(text: 'Хуваагчийн тоо: \$\\tau(n) = ${f.map((e) => '(${e.$2}+1)').join()} = $tau\$'));
  if (ds != null) steps.add(Step(text: 'Бүх хуваагчид', tex: [ds.join(r',\ ')]));
  final isPrime = f.length == 1 && f[0].$2 == 1;
  return Solution(
    ok: true,
    title: 'Анхны үржвэрт задлах',
    problem: '$n',
    steps: steps,
    answer: ['$n = ${primeTex(n)}'],
    notes: isPrime ? ['$n нь анхны тоо'] : null,
  );
}

Solution gcdLcm(String src) {
  final ns = _parseInts(src);
  if (ns == null || ns.length < 2) {
    return failure('Хоёр ба түүнээс олон натурал тоог таслалаар тусгаарлаж оруулна уу (ж: 12, 18)');
  }
  if (ns.any((x) => x == 0)) return failure('Тэгээс ялгаатай тоо оруулна уу');
  if (ns.any((x) => x > 1e12)) return failure(r'Хэт их тоо — $10^{12}$ хүртэл');
  final steps = <Step>[Step(text: 'Анхны үржвэрт задлавал', tex: ns.map((n) => '$n = ${primeTex(n)}').toList())];
  // Евклидийн алгоритм
  final euclid = <String>[];
  var g = ns[0];
  for (var i = 1; i < ns.length; i++) {
    var a = math.max(g, ns[i]), b = math.min(g, ns[i]);
    while (b != 0) {
      euclid.add('$a = $b\\cdot ${a ~/ b}${a % b != 0 ? ' + ${a % b}' : ''}');
      final t = a % b;
      a = b;
      b = t;
    }
    g = a;
  }
  steps.add(Step(text: 'Евклидийн алгоритм (үлдэгдэл 0 болтол хуваана)', tex: euclid.take(30).toList()));
  var l = 1;
  try {
    for (final n in ns) {
      l = ilcm(l, n);
    }
  } on ExactFail {
    return failure('ХБЕХ хэт их гарч байна');
  }
  final primes = {for (final n in ns) ...factorInt(n).map((e) => e.$1)}.toList()..sort();
  int pw(int n, int p) {
    for (final e in factorInt(n)) {
      if (e.$1 == p) return e.$2;
    }
    return 0;
  }

  String pe(int p, int e) => e > 1 ? '$p^{$e}' : '$p';
  final gParts = [
    for (final p in primes)
      if (ns.map((n) => pw(n, p)).reduce(math.min) > 0) pe(p, ns.map((n) => pw(n, p)).reduce(math.min)),
  ];
  final gT = gParts.isEmpty ? '1' : gParts.join(r'\cdot ');
  final lT = [for (final p in primes) pe(p, ns.map((n) => pw(n, p)).reduce(math.max))].join(r'\cdot ');
  steps.add(
    Step(
      text: 'ХИЕХ — нийтлэг анхны тоонуудын хамгийн бага зэрэг, ХБЕХ — бүх анхны тоонуудын хамгийн их зэрэг',
      tex: ['\\text{ХИЕХ} = $gT = $g', '\\text{ХБЕХ} = $lT = $l'],
    ),
  );
  if (ns.length == 2) {
    steps.add(
      Step(
        text: r'Шалгалт: $a\cdot b = \text{ХИЕХ}\cdot\text{ХБЕХ}$',
        tex: ['${ns[0]}\\cdot ${ns[1]} = $g\\cdot $l = ${ns[0] * ns[1]}'],
      ),
    );
  }
  final list = ns.join(r';\ ');
  return Solution(
    ok: true,
    title: 'ХИЕХ ба ХБЕХ',
    problem: list,
    steps: steps,
    answer: ['\\text{ХИЕХ}($list) = $g', '\\text{ХБЕХ}($list) = $l'],
  );
}
