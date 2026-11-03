// Вэбийн `solve/solve.test.mjs`-ийн бүрэн порт: бодогчийн жинхэнэ модулиудыг шалгана.
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/solve/domain/auto.dart';
import 'package:piemath_app/features/tools/solve/domain/exact.dart';
import 'package:piemath_app/features/tools/solve/domain/expr_ext.dart';
import 'package:piemath_app/features/tools/solve/domain/ineq.dart';
import 'package:piemath_app/features/tools/solve/domain/live.dart';
import 'package:piemath_app/features/tools/solve/domain/poly.dart';
import 'package:piemath_app/features/tools/solve/domain/roots.dart';
import 'package:piemath_app/features/tools/solve/domain/solve.dart';
import 'package:piemath_app/features/tools/solve/domain/steps.dart';

Solution S(String mode, String input, [Map<String, String> extra = const {}, String? sub, bool degrees = false]) =>
    solve(
      SolveRequest(
        mode: SolveMode.values.byName(mode),
        sub: sub,
        input: input,
        extra: extra,
        degrees: degrees,
      ),
    );

String ans(Solution s) => s.answer.join(' ; ');
String nos(String s) => s.replaceAll(RegExp(r'\s+'), '');

void okHas(Solution sol, List<String> parts) {
  expect(sol.ok, isTrue, reason: 'ok биш: ${sol.notes?.join(' ')}');
  final a = nos(ans(sol));
  for (final p in parts) {
    expect(a.contains(nos(p)), isTrue, reason: '«$p» хариунд алга: ${ans(sol)}');
  }
}

String X(String s) => xtex(evalExact(parseExpr(s)));
String note0(Solution s) => (s.notes ?? const [''])[0];
bool stepHas(Solution s, String re) => s.steps.any((x) => RegExp(re).hasMatch(x.text ?? ''));

