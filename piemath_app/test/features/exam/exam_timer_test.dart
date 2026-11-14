import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/exam/ui/widgets/exam_timer.dart';

Future<void> _pump(WidgetTester tester, ValueNotifier<int?> remaining) => tester.pumpWidget(
  MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: Center(child: ExamTimer(remaining: remaining))),
  ),
);

void main() {
  late List<String> haptics;

  setUp(() {
    haptics = [];
  });

  void mockHaptics(WidgetTester tester) {
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'HapticFeedback.vibrate') haptics.add(call.arguments as String);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
  }

  testWidgets('хугацаа null үед юу ч харуулахгүй', (tester) async {
    await _pump(tester, ValueNotifier<int?>(null));
    expect(find.byIcon(Icons.circle), findsNothing);
    expect(find.textContaining(':'), findsNothing);
  });

  testWidgets('товшоод нуух → товчоор буцаах', (tester) async {
    final r = ValueNotifier<int?>(1500);
    await _pump(tester, r);
    expect(find.text('25:00'), findsOneWidget);
    await tester.tap(find.text('25:00'));
    await tester.pump();
    expect(find.text('25:00'), findsNothing);
    expect(find.byTooltip('Хугацааг харуулах'), findsOneWidget);
    await tester.tap(find.byTooltip('Хугацааг харуулах'));
    await tester.pump();
    expect(find.text('25:00'), findsOneWidget);
  });

  testWidgets('нуусан таймер 5 минут үлдэхэд нэг удаа haptic-тай буцаж гарна', (tester) async {
    mockHaptics(tester);
    final r = ValueNotifier<int?>(1500);
    await _pump(tester, r);
    await tester.tap(find.text('25:00'));
    await tester.pump();

    r.value = 301;
    await tester.pump();
    expect(find.byTooltip('Хугацааг харуулах'), findsOneWidget);
    expect(haptics, isEmpty);

    r.value = 300;
    await tester.pump();
    expect(find.text('05:00'), findsOneWidget);
    expect(haptics, ['HapticFeedbackType.lightImpact']);

    r.value = 299;
    await tester.pump();
    expect(haptics, hasLength(1));
  });

  testWidgets('5 минутаас дотор нууж болохгүй', (tester) async {
    await _pump(tester, ValueNotifier<int?>(240));
    await tester.tap(find.text('04:00'));
    await tester.pump();
    expect(find.text('04:00'), findsOneWidget);
    expect(find.byTooltip('Хугацааг харуулах'), findsNothing);
  });

  testWidgets('сүүлийн минутад улаан биш (хүрээ, үсэг тодорно)', (tester) async {
    await _pump(tester, ValueNotifier<int?>(45));
    final ctx = tester.element(find.text('00:45'));
    final text = tester.widget<Text>(find.text('00:45'));
    expect(text.style?.color, isNot(Theme.of(ctx).colorScheme.error));
    expect(text.style?.fontWeight, FontWeight.w700);
  });

  testWidgets('дэлгэц уншигч: үлдсэн хугацаа, нуух үйлдэл', (tester) async {
    final handle = tester.ensureSemantics();
    await _pump(tester, ValueNotifier<int?>(1500));
    final node = tester.getSemantics(find.text('25:00'));
    expect(node.label, contains('Үлдсэн хугацаа 25 минут'));
    expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    handle.dispose();
  });
}
