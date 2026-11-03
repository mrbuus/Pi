// Бодогчийн цөмийн нэмэлт — вэбийн `core/expr.ts`-ээс `expr.dart`-д ороогүй хэсэг:
// simplify, same, diff, fmt, вэбийн toLatex/numTex (яг адил гаралттай), gcd (`|| 1`).
// Мөн JS-ийн тооны хэвлэлт (String(x), toFixed), тогтвортой эрэмбэлэлт зэрэг туслахууд.
//
// Бодогчийн бүх файл зөвхөн энэ файлыг импортолно (expr.dart-ийг дахин экспортолдог).
import 'dart:collection';
import 'dart:math' as math;

import 'package:piemath_app/shared/math_keyboard/expr.dart';

export 'package:piemath_app/shared/math_keyboard/expr.dart'
    hide gcd, jsNum, numTex, relationLatex, symTex, toLatex;

/* ---------- Мод үүсгэгч ---------- */

Expr mkNum(num v) => Expr.number(v.toDouble());
Expr mkSym(String n) => Expr.symbol(n);
Expr mkNeg(Expr a) => Expr.neg(a);
Expr mkAdd(Expr a, Expr b) => Expr.bin(ExprKind.add, a, b);
Expr mkSub(Expr a, Expr b) => Expr.bin(ExprKind.sub, a, b);
Expr mkMul(Expr a, Expr b) => Expr.bin(ExprKind.mul, a, b);
Expr mkDiv(Expr a, Expr b) => Expr.bin(ExprKind.div, a, b);
Expr mkPow(Expr a, Expr b) => Expr.bin(ExprKind.pow, a, b);
Expr mkCall(String f, List<Expr> args) => Expr.call(f, args);
Expr mkFact(Expr a) => Expr.fact(a);

bool isBinary(ExprKind k) =>
    k == ExprKind.add || k == ExprKind.sub || k == ExprKind.mul || k == ExprKind.div || k == ExprKind.pow;

/* ---------- JS-ийн тооны туслахууд ---------- */

const int maxSafeInt = 9007199254740991;

/// JS `Number.isInteger`.
bool isInteger(num v) => v is int || (v.isFinite && v == v.truncateToDouble());

/// JS `Number.isSafeInteger`.
bool isSafeInteger(num v) => isInteger(v) && v.abs() <= maxSafeInt;

/// JS `String(x)` (тоо).
String jsStr(num x) {
  if (x is int) return x.toString();
  final v = x.toDouble();
  if (v.isNaN) return 'NaN';
  if (v == double.infinity) return 'Infinity';
  if (v == double.negativeInfinity) return '-Infinity';
  if (v == 0) return '0';
  if (v == v.truncateToDouble() && v.abs() < 1e21) return v.toStringAsFixed(0);
  return v.toString();
}

/// JS `Number(s)` — бичвэрийг тоо болгоно (хоосон бол 0, буруу бол NaN).
double jsNumber(String s) {
  final t = s.trim();
  if (t.isEmpty) return 0;
  if (t == 'Infinity' || t == '+Infinity') return double.infinity;
  if (t == '-Infinity') return double.negativeInfinity;
  if (!RegExp(r'^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$', caseSensitive: false).hasMatch(t)) return double.nan;
  return double.parse(t);
}

/// JS `x.toFixed(d)`.
String toFixed(double x, int d) {
  if (!x.isFinite) return jsStr(x);
  final s = x.toStringAsFixed(d);
  // JS-д (-0).toFixed(2) = "0.00"
  if (x == 0 && s.startsWith('-')) return s.substring(1);
  return s;
}

/// JS `String(Number(x.toFixed(d)))`.
String fixedNum(double x, int d) => jsStr(double.parse(toFixed(x, d)));

/// JS `Math.sign` (NaN хэвээр).
double jsSign(double x) => x.isNaN ? double.nan : (x > 0 ? 1 : (x < 0 ? -1 : 0));

/// JS `Math.round` (.5 үед дээш).
double jsRound(double x) => (x + 0.5).floorToDouble();

/// JS-ийн тогтвортой эрэмбэлэлт (Array.prototype.sort): харьцуулагч NaN бол 0.
void ssort<T>(List<T> list, num Function(T a, T b) cmp) {
  if (list.length < 2) return;
  final tmp = List<T>.of(list);
  _msort(list, tmp, 0, list.length, cmp);
}

