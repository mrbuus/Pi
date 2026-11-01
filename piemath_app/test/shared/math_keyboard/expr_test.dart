// Вэбийн core/expr.test.mjs-ийн порт + LaTeX оролт.
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/shared/math_keyboard/expr.dart';

double ev(String s, [Map<String, double> scope = const {}]) => compileExpr(parseExpr(s))(scope);
void near(double a, double b) => expect((a - b).abs() < 1e-9, isTrue, reason: '$a ≈ $b');

void main() {
  test('далд үржвэр ба эрэмбэ', () {
    near(ev('2x^2-3x+1', {'x': 2}), 3);
    near(ev('-2^2'), -4);
    near(ev('2^3^2'), 512);
    near(ev('2(x+1)', {'x': 3}), 8);
    near(ev('x(x+1)', {'x': 3}), 12);
    near(ev('(x+1)(x-1)', {'x': 3}), 8);
    near(ev('2pi'), 2 * math.pi);
    near(ev('ab', {'a': 2, 'b': 5}), 10);
    near(ev('2^-1'), 0.5);
    near(ev('6/2*3'), 9);
  });

  test('функцүүд', () {
    near(ev('sin2x', {'x': math.pi / 4}), 1);
    near(ev('sin^2 x + cos^2 x', {'x': 0.7}), 1);
    near(ev('tg(pi/4)'), 1);
    near(ev('sqrt(16)'), 4);
    near(ev('√16'), 4);
    near(ev('|x-5|', {'x': 2}), 3);
    near(ev('|x|+|y|', {'x': -2, 'y': 3}), 5);
    near(ev('2|x|', {'x': -3}), 6);
    near(ev('log_2(8)'), 3);
    near(ev('log(2, 8)'), 3);
    near(ev('lg100'), 2);
    near(ev('ln(e)'), 1);
    near(ev('5!'), 120);
    near(ev('cbrt(-8)'), -2);
    near(ev('(-8)^(1/3)'), -2);
    near(ev('arcsin(1)'), math.pi / 2);
    near(ev('x²', {'x': 3}), 9);
  });

  test('градус', () {
    near(compileExpr(parseExpr('sin(30)'), degrees: true)({}), 0.5);
  });

  test('харьцаа', () {
    final r = parseRelation('x^2+y^2=25')!;
    expect(r.op, RelOp.eq);
    expect(parseRelation('2x-1 ≥ 3')!.op, RelOp.ge);
    expect(parseRelation('x+1'), isNull);
  });

  test('алдаа монголоор', () {
    expect(() => parseExpr('(x+1'), throwsA(isA<ExprParseError>().having((e) => e.message, 'msg', contains('Хаалт'))));
    expect(() => parseExpr('x+'), throwsA(isA<ExprParseError>().having((e) => e.message, 'msg', contains('дутуу'))));
    expect(
      () => parseExpr(r'x$'),
      throwsA(isA<ExprParseError>().having((e) => e.message, 'msg', contains('ойлгосонгүй'))),
    );
  });

  test('LaTeX', () {
    expect(toLatex(parseExpr('2x^2-3x+1')), '2 x^{2}-3 x+1');
    expect(toLatex(parseExpr('sqrt(x)/2')), r'\frac{\sqrt{x}}{2}');
    expect(toLatex(parseExpr('tg x')), r'\operatorname{tg} x');
    expect(toLatex(parseExpr('log_2 8')), r'\log_{2} 8');
    expect(toLatex(parseExpr('a-(b+c)')), r'a-\left(b+c\right)');
    expect(relationLatex(parseRelation('sqrt(x) >= x-2')!), r'\sqrt{x}\ge x-2');
    expect(relationLatex(parseRelation('x <= 3')!), r'x\le 3');
  });

  test('хувьсагч', () {
    expect(freeSymbols(parseExpr('a x^2 + b x + pi')).toList()..sort(), ['a', 'b', 'x']);
  });

  test('гоё тоо', () {
    expect(toFraction(1 / 3), (1, 3));
    expect(niceTex(0.5), r'\frac{1}{2}');
    expect(niceTex(math.sqrt2), r'\sqrt{2}');
    expect(niceTex(math.sqrt(3) / 2), r'\frac{\sqrt{3}}{2}');
    expect(niceTex(-2 * math.sqrt(5)), r'-2\sqrt{5}');
    expect(niceTex(math.pi / 6), r'\frac{\pi}{6}');
    expect(niceTex(-4), '-4');
  });

  test('LaTeX оролт: 2\\sqrt{3}, \\frac{3}{4}, \\pi', () {
    near(evaluate(r'2\sqrt{3}')!, 2 * math.sqrt(3));
    near(evaluate(r'\frac{3}{4}')!, 0.75);
    near(evaluate('3/4')!, 0.75);
    near(evaluate(r'\frac{2\pi}{3}')!, 2 * math.pi / 3);
    near(evaluate(r'\frac{\sqrt{3}}{2}')!, math.sqrt(3) / 2);
    near(evaluate(r'5\cdot 2')!, 10);
    near(evaluate(r'\sqrt[3]{27}')!, 3);
    near(evaluate(r'60^{\circ}')!, 60);
    near(evaluate('60°')!, 60);
    expect(evaluate(r'\frac{3}'), isNull);
    expect(evaluate(''), isNull);
  });

  test('бичсэн тоог яг хэвээр (гарны дэлгэц)', () {
    expect(toLatex(parseExpr('2.'), raw: true), '2.');
    expect(toLatex(parseExpr('0.50'), raw: true), '0.50');
    expect(toLatex(parseExpr('3/?'), raw: true), r'\frac{3}{\square}');
    expect(toLatex(parseExpr('2sqrt(3)'), raw: true), r'2 \sqrt{3}');
  });
}
