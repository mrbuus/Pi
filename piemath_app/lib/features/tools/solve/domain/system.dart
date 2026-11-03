// Тэгшитгэлийн систем (вэбийн `solve/system.ts`): шугаман — Крамер, Гаусс,
// 2×2 орлуулах арга; «нэг шугаман + нэг олон гишүүнт» — орлуулах арга. Бүгд ЯГ.
import 'equation.dart';
import 'exact.dart';
import 'expr_ext.dart';
import 'mpoly.dart';
import 'poly.dart';
import 'q.dart';
import 'roots.dart';
import 'steps.dart';

const _order = ['x', 'y', 'z', 't', 'u', 'v', 'w', 'a', 'b', 'c'];

List<String> _sortVars(Iterable<String> vs) {
  int rank(String a) => _order.indexOf(a) + (_order.contains(a) ? 0 : 100);
  return sortedCopy(vs, (a, b) {
    final d = rank(a) - rank(b);
    return d != 0 ? d : a.compareTo(b);
  });
}

Q _det(List<List<Q>> m) {
  final n = m.length;
  if (n == 1) return m[0][0];
  if (n == 2) return qsub(qmul(m[0][0], m[1][1]), qmul(m[0][1], m[1][0]));
  var s = qZero;
  for (var j = 0; j < n; j++) {
    final minor = [
      for (final r in m.skip(1)) [for (var k = 0; k < r.length; k++) if (k != j) r[k]],
    ];
    final t = qmul(m[0][j], _det(minor));
    s = j.isOdd ? qsub(s, t) : qadd(s, t);
  }
  return s;
}

String _vmat(List<List<Q>> m) =>
    '\\begin{vmatrix} ${m.map((r) => r.map(qTex).join(' & ')).join(r' \\ ')} \\end{vmatrix}';

String _detExpansion(List<List<Q>> m) {
  if (m.length == 2) return '${qp(m[0][0])}\\cdot ${qp(m[1][1])}-${qp(m[0][1])}\\cdot ${qp(m[1][0])}';
  return '';
}

class _GJ {
  const _GJ(this.m, this.pivots, this.inconsistent);
  final List<List<Q>> m;
  final List<int> pivots;
  final bool inconsistent;
  int get rank => pivots.length;
}

/// Гаусс–Жорданы арга (ЯГ).
_GJ _gaussJordan(List<List<Q>> a, List<Q> b) {
  final n = a.length, m = a[0].length;
  final mm = [
    for (var i = 0; i < n; i++) [...a[i], b[i]],
  ];
  final pivots = <int>[];
  var row = 0;
  for (var col = 0; col < m && row < n; col++) {
    var p = -1;
    for (var r = row; r < n; r++) {
      if (!isZ(mm[r][col])) {
        p = r;
        break;
      }
    }
    if (p < 0) continue;
    final tmp = mm[row];
    mm[row] = mm[p];
    mm[p] = tmp;
    final pv = mm[row][col];
    mm[row] = mm[row].map((x) => qdiv(x, pv)).toList();
    for (var r = 0; r < n; r++) {
      if (r == row || isZ(mm[r][col])) continue;
      final f = mm[r][col];
      mm[r] = [for (var k = 0; k < mm[r].length; k++) qsub(mm[r][k], qmul(f, mm[row][k]))];
    }
    pivots.add(col);
    row++;
  }
  final inconsistent = mm.any((r) => r.sublist(0, m).every(isZ) && !isZ(r[m]));
  return _GJ(mm, pivots, inconsistent);
}

String _pairTex(List<String> vs, List<String> vals) => vs.length == 1
    ? '${vs[0]} = ${vals[0]}'
    : '\\left(${vs.join(r';\ ')}\\right) = \\left(${vals.join(r';\ ')}\\right)';

const _mixedOnly = '$cannot: шугаман бус системээс зөвхөн «нэг шугаман + нэг олон гишүүнт» хэлбэрийг бодно';

