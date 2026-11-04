@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';

import '../helpers/fonts.dart';
import '../helpers/pump.dart';

/// Дизайны системийн үзүүлэн — өнгө, фонт, карт, Meta, товч, төлөв.
class _Showcase extends StatelessWidget {
  const _Showcase();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        const BrandMark(),
        const SizedBox(height: AppSpace.lg),
        const PageHeader(title: 'Өнөөдрийн хичээл', subtitle: Meta(items: ['Даваа', '11-р сарын 2'])),
        Text('1 250', style: context.text.displayMedium),
        const SectionHeader(title: 'Миний анги', trailing: InfoHint(title: 'Тайлбар', message: 'Жишээ')),
        AppCard(
          accent: context.colors.brandBright,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('12-р анги, Үдээс хойш', style: context.text.titleMedium),
              const SizedBox(height: AppSpace.xs),
              const MetaTitle('100x100 V3 · Логарифм · Тест 3'),
              const SizedBox(height: AppSpace.xs),
              const Meta(items: ['501', 'Ө. Батболд', '15:00–17:00']),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.md),
        Row(
          children: [
            Icon(AppIcons.success, color: context.colors.success),
            const SizedBox(width: AppSpace.sm),
            const Text('Ирсэн'),
            const SizedBox(width: AppSpace.lg),
            Icon(AppIcons.warning, color: context.colors.warning),
            const SizedBox(width: AppSpace.sm),
            const Text('Хоцорсон'),
            const SizedBox(width: AppSpace.lg),
            Icon(AppIcons.failure, color: context.colors.error),
            const SizedBox(width: AppSpace.sm),
            const Text('Тасалсан'),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        FilledButton(onPressed: () {}, child: const Text('Шалгалт эхлүүлэх')),
        const SizedBox(height: AppSpace.sm),
        OutlinedButton(onPressed: () {}, child: const Text('Хуваарь харах')),
        const SizedBox(height: AppSpace.lg),
        const TextField(decoration: InputDecoration(labelText: 'Утасны дугаар')),
        const SizedBox(height: AppSpace.lg),
        const SkeletonCard(),
        const SizedBox(height: AppSpace.lg),
        const ConnectionBanner(offline: true),
      ],
    );
  }
}

void main() {
  setUpAll(loadAppFonts);

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';
    testWidgets('дизайны систем ($mode)', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      await pumpThemed(tester, const _Showcase(), dark: dark, size: const Size(390, 1100));
      await precacheImages(tester);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('design_system_$mode.png'));
    });

    testWidgets('алдаа ба хоосон төлөв ($mode)', (tester) async {
      await pumpThemed(
        tester,
        Column(
          children: [
            Expanded(child: ErrorState(message: AppStrings.networkError, onRetry: () {})),
            const Divider(),
            const Expanded(
              child: EmptyState(title: 'Мэдэгдэл алга', message: 'Шинэ мэдэгдэл ирэхэд энд харагдана'),
            ),
          ],
        ),
        dark: dark,
        size: const Size(390, 700),
      );
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('states_$mode.png'));
    });
  }
}