/// Вэбийн тестийн LCG (2^31 модуль) — ижил дараалал.
double Function() rng(int seed) {
  var s = seed;
  return () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

void main() {
  test('яг тоо: бутархай, язгуур, π, тригонометр, логарифм', () {
    expect(X('1/2+1/3'), r'\frac{5}{6}');
    expect(X('sqrt(12)'), r'2\sqrt{3}');
    expect(X('sqrt(8)+sqrt(18)'), r'5\sqrt{2}');
    expect(X('1/(1+sqrt(2))'), r'\sqrt{2}-1');
    expect(X('tan(pi/12)'), r'2-\sqrt{3}');
    expect(X('sin(pi/12)'), r'\frac{\sqrt{6}-\sqrt{2}}{4}');
    expect(X('sqrt(3+2sqrt(2))'), r'1+\sqrt{2}');
    expect(X('cbrt(16)'), r'2\sqrt[3]{2}');
    expect(X('log_4(2)'), r'\frac{1}{2}');
    expect(X('lg(0.001)'), '-3');
    expect(X('ln(e^3)'), '3');
    expect(X('arccos(-sqrt(3)/2)'), r'\frac{5\pi}{6}');
    expect(X('(-8)^(2/3)'), '4');
    expect(xtex(evalExact(parseExpr('sin(30)'), degrees: true)), r'\frac{1}{2}');
  });

  test('тооцоолох горим', () {
    okHas(S('calc', '1/2+1/3'), [r'\frac{5}{6}']);
    okHas(S('calc', '7/3'), [r'2\frac{1}{3}']);
    okHas(S('calc', 'sqrt(50)'), [r'5\sqrt{2}']);
    okHas(S('calc', 'sin(30)', {}, null, true), [r'\frac{1}{2}']);
    okHas(S('calc', 'sin 30\u00B0'), [r'\frac{1}{2}']);
    okHas(S('calc', '5!'), ['120']);
    okHas(S('calc', 'C(5,2)'), ['10']);
    okHas(S('calc', 'A(5,2)'), ['20']);
    okHas(S('calc', 'C(10,3)+1'), ['121']);
    okHas(S('calc', '25!'), [r'15\,511\,210\,043\,330\,985\,984\,000\,000']);
    okHas(S('calc', 'C(52,5)'), [r'2\,598\,960']);
    okHas(S('calc', '12:4'), ['3']);
    okHas(S('calc', 'log_2(32)'), ['5']);
    okHas(S('calc', '2pi/3+pi/3'), [r'\pi']);
    final s = S('calc', 'sin(1)');
    expect(s.ok && ans(s).contains(r'\approx 0.8414709848'), isTrue);
  });

  test('тооцоолох: алдаа монголоор', () {
    expect(note0(S('calc', '1/0')), contains('тодорхойлогдохгүй'));
    expect(note0(S('calc', 'sqrt(-4)')), contains('тодорхойлогдохгүй'));
    expect(note0(S('calc', '2x+1')), contains('хувьсагч'));
    expect(note0(S('calc', '(2+3')), contains('Хаалт'));
    expect(note0(S('calc', '')), contains('оруулна уу'));
    expect(note0(S('calc', r'2$3')), contains('ойлгосонгүй'));
  });

  test('олон гишүүнт тэгшитгэл', () {
    okHas(S('eq', 'x^2-5x+6=0'), ['x_{1} = 2', 'x_{2} = 3']);
    okHas(S('eq', 'x^3-6x^2+11x-6=0'), ['x_{1} = 1', 'x_{2} = 2', 'x_{3} = 3']);
    okHas(S('eq', '2x+3=7'), ['x = 2']);
    okHas(S('eq', 'x^2-2=0'), [r'-\sqrt{2}', r'\sqrt{2}']);
    okHas(S('eq', 'x^2+x+1=0'), [r'\varnothing']);
    okHas(S('eq', 'x^4-5x^2+4=0'), ['-2', '-1', 'x_{3} = 1', 'x_{4} = 2']);
    okHas(S('eq', '2x^3-x^2-2x+1=0'), [r'\frac{1}{2}']);
    okHas(S('eq', 'x^2-4x+4=0'), ['x = 2']);
    okHas(S('eq', 'x^2-x-1=0'), [r'\frac{1-\sqrt{5}}{2}', r'\frac{1+\sqrt{5}}{2}']);
    okHas(S('eq', '3(x-1)=2x+5'), ['x = 8']);
    okHas(S('eq', 'x=x'), [r'\mathbb{R}']);
    final q = S('eq', 'x^2-5x+6=0');
    expect(q.title, 'Квадрат тэгшитгэл');
    final st = q.steps.map((s) => (s.tex ?? const []).join(' ')).join(' ');
    expect(st.contains('D = b^2-4ac'), isTrue, reason: 'дискриминантын алхам');
    expect(stepHas(q, 'Виет'), isTrue, reason: 'Виетийн алхам');
    expect(stepHas(S('eq', 'x^3-6x^2+11x-6=0'), 'Хорнер'), isTrue, reason: 'Хорнерийн схем');
    final n = S('eq', 'x^5-x-1=0');
    expect(n.ok && ans(n).contains(r'\approx 1.167304'), isTrue, reason: 'тоон язгуур');
  });

  test('бутархай-рационал: ОЗ, гаднах язгуур', () {
    okHas(S('eq', '(x-1)/(x+2)=0'), ['x = 1']);
    okHas(S('eq', '1/x+1/(x-1)=3/2'), [r'\frac{1}{3}', 'x_{2} = 2']);
    final s = S('eq', '(x^2-1)/(x-1)=0');
    okHas(s, ['x = -1']);
    expect(s.steps.any((x) => x.tone == Tone.bad && (x.text ?? '').contains('гаднах')), isTrue);
    okHas(S('eq', 'x/(x-1)=1/(x-1)'), [r'\varnothing']);
  });

  test('модультай тэгшитгэл', () {
    okHas(S('eq', '|x-2|=3'), ['x_{1} = -1', 'x_{2} = 5']);
    okHas(S('eq', '|2x+1|=|x-3|'), ['-4', r'\frac{2}{3}']);
    okHas(S('eq', '|x-1|+|x-3|=2'), [r'\left[1;\ 3\right]']);
    okHas(S('eq', '|x^2-4|=3x'), ['x_{1} = 1', 'x_{2} = 4']);
    okHas(S('eq', '|x|=-1'), [r'\varnothing']);
  });

  test('иррациональ тэгшитгэл: квадрат зэрэгт дэвшүүлж шалгана', () {
    final s = S('eq', 'sqrt(x+3)=x+1');
    okHas(s, ['x = 1']);
    expect(s.steps.any((x) => x.tone == Tone.bad), isTrue);
    okHas(S('eq', 'sqrt(2x+3)-sqrt(x+1)=1'), ['-1', '3']);
    okHas(S('eq', 'sqrt(x)=-2'), [r'\varnothing']);
    okHas(S('eq', 'sqrt(x^2+9)=5'), ['-4', '4']);
  });

  test('үзүүлэнт ба логарифм тэгшитгэл', () {
    okHas(S('eq', '2^x=8'), ['x = 3']);
    okHas(S('eq', '4^x-3*2^x+2=0'), ['x_{1} = 0', 'x_{2} = 1']);
    okHas(S('eq', '3^(x^2-3x)=1/9'), ['x_{1} = 1', 'x_{2} = 2']);
    okHas(S('eq', '2^(x+1)+2^x=12'), ['x = 2']);
    okHas(S('eq', 'e^x=5'), [r'\ln 5']);
    okHas(S('eq', '9^x=1/3'), [r'-\frac{1}{2}']);
    okHas(S('eq', 'log_2(x)=3'), ['x = 8']);
    okHas(S('eq', 'lg(x)+lg(x-9)=1'), ['x = 10']);
    okHas(S('eq', 'log_3(x^2-8x)=2'), ['-1', '9']);
    okHas(S('eq', 'ln(x)^2-3ln(x)+2=0'), ['e', 'e^{2}']);
    okHas(S('eq', 'log_2(x)+log_4(x)=3'), ['x = 4']);
    okHas(S('eq', '2^x=-4'), [r'\varnothing']);
  });

  test('тригонометрийн энгийн тэгшитгэл: ерөнхий шийд', () {
    okHas(S('eq', 'sin(x)=1/2'), [r'(-1)^{n}\frac{\pi}{6}+\pi n', r'n\in\mathbb{Z}']);
    okHas(S('eq', 'cos(x)=1/2'), [r'\pm \frac{\pi}{3}+2\pi n']);
    okHas(S('eq', 'tg(2x)=1'), [r'\frac{\pi}{8}+\frac{\pi}{2}n']);
    okHas(S('eq', 'sin(x)=cos(x)'), [r'\frac{\pi}{4}+\pi n']);
    okHas(S('eq', 'sin(x)=2'), [r'\varnothing']);
    okHas(S('eq', 'sin(2x)=0'), [r'\frac{\pi}{2}n']);
    okHas(S('eq', '2sin(x)^2-3sin(x)+1=0'), [r'(-1)^{n}\frac{\pi}{6}', r'\frac{\pi}{2}+2\pi n']);
    okHas(S('eq', '2cos(x)^2+sin(x)-1=0'), [r'(-1)^{n+1}\frac{\pi}{6}']);
    okHas(S('eq', 'cos(x+pi/4)=-sqrt(2)/2'), [r'\pm \frac{3\pi}{4}']);
    okHas(S('eq', 'sin(x)=1/2', {}, null, true), [r'30^\circ', r'180^\circ n']);
  });

  test('бодож чадахгүйг үнэнээр хэлнэ', () {
    final s = S('eq', 'x^x=4');
    expect(s.ok, isFalse);
    expect((s.notes ?? []).join(' '), contains('бодож чадсангүй'));
    expect((s.approx ?? []).any((a) => a.contains(r'\approx 2')), isTrue);
    expect(s.answer, isEmpty);
    expect(S('eq', 'sin(x)=x/2+cos(3x)').ok, isFalse);
  });

  test('тэнцэтгэл биш: завсар', () {
    okHas(S('eq', '2x-1>3'), [r'\left(2;\ +\infty\right)']);
    okHas(S('eq', '-3x+2<=8'), [r'\left[-2;\ +\infty\right)']);
    okHas(S('eq', 'x^2-3x+2>0'), [r'\left(-\infty;\ 1\right)\cup \left(2;\ +\infty\right)']);
    okHas(S('eq', 'x^2-3x+2<=0'), [r'\left[1;\ 2\right]']);
    okHas(S('eq', 'x^2+1>0'), [r'\mathbb{R}']);
    okHas(S('eq', 'x^2+1<0'), [r'\varnothing']);
    okHas(S('eq', 'x^2-4x+4<=0'), [r'\left\{2\right\}']);
    okHas(S('eq', '(x-1)/(x+2)>0'), [r'\left(-\infty;\ -2\right)\cup \left(1;\ +\infty\right)']);
    okHas(S('eq', '(x-1)/(x+2)>=0'), [r'\left(-\infty;\ -2\right)\cup \left[1;\ +\infty\right)']);
    okHas(S('eq', '|x-2|<3'), [r'\left(-1;\ 5\right)']);
    okHas(S('eq', '|x-2|>=3'), [r'\left(-\infty;\ -1\right]\cup \left[5;\ +\infty\right)']);
    okHas(S('eq', 'sqrt(x+2)>x'), [r'\left[-2;\ 2\right)']);
    okHas(S('eq', '2^x>8'), [r'\left(3;\ +\infty\right)']);
    okHas(S('eq', 'log_2(x)<3'), [r'\left(0;\ 8\right)']);
    okHas(S('eq', 'x^2-2<0'), [r'\left(-\sqrt{2};\ \sqrt{2}\right)']);
    final nl = S('eq', '(x-1)/(x+2)>=0').numberLine;
    expect(nl, isNotNull);
    expect(nl!.points.map((p) => [p.label, p.filled]).toList(), [
      ['-2', false],
      ['1', true],
    ]);
    expect(nl.signs, ['+', '-', '+']);
    expect(stepHas(S('eq', '-2x>4'), 'эсрэгээр'), isTrue);
    expect(S('eq', 'sin(x)>0').ok, isFalse);
  });

  test('тооны шулуун вэбтэй ижил: зэргийн суурийн тэг (0) хасагдсан цэг', () {
    final a = S('eq', 'x^2>0');
    okHas(a, [r'\left(-\infty;\ 0\right)\cup \left(0;\ +\infty\right)']);
    expect(a.numberLine!.points.map((p) => [p.label, p.filled]).toList(), [
      ['0', false],
    ]);
    expect(a.numberLine!.signs, ['+', '+']);
    final b = S('eq', 'x^2-3x+2<=0');
    expect(b.numberLine!.points.map((p) => [p.label, p.filled]).toList(), [
      ['0', false],
      ['1', true],
      ['2', true],
    ]);
    expect(b.numberLine!.signs, ['+', '+', '-', '+']);
  });

  test('систем', () {
    okHas(S('sys', '2x+y=5\nx-y=1'), [r'\left(x;\ y\right) = \left(2;\ 1\right)']);
    okHas(S('sys', 'x+y+z=6; x-y+z=2; 2x+y-z=1'), [r'\left(1;\ 2;\ 3\right)']);
    okHas(S('sys', '3x-2y=1\n5x+4y=9'), [r'\left(1;\ 1\right)']);
    okHas(S('sys', 'x+y=2\n2x+2y=5'), [r'\varnothing']);
    final inf = S('sys', 'x+y=2\n2x+2y=4');
    expect(inf.ok && (inf.notes ?? []).join().contains('Төгсгөлгүй'), isTrue);
    okHas(S('sys', 'x+y=5\nxy=6'), [r'\left(2;\ 3\right)', r'\left(3;\ 2\right)']);
    okHas(S('sys', 'x^2+y^2=25\nx+y=7'), [r'\left(3;\ 4\right)', r'\left(4;\ 3\right)']);
    okHas(S('sys', 'y=x^2\ny=x+2'), [r'\left(-1;\ 1\right)', r'\left(2;\ 4\right)']);
    final cr = S('sys', '2x+y=5\nx-y=1');
    expect(stepHas(cr, 'Крамер') && stepHas(cr, 'Орлуулах'), isTrue);
    expect(note0(S('sys', 'x+y=1')), contains('2 тэгшитгэл'));
    okHas(S('eq', '2x+y=5\nx-y=1'), [r'\left(2;\ 1\right)']);
  });

  test('үржигдэхүүнд задлах', () {
    Solution f(String s) => S('alg', s, {}, 'factor');
    okHas(f('x^2-5x+6'), [r'\left(x-2\right)\left(x-3\right)']);
    okHas(f('x^2-9'), [r'\left(x-3\right)\left(x+3\right)']);
    okHas(f('4a^2-9b^2'), [r'\left(2a-3b\right)\left(2a+3b\right)']);
    okHas(f('x^3-8'), [r'\left(x-2\right)\left(x^{2}+2x+4\right)']);
    okHas(f('x^3+27y^3'), [r'\left(x+3y\right)\left(x^{2}-3xy+9y^{2}\right)']);
    okHas(f('2x^2+4x'), [r'2x\left(x+2\right)']);
    okHas(f('ax+ay+bx+by'), [r'\left(a+b\right)\left(x+y\right)']);
    okHas(f('x^4+4'), [r'\left(x^{2}+2x+2\right)\left(x^{2}-2x+2\right)']);
    okHas(f('x^3-x^2-x+1'), [r'\left(x+1\right)\left(x-1\right)^{2}']);
    okHas(f('x^2-5xy+6y^2'), [r'\left(x-2y\right)\left(x-3y\right)']);
    okHas(f('a^2+2ab+b^2-c^2'), [r'\left(a+b-c\right)\left(a+b+c\right)']);
    okHas(f('6x^2-x-2'), [r'\left(2x+1\right)\left(3x-2\right)']);
    final irr = f('x^2+1');
    expect(irr.ok && irr.steps.any((x) => x.tone == Tone.note), isTrue);
  });

  test('хаалт задлах, бутархай хураах, хуваах', () {
    okHas(S('alg', '(x+2)^2', {}, 'expand'), ['x^{2}+4x+4']);
    okHas(S('alg', '(2a-3b)^3', {}, 'expand'), ['8a^{3}-36a^{2}b+54ab^{2}-27b^{3}']);
    okHas(S('alg', '(x-1)(x+1)', {}, 'expand'), ['x^{2}-1']);
    okHas(S('alg', '(x^2-1)/(x^2+2x+1)', {}, 'frac'), [r'\frac{x-1}{x+1}']);
    okHas(S('alg', '(a^2-b^2)/(a+b)', {}, 'frac'), ['= a-b']);
    okHas(S('alg', 'x/(x+1)+1/(x+1)', {}, 'frac'), ['= 1']);
    okHas(S('alg', '(x^3-2x^2+4)/(x-3)', {}, 'div'), [r'x^{2}+x+3+\frac{13}{x-3}']);
    okHas(S('alg', '(2x^4+3x^2-1):(x^2+1)', {}, 'div'), [r'2x^{2}+1-\frac{2}{x^{2}+1}']);
    expect(note0(S('alg', 'x^2+1', {}, 'div')), contains('A/B'));
  });

  test('ХИЕХ, ХБЕХ, анхны үржвэр', () {
    final g = S('alg', '12, 18', {}, 'gcd');
    okHas(g, [r'\text{ХИЕХ}(12;\ 18) = 6', r'\text{ХБЕХ}(12;\ 18) = 36']);
    expect(stepHas(g, 'Евклид'), isTrue);
    okHas(S('alg', '24 36 60', {}, 'gcd'), ['= 12', '= 360']);
    okHas(S('alg', '360', {}, 'prime'), [r'360 = 2^{3}\cdot 3^{2}\cdot 5']);
    expect(note0(S('alg', '97', {}, 'prime')), contains('анхны тоо'));
    expect(note0(S('alg', '12', {}, 'gcd')), contains('Хоёр'));
    expect(note0(S('alg', 'abc', {}, 'prime')), contains('натурал'));
  });

  test('уламжлал', () {
    Solution d(String s, [Map<String, String> extra = const {}]) => S('an', s, extra, 'deriv');
    okHas(d('x sin x'), [r'\sin x+x \cos x']);
    okHas(d('x^3-2x^2+5'), ['3x^{2}-4x']);
    okHas(d('e^(x^2)'), ['2 x e^{x^{2}}']);
    okHas(d('ln(x^2+1)'), [r'\frac{2 x}{x^{2}+1}']);
    okHas(d('x/(x+1)'), [r'\frac{1}{\left(x+1\right)^{2}}']);
    okHas(d('x^3', {'order': '2'}), ["f''(x) = 6x"]);
    okHas(d('x^3-3x', {'at': '2'}), [r"f'\left(2\right) = 9"]);
    expect(stepHas(d('x sin x'), 'Үржвэрийн'), isTrue);
    expect(stepHas(d('sin(2x+1)'), 'Нийлмэл'), isTrue);
  });

  test('интеграл', () {
    Solution i(String s) => S('an', s, {}, 'int');
    okHas(i('x^2'), [r'\frac{1}{3}x^{3}+C']);
    okHas(i('1/x'), [r'\ln\left|x\right|+C']);
    okHas(i('sin(3x)'), [r'-\frac{1}{3} \cos\left(3 x\right)+C']);
    okHas(i('x e^x'), ['x e^{x}-e^{x}+C']);
    okHas(i('(2x+1)^5'), [r'\frac{1}{12}\left(2 x+1\right)^{6}+C']);
    okHas(i('1/(x^2+4)'), [r'\operatorname{arctg}']);
    okHas(i('sin(x)^2'), [r'\frac{1}{2} x-\frac{1}{4} \sin\left(2 x\right)+C']);
    expect(i('e^(x^2)').ok, isFalse);
    okHas(S('an', 'x^2', {'a': '0', 'b': '1'}, 'defint'), [r'= \frac{1}{3}']);
    okHas(S('an', 'sin x', {'a': '0', 'b': 'pi'}, 'defint'), ['= 2']);
    okHas(S('an', '1/x', {'a': '1', 'b': 'e'}, 'defint'), ['= 1']);
    final num = S('an', 'e^(x^2)', {'a': '0', 'b': '1'}, 'defint');
    expect(num.ok && ans(num).contains(r'\approx 1.46265175'), isTrue);
    expect(S('an', '1/x', {'a': '-1', 'b': '1'}, 'defint').ok, isFalse);
  });

  test('хязгаар', () {
    Solution l(String s, String to) => S('an', s, {'to': to}, 'lim');
    okHas(l('sin(x)/x', '0'), ['= 1']);
    okHas(l('(x^2-4)/(x-2)', '2'), ['= 4']);
    okHas(l('(2x^2+1)/(3x^2-x)', 'inf'), [r'= \frac{2}{3}']);
    okHas(l('(1+1/x)^x', 'inf'), ['= e']);
    okHas(l('(1-cos x)/x^2', '0'), [r'= \frac{1}{2}']);
    okHas(l('(e^x-1)/x', '0'), ['= 1']);
    okHas(l('1/x^2', '0'), [r'+\infty']);
    expect(note0(l('1/x', '0')), contains('оршихгүй'));
    expect(l('sin(1/x)', '0').ok, isFalse);
  });

  test('функцийн судалгаа', () {
    final s = S('an', 'x^3-3x', {}, 'study');
    okHas(s, [
      r'D(f) = \mathbb{R}',
      r'x_{\max} = -1,\ f_{\max} = 2',
      r'x_{\min} = 1,\ f_{\min} = -2',
      r'\text{сондгой функц}',
    ]);
    okHas(S('an', '(x^2+1)/x', {}, 'study'), [r'x = 0,\ y = x']);
    okHas(S('an', 'sqrt(x)', {}, 'study'), [r'D(f) = \left[0;\ +\infty\right)']);
  });

  test('прогресс ба комбинаторик', () {
    okHas(S('seq', '', {'a1': '2', 'd': '3', 'n': '10'}, 'arith'), ['a_{10} = 29', 'S_{10} = 155']);
    okHas(S('seq', '', {'b1': '3', 'q': '2', 'n': '5'}, 'geom'), ['b_{5} = 48', 'S_{5} = 93']);
    okHas(S('seq', '', {'b1': '1', 'q': '1/2', 'n': '4'}, 'geom'), ['S = 2']);
    okHas(S('seq', '', {'n': '5', 'k': '2'}, 'comb'), ['A_{5}^{2} = 20', 'C_{5}^{2} = 10', 'P_{5} = 120']);
    okHas(S('seq', '', {'m': '3', 'n': '6'}, 'prob'), [r'\frac{1}{2}']);
    okHas(S('seq', '', {'n': '3', 'k': '2', 'p': '1/2'}, 'bern'), [r'\frac{3}{8}']);
    expect(note0(S('seq', '', {'a1': '2', 'd': '3', 'n': '0'}, 'arith')), contains('натурал'));
    expect(note0(S('seq', '', {'a1': '', 'd': '3', 'n': '2'}, 'arith')), contains('оруулна уу'));
  });

  test('санамсаргүй олон гишүүнт: мэдэгдэж буй бүхэл язгуурууд яг олдоно', () {
    final r = rng(7);
    for (var t = 0; t < 60; t++) {
      final k = 1 + (r() * 4).floor();
      final roots = [for (var i = 0; i < k; i++) (r() * 13).floor() - 6];
      final lead = 1 + (r() * 3).floor();
      final src = '$lead*${roots.map((a) => '(x-($a))').join('*')}';
      final p = polyFrom(parseExpr(src))!;
      final res = solvePoly(p, [], quiet: true);
      final got = res.roots.map((x) => approx(x.x!)).toList();
      final want = (roots.toSet().toList()..sort()).map((e) => e.toDouble()).toList();
      expect(got, want, reason: src);
      expect(res.exact && res.complete, isTrue);
    }
  });

  test('санамсаргүй квадрат тэгшитгэл: хариу бүр тэгшитгэлийг хангана', () {
    final r = rng(11);
    for (var t = 0; t < 80; t++) {
      final a = 1 + (r() * 5).floor(), b = (r() * 21).floor() - 10, c = (r() * 21).floor() - 10;
      final src = '${a}x^2+($b)x+($c)=0';
      final sol = S('eq', src);
      expect(sol.ok, isTrue, reason: src);
      final d = b * b - 4 * a * c;
      final n = sol.answer[0].contains('varnothing') ? 0 : sol.answer.length;
      expect(n, d < 0 ? 0 : (d == 0 ? 1 : 2), reason: src);
    }
  });

  test('санамсаргүй шугаман систем: Крамер/Гаусс хариу яг', () {
    final r = rng(5);
    for (var t = 0; t < 40; t++) {
      final xs = [for (var i = 0; i < 3; i++) (r() * 11).floor() - 5];
      final rows = <String>[];
      for (var i = 0; i < 3; i++) {
        final c = [for (var j = 0; j < 3; j++) (r() * 9).floor() - 4];
        final rhs = c[0] * xs[0] + c[1] * xs[1] + c[2] * xs[2];
        rows.add('${c[0]}x+(${c[1]})y+(${c[2]})z=$rhs');
      }
      final sol = S('sys', rows.join('\n'));
      expect(sol.ok, isTrue, reason: rows.join(' | '));
      if ((sol.notes ?? []).join().contains('Төгсгөлгүй')) continue;
      okHas(sol, ['\\left(${xs.join(r';\ ')}\\right)']);
    }
  });

  test('санамсаргүй тэнцэтгэл биш: хариуны завсрыг цэг тус бүрээр шууд шалгана', () {
    final r = rng(3);
    const ops = [RelOp.lt, RelOp.gt, RelOp.le, RelOp.ge];
    final forms = <String Function()>[
      () => '(x-(${(r() * 9).floor() - 4}))*(x-(${(r() * 9).floor() - 4}))',
      () => '(x-(${(r() * 9).floor() - 4}))/(x-(${(r() * 9).floor() - 4}))',
      () => '|x-(${(r() * 9).floor() - 4})|-${(r() * 4).floor()}',
      () => '(x-(${(r() * 7).floor() - 3}))^2*(x-(${(r() * 7).floor() - 3}))/(x-(${(r() * 7).floor() - 3}))',
      () => 'x^3-${1 + (r() * 9).floor()}x',
    ];
    for (var t = 0; t < 120; t++) {
      final expr = forms[t % forms.length]();
      final op = ops[(r() * 4).floor()];
      final f = parseExpr(expr);
      final sa = signAnalysis(f, 'x', false);
      expect(sa, isNotNull, reason: expr);
      final pieces = piecesFrom(sa!, op);
      bool inPieces(double x) => pieces.any((p) {
        final lo = p.a?.v ?? double.negativeInfinity, hi = p.b?.v ?? double.infinity;
        final okLo = p.a == null || (p.aClosed ? x >= lo - 1e-12 : x > lo);
        final okHi = p.b == null || (p.bClosed ? x <= hi + 1e-12 : x < hi);
        return okLo && okHi;
      });
      final fn = compileExpr(f);
      bool test(double y) => switch (op) {
        RelOp.lt => y < 0,
        RelOp.gt => y > 0,
        RelOp.le => y <= 0,
        _ => y >= 0,
      };
      for (var k = -80; k <= 80; k++) {
        final x = k / 8 + 0.0137;
        final y = fn({'x': x});
        if (!y.isFinite) {
          expect(inPieces(x), isFalse, reason: '$expr $op 0, x=$x тодорхойгүй');
          continue;
        }
        expect(inPieces(x), test(y), reason: '$expr $op 0 at x=$x');
      }
      for (var xi = -6; xi <= 6; xi++) {
        final x = xi.toDouble();
        final y = fn({'x': x});
        if (!y.isFinite) {
          expect(inPieces(x), isFalse, reason: '$expr $op 0 тодорхойгүй x=$x');
          continue;
        }
        expect(inPieces(x), test(y.abs() < 1e-12 ? 0 : y), reason: '$expr $op 0 at x=$x');
      }
    }
  });

  test('санамсаргүй уламжлал ба интеграл: тоон тулгалт', () {
    const fs = [
      'x^2*sin(x)',
      'e^(3x)*cos(x)',
      'ln(x^2+1)/x',
      'sqrt(x^2+1)',
      '(x+1)/(x-2)',
      'x^3*e^(-x)',
      'sin(x)^3',
      'tan(2x)',
      '2^x*x',
    ];
    for (final s in fs) {
      expect(S('an', s, {}, 'deriv').ok, isTrue, reason: s);
    }
    const ints = [
      'x^3-2x',
      'e^(-2x)',
      'cos(4x+1)',
      '1/(2x+3)',
      'x cos x',
      'x^2 sin x',
      '1/((x-1)(x+2))',
      '(3x-1)^4',
      '1/sqrt(x+1)',
    ];
    for (final s in ints) {
      expect(S('an', s, {}, 'int').ok, isTrue, reason: s);
    }
  });

  test('графикт дамжуулах илэрхийлэл задлагдана', () {
    for (final (mode, input, sub) in const [
      ('eq', 'x^2-4x+3=0', null),
      ('eq', '(x-1)/(x+2)>0', null),
      ('an', 'x sin x', 'deriv'),
      ('an', 'x^2', 'int'),
    ]) {
      final sol = S(mode, input, {}, sub);
      expect(sol.graph != null && sol.graph!.isNotEmpty, isTrue, reason: '$input: graph');
      for (final g in sol.graph!) {
        expect(() => parseExpr(g), returnsNormally, reason: g);
      }
    }
  });

  group('автомат таних ба шууд бодолт (апп-ын ASCII оролт)', () {
    test('төрөл таних', () {
      expect(analyzeInput('x^2-5x+6=0').kind, InputKind.equation);
      expect(analyzeInput('2x-1>3').kind, InputKind.inequality);
      expect(analyzeInput('2x+y=5\nx-y=1').kind, InputKind.system);
      expect(analyzeInput('12, 18').kind, InputKind.intlist);
      expect(analyzeInput('y=x^2-1').kind, InputKind.function);
      expect(analyzeInput('x^2+y^2=25').kind, InputKind.implicit);
      expect(analyzeInput('2+3').primary, SolveAction.calc);
      expect(analyzeInput('x^2-9').primary, SolveAction.factor);
      expect(analyzeInput('(x+1)^2').primary, SolveAction.expand);
      expect(analyzeInput('sin(x)').primary, SolveAction.deriv);
    });

    test('дутуу оролт юу ч харуулахгүй, бүрэн оролт хариутай', () {
      expect(liveSolve('').status, LiveStatus.empty);
      expect(liveSolve('2+').status, LiveStatus.incomplete);
      expect(liveSolve('sqrt(x+').status, LiveStatus.incomplete);
      expect(liveSolve('|x-2').status, LiveStatus.incomplete);
      final d = liveSolve('x^2-5x+6=0');
      expect(d.status, LiveStatus.done);
      expect(nos(d.sol!.answer.join()), contains('x_{1}=2'));
      expect(liveSolve('x^2+y^2=25').status, LiveStatus.implicit);
      expect(liveSolve('sin(x)/x', action: SolveAction.lim).status, LiveStatus.need);
      final l = liveSolve('sin(x)/x', action: SolveAction.lim, params: {'to': '0'});
      expect(nos(l.sol!.answer.join()), contains('=1'));
      final id = liveSolve('sin(x)^2+cos(x)^2');
      expect(id.sol!.answer.single, endsWith('= 1'));
    });
  });
}