Solution solveSystem(List<Relation> rels) {
  if (rels.length < 2) return failure('Системд хамгийн багадаа 2 тэгшитгэл мөр мөрөөр оруулна уу');
  if (rels.length > 4) return failure('4-өөс олон тэгшитгэлтэй системийг бодохгүй');
  if (rels.any((r) => r.op != RelOp.eq)) return failure(r'Системийн мөр бүр тэгшитгэл ($=$) байх ёстой');
  final problem = '\\begin{cases} ${rels.map(relTex).join(r' \\ ')} \\end{cases}';
  final polys = <MPoly>[];
  for (final r in rels) {
    final p = mfrom(N.sub(r.lhs, r.rhs));
    if (p == null) {
      return failure(
        '$cannot: системд зөвхөн олон гишүүнт тэгшитгэл (бутархай коэффициенттэй байж болно) ойлгоно',
      ).copyWith(problem: problem);
    }
    polys.add(p);
  }
  final vs = _sortVars({for (final p in polys) ...mvars(p)});
  if (vs.isEmpty) return failure('Системд үл мэдэгдэгч алга').copyWith(problem: problem);
  final graph = vs.length == 2 && vs.every((x) => x == 'x' || x == 'y')
      ? rels.map((r) => '${toAscii(r.lhs)}=${toAscii(r.rhs)}').toList()
      : null;
  if (polys.every((p) => mtotalDeg(p) <= 1)) return _linearSystem(polys, vs, problem, graph);
  if (polys.length == 2 && vs.length == 2) return _mixedSystem(polys, vs, problem, graph);
  return failure(_mixedOnly).copyWith(problem: problem, graph: graph);
}

Solution _linearSystem(List<MPoly> polys, List<String> vs, String problem, List<String>? graph) {
  final a = [
    for (final p in polys) [for (final v in vs) masConst(mcoeffAt(p, v, 1)) ?? qZero],
  ];
  final b = [for (final p in polys) qneg(masConst(_vsReduce(p, vs)) ?? qZero)];
  final steps = <Step>[];
  final n = polys.length, m = vs.length;
  final stdForm = [for (var i = 0; i < n; i++) '${mtex(msub(polys[i], mconst(qneg(b[i]))), vs)} = ${qTex(b[i])}'];
  steps.add(Step(text: 'Стандарт хэлбэрт бичвэл', tex: ['\\begin{cases} ${stdForm.join(r' \\ ')} \\end{cases}']));
  final titleTxt = n == m ? 'Шугаман тэгшитгэлийн систем ($n хувьсагч)' : 'Шугаман тэгшитгэлийн систем';

  if (n == m && n <= 3) {
    final d = _det(a);
    if (n == 2) _substitution2(a, b, vs, steps);
    final dSteps = ['\\Delta = ${_vmat(a)} = ${n == 2 ? '${_detExpansion(a)} = ' : ''}${qTex(d)}'];
    if (!isZ(d)) {
      final vals = <Q>[];
      for (var j = 0; j < vs.length; j++) {
        final aj = [
          for (var i = 0; i < n; i++) [for (var k = 0; k < m; k++) k == j ? b[i] : a[i][k]],
        ];
        final dj = _det(aj);
        dSteps.add('\\Delta_{${vs[j]}} = ${_vmat(aj)} = ${n == 2 ? '${_detExpansion(aj)} = ' : ''}${qTex(dj)}');
        vals.add(qdiv(dj, d));
      }
      dSteps.add(
        [for (var j = 0; j < vs.length; j++) '${vs[j]} = \\frac{\\Delta_{${vs[j]}}}{\\Delta} = ${qTex(vals[j])}']
            .join(r',\quad '),
      );
      steps.add(Step(text: n == 2 ? 'Крамерын аргаар шалгавал' : 'Крамерын арга: тодорхойлогчууд', tex: dSteps));
      // шалгалт
      for (var i = 0; i < n; i++) {
        var s = qZero;
        for (var j = 0; j < m; j++) {
          s = qadd(s, qmul(a[i][j], vals[j]));
        }
        if (!qeq(s, b[i])) return failure('$cannot: шалгалтад тэнцээгүй').copyWith(problem: problem);
      }
      steps.add(const Step(text: 'Олсон утгыг тэгшитгэл бүрт орлуулахад биелж байна', tone: Tone.ok));
      return Solution(
        ok: true,
        title: titleTxt,
        problem: problem,
        steps: steps,
        answer: [_pairTex(vs, vals.map(qTex).toList())],
        graph: graph,
      );
    }
    steps.add(Step(text: 'Үндсэн тодорхойлогч тэг тул Гауссын аргаар шинжилнэ', tex: [dSteps[0]]));
  }
  final g = _gaussJordan(a, b);
  final rowsTex = g.m.map((r) => '${mtex(_rowPoly(r, vs), vs)} = ${qTex(r[m])}').toList();
  steps.add(
    Step(
      text: 'Гауссын аргаар (мөрийн хувиргалт) хялбарчилбал',
      tex: ['\\begin{cases} ${rowsTex.join(r' \\ ')} \\end{cases}'],
    ),
  );
  const title = 'Шугаман тэгшитгэлийн систем';
  if (g.inconsistent) {
    steps.add(const Step(text: r'$0 = c\ (c\ne 0)$ гэсэн зөрчилтэй мөр гарсан тул шийдгүй'));
    return Solution(
      ok: true,
      title: title,
      problem: problem,
      steps: steps,
      answer: const [r'\varnothing'],
      notes: const ['Систем шийдгүй'],
      graph: graph,
    );
  }
  if (g.rank == m) {
    final vals = [for (var j = 0; j < m; j++) g.m[g.pivots.indexOf(j)][m]];
    return Solution(
      ok: true,
      title: title,
      problem: problem,
      steps: steps,
      answer: [_pairTex(vs, vals.map(qTex).toList())],
      graph: graph,
    );
  }
  // Төгсгөлгүй олон шийд: чөлөөт хувьсагчаар илэрхийлнэ
  final free = [
    for (var j = 0; j < vs.length; j++)
      if (!g.pivots.contains(j)) vs[j],
  ];
  final exprs = [
    for (var j = 0; j < vs.length; j++)
      if (free.contains(vs[j]))
        vs[j]
      else
        () {
          final r = g.m[g.pivots.indexOf(j)];
          var e = mconst(r[m]);
          for (final f in free) {
            e = madd(e, mterm({f: 1}, qneg(r[vs.indexOf(f)])));
          }
          return mtex(e, vs);
        }(),
  ];
  steps.add(Step(text: 'Чөлөөт хувьсагч: \$${free.join(r',\ ')}\$ — дурын бодит тоо'));
  return Solution(
    ok: true,
    title: title,
    problem: problem,
    steps: steps,
    answer: [_pairTex(vs, exprs), '${free.join(r',\ ')}\\in\\mathbb{R}'],
    notes: const ['Төгсгөлгүй олон шийдтэй'],
    graph: graph,
  );
}

