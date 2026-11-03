// Прогресс, комбинаторик, магадлал (вэбийн `solve/seq.ts`). Бүх утга ЯГ.
import 'calc.dart';
import 'exact.dart';
import 'expr_ext.dart';
import 'input.dart';
import 'q.dart';
import 'steps.dart';

class _SeqError implements Exception {
  const _SeqError(this.message);
  final String message;
}

X _num(String src, String name) {
  final s = src.trim();
  if (s.isEmpty) throw _SeqError('\$$name\$-г оруулна уу');
  try {
    return evalExact(parseExpr(prepare(s)));
  } on NotReal {
    throw _SeqError('\$$name\$ бодит тоо биш');
  } catch (_) {
    throw _SeqError('\$$name\$-г тоо эсвэл бутархайгаар оруулна уу (ж: 3, -1/2, \\sqrt{2})');
  }
}

int _natural(String src, String name, [int min = 1]) {
  final x = _num(src, name);
  final r = asQ(x);
  if (r == null || r.d != 1 || r.n < min) {
    throw _SeqError('\$$name\$ нь ${min == 0 ? 'сөрөг биш бүхэл' : 'натурал'} тоо байх ёстой');
  }
  if (r.n > 100000) throw _SeqError('\$$name\$ хэт их байна');
  return r.n;
}

Solution _wrap(Solution Function() f) {
  try {
    return f();
  } on ExactFail {
    return failure('Тоо хэт их тул яг утгыг гаргаж чадсангүй');
  } on _SeqError catch (e) {
    return failure(e.message);
  } catch (_) {
    return failure('Утгыг шалгана уу');
  }
}

String _par(X x) {
  final t = xtex(x);
  return t.startsWith('-') || RegExp('[+-]').hasMatch(t.length > 1 ? t.substring(1) : '') ? '\\left($t\\right)' : t;
}

String _withApprox(X x) => asQ(x) != null ? xtex(x) : '${xtex(x)}\\approx ${decTex(approx(x), 6)}';

Solution arithmetic(String a1s, String ds, String ns) => _wrap(() {
  final a1 = _num(a1s, 'a_1'), d = _num(ds, 'd'), n = _natural(ns, 'n');
  final an = xadd(a1, xmul(xint(n - 1), d));
  final sn = xdiv(xmul(xadd(a1, an), xint(n)), xint(2));
  final steps = [
    Step(
      text: r'$n$-р гишүүний томьёо',
      tex: ['a_n = a_1+(n-1)d = ${xtex(a1)}+${n - 1}\\cdot ${_par(d)} = ${xtex(an)}'],
    ),
    Step(
      text: r'Эхний $n$ гишүүний нийлбэр',
      tex: [
        'S_n = \\frac{(a_1+a_n)\\,n}{2} = \\frac{\\left(${xtex(a1)}+${_par(an)}\\right)\\cdot $n}{2} = ${xtex(sn)}',
      ],
    ),
  ];
  return Solution(
    ok: true,
    title: 'Арифметик прогресс',
    problem: 'a_1 = ${xtex(a1)},\\ d = ${xtex(d)},\\ n = $n',
    steps: steps,
    answer: ['a_{$n} = ${_withApprox(an)}', 'S_{$n} = ${_withApprox(sn)}'],
  );
});

Solution geometric(String b1s, String qs, String ns) => _wrap(() {
  final b1 = _num(b1s, 'b_1'), qq = _num(qs, 'q'), n = _natural(ns, 'n');
  if (asQ(qq)?.n == 0) throw const _SeqError(r'Хуваарь $q \ne 0$ байх ёстой');
  if (asQ(b1)?.n == 0) throw const _SeqError(r'$b_1 \ne 0$ байх ёстой');
  if (n > 200) throw const _SeqError(r'$n \le 200$');
  final bn = xmul(b1, xpowInt(qq, n - 1));
  final steps = [
    Step(
      text: r'$n$-р гишүүний томьёо',
      tex: ['b_n = b_1 q^{n-1} = ${_par(b1)}\\cdot ${_par(qq)}^{${n - 1}} = ${xtex(bn)}'],
    ),
  ];
  X sn;
  if (xeq(qq, xint(1))) {
    sn = xmul(b1, xint(n));
    steps.add(Step(text: r'$q = 1$ тул $S_n = n b_1$', tex: ['S_n = ${xtex(sn)}']));
  } else {
    sn = xdiv(xmul(b1, xsub(xpowInt(qq, n), xint(1))), xsub(qq, xint(1)));
    steps.add(
      Step(
        text: r'Эхний $n$ гишүүний нийлбэр',
        tex: [
          'S_n = \\frac{b_1\\left(q^n-1\\right)}{q-1} = \\frac{${_par(b1)}\\left(${_par(qq)}^{$n}-1\\right)}{${_par(qq)}-1} = ${xtex(sn)}',
        ],
      ),
    );
  }
  final answer = ['b_{$n} = ${_withApprox(bn)}', 'S_{$n} = ${_withApprox(sn)}'];
  if (approx(qq).abs() < 1) {
    final s = xdiv(b1, xsub(xint(1), qq));
    steps.add(
      Step(text: r'$|q| < 1$ тул төгсгөлгүй буурах прогрессийн нийлбэр', tex: ['S = \\frac{b_1}{1-q} = ${xtex(s)}']),
    );
    answer.add('S = ${_withApprox(s)}');
  }
  return Solution(
    ok: true,
    title: 'Геометр прогресс',
    problem: 'b_1 = ${xtex(b1)},\\ q = ${xtex(qq)},\\ n = $n',
    steps: steps,
    answer: answer,
  );
});

