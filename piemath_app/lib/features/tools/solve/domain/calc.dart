// Тооцоолох горим: илэрхийллийг ЯГ (бутархай, a\sqrt b, k\pi) ба аравтын хэлбэрээр
// (вэбийн `solve/calc.ts`). Факториал, C, A-г их бүхэл тоогоор (BigInt) яг гаргана.
import 'exact.dart';
import 'expr_ext.dart';
import 'input.dart';
import 'steps.dart';

BigInt bigFact(int n) {
  var r = BigInt.one;
  for (var i = 2; i <= n; i++) {
    r *= BigInt.from(i);
  }
  return r;
}

BigInt bigA(int n, int k) {
  var r = BigInt.one;
  for (var i = n - k + 1; i <= n; i++) {
    r *= BigInt.from(i);
  }
  return r;
}

BigInt bigC(int n, int k0) {
  final k = k0 < n - k0 ? k0 : n - k0;
  var r = BigInt.one;
  for (var i = 1; i <= k; i++) {
    r = (r * BigInt.from(n - k + i)) ~/ BigInt.from(i);
  }
  return r;
}

/// Их бүхлийг LaTeX: 3 оронгоор зайтай.
String bigTex(BigInt b) {
  final s = b.toString();
  final neg = s.startsWith('-');
  final d = neg ? s.substring(1) : s;
  final grouped = d.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => r'\,');
  return (neg ? '-' : '') + grouped;
}

/// C(n,k), A(n,k)-тай илэрхийллийн бичлэг: сургуулийн тэмдэглэгээгээр C_n^k.
String? combProblemTex(String src, bool degrees) {
  final re = RegExp(r'\b([CA])\s*\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)');
  if (!re.hasMatch(src)) return null;
  final free = 'QRSTUVWZ'.split('').where((ch) => !src.contains(ch)).toList();
  final map = <String, String>{};
  var i = 0;
  final marked = src.replaceAllMapped(re, (m) {
    if (i >= free.length) return m.group(0)!;
    final ch = free[i++];
    map[ch] = '${m.group(1)}_{${m.group(2)!.trim()}}^{${m.group(3)!.trim()}}';
    return ch;
  });
  if (map.isEmpty) return null;
  try {
    var tex = toLatex(parseExpr(prepare(marked, degrees: degrees)));
    for (final e in map.entries) {
      tex = tex.split(e.key).join(e.value);
    }
    return tex.replaceAll(RegExp(r'\}\s*(?=[CA]_\{)'), r'}\cdot ');
  } catch (_) {
    return null;
  }
}

Solution calculate(String src, {bool degrees = false}) {
  String prepared;
  try {
    prepared = prepare(src, degrees: degrees);
  } catch (e) {
    return failure(e is InputError ? e.message : 'Илэрхийллийг ойлгосонгүй');
  }
  final cp = combPattern(src);
  if (cp != null) {
    if (cp.n > 5000 || cp.k > cp.n) return failure(cp.k > cp.n ? r'$k \le n$ байх ёстой' : 'Хэт их тоо — 5000 хүртэл');
    final val = cp.kind == 'F' ? bigFact(cp.n) : (cp.kind == 'A' ? bigA(cp.n, cp.k) : bigC(cp.n, cp.k));
    final problem = cp.kind == 'F'
        ? '${cp.n}!'
        : (cp.kind == 'A' ? 'A_{${cp.n}}^{${cp.k}}' : 'C_{${cp.n}}^{${cp.k}}');
    final formula = cp.kind == 'F'
        ? ''
        : (cp.kind == 'A' ? '\\frac{${cp.n}!}{${cp.n - cp.k}!}' : '\\frac{${cp.n}!}{${cp.k}!\\,${cp.n - cp.k}!}');
    final digits = val.toString().length;
    return Solution(
      ok: true,
      title: 'Тооцоо',
      problem: problem,
      steps: const [],
      answer: ['$problem ${formula.isNotEmpty ? '= $formula ' : ''}= ${digits > 400 ? r'\ldots' : bigTex(val)}'],
      notes: digits > 15 ? ['$digits оронтой тоо'] : null,
    );
  }
  Expr node;
  try {
    node = parseExpr(prepared);
  } catch (e) {
    return failure(e is ExprParseError ? e.message : 'Илэрхийллийг ойлгосонгүй');
  }
  final problem = combProblemTex(src, degrees) ?? toLatex(node);
  final vars = freeSymbols(node).toList();
  if (vars.isNotEmpty) {
    return failure(
      'Тооцоолох горимд хувьсагч (\$${vars.join(r',\ ')}\$) орохгүй. Тэгшитгэл бол «Тэгшитгэл», хаалт задлах бол «Алгебр» горимыг сонгоно уу',
    ).copyWith(problem: problem);
  }
  X? exact;
  try {
    exact = evalExact(node, degrees: degrees);
  } on NotReal {
    return failure(
      'Бодит тоонд тодорхойлогдохгүй (тэгд хуваах, сөрөг тооны тэгш зэргийн язгуур г.м.)',
    ).copyWith(problem: problem);
  } catch (_) {
    exact = null;
  }
  final v = exact != null ? approx(exact) : compileExpr(node, degrees: degrees)(const {});
  if (!v.isFinite) return failure('Бодит тоонд тодорхойлогдохгүй эсвэл хэт их утга').copyWith(problem: problem);
  final answer = <String>[];
  final approxs = <String>[];
  if (exact != null) {
    final r = asQ(exact);
    answer.add('$problem = ${xtex(exact)}');
    if (r != null && r.d != 1) {
      final whole = r.n ~/ r.d;
      if (whole != 0) answer.add('= ${whole < 0 ? '-' : ''}${whole.abs()}\\frac{${r.n.abs() % r.d}}{${r.d}}');
    }
    if (r == null || r.d != 1) approxs.add('\\approx ${decTex(v, 10)}');
  } else {
    answer.add('$problem \\approx ${decTex(v, 10)}');
  }
  final trig = RegExp('sin|cos|tan|cot|asin|acos|atan|acot').hasMatch(prepared);
  return Solution(
    ok: true,
    title: degrees && trig ? 'Тооцоо (градус)' : 'Тооцоо',
    problem: problem,
    steps: const [],
    answer: answer,
    approx: approxs.isNotEmpty ? approxs : null,
  );
}
