import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart' as exam;
import 'package:piemath_app/features/test_authoring/domain/editor_model.dart';
import 'package:piemath_app/features/test_authoring/ui/authoring_widgets.dart';

import '../../helpers/fake_http.dart';
import 'authoring_fixtures.dart';

/// A–E үсгийн мөр бүрийн тоо (дээрээс доош).
List<int> _rowSizes(WidgetTester tester) {
  final ys = <double>[];
  for (final l in ['A', 'B', 'C', 'D', 'E']) {
    ys.add(tester.getTopLeft(find.text('$l.')).dy.roundToDouble());
  }
  final sizes = <int>[];
  double? last;
  for (final y in ys) {
    if (last != null && (y - last).abs() < 2) {
      sizes[sizes.length - 1]++;
    } else {
      sizes.add(1);
    }
    last = y;
  }
  return sizes;
}

void _expectOneOf(List<int> sizes, List<List<int>> allowed) =>
    expect(allowed.any((a) => listEquals(a, sizes)), isTrue, reason: 'мөрүүд: $sizes');

BlockContent _five(String Function(int i) text) => BlockContent(
  statement: r'$2\cdot x=10$',
  choices: [for (var i = 0; i < 5; i++) EditorChoice(text: text(i), isCorrect: i == 4)],
);

Future<void> _pump(WidgetTester tester, BlockContent content, {Size size = const Size(390, 844)}) => pumpAuthoring(
  tester,
  Scaffold(
    body: Padding(
      padding: const EdgeInsets.all(16),
      child: ProblemReadView(content: content),
    ),
  ),
  http: FakeHttp(),
  size: size,
);

void main() {
  test('A–E: 5 → нэг мөр, эсвэл 3+2; ганц хариу өнчин үлдэхгүй', () {
    expect(choiceColumnOptions(5), [5, 3, 1]);
    expect(choiceRows(5, 3), [3, 2]);
    for (final cols in choiceColumnOptions(5)) {
      final rows = choiceRows(5, cols);
      expect(rows.length == 1 || rows.last >= 2 || cols == 1, isTrue, reason: '$rows');
    }
  });

  testWidgets('богино хариу, өргөн дэлгэц (таблет) — нэг мөрөнд 5', (tester) async {
    await _pump(tester, _five((i) => '\$${i + 1}\$'), size: const Size(820, 1180));
    expect(_rowSizes(tester), [5]);
  });

  testWidgets('утсан дээр — 5 эсвэл 3+2, өнчингүй', (tester) async {
    await _pump(tester, _five((i) => '\$${i + 1}\$'));
    _expectOneOf(_rowSizes(tester), const [
      [5],
      [3, 2],
    ]);
  });

  testWidgets('урт хариу — 3+2 (эсвэл мөр бүрт нэг), өнчингүй', (tester) async {
    await _pump(tester, _five((i) => 'Тэгшитгэлийн их шийд нь \$x=${i + 10}\$'));
    final sizes = _rowSizes(tester);
    _expectOneOf(sizes, const [
      [3, 2],
      [1, 1, 1, 1, 1],
    ]);
  });

  test('багшид үсэг + зөв хариу; сурагчид дугаар, түлхүүргүй', () {
    final c = _five((i) => '$i');
    final teacher = teacherChoiceItems(c, (_) => const AssetImage('x'));
    expect(teacher.map((t) => t.label), ['A', 'B', 'C', 'D', 'E']);
    expect(teacher.last.isCorrect, isTrue);
    final student = studentProblemOf(c, points: 3);
    expect(student.choiceMode, exam.ChoiceMode.text);
    expect(student.choices, ['0', '1', '2', '3', '4']);
    expect(student.points, 3);
    expect(student.isChoice, isTrue);
  });
}
