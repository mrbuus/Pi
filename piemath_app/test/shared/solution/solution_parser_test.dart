import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/shared/solution/solution_parser.dart';

void main() {
  test('дугаартай алхам + тусдаа «Хариу» мөр', () {
    final p = parseSolution('1. Эхний алхам\n2. Хоёр дахь алхам\n3) Гурав\n\n**Хариу: E**');
    expect(p.steps.map((s) => s.number), [1, 2, 3]);
    expect(p.steps.map((s) => s.text), ['Эхний алхам', 'Хоёр дахь алхам', 'Гурав']);
    expect(p.answer, 'E');
    expect(p.hasNumbers, isTrue);
  });

  test('дугааргүй догол мөр бүр нэг алхам', () {
    final p = parseSolution('Эхний догол мөр.\n\nХоёр дахь\nмөрөөр үргэлжилнэ.\n\nГурав дахь.');
    expect(p.steps.length, 3);
    expect(p.steps[1].text, 'Хоёр дахь\nмөрөөр үргэлжилнэ.');
    expect(p.answer, isNull);
    expect(p.hasNumbers, isFalse);
  });

  test('дугаартай алхамын дараах догол мөр өмнөх алхамд хамаарна', () {
    final p = parseSolution('Оршил\n\n1. Алхам нэг\n\nЭнэ нь тайлбар үргэлжлэл\n2. Алхам хоёр');
    expect(p.steps.length, 3);
    expect(p.steps[0].number, isNull);
    expect(p.steps[1].text, 'Алхам нэг\n\nЭнэ нь тайлбар үргэлжлэл');
    expect(p.steps[2].number, 2);
  });

  test('«Хариу: x» энгийн ба тод хэлбэр, LaTeX хариу', () {
    expect(parseSolution('1. a\nХариу: \$x=3\$').answer, r'$x=3$');
    expect(parseSolution('1. a\n**Хариу:** B').answer, 'B');
    expect(parseSolution('1. a\n**Хариу:**\n\$\$\\frac{1}{2}\$\$').answer, r'$$\frac{1}{2}$$');
    expect(parseSolution('1. a\n**Хариу: E**').steps.length, 1);
  });

  test(r'$$ дотрох шинэ мөр, хоосон мөр, «1.» хуваагдахгүй', () {
    const src = '1. Тэгшитгэл:\n\$\$\nx + 1 = 2\n\n2. y\n\$\$\n2. Дараа нь\n**Хариу: 1**';
    final p = parseSolution(src);
    expect(p.steps.length, 2);
    expect(p.steps[0].text, contains('x + 1 = 2'));
    expect(p.steps[0].text, contains('2. y'));
    expect(p.steps[1].text, 'Дараа нь');
    expect(p.answer, '1');
  });

  test('аравтын бутархай дугаар биш, CRLF зөв', () {
    final p = parseSolution('2.5 дахин их\r\n\r\n1. Нэг\r\n2. Хоёр');
    expect(p.steps.length, 3);
    expect(p.steps.first.number, isNull);
    expect(p.steps.first.text, '2.5 дахин их');
  });

  test('хоосон / зөвхөн хариу', () {
    expect(parseSolution(null).isEmpty, isTrue);
    expect(parseSolution('  \n ').isEmpty, isTrue);
    final p = parseSolution('**Хариу: 5**');
    expect(p.steps, isEmpty);
    expect(p.answer, '5');
    expect(p.isEmpty, isFalse);
  });

  test('урт алхам эвхэгдэнэ, томьёо дундуур таслагдахгүй', () {
    final long = 'Эхний өгүүлбэр энд байна ${'ө' * 120}. Хоёр дахь өгүүлбэр нь илүү урт бөгөөд \$a. b\$ томьёог агуулсан үргэлжлэл болно.';
    final s = SolutionStep(text: long);
    expect(s.isLong, isTrue);
    expect(s.head.endsWith('.'), isTrue);
    expect('${s.head} ${s.rest}'.replaceAll(RegExp(r'\s+'), ' '), long.replaceAll(RegExp(r'\s+'), ' '));
    expect(const SolutionStep(text: 'Богино').isLong, isFalse);
    // Томьёоны доторх цэг алгасна: толгой нь \$ тэгш тоотой.
    final tricky = SolutionStep(text: '${'ү' * 150} \$a. b\$ ба дараах урт тайлбар үргэлжилсээр дуусна энд');
    expect(tricky.isLong, isFalse);
  });

  test('хайлт том/жижиг үсэг үл ялгана', () {
    expect(solutionMatches('Пифагорын теорем', 'пифагор'), isTrue);
    expect(solutionMatches('abc', ''), isFalse);
  });
}