void _msort<T>(List<T> a, List<T> tmp, int lo, int hi, num Function(T, T) cmp) {
  if (hi - lo < 2) return;
  final mid = (lo + hi) >> 1;
  _msort(a, tmp, lo, mid, cmp);
  _msort(a, tmp, mid, hi, cmp);
  var i = lo, j = mid, k = lo;
  while (i < mid && j < hi) {
    final c = cmp(a[j], a[i]);
    // a[j] < a[i] бол л урд гаргана (тогтвортой)
    if (!c.isNaN && c < 0) {
      tmp[k++] = a[j++];
    } else {
      tmp[k++] = a[i++];
    }
  }
  while (i < mid) {
    tmp[k++] = a[i++];
  }
  while (j < hi) {
    tmp[k++] = a[j++];
  }
  for (var t = lo; t < hi; t++) {
    a[t] = tmp[t];
  }
}

/// Эрэмбэлсэн хуулбар.
List<T> sortedCopy<T>(Iterable<T> it, num Function(T a, T b) cmp) {
  final l = List<T>.of(it);
  ssort(l, cmp);
  return l;
}

/// Давхардалгүй (эхний дарааллаар).
List<T> uniq<T>(Iterable<T> it) => LinkedHashSet<T>.of(it).toList();

/* ---------- Модны бүтцийн түлхүүр (JSON.stringify-ийн оронд) ---------- */

String nodeKey(Expr n) {
  switch (n.kind) {
    case ExprKind.num:
      return 'n(${jsStr(n.v)})';
    case ExprKind.sym:
      return 's(${n.name})';
    case ExprKind.neg:
    case ExprKind.fact:
      return '${n.kind.name}(${nodeKey(n.a!)})';
    case ExprKind.call:
      return 'c:${n.name}(${n.args.map(nodeKey).join(',')})';
    default:
      return '${n.kind.name}(${nodeKey(n.a!)},${nodeKey(n.b!)})';
  }
}

/* ---------- gcd (вэбийн хувилбар: `a || 1`) ---------- */

double gcd(num a0, num b0) {
  var a = a0.abs().toDouble(), b = b0.abs().toDouble();
  while (b != 0) {
    final t = a % b;
    a = b;
    b = t;
  }
  return a == 0 ? 1 : a;
}

/* ---------- LaTeX (вэбийн toLatex-тэй яг адил) ---------- */

int _prec(Expr n) => switch (n.kind) {
  ExprKind.add || ExprKind.sub => 1,
  ExprKind.mul || ExprKind.div => 2,
  ExprKind.neg => 3,
  ExprKind.pow => 4,
  ExprKind.fact => 5,
  _ => 6,
};

const fnTex = <String, String>{
  'sin': r'\sin',
  'cos': r'\cos',
  'tan': r'\operatorname{tg}',
  'cot': r'\operatorname{ctg}',
  'asin': r'\arcsin',
  'acos': r'\arccos',
  'atan': r'\operatorname{arctg}',
  'acot': r'\operatorname{arcctg}',
  'sinh': r'\sinh',
  'cosh': r'\cosh',
  'tanh': r'\tanh',
  'ln': r'\ln',
  'lg': r'\lg',
  'exp': r'\exp',
  'sign': r'\operatorname{sign}',
  'min': r'\min',
  'max': r'\max',
};

String numTex(double v) {
  if (v == double.infinity) return r'+\infty';
  if (v == double.negativeInfinity) return r'-\infty';
  if (v.isNaN) return r'\text{тодорхойгүй}';
  if (isInteger(v)) return jsStr(v);
  final r = v.abs() >= 1e6 || v.abs() < 1e-4 ? v.toStringAsExponential(4) : fixedNum(v, 6);
  if (r.contains('e')) {
    final parts = r.split('e');
    return '${parts[0]}\\cdot 10^{${int.parse(parts[1])}}';
  }
  return r;
}

String symTex(String n) => n == 'pi' ? r'\pi' : n;

String _fnArg(Expr a) {
  if (a.kind == ExprKind.sym || (a.kind == ExprKind.num && a.v >= 0)) return ' ${toLatex(a)}';
  return '\\left(${toLatex(a)}\\right)';
}

