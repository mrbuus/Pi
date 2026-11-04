import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/math/math.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/ui/ui.dart';
import 'books_common.dart';

/// `GET /placement/test` — нийтийн мэдээлэл (хариуны түлхүүргүй).
class PlacementInfo {
  const PlacementInfo({
    required this.title,
    required this.minutes,
    required this.problemCount,
    required this.instructions,
  });

  factory PlacementInfo.fromJson(Map<String, Object?> j) => PlacementInfo(
    title: j['title'] as String? ?? 'Түвшин шалгах тест',
    minutes: (j['minutes'] as num?)?.toInt() ?? 0,
    problemCount: (j['problems'] as List?)?.length ?? 0,
    instructions: [
      for (final l in (j['instructions'] as String? ?? '').split('\n'))
        if (l.trim().isNotEmpty) l.trim(),
    ],
  );

  final String title;
  final int minutes;
  final int problemCount;
  final List<String> instructions;
}

final placementInfoProvider = FutureProvider.autoDispose<PlacementInfo>((ref) {
  return ref
      .read(apiClientProvider)
      .get('/placement/test', auth: false, parse: (j) => PlacementInfo.fromJson((j! as Map).cast<String, Object?>()));
});

/// Түвшин тогтоох шалгалт (`/placement`, нэвтрэлтгүй).
///
/// Апп-д: шалгалтын мэдээлэл, заавар. Шалгалт өгөх урсгал (хугацаатай тест + бодолтын зураг
/// илгээх, зочны түлхүүр) том тул одоогоор вэбээр — PARITY.md-д `↗`.
class PlacementScreen extends ConsumerWidget {
  const PlacementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(placementInfoProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Түвшин тогтоох шалгалт')),
      body: async.when(
        loading: () => const LoadingState(cards: 1),
        error: (e, _) => publicError(e, onRetry: () => ref.invalidate(placementInfoProvider)),
        data: (p) => ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
          children: [
            Text(
              'Цагтай тест бодоод бодолтын зургаа илгээ, багш түвшинг чинь тогтоож холбогдоно',
              style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
            ),
            const SizedBox(height: AppSpace.lg),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p.title, style: context.text.titleMedium),
                  const SizedBox(height: AppSpace.xs),
                  Meta(items: ['${p.problemCount} бодлого', if (p.minutes > 0) '${p.minutes} минут']),
                  if (p.instructions.isNotEmpty) ...[
                    const SizedBox(height: AppSpace.md),
                    for (final line in p.instructions) ...[
                      MathText(line, style: context.text.bodyMedium),
                      const SizedBox(height: AppSpace.xs),
                    ],
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpace.xl),
            FilledButton.icon(
              icon: const Icon(AppIcons.forward, size: 18),
              label: const Text('Вэбээр шалгалт өгөх'),
              onPressed: () => openWeb('/placement'),
            ),
          ],
        ),
      ),
    );
  }
}
