// Хэрэглэгдэхүүний томьёо задлагч \u2014 вэбийн `web/src/components/tools/core/expr.ts`-ийн
// Dart хувилбар (задлах, тооцоолох, LaTeX, «гоё» тоо). Уламжлал/хялбарчлал (график,
// бодогчид) хараахан хэрэггүй тул порт хийгээгүй.
//
// Нэмэлт: LaTeX оролт (`2\sqrt{3}`, `\frac{3}{4}`, `\pi`) болон `?` орлуулагч \u2014
// гарнаас бичиж дуусаагүй илэрхийллийг `\square`-тай харуулахад.
import 'dart:math' as math;

enum ExprKind { num, sym, neg, add, sub, mul, div, pow, call, fact }

/// Илэрхийллийн мод (AST).
class Expr {
  const Expr._(this.kind, {this.v = 0, this.raw, this.name = '', this.a, this.b, this.args = const []});

  const Expr.number(double v, {String? raw}) : this._(ExprKind.num, v: v, raw: raw);
  const Expr.symbol(String n) : this._(ExprKind.sym, name: n);
  const Expr.neg(Expr a) : this._(ExprKind.neg, a: a);
  const Expr.bin(ExprKind k, Expr a, Expr b) : this._(k, a: a, b: b);
  const Expr.call(String f, List<Expr> args) : this._(ExprKind.call, name: f, args: args);
  const Expr.fact(Expr a) : this._(ExprKind.fact, a: a);

  final ExprKind kind;
  final double v;

  /// Тооны бичсэн хэлбэр («2.», «0.50») \u2014 гарны дэлгэцэнд яг бичсэнээр харуулна.
  final String? raw;

  /// Хувьсагчийн эсвэл функцийн нэр.
  final String name;
  final Expr? a;
  final Expr? b;
  final List<Expr> args;
}

class ExprParseError implements Exception {
  ExprParseError(this.message, [this.pos = -1]);
  final String message;
  final int pos;

  @override
  String toString() => message;
}

/* ---------- Танигдах нэрс ---------- */

const _funcAlias = <String, String>{
  'sin': 'sin',
  'cos': 'cos',
  'tan': 'tan',
  'tg': 'tan',
  'cot': 'cot',
  'ctg': 'cot',
  'arcsin': 'asin',
  'asin': 'asin',
  'arccos': 'acos',
  'acos': 'acos',
  'arctan': 'atan',
  'arctg': 'atan',
  'atan': 'atan',
  'arcctg': 'acot',
  'acot': 'acot',
  'sinh': 'sinh',
  'cosh': 'cosh',
  'tanh': 'tanh',
  'sqrt': 'sqrt',
  'cbrt': 'cbrt',
  'root': 'root',
  'abs': 'abs',
  'ln': 'ln',
  'lg': 'lg',
  'log': 'log',
  'exp': 'exp',
  'floor': 'floor',
  'ceil': 'ceil',
  'round': 'round',
  'sign': 'sign',
  'sgn': 'sign',
  'min': 'min',
  'max': 'max',
};

/// Урт нэрийг түрүүлж тааруулна (arcsin нь a, r, c, sin биш).
final List<String> _names = [..._funcAlias.keys, 'pi']..sort((a, b) => b.length.compareTo(a.length));

/// Хэмийн тэмдэг (оролтод нэгжийн тэмдэглэгээ \u2014 утгыг өөрчлөхгүй).
const degreeSign = '\u00B0';

/* ---------- LaTeX → энгийн бичвэр ---------- */

