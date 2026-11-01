import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../application/mistakes_controller.dart';
import '../data/mistake_models.dart';
import '../learning_icons.dart';
import 'inline_message.dart';
import 'mistake_detail.dart';

/// `/app/mistakes` — алдааны дэвтэр: тоо, сэдвийн шүүлтүүр, жагсаалт, өнөөдрийн давтлага.
class MistakesScreen extends ConsumerWidget {
  const MistakesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final book = ref.watch(mistakesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Алдааны дэвтэр')),
      body: book.when(
        skipLoadingOnRefresh: true,
        skipLoadingOnReload: true,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Алдааны дэвтэр ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(mistakesProvider),
        ),
        data: (n) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(todayMistakesProvider);
            ref.invalidate(mistakesProvider);
            await ref.read(mistakesProvider.future);
          },
          child: _NotebookList(notebook: n),
        ),
      ),
    );
  }
}

class _NotebookList extends ConsumerWidget {
  const _NotebookList({required this.notebook});

  final Notebook notebook;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(mistakeFilterProvider);
    final ctl = ref.read(mistakeFilterProvider.notifier);
    final today = ref.watch(todayMistakesProvider);
    final n = notebook;
    final filtered = filter.status != null || filter.topic != null || filter.source != null;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        _CountsRow(counts: n.counts),
        const SizedBox(height: AppSpace.lg),
        AppCard(
          onTap: () => context.push('/app/mistakes/today'),
          child: Row(
            children: [
              Icon(LearningIcons.review, color: context.colors.brand),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Өнөөдрийн давтлага', style: context.text.titleSmall),
                    Text(
                      today.when(
                        data: (l) => l.isEmpty ? 'Өнөөдөр товлосон бодлого алга' : 'Өнөөдөр ${l.length} бодлого давтахаар байна',
                        loading: () => 'Ачаалж байна',
                        error: (_, _) => 'Давтлагыг нээж үзнэ үү',
                      ),
                      style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                    ),
                  ],
                ),
              ),
              Icon(AppIcons.forward, color: context.colors.inkDim),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.xl),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            ChoiceChip(label: const Text('Бүгд'), selected: filter.status == null, onSelected: (_) => ctl.setStatus(null)),
            for (final s in MistakeStatus.values)
              ChoiceChip(
                label: Text(s.label),
                selected: filter.status == s,
                onSelected: (_) => ctl.setStatus(filter.status == s ? null : s),
              ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final s in MistakeSource.values)
              FilterChip(
                label: Text(s.label),
                selected: filter.source == s,
                onSelected: (_) => ctl.setSource(filter.source == s ? null : s),
              ),
          ],
        ),
        if (n.byTopic.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xl),
          const SectionHeader(title: 'Сэдвээр', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              for (final t in n.byTopic)
                FilterChip(
                  label: Text('${t.topic} (${t.count})'),
                  selected: filter.topic == t.topic,
                  onSelected: (_) => ctl.setTopic(filter.topic == t.topic ? null : t.topic),
                ),
            ],
          ),
        ],
        const SizedBox(height: AppSpace.xl),
        if (n.items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
            child: EmptyState(
              icon: LearningIcons.mistakes,
              title: filtered ? 'Энэ шүүлтүүрт алдаа олдсонгүй' : 'Дэвтэр хоосон байна',
              message: filtered
                  ? null
                  : 'Тест, дасгалд алдсан бодлого энд автоматаар хадгалагдаж, дахин бодох боломжтой болно',
              action: filtered ? TextButton(onPressed: ctl.clear, child: const Text('Шүүлтүүр арилгах')) : null,
            ),
          )
        else ...[
          for (final m in n.items) ...[
            _MistakeRow(item: m),
            const SizedBox(height: AppSpace.md),
          ],
          if (n.nextCursor != null) const _LoadMore(),
        ],
      ],
    );
  }
}

class _CountsRow extends StatelessWidget {
  const _CountsRow({required this.counts});

  final MistakeCounts counts;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Алдааны төлөвийн тоо',
      child: Row(
        children: [
          for (final s in MistakeStatus.values) ...[
            if (s != MistakeStatus.fresh) const SizedBox(width: AppSpace.md),
            Expanded(
              child: AppCard(
                padding: const EdgeInsets.all(AppSpace.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${counts.of(s)}', style: context.text.headlineSmall),
                    Text(s.label, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MistakeRow extends ConsumerWidget {
  const _MistakeRow({required this.item});

  final Mistake item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    return AppCard(
      onTap: () => Navigator.of(context).push<void>(
        MaterialPageRoute(fullscreenDialog: true, builder: (_) => MistakeDetailPage(mistakeId: item.id, initial: item)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MathText(item.problem.statementText ?? 'Зурагтай бодлого', maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: AppSpace.sm),
          Meta(
            items: [
              item.status.label,
              item.reason?.label,
              item.testTitle,
            ],
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
        ],
      ),
    );
  }
}

class _LoadMore extends ConsumerWidget {
  const _LoadMore();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctl = ref.read(mistakesProvider.notifier);
    return ValueListenableBuilder<bool>(
      valueListenable: ctl.moreFailed,
      builder: (context, failed, _) => Column(
        children: [
          if (failed) const InlineMessage('Дараагийн бодлогууд ачаалсангүй'),
          OutlinedButton(onPressed: ctl.loadMore, child: Text(failed ? AppStrings.retry : 'Цааш үзэх')),
        ],
      ),
    );
  }
}

/// Нэг алдааны бүтэн дэлгэц. Жагсаалтын төлөвөөс уншина — дахин оролдсоны дараа шинэчлэгдсэн хэвээр харагдана.
class MistakeDetailPage extends ConsumerWidget {
  const MistakeDetailPage({super.key, required this.mistakeId, required this.initial});

  final String mistakeId;
  final Mistake initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(mistakesProvider).value?.items ?? const <Mistake>[];
    final item = items.firstWhere((m) => m.id == mistakeId, orElse: () => initial);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(AppIcons.close),
          tooltip: AppStrings.close,
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Алдаа'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          child: MistakeDetail(item: item, onChanged: ref.read(mistakesProvider.notifier).replace),
        ),
      ),
    );
  }
}
