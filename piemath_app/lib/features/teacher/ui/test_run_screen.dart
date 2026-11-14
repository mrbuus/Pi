import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../domain/test_run_row.dart';

/// Шалгалтын дүн (`/app/teacher/tests/:id/results`): сурагч бүрийн оноо, түүнчлэн бүртгэгдсэн
/// «гарсан / скриншот / бичлэг» тоо (зөвхөн > 0 үед). Эдгээр нь багшийн хянах мэдээлэл, дүгнэлт БИШ.
class TestRunScreen extends ConsumerWidget {
  const TestRunScreen({super.key, required this.testId, this.title});

  final String testId;
  final String? title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testRunProvider(testId));
    return Scaffold(
      appBar: AppBar(title: Text(title == null || title!.isEmpty ? 'Шалгалтын дүн' : title!)),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Шалгалтын дүн нээгдсэнгүй'),
          onRetry: () => ref.invalidate(testRunProvider(testId)),
        ),
        data: (rows) {
          if (rows.isEmpty) return const EmptyState(icon: AppIcons.exam, title: 'Дүн алга байна');
          return RefreshIndicator(
            onRefresh: () => ref.refresh(testRunProvider(testId).future).then((_) {}, onError: (_) {}),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
              children: [
                for (final r in rows) ...[_RunCard(row: r), const SizedBox(height: AppSpace.sm)],
                const SizedBox(height: AppSpace.sm),
                const IntegrityLegend(),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _RunCard extends StatelessWidget {
  const _RunCard({required this.row});

  final TestRunRow row;

  static String _n(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);

  @override
  Widget build(BuildContext context) {
    final inds = row.indicators;
    return AppCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.name, style: context.text.titleSmall),
                if (inds.isNotEmpty) ...[
                  const SizedBox(height: AppSpace.xs),
                  Wrap(
                    spacing: AppSpace.md,
                    runSpacing: AppSpace.xs,
                    children: [for (final i in inds) IntegrityChip(kind: i.kind, count: i.count)],
                  ),
                ],
              ],
            ),
          ),
          Text('${_n(row.totalScore)}/${_n(row.maxScore)}', style: context.text.titleMedium),
        ],
      ),
    );
  }
}

/// Нэг үзүүлэлт: дүрс + «Гарсан 2». Анхааруулах өнгө зөвхөн дүрсэнд (мөр улаан болохгүй).
class IntegrityChip extends StatelessWidget {
  const IntegrityChip({super.key, required this.kind, required this.count});

  final IntegrityKind kind;
  final int count;

  static IconData iconOf(IntegrityKind k) => switch (k) {
    IntegrityKind.leave => AppIcons.logout,
    IntegrityKind.screenshot => AppIcons.camera,
    IntegrityKind.recording => AppIcons.videoRecord,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: '${kind.label} $count',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(iconOf(kind), size: 16, color: c.warning),
          const SizedBox(width: AppSpace.xs),
          Text('${kind.label} $count', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
        ],
      ),
    );
  }
}

/// Доор байх тайлбар: бүртгэгдсэн үйл явдал, автомат дүгнэлт биш.
class IntegrityLegend extends StatelessWidget {
  const IntegrityLegend({super.key});

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(AppIcons.info, size: 16, color: context.colors.inkDim),
      const SizedBox(width: AppSpace.sm),
      Expanded(
        child: Text(
          'Гарсан, скриншот, бичлэгийн тоо нь шалгалтын үед бүртгэгдсэн үйл явдал бөгөөд багш өөрөө хянаж үзэх '
          'зорилготой. Эдгээр нь хууран мэхэлсэн гэсэн автомат дүгнэлт биш',
          style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
        ),
      ),
    ],
  );
}
