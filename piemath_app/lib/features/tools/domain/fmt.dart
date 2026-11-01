// Тоог LaTeX-ээр харуулах — вэбийн `plane/fmt.ts`-ийн порт.
// Үр дүн: яг хэлбэр (\sqrt{13}) эхэнд, ойролцоо утга (3.61) дараа нь.
import 'dart:math' as math;

import '../../../shared/math_keyboard/expr.dart';

/// Аравтын [digits] оронтой, илүү тэггүй: 2.50 → «2.5», -0.0001 → «0».
String dec(double x, [int digits = 2]) {
  if (!x.isFinite) return r'\text{--}';
  final v = double.parse(x.toStringAsFixed(digits));
  if (v == 0) return '0';
  return jsNum(v);
}

bool _isInt(double x, [double tol = 1e-9]) => (x - x.roundToDouble()).abs() < tol * math.max(1, x.abs());
bool _decExact(double x, int digits) =>
    (double.parse(x.toStringAsFixed(digits)) - x).abs() < 1e-9 * math.max(1, x.abs());

/// Яг хэлбэр: бүхэл, \frac{p}{q} (q <= 12), \frac{a\sqrt{b}}{q}. Олдохгүй бол null.
String? exactTex(double x) {
  if (!x.isFinite) return null;
  if (_isInt(x)) return '${x.round()}';
  final sign = x < 0 ? '-' : '';
  final ax = x.abs();
  final f = toFraction(ax, maxDen: 12, eps: 1e-10);
  if (f != null) return '$sign\\frac{${f.$1}}{${f.$2}}';
  for (var q = 1; q <= 12; q++) {
    final sq = (ax * q) * (ax * q);
    if (sq > 1e6 || (sq - sq.roundToDouble()).abs() > 1e-6) continue;
    final (o, i) = splitSqrt(sq.round());
    if (i <= 1) continue;
    final g = gcd(o, q), oo = o ~/ g, qq = q ~/ g;
    final top = '${oo == 1 ? '' : oo}\\sqrt{$i}';
    return '$sign${qq == 1 ? top : '\\frac{$top}{$qq}'}';
  }
  return null;
}

/// Нэг утга: яг хэлбэр, аравтын бичлэг, аравтын нь яг эсэх.
class Val {
  const Val({required this.exact, required this.dec, required this.eq});
  final String? exact;
  final String dec;
  final bool eq;

  @override
  bool operator ==(Object other) => other is Val && other.exact == exact && other.dec == dec && other.eq == eq;

  @override
  int get hashCode => Object.hash(exact, dec, eq);
}

Val val(double x, [int digits = 2]) => Val(exact: exactTex(x), dec: dec(x, digits), eq: _decExact(x, digits));

/// k*pi утга.
Val piVal(double k, [int digits = 2]) {
  final v = k * math.pi;
  final e = exactTex(k);
  String? exact;
  if (e != null && !e.contains('sqrt')) {
    final m = RegExp(r'^(-?)\\frac\{(\d+)\}\{(\d+)\}$').firstMatch(e);
    if (m != null) {
      exact = '${m.group(1)}\\frac{${m.group(2) == '1' ? '' : m.group(2)}\\pi}{${m.group(3)}}';
    } else {
      exact = e == '0'
          ? '0'
          : '${e == '1'
                ? ''
                : e == '-1'
                ? '-'
                : e}\\pi';
    }
  }
  return Val(exact: exact, dec: dec(v, digits), eq: _decExact(v, digits));
}

/// Өнцөг (градус): цэвэр бол бүхэл, бусад 1 орон.
Val degVal(double x) {
  if ((x - x.roundToDouble()).abs() < 1e-6) {
    return Val(exact: '${x.round()}^\\circ', dec: '${x.round()}^\\circ', eq: true);
  }
  return Val(exact: null, dec: '${dec(x, 1)}^\\circ', eq: _decExact(x, 1));
}

final _plainNum = RegExp(r'^-?\d+(\.\d+)?(\^\\circ)?$');

/// «=\sqrt{13}\approx 3.61», «=6», «\approx 36.9^\circ».
String valTex(Val v, [String unit = '']) {
  if (v.exact != null) {
    if (_plainNum.hasMatch(v.exact!) || v.exact == v.dec) return '=${v.exact}$unit';
    return '=${v.exact}${v.eq ? '=${v.dec}' : '\\approx ${v.dec}'}$unit';
  }
  return '${v.eq ? '=' : r'\approx '}${v.dec}$unit';
}

bool needsApprox(Val v) => v.exact != null && !_plainNum.hasMatch(v.exact!) && v.exact != v.dec;

String res(double x, [int digits = 2]) => valTex(val(x, digits));
String piRes(double k, [int digits = 2]) => valTex(piVal(k, digits));

/// Томьёонд орлуулах тоо: 2.5, \sqrt{2}.
String num(double x) {
  if (!x.isFinite) return r'\text{--}';
  if (_decExact(x, 2)) return dec(x, 2);
  return exactTex(x) ?? dec(x, 2);
}

String degTex(double x) => degVal(x).dec;

/// Зурагт урт: 2 оронтой аравтын.
String lenLabel(double x, [int digits = 2]) => dec(x, digits);