String toLatex(Expr node) {
  String wrap(Expr child, int minPrec) {
    final s = toLatex(child);
    return _prec(child) < minPrec || (child.kind == ExprKind.num && child.v < 0) ? '\\left($s\\right)' : s;
  }

  switch (node.kind) {
    case ExprKind.num:
      return numTex(node.v);
    case ExprKind.sym:
      return symTex(node.name);
    case ExprKind.neg:
      return '-${wrap(node.a!, 3)}';
    case ExprKind.add:
      return '${toLatex(node.a!)}+${wrap(node.b!, 1)}';
    case ExprKind.sub:
      final b = node.b!.kind == ExprKind.add || node.b!.kind == ExprKind.sub
          ? '\\left(${toLatex(node.b!)}\\right)'
          : wrap(node.b!, 2);
      return '${toLatex(node.a!)}-$b';
    case ExprKind.mul:
      final a = wrap(node.a!, 2), b = wrap(node.b!, 2);
      final bStartsDigit = RegExp(r'^[\d.]').hasMatch(b) || b.startsWith('-');
      final sep = bStartsDigit || (node.a!.kind != ExprKind.num && node.b!.kind == ExprKind.num)
          ? r'\cdot '
          : node.b!.kind == ExprKind.sym && node.a!.kind == ExprKind.sym
          ? ''
          : ' ';
      return '$a$sep$b'.replaceAll(r' \left', r'\left');
    case ExprKind.div:
      return '\\frac{${toLatex(node.a!)}}{${toLatex(node.b!)}}';
    case ExprKind.pow:
      final base = node.a!;
      if (base.kind == ExprKind.call && fnTex.containsKey(base.name)) {
        return '${fnTex[base.name]}^{${toLatex(node.b!)}}${_fnArg(base.args[0])}';
      }
      return '${wrap(base, 5)}^{${toLatex(node.b!)}}';
    case ExprKind.fact:
      return '${wrap(node.a!, 6)}!';
    case ExprKind.call:
      final a = node.args[0];
      final b = node.args.length > 1 ? node.args[1] : null;
      switch (node.name) {
        case 'sqrt':
          return '\\sqrt{${toLatex(a)}}';
        case 'cbrt':
          return '\\sqrt[3]{${toLatex(a)}}';
        case 'root':
          return '\\sqrt[${toLatex(a)}]{${toLatex(b!)}}';
        case 'abs':
          return '\\left|${toLatex(a)}\\right|';
        case 'floor':
          return '\\left\\lfloor ${toLatex(a)}\\right\\rfloor';
        case 'ceil':
          return '\\left\\lceil ${toLatex(a)}\\right\\rceil';
        case 'round':
          return '\\operatorname{round}\\left(${toLatex(a)}\\right)';
        case 'exp':
          return 'e^{${toLatex(a)}}';
        case 'log':
          if (a.kind == ExprKind.num && a.v == 10) return '\\lg${_fnArg(b!)}';
          return '\\log_{${toLatex(a)}}${_fnArg(b!)}';
        case 'min' || 'max':
          return '${fnTex[node.name]}\\left(${node.args.map(toLatex).join(r';\ ')}\\right)';
      }
      return '${fnTex[node.name] ?? '\\operatorname{${node.name}}'}${_fnArg(a)}';
  }
}

/* ---------- Хялбарчлах ---------- */

bool _isNum(Expr n, [double? v]) => n.kind == ExprKind.num && (v == null || n.v == v);
double _v(Expr n) => n.kind == ExprKind.num ? n.v : double.nan;

