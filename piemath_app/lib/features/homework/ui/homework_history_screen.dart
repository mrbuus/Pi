import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../domain/homework_history_logic.dart';
import '../domain/homework_logic.dart';
import 'homework_badges.dart';
import 'homework_providers.dart';

/// `/app/homework/history` — багшийн тэмдэглэгээний жилийн түүх (`GET /homework-marks/my?year=`).
class HomeworkHistoryScreen extends ConsumerStatefulWidget {
  const HomeworkHistoryScreen({super.key});

  @override
  ConsumerState<HomeworkHistoryScreen> createState() => _HomeworkHistoryScreenState();
}

class _HomeworkHistoryScreenState extends ConsumerState<HomeworkHistoryScreen> {
  int? _year;

  int get _thisYear => int.tryParse(ref.read(todayKeyProvider).substring(0, 4)) ?? DateTime.now().year;

  @override
  Widget build(BuildContext context) {
    final thisYear = _thisYear;
    final year = _year ?? thisYear;
    final marks = ref.watch(homeworkYearMarksProvider(year));
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('Даалгаврын түүх')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Өмнөх он',
                  icon: const Icon(AppIcons.back),
                  onPressed: year <= thisYear - 5 ? null : () => setState(() => _year = year - 1),
                ),
                Expanded(
                  child: Text('$year он', textAlign: TextAlign.center, style: context.text.titleMedium),
                ),
                IconButton(
                  tooltip: 'Дараагийн он',
                  icon: const Icon(AppIcons.forward),
                  onPressed: year >= thisYear ? null : () => setState(() => _year = year + 1),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: c.line),
          Expanded(
            child: marks.when(
              skipLoadingOnRefresh: true,
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(
                message: e is ApiError ? e.message : AppStrings.genericError,
                onRetry: () => ref.invalidate(homeworkYearMarksProvider(year)),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    icon: AppIcons.homework,
                    title: '$year онд тэмдэглэгээ алга',
                    message: 'Багш даалгавар шалгаж тэмдэглэхэд энд гарна',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(homeworkYearMarksProvider(year)),
                  child: _MarksList(entries: list),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MarksList extends StatelessWidget {
  const _MarksList({required this.entries});

  final List<HwMarkEntry> entries;

  @override
  Widget build(BuildContext context) {
    final s = summarizeMarks(entries);
    final months = groupMarksByMonth(entries);
    final rows = <Widget Function()>[
      () => Padding(
        padding: const EdgeInsets.only(top: AppSpace.lg),
        child: AppCard(
          child: Row(
            children: [
              _Count(icon: AppIcons.bookOpenCheck, label: 'Хийсэн', value: s.done, color: context.colors.success),
              _Count(icon: AppIcons.circleDashed, label: 'Дутуу', value: s.partial, color: context.colors.warning),
              _Count(icon: AppIcons.failure, label: 'Хийгээгүй', value: s.notDone, color: context.colors.error),
            ],
          ),
        ),
      ),
      for (final (month, items) in months) ...[
        () => SectionHeader(
          title: monthTitleMn(month),
          padding: const EdgeInsets.only(top: AppSpace.lg, bottom: AppSpace.sm),
        ),
        for (final e in items) () => _MarkRow(entry: e),
      ],
    ];
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
      itemCount: rows.length,
      itemBuilder: (_, i) => rows[i](),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.icon, required this.label, required this.value, required this.color});

  final IconData icon;
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        label: '$label: $value',
        excludeSemantics: true,
        child: Column(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: AppSpace.xs),
            Text('$value', style: context.text.titleLarge),
            Text(label, style: context.text.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _MarkRow extends StatelessWidget {
  const _MarkRow({required this.entry});

  final HwMarkEntry entry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 56),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(dayLabel(entry.date), style: context.text.titleSmall),
                  if (entry.classroomName.isNotEmpty) Text(entry.classroomName, style: context.text.bodySmall),
                  if (entry.comment != null)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xs),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(AppIcons.messageSquareText, size: 14, color: c.inkDim, semanticLabel: 'Багшийн тайлбар'),
                          const SizedBox(width: AppSpace.xs),
                          Expanded(child: Text(entry.comment!, style: context.text.bodyMedium)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            HomeworkMarkBadge(mark: entry.mark),
          ],
        ),
      ),
    );
  }
}
