import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/shared/math_keyboard/math_input_controller.dart';

MathInputController typed(List<MathKey> keys, {MathInputKind kind = MathInputKind.length}) {
  final c = MathInputController(kind: kind);
  keys.forEach(c.press);
  return c;
}

void main() {
  const k = MathKey.values;
  MathKey d(int n) => MathKey.digits[n];

  test('цифр, аравтын цэг', () {
    final c = typed([d(2), MathKey.dot, d(5)]);
    expect(c.value, 2.5);
    expect(c.displayTex, '2.5');
    // Давхар цэг орохгүй
    c.press(MathKey.dot);
    expect(c.text, '2.5');
    expect(typed([MathKey.dot, d(5)]).value, 0.5);
  });

  test('2√3: язгуур дараагийн тоог л хамарна', () {
    final c = typed([d(2), MathKey.sqrt, d(3)]);
    expect(c.value, closeTo(2 * math.sqrt(3), 1e-12));
    expect(c.displayTex, r'2 \sqrt{3}');
    // бутархай дармагц язгуур хаагдана: (2√3)/3
    c
      ..press(MathKey.frac)
      ..press(d(3));
    expect(c.value, closeTo(2 * math.sqrt(3) / 3, 1e-12));
    expect(c.displayTex, r'\frac{2 \sqrt{3}}{3}');
  });

  test('3/4 ба дуусаагүй бутархай', () {
    final c = typed([d(3), MathKey.frac]);
    expect(c.value, isNull);
    expect(c.displayTex, r'\frac{3}{\square}');
    c.press(d(4));
    expect(c.value, 0.75);
    expect(c.displayTex, r'\frac{3}{4}');
  });

  test('квадрат, пи', () {
    expect(typed([d(3), MathKey.square]).value, 9);
    expect(typed([d(2), MathKey.pi]).value, closeTo(2 * math.pi, 1e-12));
    expect(typed([d(2), MathKey.pi]).displayTex, r'2 \pi');
    expect(typed([MathKey.sqrt]).displayTex, r'\sqrt{\square}');
  });

  test('буцаах нэг токеныг бүтнээр арилгана', () {
    final c = typed([d(2), MathKey.sqrt, d(3)]);
    c.press(MathKey.backspace);
    expect(c.tokens, ['2', 'sqrt(']);
    c.press(MathKey.backspace);
    expect(c.value, 2);
    c.press(MathKey.clear);
    expect(c.isEmpty, isTrue);
    expect(c.value, isNull);
  });

  test('өнцгийн талбар: хэмийн тэмдэг', () {
    final c = typed([d(6), d(0), MathKey.degree], kind: MathInputKind.angle);
    expect(c.value, 60);
    expect(c.displayTex, r'60^{\circ}');
    // уртын талбарт хэмийн тэмдэг идэвхгүй
    expect(MathInputController().allows(MathKey.degree), isFalse);
  });

  test('бүхэл талбар: зөвхөн цифр', () {
    final c = MathInputController(kind: MathInputKind.integer);
    for (final key in [MathKey.dot, MathKey.sqrt, MathKey.frac, MathKey.pi, MathKey.square, MathKey.degree]) {
      expect(c.allows(key), isFalse, reason: key.name);
    }
    c
      ..press(d(1))
      ..press(d(2))
      ..press(MathKey.sqrt);
    expect(c.value, 12);
  });

  test('анхны утга', () {
    expect(MathInputController(value: 4).text, '4');
    expect(MathInputController(value: 2.5).value, 2.5);
    expect(k.contains(MathKey.next), isTrue);
  });

  test('бүлэг: Дараах ба хаах', () {
    final a = MathInputController(), b = MathInputController();
    final g = MathFieldGroup()..setFields([a, b]);
    expect(g.isOpen, isFalse);
    g.focus(a);
    expect(g.active, a);
    g.next();
    expect(g.active, b);
    g.next();
    expect(g.isOpen, isFalse);
  });
}
