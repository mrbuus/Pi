import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error.dart';
import '../../core/network/network_providers.dart';
import '../../core/time/ub_time.dart';
import '../../core/ui/ui.dart';
import 'paid_until.dart';

/// Өнөөдөр (UB) — тестэд override.
final paymentTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// `GET /tuition/paid-until/my` ([studentId] null) эсвэл `/tuition/paid-until/:studentId`
/// (эцэг эх — баталгаажсан хүүхэд, ангийн багш). Хариу `{ paidUntil: ISO | null }`.
final paidUntilProvider = FutureProvider.autoDispose.family<String?, String?>((ref, studentId) {
  final path = studentId == null ? '/tuition/paid-until/my' : '/tuition/paid-until/${Uri.encodeComponent(studentId)}';
  return ref.read(apiClientProvider).get(path, parse: (j) => (j! as Map)['paidUntil'] as String?);
});

/// «Хэдий хүртэл төлсөн» карт (вэбийн `PaidUntilCard`). Өнгө + дүрс + үгээр төлөв.
/// Сурагч, эцэг эх, багш бүгд энэ виджетийг ашиглана.
class PaidUntilCard extends ConsumerWidget {
  const PaidUntilCard({super.key, this.studentId, this.compact = false, this.studentName});

  final String? studentId;
  final bool compact;

  /// Өгвөл гарчиг «<Нэр>: төлбөрийн хугацаа».
  final String? studentName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(paidUntilProvider(studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const SkeletonPulse(child: SkeletonCard(lines: 1)),
      error: (e, _) => AppCard(
        child: Row(
          children: [
            Icon(AppIcons.error, color: context.colors.error),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Text(
                e is ApiError ? e.message : AppStrings.genericError,
                style: context.text.bodyMedium,
              ),
            ),
            TextButton(
              onPressed: () => ref.invalidate(paidUntilProvider(studentId)),
              child: const Text(AppStrings.retry),
            ),
          ],
        ),
      ),
      data: (iso) => _PaidUntilBody(
        view: PaidUntilView.of(iso, today: ref.watch(paymentTodayProvider)),
        compact: compact,
        title: studentName == null ? 'Хэдий хүртэл төлсөн' : '$studentName: төлбөрийн хугацаа',
      ),
    );
  }
}

class _PaidUntilBody extends StatelessWidget {
  const _PaidUntilBody({required this.view, required this.compact, required this.title});

  final PaidUntilView view;
  final bool compact;
  final String title;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = view.tone(c);
    return AppCard(
      padding: EdgeInsets.zero,
      semanticLabel: '$title: ${view.dateLabel ?? 'тооцоогүй'}, ${view.title}',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpace.lg),
              child: Row(
                children: [
                  Container(
                    width: compact ? 48 : 60,
                    height: compact ? 48 : 60,
                    decoration: BoxDecoration(
                      color: c.surfaceSunken,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Icon(view.icon, color: tone, size: compact ? 26 : 32),
                  ),
                  const SizedBox(width: AppSpace.lg),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                        const SizedBox(height: 2),
                        Text(
                          view.dateLabel ?? 'Тооцоогүй',
                          style: (compact ? context.text.displaySmall : context.text.displayMedium)
                              ?.copyWith(fontSize: compact ? 22 : 26),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          view.title,
                          style: context.text.labelLarge?.copyWith(color: tone),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: c.line),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
              child: Text(view.hint, style: context.text.bodySmall),
            ),
          ],
        ),
      ),
    );
  }
}
