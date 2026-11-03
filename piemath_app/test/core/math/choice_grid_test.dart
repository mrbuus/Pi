import 'dart:ui' show Tristate;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/choice_grid.dart';
import 'package:piemath_app/core/math/choice_layout.dart';
import 'package:piemath_app/core/ui/icons.dart';

import '../../helpers/fonts.dart';
import '../../helpers/pump.dart';
import 'math_test_helpers.dart';

List<ChoiceItem> _items(List<String> texts) => [
  for (var i = 0; i < texts.length; i++) ChoiceItem(label: String.fromCharCode(65 + i), text: texts[i]),
];

/// Нүдний semantics: «A хариулт» + агуулга (MathText) нэгдэнэ.
Finder _cell(String label, {bool correct = false}) =>
    find.bySemanticsLabel(RegExp(correct ? '^$label хариулт, зөв' : '^$label хариулт(?!, зөв)'));

RenderChoiceGrid _render(WidgetTester tester) => tester.renderObject<RenderChoiceGrid>(find.byType(ChoiceGridLayout));

void main() {
  // Хэмжилт бодит фонтын өргөнөөс хамаарна (тестийн анхдагч фонт тэмдэгт бүрийг 1em дөрвөлжин зурдаг).
  setUpAll(() async {
    await loadAppFonts();
    await loadKatexFonts();
  });

  group('choiceColumnOptions — вэбийн columnOptions', () {
    test('5 → 5, 3, 1 (2+2+1 хэлбэрийг алгасна)', () => expect(choiceColumnOptions(5), [5, 3, 1]));
    test('4 → 4, 2, 1 (3+1 өнчинг алгасна)', () => expect(choiceColumnOptions(4), [4, 2, 1]));
    test('6 → 6, 4, 3, 2, 1', () => expect(choiceColumnOptions(6), [6, 4, 3, 2, 1]));
    test('3 → 3, 1', () => expect(choiceColumnOptions(3), [3, 1]));
    test('2 → 2, 1', () => expect(choiceColumnOptions(2), [2, 1]));
    test('1, 0 → 1', () {
      expect(choiceColumnOptions(1), [1]);
      expect(choiceColumnOptions(0), [1]);
    });
    test('ямар ч n-д ганц өнчин мөр үүсэхгүй', () {
      for (var n = 2; n <= 8; n++) {
        for (final c in choiceColumnOptions(n)) {
          if (c == 1) continue;
          expect(n % c != 1, isTrue, reason: 'n=$n c=$c');
        }
      }
    });
  });

  group('pickChoiceColumns', () {
    test('5 багтвал 5', () => expect(pickChoiceColumns(count: 5, widest: 60, width: 360), 5));
    test('5 багтахгүй, 3 багтвал 3 (3+2)', () {
      expect(pickChoiceColumns(count: 5, widest: 100, width: 360), 3);
      expect(choiceRows(5, 3), [3, 2]);
    });
    test('3 ч багтахгүй бол 1', () => expect(pickChoiceColumns(count: 5, widest: 200, width: 360), 1));
    test('яг тэнцүү өргөн багтана (зай тооцно)', () {
      // 5 × 62.4 + 4 × 12 = 360
      expect(pickChoiceColumns(count: 5, widest: 62.4, width: 360), 5);
    });
    test('choiceRows', () {
      expect(choiceRows(5, 5), [5]);
      expect(choiceRows(6, 4), [4, 2]);
      expect(choiceRows(5, 1), [1, 1, 1, 1, 1]);
      expect(choiceRows(0, 3), isEmpty);
    });
  });

  group('ChoiceGrid widget', () {
    testWidgets('богино 5 хариу утсан дээр нэг мөрөнд, тэнцүү өргөнтэй', (tester) async {
      await pumpThemed(
        tester,
        Padding(
          padding: const EdgeInsets.all(16),
          child: ChoiceGrid(choices: _items(['1', '2', '3', '4', '5']), variant: ChoiceGridVariant.compact),
        ),
      );
      expect(_render(tester).columns, 5);
      final a = tester.getRect(_cell('A'));
      final e = tester.getRect(_cell('E'));
      expect(a.top, e.top);
    });

    testWidgets('урт хариу → 3 + 2', (tester) async {
      await pumpThemed(
        tester,
        Padding(
          padding: const EdgeInsets.all(16),
          child: ChoiceGrid(
            choices: _items([
              r'$\frac{3}{10}$',
              r'$\frac{1}{6}$',
              r'$\frac{2}{3}$',
              r'$\frac{1}{3}$',
              r'$\frac{4}{9}$',
            ]),
          ),
        ),
      );
      expect(_render(tester).columns, 3);
      final a = tester.getRect(_cell('A'));
      final d = tester.getRect(_cell('D'));
      final e = tester.getRect(_cell('E'));
      expect(d.top, greaterThan(a.top));
      expect(d.left, a.left);
      expect(e.top, d.top);
    });

    testWidgets('маш урт хариу → мөр бүрт нэг', (tester) async {
      await pumpThemed(
        tester,
        ChoiceGrid(choices: _items(List.filled(5, 'Энэ бол нэлээд урт хариулт, нэг мөрөнд хоёр багтахгүй'))),
      );
      expect(_render(tester).columns, 1);
    });

    testWidgets('таблетад урт хариу ч нэг мөрөнд багтаж болно', (tester) async {
      await pumpThemed(
        tester,
        ChoiceGrid(choices: _items([r'$\frac{3}{10}$ орчим', 'b орчим', 'c орчим', 'd орчим', 'e орчим'])),
        size: const Size(1024, 768),
      );
      expect(_render(tester).columns, 5);
    });

    testWidgets('сонгоход onSelect, сонгосон төлөв semantics-д', (tester) async {
      int? picked;
      await pumpThemed(
        tester,
        StatefulBuilder(
          builder: (context, setState) => ChoiceGrid(
            choices: _items(['1', '2', '3', '4', '5']),
            selectedIndex: picked,
            onSelect: (i) => setState(() => picked = i),
          ),
        ),
      );
      await tester.tap(_cell('C'));
      await tester.pump();
      expect(picked, 2);
      final sem = tester.getSemantics(_cell('C'));
      expect(sem.flagsCollection.isSelected, Tristate.isTrue);
      // Өнгөөс гадна шалгах тэмдэг.
      expect(find.byIcon(AppIcons.check), findsOneWidget);
    });

    testWidgets('onSelect байхгүй бол дарахад юу ч болохгүй (зөвхөн харах)', (tester) async {
      await pumpThemed(tester, ChoiceGrid(choices: _items(['1', '2']), selectedIndex: 0));
      await tester.tap(_cell('B'));
      await tester.pump();
      expect(tester.takeException(), isNull);
    });

    testWidgets('товч хэлбэрийн хүрэх талбай ≥ 44', (tester) async {
      await pumpThemed(tester, ChoiceGrid(choices: _items(['1', '2', '3', '4', '5']), onSelect: (_) {}));
      for (final l in ['A', 'B', 'C', 'D', 'E']) {
        final r = tester.getRect(_cell(l));
        expect(r.height, greaterThanOrEqualTo(44), reason: l);
        expect(r.width, greaterThanOrEqualTo(44), reason: l);
      }
    });

    testWidgets('багшид зөв хариу тэмдэглэгдэнэ (semantics «зөв»)', (tester) async {
      await pumpThemed(
        tester,
        const ChoiceGrid(
          choices: [
            ChoiceItem(label: 'A', text: '1'),
            ChoiceItem(label: 'B', text: '2', isCorrect: true),
          ],
          showCorrect: true,
          variant: ChoiceGridVariant.compact,
        ),
      );
      expect(_cell('B', correct: true), findsOneWidget);
      expect(_cell('A'), findsOneWidget);
    });

    testWidgets('сурагчид зөв хариу харагдахгүй (showCorrect=false)', (tester) async {
      await pumpThemed(
        tester,
        const ChoiceGrid(
          choices: [ChoiceItem(label: 'A', text: '1', isCorrect: true)],
        ),
      );
      expect(_cell('A', correct: true), findsNothing);
    });
  });
}
