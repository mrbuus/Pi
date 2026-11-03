// График: гарнаас функц бичих, онцгой цэг тодруулах, тохиргоо нээх, параметрийн гулсуур.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/features/tools/graph/ui/graph_screen.dart';
import 'package:piemath_app/features/tools/ui/tools_hub_screen.dart';

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

  testWidgets('жагсаалтад График, Бодогч, Томьёо', (tester) async {
    await pumpThemed(tester, const ToolsHubScreen());
    expect(find.text('График'), findsOneWidget);
    expect(find.text('Бодогч'), findsOneWidget);
    expect(find.text('Томьёо'), findsOneWidget);
  });

  testWidgets('анхдагч функц, онцгой цэг дээр дарвал тодорно (360dp)', (tester) async {
    await pumpThemed(tester, const GraphScreen(), size: const Size(360, 760));
    await tester.pump();
    expect(find.byKey(const ValueKey('graph-canvas')), findsOneWidget);
    expect(hasMath('x^{2}-4x+3'), isTrue);
    // Системийн гар хэзээ ч үгүй
    expect(find.byType(EditableText), findsNothing);
    final first = find.byKey(const ValueKey('graph-special-0'));
    await tester.scrollUntilVisible(first, 120, scrollable: find.byType(Scrollable).last);
    expect(first, findsOneWidget);
    // x^2-4x+3: тэг 1, 3 — (1; 0) жагсаалтад бий
    expect(hasMath(r'\left(1;\ 0\right)'), isTrue);
    await tester.tap(first);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('гарнаас шинэ функц бичнэ, системийн гар гарахгүй', (tester) async {
    await pumpThemed(tester, const GraphScreen(), size: const Size(360, 760));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('graph-add')));
    await tester.pump();
    expect(find.byKey(const ValueKey('func-keyboard')), findsOneWidget);
    expect(find.byKey(const ValueKey('graph-editor')), findsOneWidget);
    await press(tester, 'x');
    await press(tester, 'Квадрат');
    await press(tester, 'Хасах');
    await press(tester, '1');
    expect(hasMath('x^{2}-1'), isTrue, reason: 'бичиж буй мөрийн урьдчилсан харагдац');
    await press(tester, 'Болсон');
    expect(find.byKey(const ValueKey('func-keyboard')), findsNothing);
    expect(find.byKey(const ValueKey('graph-line-1')), findsOneWidget);
    expect(hasMath('y=x^{2}-1'), isTrue);
    expect(find.byType(EditableText), findsNothing);
  });

  testWidgets('параметр a гулсуураар; дутуу оролтод алдаа харуулахгүй', (tester) async {
    await pumpThemed(tester, const GraphScreen(initial: ['']), size: const Size(360, 760));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('graph-line-0')));
    await tester.pump();
    await press(tester, 'Функцийн гар');
    await press(tester, 'a');
    await press(tester, 'Тооны гар');
    await press(tester, 'Үржих');
    expect(find.text('Илэрхийллийг бүрэн ойлгосонгүй'), findsNothing);
    await press(tester, 'x');
    await press(tester, 'Болсон');
    expect(find.byKey(const ValueKey('graph-param-a')), findsOneWidget);
    await tester.drag(find.byType(Slider), const Offset(40, 0));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('тохиргоо нуугдмал, нээхэд тор/градус гарна; чирж томруулна', (tester) async {
    await pumpThemed(tester, const GraphScreen(), size: const Size(360, 760));
    await tester.pump();
    expect(find.byKey(const ValueKey('graph-toggle-Тор')), findsNothing);
    final settings = find.byKey(const ValueKey('graph-settings'));
    await tester.scrollUntilVisible(settings, 120, scrollable: find.byType(Scrollable).last);
    await tester.tap(settings);
    await tester.pump();
    expect(find.byKey(const ValueKey('graph-toggle-Тор')), findsOneWidget);
    await tester.drag(find.byKey(const ValueKey('graph-canvas')), const Offset(60, -30));
    await tester.pump();
    await tester.tap(find.byTooltip('Томруулах'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('graph-reset')));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}
