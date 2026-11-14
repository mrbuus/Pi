// Олон гишүүнт тэгшитгэл P(x) = 0 — алхамтай (вэбийн `solve/roots.ts`).
//   1-р зэрэг: шугаман; 2-р зэрэг: дискриминант, x_{1,2}, Виет;
//   x^{2k}-аар орлуулах (биквадрат); >=3: рационал язгуурын теорем + Хорнерийн схем;
//   рационал язгуургүй үлдэгдэл: бодит язгуурыг тоогоор (ойролцоо гэж тэмдэглэнэ).
import 'dart:math' as math;

import 'exact.dart';
import 'poly.dart';
import 'q.dart';
import 'steps.dart';

class Root {
  Root({required this.x, required this.v, required this.tex, required this.mult});

  /// ЯГ утга (олдоогүй бол null — тэгвэл v нь ойролцоо)
  final X? x;
  final double v;
  final String tex;
  int mult;

  Root copy({int? mult}) => Root(x: x, v: v, tex: tex, mult: mult ?? this.mult);
}

class Roots {
  const Roots({required this.roots, required this.complete, required this.exact, this.all = false});
  final List<Root> roots;

  /// Бүх бодит язгуурыг олсон эсэх
  final bool complete;

  /// Бүгд ЯГ эсэх
  final bool exact;

  /// Тэгшитгэл адилтгал (x дурын)
  final bool all;
}

Root rootX(X x, [int mult = 1]) => Root(x: x, v: approx(x), tex: xtex(x), mult: mult);
Root rootNum(double v) => Root(x: null, v: v, tex: '\\approx ${decTex(v, 6)}', mult: 1);

/// Давхардлыг нэгтгэж эрэмбэлнэ.
List<Root> mergeRoots(List<Root> rs) {
  final out = <Root>[];
  for (final r in rs) {
    Root? same;
    for (final o in out) {
      final eq = o.x != null && r.x != null
          ? xeq(o.x!, r.x!)
          : (o.v - r.v).abs() < 1e-9 * math.max(1, r.v.abs());
      if (eq) {
        same = o;
        break;
      }
    }
    if (same != null) {
      same.mult += r.mult;
    } else {
      out.add(r.copy());
    }
  }
  ssortRoots(out);
  return out;
}

void ssortRoots(List<Root> l) => _ssort(l, (a, b) => a.v - b.v);

void _ssort<T>(List<T> l, num Function(T, T) c) {
  // expr_ext-ийн ssort-ийг дахин импортлохгүйн тулд энгийн тогтвортой оруулгын эрэмбэ
  for (var i = 1; i < l.length; i++) {
    final x = l[i];
    var j = i - 1;
    while (j >= 0) {
      final r = c(l[j], x);
      if (r.isNaN || r <= 0) break;
      l[j + 1] = l[j];
      j--;
    }
    l[j + 1] = x;
  }
}

/// Язгуурын жагсаалтыг LaTeX: x_1 = 2,\ x_2 = 3.
List<String> rootsTex(List<Root> rs, [String v = 'x']) {
  String rel(Root r) => r.tex.startsWith(r'\approx') ? ' ${r.tex}' : ' = ${r.tex}';
  if (rs.length == 1) return ['$v${rel(rs[0])}'];
  return [for (var i = 0; i < rs.length; i++) '${v}_{${i + 1}}${rel(rs[i])}'];
}

Roots solvePoly(Poly p0, List<Step> steps, {String v = 'x', bool quiet = false}) {
  final p = trim(p0);
  final d = p.length - 1;
  if (d < 0) {
    steps.add(Step(text: 'Тэгшитгэл адилтгал болж байна: \$$v\$-ийн дурын бодит утгад биелнэ'));
    return const Roots(roots: [], complete: true, exact: true, all: true);
  }
  if (d == 0) {
    steps.add(Step(text: '\$${qTex(p[0])} = 0\$ гэсэн худал тэнцэтгэл гарсан тул шийдгүй'));
    return const Roots(roots: [], complete: true, exact: true);
  }
  if (d == 1) return _linear(p, steps, v, quiet);
  if (d == 2) return _quadratic(p, steps, v, quiet);
  return _higher(p, steps, v, quiet);
}