/// `\frac{a}{b}` → `((a)/(b))`, `\sqrt{x}` → `sqrt(x)`, `\sqrt[n]{x}` → `root(n,x)`,
/// `\pi` → `pi`, `\cdot` → `*`, `^{\circ}` → хасна. Бусад `\нэр` → `нэр`.
String latexToPlain(String s) {
  if (!s.contains(r'\') && !s.contains('{')) return s;
  final out = StringBuffer();
  var i = 0;

  String group() {
    // i нь `{`-ийн байрлал: тохирох `}` хүртэлх агуулга.
    if (i >= s.length || s[i] != '{') {
      // Хаалтгүй нэг тэмдэгт: \frac12
      if (i < s.length) return s[i++];
      return '';
    }
    var depth = 0;
    final start = i + 1;
    for (; i < s.length; i++) {
      if (s[i] == '{') depth++;
      if (s[i] == '}') {
        depth--;
        if (depth == 0) {
          final inner = s.substring(start, i);
          i++;
          return latexToPlain(inner);
        }
      }
    }
    throw ExprParseError('Хаалт дутуу байна', start);
  }

  while (i < s.length) {
    final c = s[i];
    if (c == r'\') {
      var j = i + 1;
      while (j < s.length && RegExp('[a-zA-Z]').hasMatch(s[j])) {
        j++;
      }
      final cmd = s.substring(i + 1, j);
      i = j;
      switch (cmd) {
        case 'frac':
        case 'dfrac':
        case 'tfrac':
          final num = group();
          final den = group();
          out.write('(($num)/($den))');
        case 'sqrt':
          if (i < s.length && s[i] == '[') {
            final close = s.indexOf(']', i);
            if (close < 0) throw ExprParseError('Хаалт дутуу байна', i);
            final n = latexToPlain(s.substring(i + 1, close));
            i = close + 1;
            out.write('root($n,${group()})');
          } else {
            out.write('sqrt(${group()})');
          }
        case 'cdot' || 'times':
          out.write('*');
        case 'div':
          out.write('/');
        case 'circ':
          break;
        case 'left' || 'right' || 'operatorname' || 'mathrm':
          break;
        case '':
          // `\,` `\ ` `\;` \u2014 зай
          if (i < s.length) i++;
        default:
          out.write(cmd);
      }
      continue;
    }
    if (c == '^' && s.startsWith(r'^{\circ}', i)) {
      i += r'^{\circ}'.length;
      continue;
    }
    if (c == '^' && s.startsWith(r'^\circ', i)) {
      i += r'^\circ'.length;
      continue;
    }
    out.write(c);
    i++;
  }
  return out.toString();
}

/// Гараар бичсэн unicode тэмдгийг ASCII болгоно.
String normalizeInput(String src) {
  return latexToPlain(src)
      .replaceAll(RegExp('[\u2212\u2013\u2014]'), '-')
      .replaceAll(RegExp('[\u00B7\u00D7\u2219\u22C5]'), '*')
      .replaceAll('\u00F7', '/')
      .replaceAll('\u03C0', 'pi')
      .replaceAll('\u221A', 'sqrt')
      .replaceAll('\u221B', 'cbrt')
      .replaceAll('\u00B2', '^2')
      .replaceAll('\u00B3', '^3')
      .replaceAll('\u2264', '<=')
      .replaceAll('\u2265', '>=')
      .replaceAll('\u221E', 'inf')
      .replaceAll(degreeSign, '')
      .replaceAll('**', '^');
}

/* ---------- Токен ---------- */

enum _TK { num, id, fn, op, end }

class _Tok {
  const _Tok(this.k, this.p, {this.v = '', this.n = 0});
  final _TK k;
  final String v;
  final double n;
  final int p;
}

final _numRe = RegExp(r'^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?', caseSensitive: false);
final _letter = RegExp('[a-zA-Z]');

List<_Tok> _tokenize(String input) {
  final s = normalizeInput(input);
  final out = <_Tok>[];
  var i = 0;
  while (i < s.length) {
    final c = s[i];
    if (c.trim().isEmpty) {
      i++;
      continue;
    }
    if (RegExp('[0-9.]').hasMatch(c)) {
      final m = _numRe.firstMatch(s.substring(i));
      if (m == null) throw ExprParseError('Тоо буруу бичигдсэн', i);
      final text = m.group(0)!;
      out.add(_Tok(_TK.num, i, n: double.parse(text.endsWith('.') ? '${text}0' : text), v: text));
      i += text.length;
      continue;
    }
    if (_letter.hasMatch(c)) {
      var j = i;
      while (j < s.length && _letter.hasMatch(s[j])) {
        j++;
      }
      final word = s.substring(i, j);
      var k = 0;
      while (k < word.length) {
        final rest = word.substring(k).toLowerCase();
        if (rest.startsWith('inf')) {
          out.add(_Tok(_TK.num, i + k, n: double.infinity, v: 'inf'));
          k += 3;
          continue;
        }
        String? name;
        for (final n in _names) {
          if (rest.startsWith(n)) {
            name = n;
            break;
          }
        }
        if (name != null) {
          out.add(name == 'pi' ? _Tok(_TK.id, i + k, v: 'pi') : _Tok(_TK.fn, i + k, v: _funcAlias[name]!));
          k += name.length;
        } else {
          out.add(_Tok(_TK.id, i + k, v: word[k]));
          k++;
        }
      }
      i = j;
      continue;
    }
    if (c == '?') {
      out.add(_Tok(_TK.id, i, v: '?'));
      i++;
      continue;
    }
    final two = i + 2 <= s.length ? s.substring(i, i + 2) : '';
    if (two == '<=' || two == '>=') {
      out.add(_Tok(_TK.op, i, v: two));
      i += 2;
      continue;
    }
    if ('+-*/^()!,|=<>_{}[];'.contains(c)) {
      final v = (c == '[' || c == '{')
          ? '('
          : (c == ']' || c == '}')
          ? ')'
          : c == ';'
          ? ','
          : c;
      out.add(_Tok(_TK.op, i, v: v));
      i++;
      continue;
    }
    throw ExprParseError('«$c» тэмдэгтийг ойлгосонгүй', i);
  }
  out.add(_Tok(_TK.end, s.length));
  return out;
}

/* ---------- Задлагч ---------- */

class _Parser {
  _Parser(this.toks);
  final List<_Tok> toks;
  int i = 0;
  int absDepth = 0;

  _Tok peek() => toks[i];
  _Tok next() => toks[i++];
  bool isOp(String v) {
    final t = peek();
    return t.k == _TK.op && t.v == v;
  }

  void expect(String v) {
    final t = next();
    if (!(t.k == _TK.op && t.v == v)) {
      throw ExprParseError(v == ')' ? 'Хаалт дутуу байна' : '«$v» дутуу', t.p);
    }
  }

  Expr expr() {
    var left = term();
    for (;;) {
      if (isOp('+')) {
        next();
        left = Expr.bin(ExprKind.add, left, term());
      } else if (isOp('-')) {
        next();
        left = Expr.bin(ExprKind.sub, left, term());
      } else {
        return left;
      }
    }
  }

  Expr term() {
    var left = unary();
    for (;;) {
      if (isOp('*')) {
        next();
        left = Expr.bin(ExprKind.mul, left, unary());
      } else if (isOp('/')) {
        next();
        left = Expr.bin(ExprKind.div, left, unary());
      } else if (startsPrimary()) {
        left = Expr.bin(ExprKind.mul, left, power());
      } else {
        return left;
      }
    }
  }

  bool startsPrimary() {
    final t = peek();
    if (t.k == _TK.num || t.k == _TK.id || t.k == _TK.fn) return true;
    if (isOp('(')) return true;
    if (isOp('|') && absDepth == 0) return true;
    return false;
  }

  Expr unary() {
    if (isOp('-')) {
      next();
      return Expr.neg(unary());
    }
    if (isOp('+')) {
      next();
      return unary();
    }
    return power();
  }

  Expr power() {
    final base = postfix();
    if (isOp('^')) {
      next();
      return Expr.bin(ExprKind.pow, base, unary());
    }
    return base;
  }

  Expr postfix() {
    var n = primary();
    while (isOp('!')) {
      next();
      n = Expr.fact(n);
    }
    return n;
  }

  Expr primary() {
    final t = next();
    switch (t.k) {
      case _TK.num:
        return Expr.number(t.n, raw: t.v);
      case _TK.id:
        return Expr.symbol(t.v);
      case _TK.fn:
        return call(t.v);
      case _TK.op when t.v == '(':
        final e = expr();
        expect(')');
        return e;
      case _TK.op when t.v == '|':
        absDepth++;
        final e = expr();
        absDepth--;
        expect('|');
        return Expr.call('abs', [e]);
      case _TK.end:
        throw ExprParseError('Илэрхийлэл дутуу байна', t.p);
      case _TK.op:
        throw ExprParseError('«${t.v}» энд байж болохгүй', t.p);
    }
  }

  Expr call(String f) {
    if (f == 'log' && isOp('_')) {
      next();
      final base = postfix();
      final arg = isOp('(') ? paren() : power();
      return Expr.call('log', [base, arg]);
    }
    if (isOp('^')) {
      next();
      final ex = postfix();
      final inner = call(f);
      return Expr.bin(ExprKind.pow, inner, ex);
    }
    if (isOp('(')) {
      next();
      final args = [expr()];
      while (isOp(',')) {
        next();
        args.add(expr());
      }
      expect(')');
      return Expr.call(f, _normalizeArgs(f, args));
    }
    var arg = power();
    while (peek().k == _TK.num || peek().k == _TK.id) {
      arg = Expr.bin(ExprKind.mul, arg, power());
    }
    return Expr.call(f, [arg]);
  }

  Expr paren() {
    expect('(');
    final e = expr();
    expect(')');
    return e;
  }
}

List<Expr> _normalizeArgs(String f, List<Expr> args) {
  const arity = {'log': (1, 2), 'root': (2, 2), 'min': (1, 9), 'max': (1, 9)};
  final (lo, hi) = arity[f] ?? (1, 1);
  if (args.length < lo || args.length > hi) throw ExprParseError('Функцийн аргументын тоо буруу');
  if (f == 'log' && args.length == 1) return [const Expr.number(10), args[0]];
  return args;
}

/// Бичвэр → мод. Алдааг монголоор ([ExprParseError]).
Expr parseExpr(String src) {
  if (src.trim().isEmpty) throw ExprParseError('Илэрхийлэл хоосон байна');
  final p = _Parser(_tokenize(src));
  final e = p.expr();
  final t = p.peek();
  if (t.k != _TK.end) {
    if (t.k == _TK.op && t.v == ')') throw ExprParseError('Илүү хаалт байна', t.p);
    throw ExprParseError('Илэрхийллийг бүрэн ойлгосонгүй', t.p);
  }
  return e;
}

enum RelOp { eq, lt, gt, le, ge }

class Relation {
  const Relation(this.lhs, this.op, this.rhs);
  final Expr lhs;
  final RelOp op;
  final Expr rhs;
}

/// «x^2+y^2=25», «2x-1 > 3» → харьцаа; харьцаагүй бол null.
Relation? parseRelation(String src) {
  final s = normalizeInput(src);
  final re = RegExp('(<=|>=|=|<|>)');
  final m = re.firstMatch(s);
  if (m == null) return null;
  final lhs = s.substring(0, m.start);
  final rhs = s.substring(m.end);
  if (re.hasMatch(rhs)) throw ExprParseError('Нэг л тэнцүүгийн тэмдэг байх ёстой');
  final op = switch (m.group(0)) {
    '<=' => RelOp.le,
    '>=' => RelOp.ge,
    '<' => RelOp.lt,
    '>' => RelOp.gt,
    _ => RelOp.eq,
  };
  return Relation(parseExpr(lhs), op, parseExpr(rhs));
}

/* ---------- Тооцоо ---------- */

double _factorial(double n) {
  if (n < 0 || n != n.roundToDouble()) return _gamma(n + 1);
  if (n > 170) return double.infinity;
  var r = 1.0;
  for (var i = 2; i <= n; i++) {
    r *= i;
  }
  return r;
}

double _gamma(double z) {
  if (z < 0.5) return math.pi / (math.sin(math.pi * z) * _gamma(1 - z));
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  z -= 1;
  var x = c[0];
  for (var i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  final t = z + g + 0.5;
  return math.sqrt(2 * math.pi) * math.pow(t, z + 0.5) * math.exp(-t) * x;
}

/// Сондгой язгуур сөрөг тоонд: (-8)^(1/3) = -2.
double _realPow(double a, double b) {
  if (a >= 0 || b == b.roundToDouble()) return math.pow(a, b).toDouble();
  final inv = 1 / b;
  if ((inv - inv.round()).abs() < 1e-9 && inv.round().isOdd) return -math.pow(-a, b).toDouble();
  return double.nan;
}

double _cbrt(double x) => x < 0 ? -math.pow(-x, 1 / 3).toDouble() : math.pow(x, 1 / 3).toDouble();

typedef Scope = Map<String, double>;

/// Модыг тооцоолох функц болгоно. [degrees] \u2014 тригонометрийг градусаар.
double Function(Scope) compileExpr(Expr node, {bool degrees = false}) {
  final k = degrees ? math.pi / 180 : 1.0;
  double Function(Scope) go(Expr n) {
    switch (n.kind) {
      case ExprKind.num:
        final v = n.v;
        return (_) => v;
      case ExprKind.sym:
        final name = n.name;
        if (name == 'pi') return (_) => math.pi;
        if (name == 'e') return (s) => s['e'] ?? math.e;
        return (s) => s[name] ?? double.nan;
      case ExprKind.neg:
        final a = go(n.a!);
        return (s) => -a(s);
      case ExprKind.add:
        final a = go(n.a!), b = go(n.b!);
        return (s) => a(s) + b(s);
      case ExprKind.sub:
        final a = go(n.a!), b = go(n.b!);
        return (s) => a(s) - b(s);
      case ExprKind.mul:
        final a = go(n.a!), b = go(n.b!);
        return (s) => a(s) * b(s);
      case ExprKind.div:
        final a = go(n.a!), b = go(n.b!);
        return (s) => a(s) / b(s);
      case ExprKind.pow:
        final a = go(n.a!), b = go(n.b!);
        return (s) => _realPow(a(s), b(s));
      case ExprKind.fact:
        final a = go(n.a!);
        return (s) => _factorial(a(s));
      case ExprKind.call:
        final args = n.args.map(go).toList();
        final a = args[0];
        final b = args.length > 1 ? args[1] : a;
        return switch (n.name) {
          'sin' => (s) => math.sin(a(s) * k),
          'cos' => (s) => math.cos(a(s) * k),
          'tan' => (s) => math.tan(a(s) * k),
          'cot' => (s) => 1 / math.tan(a(s) * k),
          'asin' => (s) => math.asin(a(s)) / k,
          'acos' => (s) => math.acos(a(s)) / k,
          'atan' => (s) => math.atan(a(s)) / k,
          'acot' => (s) => (math.pi / 2 - math.atan(a(s))) / k,
          'sinh' => (s) => (math.exp(a(s)) - math.exp(-a(s))) / 2,
          'cosh' => (s) => (math.exp(a(s)) + math.exp(-a(s))) / 2,
          'tanh' => (s) {
            final x = a(s);
            return (math.exp(x) - math.exp(-x)) / (math.exp(x) + math.exp(-x));
          },
          'sqrt' => (s) => math.sqrt(a(s)),
          'cbrt' => (s) => _cbrt(a(s)),
          'root' => (s) => _realPow(b(s), 1 / a(s)),
          'abs' => (s) => a(s).abs(),
          'ln' => (s) => math.log(a(s)),
          'lg' => (s) => math.log(a(s)) / math.ln10,
          'log' => (s) => math.log(b(s)) / math.log(a(s)),
          'exp' => (s) => math.exp(a(s)),
          'floor' => (s) => a(s).floorToDouble(),
          'ceil' => (s) => a(s).ceilToDouble(),
          'round' => (s) => a(s).roundToDouble(),
          'sign' => (s) => a(s).sign,
          'min' => (s) => args.map((f) => f(s)).reduce(math.min),
          'max' => (s) => args.map((f) => f(s)).reduce(math.max),
          _ => throw ExprParseError('«${n.name}» функцийг тооцоолж чадсангүй'),
        };
    }
  }

  return go(node);
}

/// Бичвэрийг шууд тоо болгоно (хувьсагчгүй). Алдаатай бол null.
double? evaluate(String src, {bool degrees = false}) {
  try {
    final v = compileExpr(parseExpr(src), degrees: degrees)(const {});
    return v.isNaN ? null : v;
  } on ExprParseError {
    return null;
  }
}

/// Модонд орсон хувьсагчид (pi, e орохгүй).
Set<String> freeSymbols(Expr node, [Set<String>? acc]) {
  final out = acc ?? <String>{};
  switch (node.kind) {
    case ExprKind.sym:
      if (node.name != 'pi' && node.name != 'e') out.add(node.name);
    case ExprKind.neg || ExprKind.fact:
      freeSymbols(node.a!, out);
    case ExprKind.call:
      for (final a in node.args) {
        freeSymbols(a, out);
      }
    case ExprKind.num:
      break;
    default:
      freeSymbols(node.a!, out);
      freeSymbols(node.b!, out);
  }
  return out;
}

/* ---------- LaTeX ---------- */

int _prec(Expr n) => switch (n.kind) {
  ExprKind.add || ExprKind.sub => 1,
  ExprKind.mul || ExprKind.div => 2,
  ExprKind.neg => 3,
  ExprKind.pow => 4,
  ExprKind.fact => 5,
  _ => 6,
};

const _fnTex = <String, String>{
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

/// JS-ийн `String(Number(x))`-тэй ижил: бүхэл бол «.0»-гүй.
String jsNum(double v) {
  if (v == v.roundToDouble() && v.abs() < 1e15) return v.toInt().toString();
  return v.toString();
}

String numTex(double v) {
  if (v == double.infinity) return r'+\infty';
  if (v == double.negativeInfinity) return r'-\infty';
  if (v.isNaN) return r'\text{тодорхойгүй}';
  if (v == v.roundToDouble() && v.abs() < 1e15) return v.toInt().toString();
  if (v.abs() >= 1e6 || v.abs() < 1e-4) {
    final r = v.toStringAsExponential(4);
    final parts = r.split('e');
    return '${parts[0]}\\cdot 10^{${int.parse(parts[1])}}';
  }
  return jsNum(double.parse(v.toStringAsFixed(6)));
}

String symTex(String n) => switch (n) {
  'pi' => r'\pi',
  '?' => r'\square',
  _ => n,
};

/// Мод → LaTeX. [raw] \u2014 тоог бичсэн хэлбэрээр нь (гарны дэлгэцэнд).
String toLatex(Expr node, {bool raw = false}) {
  String tex(Expr e) => toLatex(e, raw: raw);
  String wrap(Expr child, int minPrec) {
    final s = tex(child);
    return _prec(child) < minPrec || (child.kind == ExprKind.num && child.v < 0) ? '\\left($s\\right)' : s;
  }

  String fnArg(Expr a) {
    if (a.kind == ExprKind.sym || (a.kind == ExprKind.num && a.v >= 0)) return ' ${tex(a)}';
    return '\\left(${tex(a)}\\right)';
  }

  switch (node.kind) {
    case ExprKind.num:
      return raw && node.raw != null ? node.raw! : numTex(node.v);
    case ExprKind.sym:
      return symTex(node.name);
    case ExprKind.neg:
      return '-${wrap(node.a!, 3)}';
    case ExprKind.add:
      return '${tex(node.a!)}+${wrap(node.b!, 1)}';
    case ExprKind.sub:
      final b = node.b!.kind == ExprKind.add || node.b!.kind == ExprKind.sub
          ? '\\left(${tex(node.b!)}\\right)'
          : wrap(node.b!, 2);
      return '${tex(node.a!)}-$b';
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
      return '\\frac{${tex(node.a!)}}{${tex(node.b!)}}';
    case ExprKind.pow:
      final base = node.a!;
      if (base.kind == ExprKind.call && _fnTex.containsKey(base.name)) {
        return '${_fnTex[base.name]}^{${tex(node.b!)}}${fnArg(base.args[0])}';
      }
      return '${wrap(base, 5)}^{${tex(node.b!)}}';
    case ExprKind.fact:
      return '${wrap(node.a!, 6)}!';
    case ExprKind.call:
      final a = node.args[0];
      final b = node.args.length > 1 ? node.args[1] : null;
      switch (node.name) {
        case 'sqrt':
          return '\\sqrt{${tex(a)}}';
        case 'cbrt':
          return '\\sqrt[3]{${tex(a)}}';
        case 'root':
          return '\\sqrt[${tex(a)}]{${tex(b!)}}';
        case 'abs':
          return '\\left|${tex(a)}\\right|';
        case 'floor':
          return '\\left\\lfloor ${tex(a)}\\right\\rfloor';
        case 'ceil':
          return '\\left\\lceil ${tex(a)}\\right\\rceil';
        case 'round':
          return '\\operatorname{round}\\left(${tex(a)}\\right)';
        case 'exp':
          return 'e^{${tex(a)}}';
        case 'log':
          if (a.kind == ExprKind.num && a.v == 10) return '\\lg${fnArg(b!)}';
          return '\\log_{${tex(a)}}${fnArg(b!)}';
        case 'min' || 'max':
          return '${_fnTex[node.name]}\\left(${node.args.map(tex).join(r';\ ')}\\right)';
      }
      return '${_fnTex[node.name] ?? '\\operatorname{${node.name}}'}${fnArg(a)}';
  }
}

String relationLatex(Relation r) {
  final op = switch (r.op) {
    RelOp.eq => '=',
    RelOp.lt => '<',
    RelOp.gt => '>',
    RelOp.le => r'\le ',
    RelOp.ge => r'\ge ',
  };
  return '${toLatex(r.lhs)}$op${toLatex(r.rhs)}';
}

/* ---------- Тоог «гоё» харуулах ---------- */

int gcd(int a, int b) {
  a = a.abs();
  b = b.abs();
  while (b != 0) {
    final t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/// Ойролцоо бутархай: 0.333333 → (1, 3). Олдохгүй бол null.
(int, int)? toFraction(double x, {int maxDen = 1000, double eps = 1e-9}) {
  if (!x.isFinite) return null;
  if (x == x.roundToDouble()) return (x.toInt(), 1);
  final sign = x < 0 ? -1 : 1;
  var a = x.abs();
  var h1 = 1, h0 = 0, k1 = 0, k0 = 1;
  for (var i = 0; i < 32; i++) {
    final ai = a.floor();
    final h2 = ai * h1 + h0, k2 = ai * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    if ((x.abs() - h1 / k1).abs() < eps * math.max(1, x.abs())) return (sign * h1, k1);
    final frac = a - ai;
    if (frac < 1e-15) break;
    a = 1 / frac;
  }
  return null;
}

String fracTex(int p, int q) {
  if (q == 1) return '$p';
  return '${p < 0 ? '-' : ''}\\frac{${p.abs()}}{$q}';
}

/// n = out^2 * inn, inn нь квадратгүй.
(int, int) splitSqrt(num n) {
  var out = 1, inn = n.round();
  for (var k = 2; k * k <= inn; k++) {
    while (inn % (k * k) == 0) {
      inn ~/= k * k;
      out *= k;
    }
  }
  return (out, inn);
}

/// Тоог хамгийн «цэвэр» LaTeX хэлбэрт: бүхэл, бутархай, a\sqrt{b}, \frac{a\sqrt b}{c}, k\pi.
String niceTex(double x) {
  if (!x.isFinite) return numTex(x);
  if (x.abs() < 1e-12) return '0';
  final f = toFraction(x);
  if (f != null) return fracTex(f.$1, f.$2);
  final fp = toFraction(x / math.pi, maxDen: 24);
  if (fp != null) {
    final (p, q) = fp;
    final sign = p < 0 ? '-' : '';
    final top = p.abs() == 1 ? r'\pi' : '${p.abs()}\\pi';
    return q == 1 ? '$sign$top' : '$sign\\frac{$top}{$q}';
  }
  final fs = toFraction(x * x, maxDen: 400);
  if (fs != null) {
    final (p, q) = fs;
    final (out, inn) = splitSqrt(p * q);
    if (inn > 1 && inn <= 10000) {
      final g = gcd(out, q), o = out ~/ g, den = q ~/ g;
      final sign = x < 0 ? '-' : '';
      final top = '${o == 1 ? '' : o}\\sqrt{$inn}';
      return den == 1 ? '$sign$top' : '$sign\\frac{$top}{$den}';
    }
  }
  return numTex(double.parse(x.toStringAsFixed(4)));
}
