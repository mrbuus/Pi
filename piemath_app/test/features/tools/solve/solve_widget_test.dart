// Бодогч: гарнаас бичих зуур хариу гарна, үйлдэл солих, жишээ, бусад тооцоо.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/features/tools/solve/ui/solve_screen.dart';
import 'package:piemath_app/shared/solution/solution.dart';

import '../../../core/math/math_test_helpers.dart';
import '../../../helpers/pump.dart';

String _ns(String s) => s.replaceAll(' ', '');

/// Хоосон зайг үл тооцон LaTeX хайна.
bool hasMath(String needle) =>
    find.byType(MathText).evaluate().any((e) => _ns((e.widget as MathText).source).contains(_ns(needle)));

Future<void> press(WidgetTester t, String say) async {
  await t.tap(find.byKey(ValueKey('fkey-$say')));
  await t.pump();
}

void main() {
  setUpAll(loadKatexFonts);

  testWidgets('бичих зуур квадрат тэгшитгэл бодогдоно, алхам SolutionView-д (360dp)', (tester) async {
    await pumpThemed(tester, const SolveScreen(), size: const Size(360, 760));
    await tester.pump();
    expect(find.byKey(const ValueKey('func-keyboard')), findsOneWidget);
    expect(find.byType(EditableText), findsNothing);
    for (final k in ['x', 'Квадрат', 'Хасах', '5', 'x', 'Нэмэх', '6']) {
      await press(tester, k);
    }
    // дутуу биш боловч «=» байхгүй: илэрхийлэл → задлах
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const ValueKey('solve-action-factor')), findsOneWidget);
    await press(tester, 'Тэнцүү');
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const ValueKey('solve-result')), findsNothing, reason: 'дутуу оролтод хариу харуулахгүй');
    await press(tester, '0');
    await tester.pump(const Duration(milliseconds: 300));
    await press(tester, 'Бодох');
    expect(find.byKey(const ValueKey('func-keyboard')), findsNothing);
    expect(find.byKey(const ValueKey('solve-result')), findsOneWidget);
    expect(hasMath('x_{1} = 2'), isTrue);
    expect(find.text('Квадрат тэгшитгэл'), findsOneWidget);
    expect(find.byType(SolutionView), findsOneWidget);
  });

  testWidgets('жишээ дарвал бодно; үйлдэл солиход хариу шинэчлэгдэнэ', (tester) async {
    await pumpThemed(tester, const SolveScreen(), size: const Size(360, 760));
    await tester.pump();
    // x^3-8 — жишээний 9 дэх
    final ex = find.byKey(const ValueKey('solve-example-8'));
    await tester.scrollUntilVisible(ex, 100, scrollable: find.byType(Scrollable).first);
    await tester.tap(ex);
    await tester.pump();
    expect(hasMath(r'\left(x-2\right)\left(x^{2}+2x+4\right)'), isTrue);
    await tester.tap(find.byKey(const ValueKey('solve-action-deriv')));
    await tester.pump();
    expect(hasMath('3x^{2}'), isTrue);
  });

  testWidgets('бусад тооцоо: хоосон талбарт монгол мессеж', (tester) async {
    await pumpThemed(tester, const SolveScreen(initial: '2+3'), size: const Size(360, 760));
    await tester.pump();
    final other = find.byKey(const ValueKey('solve-other'));
    await tester.scrollUntilVisible(other, 100, scrollable: find.byType(Scrollable).first);
    await tester.tap(other);
    await tester.pump();
    final run = find.byKey(const ValueKey('solve-seq-run'));
    await tester.scrollUntilVisible(run, 100, scrollable: find.byType(Scrollable).first);
    await tester.tap(run);
    await tester.pump();
    expect(hasMath('оруулна уу'), isTrue);
  });
}