Roots _linear(Poly p, List<Step> steps, String v, bool quiet) {
  final b = p[0], a = p[1];
  final r = qdiv(qneg(b), a);
  if (!quiet) {
    final lines = <String>[];
    if (!isZ(b)) lines.add('${ptex([qZero, a], v)} = ${qTex(qneg(b))}');
    if (!(a.n == 1 && a.d == 1)) {
      lines.add(
        '$v = \\frac{${qTex(qneg(b))}}{${qTex(a)}}'.replaceFirstMapped(
          RegExp(r'\\frac\{(-?)\\frac'),
          (m) => '\\frac{${m.group(1)}\\frac',
        ),
      );
    }
    lines.add('$v = ${qTex(r)}');
    steps.add(
      Step(
        text: 'Шугаман тэгшитгэл: үл мэдэгдэгчтэй гишүүнийг нэг талд, тоог нөгөө талд шилжүүлнэ',
        tex: lines.toSet().toList(),
      ),
    );
  }
  return Roots(roots: [rootX(xq(r))], complete: true, exact: true);
}

Roots _quadratic(Poly p, List<Step> steps, String v, bool quiet) {
  final c = p[0], b = p[1], a = p[2];
  void say(Step s) {
    if (!quiet) steps.add(s);
  }

  say(Step(text: 'Квадрат тэгшитгэл \$a$v^2+b$v+c=0\$: \$a=${qTex(a)},\\ b=${qTex(b)},\\ c=${qTex(c)}\$'));
  if (isZ(b)) {
    final t = qdiv(qneg(c), a);
    say(Step(text: r'Дутуу квадрат тэгшитгэл ($b=0$)', tex: ['$v^2 = ${qTex(t)}']));
    if (t.n < 0) {
      say(const Step(text: 'Квадрат нь сөрөг байж болохгүй тул бодит шийдгүй'));
      return const Roots(roots: [], complete: true, exact: true);
    }
    if (isZ(t)) return Roots(roots: [rootX(xq(qZero), 2)], complete: true, exact: true);
    final s = xroot(xq(t), 2);
    say(Step(tex: ['$v = \\pm\\sqrt{${qTex(t)}} = \\pm ${xtex(s)}']));
    return Roots(roots: [rootX(xneg(s)), rootX(s)], complete: true, exact: true);
  }
  if (isZ(c)) {
    final r = qdiv(qneg(b), a);
    say(
      Step(
        text: r'Дутуу квадрат тэгшитгэл ($c=0$): үржигдэхүүнд задална',
        tex: ['$v\\left(${ptex([b, a], v)}\\right) = 0', '${v}_1 = 0,\\quad ${v}_2 = ${qTex(r)}'],
      ),
    );
    final rs = [rootX(xq(qZero)), rootX(xq(r))];
    ssortRoots(rs);
    return Roots(roots: rs, complete: true, exact: true);
  }
  final dd = qsub(qmul(b, b), qmul(q(4), qmul(a, c)));
  say(
    Step(
      text: 'Дискриминант',
      tex: ['D = b^2-4ac = ${qp(b)}^2-4\\cdot ${qp(a)}\\cdot ${qp(c)} = ${qTex(dd)}'],
    ),
  );
  if (dd.n < 0) {
    say(const Step(text: r'$D<0$ тул бодит язгуургүй'));
    return const Roots(roots: [], complete: true, exact: true);
  }
  final twoA = qmul(q(2), a);
  if (isZ(dd)) {
    final r = qdiv(qneg(b), twoA);
    say(Step(text: r'$D=0$ тул давхар (ганц) язгууртай', tex: ['$v = -\\frac{b}{2a} = ${qTex(r)}']));
    return Roots(roots: [rootX(xq(r), 2)], complete: true, exact: true);
  }
  final sD = xroot(xq(dd), 2);
  final x1 = xdiv(xsub(xq(qneg(b)), sD), xq(twoA));
  final x2 = xdiv(xadd(xq(qneg(b)), sD), xq(twoA));
  final lo = approx(x1) <= approx(x2) ? x1 : x2;
  final hi = approx(x1) <= approx(x2) ? x2 : x1;
  say(
    Step(
      text: r'$D>0$ тул хоёр ялгаатай язгууртай',
      tex: [
        '${v}_{1,2} = \\frac{-b\\pm\\sqrt{D}}{2a} = \\frac{${qTex(qneg(b))}\\pm\\sqrt{${qTex(dd)}}}{${qTex(twoA)}}',
        '${v}_1 = ${xtex(lo)},\\quad ${v}_2 = ${xtex(hi)}',
      ],
    ),
  );
  say(
    Step(
      text: 'Виетийн теоремоор шалгавал',
      tex: [
        '${v}_1+${v}_2 = -\\frac{b}{a} = ${qTex(qdiv(qneg(b), a))},\\quad ${v}_1 ${v}_2 = \\frac{c}{a} = ${qTex(qdiv(c, a))}',
      ],
    ),
  );
  return Roots(roots: [rootX(lo), rootX(hi)], complete: true, exact: true);
}