Solution combinatorics(String ns, String ks) => _wrap(() {
  final n = _natural(ns, 'n', 0), k = _natural(ks, 'k', 0);
  if (n > 3000) throw const _SeqError(r'$n \le 3000$');
  final steps = <Step>[];
  final answer = <String>[];
  String t(BigInt b) {
    final len = b.toString().length;
    return len > 300 ? '\\ldots\\ ($len\\ \\text{орон})' : bigTex(b);
  }

  steps.add(Step(text: 'Сэлгэмэл (бүх элементийн байрлал)', tex: ['P_{$n} = $n! = ${t(bigFact(n))}']));
  answer.add('P_{$n} = ${t(bigFact(n))}');
  if (k <= n) {
    steps
      ..add(
        Step(
          text: 'Байрлал (дараалал чухал)',
          tex: ['A_{$n}^{$k} = \\frac{n!}{(n-k)!} = \\frac{$n!}{${n - k}!} = ${t(bigA(n, k))}'],
        ),
      )
      ..add(
        Step(
          text: 'Хослол (дараалал хамаагүй)',
          tex: ['C_{$n}^{$k} = \\frac{n!}{k!\\,(n-k)!} = \\frac{$n!}{$k!\\,${n - k}!} = ${t(bigC(n, k))}'],
        ),
      );
    answer
      ..add('A_{$n}^{$k} = ${t(bigA(n, k))}')
      ..add('C_{$n}^{$k} = ${t(bigC(n, k))}');
  } else {
    steps.add(const Step(text: r'$k > n$ тул давталтгүй байрлал, хослол тэгтэй тэнцүү', tone: Tone.note));
  }
  if (k <= 400) {
    var rep = BigInt.one;
    for (var i = 0; i < k; i++) {
      rep *= BigInt.from(n);
    }
    steps.add(
      Step(
        text: 'Давталттай байрлал ба хослол',
        tex: [
          '\\bar{A}_{$n}^{$k} = n^k = ${t(rep)}',
          '\\bar{C}_{$n}^{$k} = C_{n+k-1}^{k} = ${t(n + k - 1 >= k ? bigC(n + k - 1, k) : BigInt.zero)}',
        ],
      ),
    );
  }
  return Solution(
    ok: true,
    title: 'Хослол, сэлгэмэл, байрлал',
    problem: 'n = $n,\\ k = $k',
    steps: steps,
    answer: answer,
  );
});

Solution classicalProbability(String ms, String ns) => _wrap(() {
  final m = _natural(ms, 'm', 0), n = _natural(ns, 'n');
  if (m > n) throw const _SeqError(r'Таатай тохиолдлын тоо $m \le n$ байх ёстой');
  final p = q(m, n);
  return Solution(
    ok: true,
    title: 'Сонгодог магадлал',
    problem: 'm = $m,\\ n = $n',
    steps: [
      Step(
        text: 'Таатай тохиолдлын тоог бүх боломжит тохиолдлын тоонд хуваана',
        tex: ['P(A) = \\frac{m}{n} = \\frac{$m}{$n} = ${qTex(p)}'],
      ),
    ],
    answer: ['P(A) = ${qTex(p)}${p.d == 1 ? '' : '\\approx ${decTex(m / n, 4)}'}'],
  );
});

Solution bernoulli(String ns, String ks, String ps) => _wrap(() {
  final n = _natural(ns, 'n'), k = _natural(ks, 'k', 0);
  if (k > n) throw const _SeqError(r'$k \le n$ байх ёстой');
  if (n > 60) throw const _SeqError(r'$n \le 60$');
  final px = _num(ps, 'p');
  final pq = asQ(px);
  if (pq == null || xsign(px) < 0 || pq.n > pq.d) {
    throw const _SeqError(r'Магадлал $0 \le p \le 1$ рационал тоо байх ёстой (ж: 1/6, 0.3)');
  }
  final c = bigC(n, k).toInt();
  final res = qmul(qmul(q(c), powQ(pq, k)), powQ(qsub(qOne, pq), n - k));
  return Solution(
    ok: true,
    title: 'Бернуллийн томьёо',
    problem: 'n = $n,\\ k = $k,\\ p = ${qTex(pq)}',
    steps: [
      Step(
        text: r'$n$ туршилтад үзэгдэл яг $k$ удаа илрэх магадлал',
        tex: [
          'P_n(k) = C_n^k p^k (1-p)^{n-k} = C_{$n}^{$k}\\cdot \\left(${qTex(pq)}\\right)^{$k}\\cdot \\left(${qTex(qsub(qOne, pq))}\\right)^{${n - k}} = ${qTex(res)}',
        ],
      ),
    ],
    answer: ['P_{$n}($k) = ${qTex(res)}\\approx ${decTex(res.n / res.d, 6)}'],
  );
});