/// Тогтмолыг нэгтгэх, 0/1-ийн ижилсэл, давхар хасах тэмдэг — хэт ухаалаг биш, аюулгүй.
Expr simplify(Expr node) {
  switch (node.kind) {
    case ExprKind.num:
    case ExprKind.sym:
      return node;
    case ExprKind.neg:
      final a = simplify(node.a!);
      if (_isNum(a)) return mkNum(-_v(a));
      if (a.kind == ExprKind.neg) return a.a!;
      return mkNeg(a);
    case ExprKind.fact:
      return mkFact(simplify(node.a!));
    case ExprKind.call:
      final args = node.args.map(simplify).toList();
      if (args.every(_isNum) && const ['abs', 'floor', 'ceil', 'round', 'sign', 'min', 'max'].contains(node.name)) {
        return mkNum(compileExpr(mkCall(node.name, args))(const {}));
      }
      if (node.name == 'sqrt' && _isNum(args[0])) {
        final r = math.sqrt(_v(args[0]));
        if (isInteger(r)) return mkNum(r);
      }
      if (node.name == 'ln' && args[0].kind == ExprKind.sym && args[0].name == 'e') return mkNum(1);
      if (node.name == 'ln' && _isNum(args[0], 1)) return mkNum(0);
      return mkCall(node.name, args);
    default:
      break;
  }
  final a = simplify(node.a!), b = simplify(node.b!);
  final both = _isNum(a) && _isNum(b);
  switch (node.kind) {
    case ExprKind.add:
      if (both) return mkNum(_v(a) + _v(b));
      if (_isNum(a, 0)) return b;
      if (_isNum(b, 0)) return a;
      if (b.kind == ExprKind.neg) return simplify(mkSub(a, b.a!));
      if (_isNum(b) && _v(b) < 0) return mkSub(a, mkNum(-_v(b)));
      return mkAdd(a, b);
    case ExprKind.sub:
      if (both) return mkNum(_v(a) - _v(b));
      if (_isNum(b, 0)) return a;
      if (_isNum(a, 0)) return simplify(mkNeg(b));
      if (b.kind == ExprKind.neg) return simplify(mkAdd(a, b.a!));
      if (_isNum(b) && _v(b) < 0) return mkAdd(a, mkNum(-_v(b)));
      if (same(a, b)) return mkNum(0);
      return mkSub(a, b);
    case ExprKind.mul:
      if (both) return mkNum(_v(a) * _v(b));
      if (_isNum(a, 0) || _isNum(b, 0)) return mkNum(0);
      if (_isNum(a, 1)) return b;
      if (_isNum(b, 1)) return a;
      if (_isNum(a, -1)) return simplify(mkNeg(b));
      if (_isNum(b, -1)) return simplify(mkNeg(a));
      if (_isNum(b) && !_isNum(a)) return simplify(mkMul(b, a));
      if (_isNum(a) && b.kind == ExprKind.mul && _isNum(b.a!)) return simplify(mkMul(mkNum(_v(a) * _v(b.a!)), b.b!));
      if (a.kind == ExprKind.neg) return simplify(mkNeg(mkMul(a.a!, b)));
      if (b.kind == ExprKind.neg) return simplify(mkNeg(mkMul(a, b.a!)));
      if (same(a, b)) return mkPow(a, mkNum(2));
      return mkMul(a, b);
    case ExprKind.div:
      if (both && isInteger(_v(a)) && isInteger(_v(b)) && _v(b) != 0) {
        final g = gcd(_v(a), _v(b)), s = _v(b) < 0 ? -1.0 : 1.0;
        if ((_v(b) / g).abs() == 1) return mkNum((s * _v(a)) / g);
        return mkDiv(mkNum((s * _v(a)) / g), mkNum(_v(b).abs() / g));
      }
      if (_isNum(a, 0)) return mkNum(0);
      if (_isNum(b, 1)) return a;
      if (same(a, b)) return mkNum(1);
      return mkDiv(a, b);
    case ExprKind.pow:
      if (both && isInteger(_v(b)) && _v(b).abs() < 64) return mkNum(math.pow(_v(a), _v(b)));
      if (_isNum(b, 0)) return mkNum(1);
      if (_isNum(b, 1)) return a;
      if (_isNum(a, 1)) return mkNum(1);
      if (a.kind == ExprKind.pow && _isNum(a.b!) && _isNum(b)) return mkPow(a.a!, mkNum(_v(a.b!) * _v(b)));
      return mkPow(a, b);
    default:
      return node;
  }
}

/// Бүтцийн тэнцүү эсэх.
bool same(Expr a, Expr b) {
  if (a.kind != b.kind) return false;
  switch (a.kind) {
    case ExprKind.num:
      return a.v == b.v;
    case ExprKind.sym:
      return a.name == b.name;
    case ExprKind.neg:
    case ExprKind.fact:
      return same(a.a!, b.a!);
    case ExprKind.call:
      if (a.name != b.name || a.args.length != b.args.length) return false;
      for (var i = 0; i < a.args.length; i++) {
        if (!same(a.args[i], b.args[i])) return false;
      }
      return true;
    default:
      return same(a.a!, b.a!) && same(a.b!, b.b!);
  }
}

/* ---------- Уламжлал ---------- */

bool _dependsOn(Expr n, String v) => freeSymbols(n).contains(v);

/// Тэмдэгт уламжлал d/dv. Үр дүнг simplify() хийж буцаана.
Expr diff(Expr node, [String v = 'x']) => simplify(_d(node, v));

