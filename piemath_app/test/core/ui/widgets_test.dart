import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';

import '../../helpers/pump.dart';

void main() {
  group('Meta', () {
    test('хоосон зүйлийг алгасна', () {
      expect(Meta.visible(['А', null, '', '  ', 'Б']), ['А', 'Б']);
    });

    testWidgets('зүйл бүрийн хооронд нэг Dot', (tester) async {
      await pumpThemed(tester, const Meta(items: ['501', null, 'Багш', '15:00']));
      expect(find.text('501'), findsOneWidget);
      expect(find.text('15:00'), findsOneWidget);
      expect(find.byType(Dot), findsNWidgets(2));
    });

    testWidgets('бүгд хоосон бол юу ч зурахгүй', (tester) async {
      await pumpThemed(tester, const Meta(items: [null, '']));
      expect(find.byType(Wrap), findsNothing);
    });
  });

  group('MetaTitle', () {
    test('зөвхөн зайтай дунд цэгээр задлана', () {
      expect(MetaTitle.split('Интеграл · Тест 1-A'), ['Интеграл', 'Тест 1-A']);
      expect(MetaTitle.split('а.б·в'), ['а.б·в']);
    });

    testWidgets('глифийг Dot-оор солино', (tester) async {
      await pumpThemed(tester, const MetaTitle('100x100 V2 · Логарифм 3'));
      expect(find.text('100x100 V2'), findsOneWidget);
      expect(find.text('Логарифм 3'), findsOneWidget);
      expect(find.byType(Dot), findsOneWidget);
    });
  });

  group('Төлөв', () {
    testWidgets('ErrorState: «Дахин оролдох» дуудна', (tester) async {
      var tapped = 0;
      await pumpThemed(tester, ErrorState(onRetry: () => tapped++));
      expect(find.text(AppStrings.genericError), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      expect(tapped, 1);
    });

    testWidgets('ErrorState: onRetry байхгүй бол товчгүй', (tester) async {
      await pumpThemed(tester, const ErrorState());
      expect(find.text(AppStrings.retry), findsNothing);
    });

    testWidgets('EmptyState: гарчиг, тайлбар, товч', (tester) async {
      await pumpThemed(
        tester,
        EmptyState(
          title: 'Даалгавар алга',
          message: 'Багш даалгавар өгөхөөр энд харагдана',
          action: TextButton(onPressed: () {}, child: const Text('Шинэчлэх')),
        ),
      );
      expect(find.text('Даалгавар алга'), findsOneWidget);
      expect(find.text('Шинэчлэх'), findsOneWidget);
    });

    testWidgets('LoadingState: skeleton карт, дэлгэц уншигчид «Ачаалж байна»', (tester) async {
      await pumpThemed(tester, const LoadingState(cards: 2));
      expect(find.byType(SkeletonCard), findsNWidgets(2));
      expect(find.bySemanticsLabel('Ачаалж байна'), findsOneWidget);
    });

    testWidgets('LoadingState: анимац унтраасан үед хөдөлгөөнгүй', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      await pumpThemed(tester, const LoadingState());
      final fade = tester.widget<FadeTransition>(
        find.descendant(of: find.byType(SkeletonPulse), matching: find.byType(FadeTransition)),
      );
      expect(fade.opacity.value, 1);
      await tester.pump(const Duration(milliseconds: 450));
      expect(fade.opacity.value, 1);
    });
  });

  group('ConnectionBanner', () {
    testWidgets('офлайн үед мессеж харагдана', (tester) async {
      await pumpThemed(tester, const Align(alignment: Alignment.bottomCenter, child: ConnectionBanner(offline: true)));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.offlineBanner), findsOneWidget);
    });

    testWidgets('онлайн үед нуугдана', (tester) async {
      await pumpThemed(tester, const ConnectionBanner(offline: false));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.offlineBanner), findsNothing);
    });
  });

  group('AppCard', () {
    testWidgets('дарахад onTap, хүрэх талбай ≥ 44', (tester) async {
      var tapped = false;
      await pumpThemed(
        tester,
        Center(child: AppCard(onTap: () => tapped = true, child: const Text('Карт'))),
      );
      await tester.tap(find.text('Карт'));
      expect(tapped, isTrue);
      expect(tester.getSize(find.byType(AppCard)).height, greaterThanOrEqualTo(44));
    });
  });

  testWidgets('товчнууд хүрэх талбайн гэрээг хангана', (tester) async {
    await pumpThemed(
      tester,
      Column(
        children: [
          FilledButton(onPressed: () {}, child: const Text('Нэвтрэх')),
          TextButton(onPressed: () {}, child: const Text('Мартсан')),
          IconButton(onPressed: () {}, icon: const Icon(AppIcons.close), tooltip: AppStrings.close),
        ],
      ),
    );
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
  });
}
