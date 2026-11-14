import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/shell/brand_intro.dart';
import 'package:piemath_app/core/ui/ui.dart';

/// Нээлтийн логоны анимац: дуусахад нэг л удаа [BrandIntro.onDone], товшвол алгасна, хөдөлгөөн
/// багасгах тохиргоонд шууд дуусна. (Зураг тестэд задрахгүй тул анимац [BrandIntro.loadTimeout]-оор эхэлнэ.)
void main() {
  Future<List<int>> pumpIntro(WidgetTester tester, {bool reduceMotion = false}) async {
    final calls = <int>[0];
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: reduceMotion),
          child: Center(child: BrandIntro(onDone: () => calls[0]++)),
        ),
      ),
    );
    return calls;
  }

  testWidgets('анимац дуусахад onDone нэг л удаа', (tester) async {
    final calls = await pumpIntro(tester);
    await tester.pump(BrandIntro.loadTimeout);
    await tester.pump(BrandIntro.duration ~/ 2);
    expect(calls[0], 0);
    await tester.pump(BrandIntro.duration);
    expect(calls[0], 1);
    await tester.pump(const Duration(seconds: 2));
    expect(calls[0], 1);
  });

  testWidgets('товшвол шууд алгасна', (tester) async {
    final calls = await pumpIntro(tester);
    await tester.pump(BrandIntro.loadTimeout);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.byType(BrandIntro));
    await tester.pump();
    expect(calls[0], 1);
    await tester.pump(BrandIntro.duration);
    expect(calls[0], 1);
  });

  testWidgets('хөдөлгөөн багасгах үед шууд бүтэн лого', (tester) async {
    final calls = await pumpIntro(tester, reduceMotion: true);
    await tester.pump();
    expect(calls[0], 1);
    await tester.pump(BrandIntro.duration);
    expect(calls[0], 1);
  });
}