/// Зөвхөн x^{g}-ийн зэрэгтэй гишүүнтэй эсэх (g >= 2).
int _powerGcd(Poly p) {
  var g = 0;
  for (var i = 1; i < p.length; i++) {
    if (!isZ(p[i])) g = igcd(g, i);
  }
  return g;
}

Roots _higher(Poly p, List<Step> steps, String v, bool quiet) {
  void say(Step s) {
    if (!quiet) steps.add(s);
  }

  final d = deg(p);
  final g = _powerGcd(p);
  if (g >= 2 && d / g <= 2 && !isZ(p[0])) {
    final tp = <Q>[for (var i = 0; i <= d; i += g) p[i]];
    const tv = 't';
    say(
      Step(
        text: 'Зөвхөн \$$v^{$g}\$-ийн зэрэгтэй гишүүнтэй тул \$t = $v^{$g}\$${g % 2 == 0 ? r' $(t\ge 0)$' : ''} гэж орлуулна',
        tex: ['${ptex(tp, tv)} = 0'],
      ),
    );
    final tr = solvePoly(tp, steps, v: tv, quiet: quiet);
    final out = <Root>[];
    for (final r in tr.roots) {
      final rx = r.x;
      if (rx == null) continue;
      final tt = xtex(rx);
      if (g % 2 == 0 && xsign(rx) < 0) {
        say(Step(text: '\$t = $tt < 0\$ тохирохгүй', tone: Tone.bad));
        continue;
      }
      if (isZero(rx)) {
        out.add(rootX(xq(qZero), r.mult * g));
        say(Step(text: '\$$v^{$g} = 0 \\Rightarrow $v = 0\$'));
        continue;
      }
      try {
        final s = xroot(rx, g);
        if (g % 2 == 0) {
          out.addAll([rootX(xneg(s)), rootX(s)]);
          say(Step(text: '\$$v^{$g} = $tt \\Rightarrow $v = \\pm ${xtex(s)}\$'));
        } else {
          out.add(rootX(s));
          say(Step(text: '\$$v^{$g} = $tt \\Rightarrow $v = ${xtex(s)}\$'));
        }
      } on NotReal {
        continue;
      } catch (_) {
        final s = math.pow(r.v.abs(), 1 / g) * (r.v < 0 ? -1 : 1);
        if (g % 2 == 0) {
          out.addAll([rootNum(-s.toDouble()), rootNum(s.toDouble())]);
        } else {
          out.add(rootNum(s.toDouble()));
        }
      }
    }
    final roots = mergeRoots(out);
    return Roots(roots: roots, complete: tr.complete, exact: roots.every((r) => r.x != null));
  }

  RatRoots rr;
  try {
    rr = rationalRoots(p);
  } on ExactFail {
    final nums = realRootsNum(p);
    say(const Step(text: 'Коэффициент хэт том тул бодит язгуурыг тоон аргаар (ойролцоогоор) оллоо'));
    return Roots(roots: nums.map(rootNum).toList(), complete: true, exact: false);
  }
  final prim = primitive(p).prim;
  if (!quiet) {
    final intForm = ptex(prim, v);
    if (intForm != ptex(p, v)) say(Step(text: 'Бүхэл коэффициенттэй болговол', tex: ['$intForm = 0']));
    final a0 = prim.indexWhere((c) => !isZ(c));
    if (a0 > 0) say(Step(text: '\$$v${a0 > 1 ? '^{$a0}' : ''}\$-ийг хаалтны гадна гаргавал \$$v = 0\$ язгуур гарна'));
    if (rr.candidates.isNotEmpty) {
      final shown = rr.candidates.take(16).map(qTex).join(r',\ ');
      say(
        Step(
          text:
              r'Рационал язгуурын теорем: язгуур нь $\frac{p}{q}$ хэлбэртэй, $p$ нь сул гишүүний, $q$ нь ахлах коэффициентийн хуваагч. Шалгах тоонууд',
          tex: ['$shown${rr.candidates.length > 16 ? r',\ \ldots' : ''}'],
        ),
      );
    }
  }
  var cur = trim(prim);
  while (cur.length > 1 && isZ(cur[0])) {
    cur = cur.sublist(1);
  }
  for (final rt in rr.roots) {
    final r = rt.r;
    if (isZ(r)) continue;
    for (var i = 0; i < rt.m; i++) {
      if (!quiet) {
        say(
          Step(
            text:
                '\$P(${qTex(r)}) = 0\$ тул \$$v = ${qTex(r)}\$ язгуур. Хорнерийн схемээр \$($v${r.n < 0 ? '+' : '-'}${qTex(r.n < 0 ? qneg(r) : r)})\$-д хуваавал',
            tex: [hornerTex(cur, r)],
          ),
        );
      }
      cur = pdivmod(cur, [qneg(r), qOne]).q;
    }
  }
  final out = rr.roots.map((x) => rootX(xq(x.r), x.m)).toList();
  final rest = rr.rest;
  var complete = true;
  if (deg(rest) >= 1) {
    if (rr.roots.isNotEmpty) say(Step(text: 'Үлдсэн тэгшитгэл', tex: ['${ptex(rest, v)} = 0']));
    if (deg(rest) <= 2) {
      final sub = solvePoly(rest, steps, v: v, quiet: quiet);
      out.addAll(sub.roots);
    } else if (_powerGcd(rest) >= 2 && deg(rest) / _powerGcd(rest) <= 2 && !isZ(rest[0])) {
      final sub = _higher(rest, steps, v, quiet);
      out.addAll(sub.roots);
      complete = sub.complete;
    } else {
      final nums = realRootsNum(rest).where((x) => !out.any((o) => (o.v - x).abs() < 1e-9));
      say(
        Step(
          text: '\$${ptex(rest, v)} = 0\$ нь рационал язгуургүй тул бодит язгуурыг тоон аргаар (ойролцоогоор) оллоо',
          tone: Tone.note,
        ),
      );
      out.addAll(nums.map(rootNum));
    }
  }
  final roots = mergeRoots(out);
  if (!quiet && roots.isNotEmpty && roots.every((r) => r.x != null && _isRat(r.x!)) && deg(rest) <= 0) {
    say(Step(text: 'Үржигдэхүүнд задарсан хэлбэр', tex: ['${factorTex(lead(p), roots, v)} = 0']));
  }
  return Roots(roots: roots, complete: complete, exact: roots.every((r) => r.x != null));
}

bool _isRat(X x) => x.isEmpty || (x.length == 1 && x[0].n == 1 && x[0].pi == 0 && x[0].e == 0);

/// a(x-r_1)^{m_1}(x-r_2)… — рационал язгууруудаас.
String factorTex(Q a, List<Root> roots, [String v = 'x']) {
  final parts = roots.map((r) {
    final c = r.x != null && r.x!.isNotEmpty ? r.x![0].c : qZero;
    final base = isZ(c) ? v : '\\left($v${c.n < 0 ? '+' : '-'}${qTex(c.n < 0 ? qneg(c) : c)}\\right)';
    return r.mult > 1 ? '$base^{${r.mult}}' : base;
  });
  final lead = a.n == 1 && a.d == 1 ? '' : (a.n == -1 && a.d == 1 ? '-' : qTex(a));
  return lead + parts.join();
}
