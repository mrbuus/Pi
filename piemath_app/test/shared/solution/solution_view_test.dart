import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/shared/solution/solution.dart';

import '../../helpers/pump.dart';

const _src = '1. Эхлээд тэгшитгэлийг бичнэ\n2. Пифагорын теоремоор тооцно\n3. Үр дүнг шалгана\n\n**Хариу: E**';

Finder _math(String s) => find.byWidgetPredicate((w) => w is MathText && w.source == s);

void main() {
  testWidgets('анхны алхам + «Дараагийн алхам», хариу эцэст нь', (tester) async {
    await pumpThemed(tester, const SingleChildScrollView(child: SolutionView(source: _src)));
    expect(_math('Эхлээд тэгшитгэлийг бичнэ'), findsOneWidget);
    expect(_math('Пифагорын теоремоор тооцно'), findsNothing);
    expect(find.text('Хариу: '), findsNothing);
    expect(find.text('Алхам 1 / 3'), findsOneWidget);

    await tester.tap(find.text('Дараагийн алхам'));
    await tester.pumpAndSettle();
    expect(_math('Пифагорын теоремоор тооцно'), findsOneWidget);
    expect(_math('Үр дүнг шалгана'), findsNothing);

    await tester.tap(find.text('Дараагийн алхам'));
    await tester.pumpAndSettle();
    expect(_math('Үр дүнг шалгана'), findsOneWidget);
    expect(find.text('Хариу: '), findsOneWidget);
    expect(_math('E'), findsOneWidget);
    expect(find.text('Дараагийн алхам'), findsNothing);
  });

  testWidgets('«Бүгдийг харах» бүгдийг нээнэ', (tester) async {
    await pumpThemed(tester, const SingleChildScrollView(child: SolutionView(source: _src)));
    await tester.tap(find.text('Бүгдийг харах'));
    await tester.pumpAndSettle();
    expect(_math('Үр дүнг шалгана'), findsOneWidget);
    expect(find.text('Хариу: '), findsOneWidget);
    expect(find.text('Бүгдийг харах'), findsNothing);
  });

  testWidgets('хоосон эх бичвэр юу ч зурахгүй', (tester) async {
    await pumpThemed(tester, const SolutionView(source: '  '));
    expect(find.byType(MathText), findsNothing);
    expect(find.text('Бодолт'), findsNothing);
  });

  testWidgets('урт алхам эвхэгдэж, «Дэлгэрэнгүй»-ээр дэлгэгдэнэ', (tester) async {
    final longText = 'Товч эхлэл энд байна. ${'Энэ бол нэлээд урт тайлбар үргэлжлэл. ' * 4}';
    await pumpThemed(tester, SingleChildScrollView(child: SolutionView(source: '1. $longText')));
    expect(_math('Товч эхлэл энд байна.'), findsOneWidget);
    expect(find.text('Дэлгэрэнгүй'), findsOneWidget);
    await tester.tap(find.text('Дэлгэрэнгүй'));
    await tester.pumpAndSettle();
    expect(_math(longText.trim()), findsOneWidget);
    expect(find.text('Хураах'), findsOneWidget);
    await tester.tap(find.text('Хураах'));
    await tester.pumpAndSettle();
    expect(find.text('Дэлгэрэнгүй'), findsOneWidget);
  });

  testWidgets('хайлт: таарсан алхмыг үзүүлж, таараагүйг нууна', (tester) async {
    await pumpThemed(tester, const SingleChildScrollView(child: SolutionView(source: _src)));
    await tester.tap(find.byTooltip('Алхмаас хайх'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'пифагор');
    await tester.pumpAndSettle();
    expect(_math('Пифагорын теоремоор тооцно'), findsOneWidget);
    expect(_math('Эхлээд тэгшитгэлийг бичнэ'), findsNothing);
    expect(find.text('Олдсон 1'), findsOneWidget);
    expect(find.text('Дараагийн алхам'), findsNothing);

    await tester.enterText(find.byType(TextField), 'яяя');
    await tester.pumpAndSettle();
    expect(find.text('Таарах алхам олдсонгүй'), findsOneWidget);

    await tester.tap(find.byTooltip('Хайлтыг хаах'));
    await tester.pumpAndSettle();
    expect(_math('Эхлээд тэгшитгэлийг бичнэ'), findsOneWidget);
    expect(_math('Пифагорын теоремоор тооцно'), findsNothing);
  });

  testWidgets('томьёоны чип товшвол callback дуудна, ≥48dp', (tester) async {
    SolutionFormulaRef? opened;
    await pumpThemed(
      tester,
      SingleChildScrollView(
        child: SolutionView(
          source: '1. Нэг',
          formulas: const [SolutionFormulaRef(slug: 'pythagoras', title: 'Пифагорын теорем')],
          onOpenFormula: (f) => opened = f,
        ),
      ),
    );
    final chip = find.ancestor(of: _math('Пифагорын теорем'), matching: find.byType(InkWell));
    expect(tester.getSize(chip).height, greaterThanOrEqualTo(48));
    await tester.tap(chip);
    expect(opened?.slug, 'pythagoras');
  });

  testWidgets('initiallyExpanded бүгдийг нээлттэй үзүүлнэ; эх сурвалж солигдвол дахин эхэлнэ', (tester) async {
    await pumpThemed(tester, const SingleChildScrollView(child: SolutionView(source: _src, initiallyExpanded: true)));
    expect(_math('Үр дүнг шалгана'), findsOneWidget);
    expect(find.text('Хариу: '), findsOneWidget);

    await pumpThemed(tester, const SingleChildScrollView(child: SolutionView(source: '1. Шинэ\n2. Хоёр')));
    await tester.pumpAndSettle();
    expect(_math('Шинэ'), findsOneWidget);
    expect(_math('Хоёр'), findsNothing);
  });

  testWidgets('хөдөлгөөн багасгахад шууд гарна', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(reduceMotion: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await pumpThemed(tester, const SingleChildScrollView(child: SolutionView(source: _src)));
    await tester.tap(find.text('Дараагийн алхам'));
    await tester.pump();
    expect(_math('Пифагорын теоремоор тооцно'), findsOneWidget);
    final tr = tester.widget<SizeTransition>(find.ancestor(of: _math('Пифагорын теоремоор тооцно'), matching: find.byType(SizeTransition)).first);
    expect(tr.sizeFactor.value, 1.0);
  });
}