MPoly _rowPoly(List<Q> r, List<String> vs) {
  MPoly p = {};
  for (var j = 0; j < vs.length; j++) {
    p = madd(p, mterm({vs[j]: 1}, r[j]));
  }
  return p;
}

/// Хувьсагчгүй гишүүн (сул гишүүн).
MPoly _vsReduce(MPoly p, List<String> vs) {
  MPoly r = {};
  for (final t in p.values) {
    if (!vs.any((v) => (t.m[v] ?? 0) != 0)) r = madd(r, mterm(const {}, t.c));
  }
  return r;
}

/// 2×2 орлуулах арга (±1 коэффициенттэй хувьсагчийг илэрхийлнэ).
void _substitution2(List<List<Q>> a, List<Q> b, List<String> vs, List<Step> steps) {
  (int, int)? pick;
  for (var i = 0; i < 2 && pick == null; i++) {
    for (var j = 1; j >= 0; j--) {
      if (a[i][j].d == 1 && a[i][j].n.abs() == 1) {
        pick = (i, j);
        break;
      }
    }
  }
  if (pick == null) {
    for (var i = 0; i < 2 && pick == null; i++) {
      for (var j = 1; j >= 0; j--) {
        if (!isZ(a[i][j])) {
          pick = (i, j);
          break;
        }
      }
    }
  }
  if (pick == null) return;
  final (i, j) = pick;
  final o = 1 - j, k = 1 - i;
  final aij = a[i][j];
  final c0 = qdiv(b[i], aij), c1 = qdiv(qneg(a[i][o]), aij);
  final expr = madd(mconst(c0), mscale(mvar(vs[o]), c1));
  steps.add(
    Step(
      text: 'Орлуулах арга: ${i + 1}-р тэгшитгэлээс \$${vs[j]}\$-г илэрхийлбэл',
      tex: ['${vs[j]} = ${mtex(expr, vs)}'],
    ),
  );
  final co = qadd(a[k][o], qmul(a[k][j], c1)), rhs = qsub(b[k], qmul(a[k][j], c0));
  final akj = a[k][j];
  final first = a[k][o].n != 0 ? mtex(mterm({vs[o]: 1}, a[k][o])) : '';
  final second = isZ(akj)
      ? ''
      : '${akj.n < 0 ? '-' : '+'}${akj.n.abs() == 1 && akj.d == 1 ? '' : qTex(akj.n < 0 ? qneg(akj) : akj)}\\left(${mtex(expr, vs)}\\right)';
  final lhsTex = '$first$second'.replaceFirst(RegExp(r'^\+'), '');
  steps.add(
    Step(
      text: '${k + 1}-р тэгшитгэлд орлуулбал',
      tex: ['$lhsTex = ${qTex(b[k])}', '${ptex([qZero, co], vs[o])} = ${qTex(rhs)}'],
    ),
  );
  if (isZ(co)) return;
  final vo = qdiv(rhs, co);
  final vj = qadd(c0, qmul(c1, vo));
  steps.add(Step(tex: ['${vs[o]} = ${qTex(vo)},\\quad ${vs[j]} = ${qTex(vj)}']));
}