Expr _d(Expr n, String v) {
  if (!_dependsOn(n, v)) return mkNum(0);
  Expr mul(Expr a, Expr b) => mkMul(a, b);
  Expr div(Expr a, Expr b) => mkDiv(a, b);
  Expr pow(Expr a, Expr b) => mkPow(a, b);
  Expr call(String f, Expr a) => mkCall(f, [a]);
  Expr n0(num x) => mkNum(x);
  switch (n.kind) {
    case ExprKind.num:
      return n0(0);
    case ExprKind.sym:
      return n0(n.name == v ? 1 : 0);
    case ExprKind.neg:
      return mkNeg(_d(n.a!, v));
    case ExprKind.add:
      return mkAdd(_d(n.a!, v), _d(n.b!, v));
    case ExprKind.sub:
      return mkSub(_d(n.a!, v), _d(n.b!, v));
    case ExprKind.mul:
      return mkAdd(mul(_d(n.a!, v), n.b!), mul(n.a!, _d(n.b!, v)));
    case ExprKind.div:
      return div(mkSub(mul(_d(n.a!, v), n.b!), mul(n.a!, _d(n.b!, v))), pow(n.b!, n0(2)));
    case ExprKind.pow:
      final fa = _dependsOn(n.a!, v), fb = _dependsOn(n.b!, v);
      if (fa && !fb) return mul(mul(n.b!, pow(n.a!, simplify(mkSub(n.b!, n0(1))))), _d(n.a!, v));
      if (!fa && fb) return mul(mul(n, call('ln', n.a!)), _d(n.b!, v));
      return mul(n, _d(mkMul(n.b!, call('ln', n.a!)), v));
    case ExprKind.fact:
      throw ExprParseError('Факториалын уламжлал тодорхойлогдохгүй');
    case ExprKind.call:
      final u = n.args[0], du = _d(u, v);
      Expr chain(Expr outer) => mul(outer, du);
      switch (n.name) {
        case 'sin':
          return chain(call('cos', u));
        case 'cos':
          return chain(mkNeg(call('sin', u)));
        case 'tan':
          return chain(div(n0(1), pow(call('cos', u), n0(2))));
        case 'cot':
          return chain(mkNeg(div(n0(1), pow(call('sin', u), n0(2)))));
        case 'asin':
          return chain(div(n0(1), call('sqrt', mkSub(n0(1), pow(u, n0(2))))));
        case 'acos':
          return chain(mkNeg(div(n0(1), call('sqrt', mkSub(n0(1), pow(u, n0(2)))))));
        case 'atan':
          return chain(div(n0(1), mkAdd(n0(1), pow(u, n0(2)))));
        case 'acot':
          return chain(mkNeg(div(n0(1), mkAdd(n0(1), pow(u, n0(2))))));
        case 'sinh':
          return chain(call('cosh', u));
        case 'cosh':
          return chain(call('sinh', u));
        case 'tanh':
          return chain(div(n0(1), pow(call('cosh', u), n0(2))));
        case 'sqrt':
          return chain(div(n0(1), mul(n0(2), call('sqrt', u))));
        case 'cbrt':
          return chain(div(n0(1), mul(n0(3), pow(call('cbrt', u), n0(2)))));
        case 'abs':
          return chain(div(u, call('abs', u)));
        case 'ln':
          return chain(div(n0(1), u));
        case 'lg':
          return chain(div(n0(1), mul(u, call('ln', n0(10)))));
        case 'exp':
          return chain(call('exp', u));
        case 'log':
          final b = n.args[0], x = n.args[1];
          if (_dependsOn(b, v)) return _d(div(call('ln', x), call('ln', b)), v);
          return mul(div(n0(1), mul(x, call('ln', b))), _d(x, v));
        case 'root':
          return _d(pow(n.args[1], div(n0(1), n.args[0])), v);
      }
      throw ExprParseError('«${n.name}» функцийн уламжлалыг олж чадсангүй');
  }
}

/* ---------- Координатын шошго ---------- */

/// Тоог энгийн бичвэрээр (координатын шошгонд): 2.5, -1.333.
String fmt(double x, [int digits = 3]) {
  if (!x.isFinite) return x > 0 ? '∞' : (x < 0 ? '-∞' : '—');
  if (x.abs() < math.pow(10, -digits) / 2) return '0';
  return fixedNum(x, digits);
}
