import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/perf/perf_tier.dart';
import 'package:piemath_app/core/ui/ui.dart';

import '../../helpers/pump.dart';

double _scaleOf(WidgetTester tester) {
  final t = tester.widget<ScaleTransition>(
    find.descendant(of: find.byType(PressableScale), matching: find.byType(ScaleTransition)),
  );
  return t.scale.value;
}

void main() {
  tearDown(() => DevicePerf.tier = PerfTier.high);

  testWidgets('PressableScale: дарахад 0.97 руу, суллахад буцна', (tester) async {
    await pumpThemed(
      tester,
      const Center(
        child: PressableScale(child: SizedBox.square(dimension: 80, child: Text('x'))),
      ),
    );
    final g = await tester.startGesture(tester.getCenter(find.byType(PressableScale)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(_scaleOf(tester), closeTo(0.97, 0.005));
    await g.up();
    await tester.pumpAndSettle();
    expect(_scaleOf(tester), closeTo(1, 0.001));
  });

  testWidgets('PressableScale: хөдөлгөөн багасгах горимд scale хийхгүй', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await pumpThemed(
      tester,
      const Center(
        child: PressableScale(child: SizedBox.square(dimension: 80, child: Text('x'))),
      ),
    );
    final g = await tester.startGesture(tester.getCenter(find.byType(PressableScale)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(_scaleOf(tester), 1);
    await g.up();
  });

  testWidgets('staggerIn: эхний 8 мөр л хөдөлнө', (tester) async {
    await pumpThemed(
      tester,
      ListView.builder(itemCount: 12, itemBuilder: (_, i) => staggerIn(i, SizedBox(height: 20, child: Text('$i')))),
    );
    final fades = find.descendant(of: find.byType(StaggerIn), matching: find.byType(FadeTransition));
    expect(fades, findsNWidgets(8));
    await tester.pumpAndSettle();
    expect(find.text('11'), findsOneWidget);
  });

  testWidgets('staggerIn: сул төхөөрөмжид хөдөлгөөнгүй', (tester) async {
    DevicePerf.tier = PerfTier.low;
    await pumpThemed(tester, Column(children: [for (var i = 0; i < 3; i++) staggerIn(i, Text('$i'))]));
    expect(find.descendant(of: find.byType(StaggerIn), matching: find.byType(FadeTransition)), findsNothing);
  });

  testWidgets('SuccessCheck зурагдаж дуусна', (tester) async {
    await pumpThemed(tester, const Center(child: SuccessCheck(haptic: false)));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Амжилттай'), findsOneWidget);
  });

  testWidgets('FadeInOnce: дууссаны дараа opacity давхаргагүй', (tester) async {
    await pumpThemed(tester, const FadeInOnce(child: Text('a')));
    expect(find.descendant(of: find.byType(FadeInOnce), matching: find.byType(FadeTransition)), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.descendant(of: find.byType(FadeInOnce), matching: find.byType(FadeTransition)), findsNothing);
  });

  test('Хуудасны шилжилт түвшнээр', () {
    final high = AppPageTransitions.theme(PerfTier.high).builders[TargetPlatform.android];
    final low = AppPageTransitions.theme(PerfTier.low).builders[TargetPlatform.android];
    expect(high, isA<SharedAxisPageTransitionsBuilder>());
    expect(low, isA<SlidePageTransitionsBuilder>());
    expect(AppTheme.light().pageTransitionsTheme.builders[TargetPlatform.android], isNotNull);
  });

  testWidgets('Shared-axis шилжилтээр хуудас нээгдэж, буцна', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () =>
                Navigator.of(context)
                    .push(MaterialPageRoute<void>(builder: (_) => const Scaffold(body: Text('дэлгэрэнгүй')))),
            child: const Text('нээх'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('нээх'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('дэлгэрэнгүй'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('нээх'), findsNothing);
    Navigator.of(tester.element(find.text('дэлгэрэнгүй'))).pop();
    await tester.pumpAndSettle();
    expect(find.text('нээх'), findsOneWidget);
  });

  testWidgets('SkeletonPulse: 300ms-ээс өмнө зурахгүй, дараа нь лугшина', (tester) async {
    await pumpThemed(tester, const SkeletonPulse(child: SkeletonLine(width: 100)));
    expect(find.bySemanticsLabel('Ачаалж байна'), findsOneWidget);
    expect(find.byType(Opacity), findsNothing);
    expect(find.descendant(of: find.byType(SkeletonPulse), matching: find.byType(FadeTransition)), findsNothing);
    await tester.pump(const Duration(milliseconds: 400));
    expect(tester.hasRunningAnimations, isTrue);
    expect(tester.getSize(find.byType(SkeletonBox)), const Size(100, 14));
  });
}