Solution _mixedSystem(List<MPoly> polys, List<String> vs, String problem, List<String>? graph) {
  final li = polys.indexWhere((p) => mtotalDeg(p) <= 1);
  if (li < 0) return failure(_mixedOnly).copyWith(problem: problem, graph: graph);
  final l = polys[li], p = polys[1 - li];
  Q coef(String v) => masConst(mcoeffAt(l, v, 1)) ?? qZero;
  final cands = vs.reversed.toList();
  String? ev;
  for (final v in cands) {
    final a = coef(v);
    if (a.d == 1 && a.n.abs() == 1) {
      ev = v;
      break;
    }
  }
  ev ??= cands.where((v) => !isZ(coef(v))).firstOrNull;
  if (ev == null) return failure(cannot).copyWith(problem: problem, graph: graph);
  final e0 = ev;
  final ov = vs.firstWhere((v) => v != e0);
  final a = coef(e0);
  final restL = msub(l, mterm({e0: 1}, a));
  final expr = mscale(restL, qdiv(q(-1), a));
  final steps = <Step>[Step(text: 'Шугаман тэгшитгэлээс \$$e0\$-г илэрхийлбэл', tex: ['$e0 = ${mtex(expr, vs)}'])];
  final s = msubst(p, e0, expr);
  final up = toUni(s, ov);
  if (up == null) return failure(cannot).copyWith(problem: problem, graph: graph);
  steps.add(Step(text: 'Нөгөө тэгшитгэлд орлуулж эмхэтгэвэл', tex: ['${ptex(up, ov)} = 0']));
  final r = solvePoly(up, steps, v: ov);
  if (r.all) return failure('$cannot: төгсгөлгүй олон шийдтэй').copyWith(problem: problem, graph: graph);
  final ec0 = masConst(mcoeffAt(expr, ov, 0)) ?? qZero, ec1 = masConst(mcoeffAt(expr, ov, 1)) ?? qZero;
  final pairs = <Map<String, X>>[];
  final approxs = <String>[];
  for (final root in r.roots) {
    if (root.x == null) {
      final e = qval(ec0) + qval(ec1) * root.v;
      approxs.add(
        '\\left($ov;\\ $e0\\right) \\approx \\left(${decTex(root.v, 5)};\\ ${decTex(e, 5)}\\right)',
      );
      continue;
    }
    final e = xadd(xq(ec0), xmul(xq(ec1), root.x!));
    pairs.add({ov: root.x!, e0: e});
    steps.add(Step(text: '\$$ov = ${root.tex}\$ үед \$$e0 = ${xtex(e)}\$'));
  }
  // ЯГ шалгалт
  for (final pr in pairs) {
    for (final pp in polys) {
      X sum = <Term>[];
      for (final t in pp.values) {
        var term = xq(t.c);
        for (final en in t.m.entries) {
          for (var i = 0; i < en.value; i++) {
            term = xmul(term, pr[en.key]!);
          }
        }
        sum = xadd(sum, term);
      }
      if (!isZero(sum)) return failure('$cannot: шалгалтад тэнцээгүй').copyWith(problem: problem, graph: graph);
    }
  }
  if (pairs.isNotEmpty) {
    steps.add(const Step(text: 'Хос бүрийг хоёр тэгшитгэлд орлуулахад биелж байна', tone: Tone.ok));
  }
  final answer = pairs.isNotEmpty
      ? pairs.map((pr) => _pairTex(vs, vs.map((v) => xtex(pr[v]!)).toList())).toList()
      : (approxs.isNotEmpty ? <String>[] : [r'\varnothing']);
  return Solution(
    ok: true,
    title: 'Шугаман ба шугаман бус систем',
    problem: problem,
    steps: steps,
    answer: answer,
    approx: approxs.isNotEmpty ? approxs : null,
    notes: pairs.isEmpty && approxs.isEmpty ? const ['Систем бодит шийдгүй'] : null,
    graph: graph,
  );
}
