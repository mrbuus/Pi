import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/study_review_controller.dart';
import '../data/study_models.dart';
import 'inline_message.dart';

/// `/app/study/history` — хувийн давтлагын жилийн түүх.
class ReviewHistoryScreen extends ConsumerWidget {
  const ReviewHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final year = ref.watch(historyYearProvider);
    final history = ref.watch(historyProvider);
    final maxYear = DateTime.now().toUtc().year + 1;
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Давтлагын түүх')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.sm),
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Өмнөх жил',
                  icon: const Icon(AppIcons.back),
                  onPressed: year > 2000 ? () => ref.read(historyYearProvider.notifier).set(year - 1) : null,
                ),
                Expanded(
                  child: Center(child: Semantics(header: true, child: Text('$year он', style: context.text.titleMedium))),
                ),
                IconButton(
                  tooltip: 'Дараагийн жил',
                  icon: const Icon(AppIcons.forward),
                  onPressed: year < maxYear ? () => ref.read(historyYearProvider.notifier).set(year + 1) : null,
                ),
              ],
            ),
          ),
          Expanded(
            child: history.when(
              skipLoadingOnReload: false,
              loading: () => const LoadingState(cards: 2),
              error: (e, _) => ErrorState(
                title: 'Түүх ачаалж чадсангүй',
                message: errorText(e),
                onRetry: () => ref.invalidate(historyProvider),
              ),
              data: (v) => _HistoryList(view: v),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryList extends ConsumerWidget {
  const _HistoryList({required this.view});

  final HistoryView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = view.page;
    if (p.items.isEmpty) {
      return EmptyState(
        title: '${p.year} онд давтлага хийгээгүй байна',
        message: 'Бүртгэлгүй байх нь чадвар муу гэсэн үнэлгээ биш',
      );
    }
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        for (final i in p.items) ...[
          _HistoryCard(item: i),
          const SizedBox(height: AppSpace.md),
        ],
        if (p.nextCursor != null) ...[
          if (view.moreError) const InlineMessage('Өмнөх бүртгэлүүд ачаалсангүй'),
          OutlinedButton(
            onPressed: view.loadingMore ? null : ref.read(historyProvider.notifier).loadMore,
            child: Text(view.loadingMore ? 'Ачаалж байна' : 'Өмнөх бүртгэлүүд'),
          ),
        ],
        if (p.caution.isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          Text(p.caution, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        ],
      ],
    );
  }
}

String _stamp(DateTime t) => DateMn.numericWithTime(UbDateTime.fromInstant(t));

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.item});

  final HistoryItem item;

  @override
  Widget build(BuildContext context) {
    final e = item.evidence;
    return AppCard(
      onTap: () => context.push('/app/study/review?run=${Uri.encodeQueryComponent(item.id)}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_stamp(item.startedAt), style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          Meta(items: [item.stateLabel, '${item.budgetMinutes} минут'], style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          const SizedBox(height: AppSpace.sm),
          Text(
            'Эхний хариу ${e.answered}/${e.assigned}, эхний зөв ${e.firstCorrect}, '
            'тусламжгүй эхний зөв ${e.independentFirstCorrect}',
            style: context.text.bodyMedium,
          ),
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text('Тусламж ба засварын бүртгэл', style: context.text.bodySmall),
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Row('Тусламжтай эхний хариу', '${e.assistedFirst}'),
              _Row('Тусламжтай засвартай бодлого', '${e.correctedWithAssistance}'),
              _Row('Үнэлгээгүй эсвэл хариулаагүй', '${e.unknown}'),
              _Row('Хугацааны төгсгөл', _stamp(item.deadlineAt)),
              if (item.submittedAt != null) _Row('Хаасан огноо', _stamp(item.submittedAt!)),
            ],
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.xs),
    child: Row(
      children: [
        Expanded(child: Text(label, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim))),
        Text(value, style: context.text.bodySmall),
      ],
    ),
  );
}
