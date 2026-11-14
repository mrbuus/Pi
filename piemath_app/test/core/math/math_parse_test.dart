import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math_parse.dart';

/// Вэбийн тестийн `show()`-тэй ижил: томьёо `[…]`, display `[[…]]`.
String show(String s) => splitMath(s).map((e) => e.toString()).join();

void main() {
  group('splitMath — вэбийн MathText.powers.test.mjs-ийн кейсүүд', () {
    // [оролт, хүлээгдэж буй, тайлбар] — вэбийн тесттэй ЯГ ижил.
    const cases = <(String, String, String)>[
      ('x2 + y2 = z2', '[x^{2}] + [y^{2}] = [z^{2}]', 'docx-оос алдагдсан зэрэг'),
      ('x 2', '[x^{2}]', 'үсэг + сул зай + цифр'),
      ('a^2 + b^-3', '[a^{2}] + [b^{-3}]', 'caret тэмдэглэгээ'),
      ('x^{12}', '[x^{12}]', 'олон оронтой зэрэг'),
      ('функцийн 2 язгуур', 'функцийн 2 язгуур', 'КИРИЛЛ — хөндөгдөх ЁСГҮЙ'),
      (r'$\sqrt{2}$ гэсэн', r'[\sqrt{2}] гэсэн', 'хэдийн LaTeX — хөндөгдөх ЁСГҮЙ'),
      (r'$\frac{a}{2}$ ба x2', r'[\frac{a}{2}] ба [x^{2}]', 'LaTeX + текст холимог'),
      ('100x100 ном', '100x100 ном', 'НОМЫН НЭР — эвдрэх ЁСГҮЙ'),
      ('200 x 200 цуврал', '200 x 200 цуврал', 'зайтай хэмжээ'),
      ('300x300 ба x2', '300x300 ба [x^{2}]', 'ном + зэрэг зэрэг'),
      ('24x24 сүлжээ', '24x24 сүлжээ', 'дүрсний хэмжээ'),
      ('2x + 3 = 0', '2x + 3 = 0', 'коэффициент — хөндөгдөхгүй'),
      ('Сорил 22B хувилбар', 'Сорил 22B хувилбар', 'кирилл + латин холимог'),
      ('', '', 'хоосон'),
      ('Ердийн монгол өгүүлбэр.', 'Ердийн монгол өгүүлбэр.', 'математикгүй текст'),
    ];
    for (final (input, expected, label) in cases) {
      test(label, () => expect(show(input), expected));
    }
  });

  group('splitMath — нэмэлт', () {
    test('display ба inline', () {
      expect(splitMath(r'Бод: $$x^2=4$$ ба $y$'), const [
        MathSegment.text('Бод: '),
        MathSegment.display('x^2=4'),
        MathSegment.text(' ба '),
        MathSegment.inline('y'),
      ]);
    });

    test('display олон мөртэй', () {
      expect(splitMath('\$\$a\\\\\nb\$\$'), const [MathSegment.display('a\\\\\nb')]);
    });

    test('мөр шилжилт хадгалагдана', () {
      expect(splitMath('Нэг\nХоёр'), const [MathSegment.text('Нэг\nХоёр')]);
    });

    test('хосгүй \$ — энгийн бичвэр (вэбтэй ижил)', () {
      expect(splitMath(r'Үнэ 5$ байна'), const [MathSegment.text(r'Үнэ 5$ байна')]);
    });

    test('хоосон \$\$ томьёо болохгүй', () {
      // `$$` дотор юу ч байхгүй бол `$([^$]+?)$` ч таарахгүй — бичвэр хэвээр.
      expect(splitMath(r'a $$ b'), const [MathSegment.text(r'a $$ b')]);
    });

    test('жинхэнэ контент: 100x100 V3', () {
      expect(splitMath(r'$0.(3)$ үет бутархайг энгийн бутархай болго.'), const [
        MathSegment.inline('0.(3)'),
        MathSegment.text(' үет бутархайг энгийн бутархай болго.'),
      ]);
    });

    test('жинхэнэ контент: 200x200 V3 км/цаг', () {
      final s = splitMath(r'$L$ цэгээс М цэгрүү 15 км $/$ цаг хурдтай');
      expect(s.where((e) => e.isMath).map((e) => e.value), ['L', '/']);
      // «М» (кирилл) зэрэг болохгүй, «15 км» хэвээр.
      expect(s.map((e) => e.toString()).join(), '[L] цэгээс М цэгрүү 15 км [/] цаг хурдтай');
    });

    test('Х (кирилл) хэмжээ — номын нэр', () {
      expect(show('100х100 ном'), '100х100 ном');
    });

    test('математик ташуу үсэг (U+1D44E) + цифр нь зэрэг', () {
      expect(show('\u{1D465}2'), '[\u{1D465}^{2}]');
    });
  });

  group('normalizePowers', () {
    test('өөрчлөлтгүй бол ижил', () {
      expect(normalizePowers('абв'), 'абв');
    });
    test('олон хэмжээг дарааллаар нь сэргээнэ', () {
      expect(normalizePowers('100x100 ба 200x200, x2'), r'100x100 ба 200x200, $x^{2}$');
    });
  });

  group('splitBold', () {
    test('тод хэсэг', () {
      expect(splitBold('**I.** Бодолт'), const [TextRun('I.', bold: true), TextRun(' Бодолт')]);
    });
    test('хосгүй ** арилна', () {
      expect(splitBold('a ** b'), const [TextRun('a  b')]);
    });
    test('тодгүй бол ганц хэсэг', () {
      expect(splitBold('энгийн'), const [TextRun('энгийн')]);
    });
    test('мөр дамнасан ** тод болохгүй', () {
      expect(splitBold('**a\nb**'), const [TextRun('a\nb')]);
    });
  });

  group('speakableTex', () {
    test('бутархай, язгуур', () {
      expect(speakableTex(r'\frac{1}{2}'), '1 / 2');
      expect(speakableTex(r'\sqrt{x}'), 'язгуур x');
      expect(speakableTex(r'a\cdot b'), 'a үржих b');
      expect(speakableTex(r'\left( x \right)'), '( x )');
    });
  });
}
