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

  testWidgets('параметрийг хөдөлгөөнт болгох: утга өөрчлөгдөж, дахин дарахад зогсоно', (tester) async {
    await pumpThemed(tester, const GraphScreen(initial: ['a*x']), size: const Size(360, 760));
    await tester.pump();
    final anim = find.byKey(const ValueKey('graph-anim-a'));
    await tester.scrollUntilVisible(anim, 120, scrollable: find.byType(Scrollable).last);
    double value() => tester.widget<Slider>(find.byType(Slider)).value;
    expect(value(), 1);
    await tester.tap(anim);
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(value(), greaterThan(1.5));
    expect(find.byTooltip('Хөдөлгөөнийг зогсоох'), findsOneWidget);
    await tester.tap(anim);
    await tester.pump();
    final stopped = value();
    await tester.pump(const Duration(milliseconds: 300));
    expect(value(), stopped);
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

  testWidgets('муж: x_max-ыг гарнаас бичнэ, буруу муж алдаа харуулна', (tester) async {
    await pumpThemed(tester, const GraphScreen(), size: const Size(360, 760));
    await tester.pump();
    final settings = find.byKey(const ValueKey('graph-settings'));
    await tester.scrollUntilVisible(settings, 120, scrollable: find.byType(Scrollable).last);
    await tester.ensureVisible(settings);
    await tester.pump();
    await tester.tap(settings);
    await tester.pump();
    final xmax = find.byKey(const ValueKey('graph-num-xMax'));
    await tester.scrollUntilVisible(xmax, 120, scrollable: find.byType(Scrollable).last);
    await tester.ensureVisible(xmax);
    await tester.pump();
    await tester.tap(xmax);
    await tester.pump();
    expect(find.byKey(const ValueKey('graph-num-editor')), findsOneWidget);
    expect(find.byKey(const ValueKey('func-keyboard')), findsOneWidget);
    expect(find.byType(EditableText), findsNothing);
    await press(tester, 'Цэвэрлэх');
    expect(find.text('Тоо бичнэ үү'), findsOneWidget);
    await press(tester, '1');
    await press(tester, '0');
    await press(tester, 'Болсон');
    expect(find.byKey(const ValueKey('graph-num-editor')), findsNothing);
    expect(find.text('10'), findsOneWidget, reason: 'x_max = 10');
    // x_max < x_min болгох оролдлого
    await tester.tap(find.byKey(const ValueKey('graph-num-xMax')));
    await tester.pump();
    await press(tester, 'Цэвэрлэх');
    await press(tester, 'Хасах');
    await press(tester, '9');
    await press(tester, '9');
    expect(find.text('Дээд утга доод утгаасаа их байх ёстой'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('шүргэгч: x0=1 дээр y=x^2-4x+3 → y=-2x+2', (tester) async {
    await pumpThemed(tester, const GraphScreen(), size: const Size(360, 760));
    await tester.pump();
    final tog = find.byKey(const ValueKey('graph-toggle-Шүргэгч'));
    await tester.scrollUntilVisible(tog, 120, scrollable: find.byType(Scrollable).last);
    await tester.ensureVisible(tog);
    await tester.pump();
    await tester.tap(tog);
    await tester.pump();
    expect(find.byKey(const ValueKey('graph-tangent-info')), findsOneWidget);
    expect(hasMath('y=-2x+2'), isTrue);
    expect(hasMath("k=f'(x_0)=-2"), isTrue);
  });

  testWidgets('талбай: ∫_0^2 (x^2-4x+3) dx = 2/3, a, b гараар', (tester) async {
    await pumpThemed(tester, const GraphScreen(), size: const Size(360, 760));
    await tester.pump();
    final tog = find.byKey(const ValueKey('graph-toggle-Интеграл, талбай'));
    await tester.scrollUntilVisible(tog, 120, scrollable: find.byType(Scrollable).last);
    await tester.ensureVisible(tog);
    await tester.pump();
    await tester.tap(tog);
    await tester.pump();
    expect(find.byKey(const ValueKey('graph-area-info')), findsOneWidget);
    expect(hasMath(r'\int_{0}^{2}'), isTrue);
    expect(hasMath(r'\frac{2}{3}'), isTrue);
    await tester.tap(find.byKey(const ValueKey('graph-num-areaB')));
    await tester.pump();
    await press(tester, 'Цэвэрлэх');
    await press(tester, '3');
    await press(tester, 'Болсон');
    expect(hasMath(r'\int_{0}^{3}'), isTrue);
    expect(hasMath('=0'), isTrue, reason: '∫_0^3 (x^2-4x+3) = 9-18+9 = 0');
    expect(tester.takeException(), isNull);
  });
}
