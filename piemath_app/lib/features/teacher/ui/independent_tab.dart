import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_extras.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// Сурагчийн «Бие даасан явц» таб: жилийн идэвхийн дулааны зураг + онлайн шалгалтын дүнгийн хураангуй
/// (вэбийн `IndependentProgressTab`). Зөвхөн тухайн сурагчийн өөрийн түүх — ангийн харьцуулалт байхгүй.
class IndependentTab extends ConsumerStatefulWidget {
  const IndependentTab({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<IndependentTab> createState() => _IndependentTabState();
}

class _IndependentTabState extends ConsumerState<IndependentTab> {
  int? _year;

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider);
    final year = _year ?? today.year;
    final args = (studentId: widget.studentId, year: year);
    final activity = ref.watch(studentActivityProvider(args));
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        Row(
          children: [
            Expanded(child: Text('Идэвхийн түүх', style: context.text.titleSmall)),
            IconButton(
              tooltip: 'Өмнөх жил',
              constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
              icon: const Icon(TeacherIcons.prevDay),
              onPressed: () => setState(() => _year = year - 1),
            ),
            Text('$year', style: context.text.titleSmall),
            IconButton(
              tooltip: 'Дараагийн жил',
              constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
              icon: const Icon(TeacherIcons.nextDay),
              onPressed: year >= today.year ? null : () => setState(() => _year = year + 1),
            ),
          ],
        ),
        ...activity.when(
          skipLoadingOnRefresh: false,
          loading: () => [const LoadingState(cards: 2, padding: EdgeInsets.zero)],
          error: (e, _) => [
            SizedBox(
              height: 240,
              child: ErrorState(
                message: errorText(e, 'Идэвхийн түүх нээгдсэнгүй'),
                onRetry: () => ref.invalidate(studentActivityProvider(args)),
              ),
            ),
          ],
          data: (a) => _activity(context, a, year == today.year, today.dateKey),
        ),
        const SizedBox(height: AppSpace.xl),
        Text('Онлайн шалгалтын дүн', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        _TestStats(studentId: widget.studentId),
      ],
    );
  }

  List<Widget> _activity(BuildContext context, ActivityYear a, bool current, String todayKey) {
    if (a.days.isEmpty) {
      return [const SizedBox(height: 200, child: EmptyState(title: 'Идэвхийн мэдээлэл алга'))];
    }
    final s = a.streak(todayKey);
    return [
      Text(
        '${current ? 'Энэ жил' : '${a.year} онд'} ${a.totalActiveDays} өдөр идэвхтэй байлаа',
        style: context.text.bodyMedium,
      ),
      if (current) ...[
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.lg,
          runSpacing: AppSpace.xs,
          children: [
            _StreakChip(label: 'Дараалсан өдөр', n: s.current),
            _StreakChip(label: 'Хамгийн урт', n: s.longest),
          ],
        ),
      ],
      const SizedBox(height: AppSpace.md),
      AppCard(child: ActivityHeatmap(year: a, scrollToEnd: current)),
      const SizedBox(height: AppSpace.sm),
      const _HeatmapLegend(),
    ];
  }
}

class _StreakChip extends StatelessWidget {
  const _StreakChip({required this.label, required this.n});

  final String label;
  final int n;

  @override
  Widget build(BuildContext context) => Semantics(
    label: '$label $n өдөр',
    excludeSemantics: true,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(TeacherIcons.streak, size: 16, color: context.colors.brand),
        const SizedBox(width: AppSpace.xs),
        Text('$label $n', style: context.text.labelLarge),
      ],
    ),
  );
}

/// Өнгөний шат: бага → их (тайлбар жагсаалтын доор).
class _HeatmapLegend extends StatelessWidget {
  const _HeatmapLegend();

  @override
  Widget build(BuildContext context) {
    final style = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return ExcludeSemantics(
      child: Row(
        children: [
          Text('Бага', style: style),
          const SizedBox(width: AppSpace.sm),
          for (var l = 0; l <= 4; l++) Padding(padding: const EdgeInsets.only(right: 3), child: HeatCell(level: l)),
          const SizedBox(width: AppSpace.xs),
          Text('Их', style: style),
        ],
      ),
    );
  }
}

/// Жилийн дулааны зураг: багана = 7 хоног (Даваагаас), мөр = гараг. Дэлгэцийн уншигчид зөвхөн хураангуй текст.
class ActivityHeatmap extends StatelessWidget {
  const ActivityHeatmap({super.key, required this.year, this.scrollToEnd = false});

  final ActivityYear year;

  /// Энэ жил бол өнөөдрийн тал (баруун) харагдана.
  final bool scrollToEnd;

  static const double cell = 12;
  static const double gap = 3;

  @override
  Widget build(BuildContext context) {
    final first = parseDateKey(year.days.first.date);
    final offset = first == null ? 0 : first.weekday - 1;
    final slots = <ActivityDay?>[...List<ActivityDay?>.filled(offset, null), ...year.days];
    while (slots.length % 7 != 0) {
      slots.add(null);
    }
    final style = context.text.labelSmall?.copyWith(color: context.colors.inkDim, height: 1);
    final cols = <Widget>[];
    for (var w = 0; w < slots.length ~/ 7; w++) {
      final week = slots.sublist(w * 7, w * 7 + 7);
      final start = week.whereType<ActivityDay>().firstOrNull;
      final d = start == null ? null : parseDateKey(start.date);
      // Сар эхэлсэн баганад сарын дугаар.
      final label = d != null && d.day <= 7 ? '${d.month}' : '';
      cols.add(
        Padding(
          padding: const EdgeInsets.only(right: gap),
          child: Column(
            children: [
              SizedBox(
                width: cell,
                height: 14,
                child: OverflowBox(
                  maxWidth: 28,
                  alignment: Alignment.centerLeft,
                  child: Text(label, style: style, maxLines: 1, softWrap: false),
                ),
              ),
              for (final day in week)
                Padding(
                  padding: const EdgeInsets.only(bottom: gap),
                  child: day == null
                      ? const SizedBox(width: cell, height: cell)
                      : HeatCell(level: day.level, holiday: day.isHoliday),
                ),
            ],
          ),
        ),
      );
    }
    return Semantics(
      label: '${year.year} онд ${year.totalActiveDays} өдөр идэвхтэй',
      child: ExcludeSemantics(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          reverse: scrollToEnd,
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: cols),
        ),
      ),
    );
  }
}

/// Нэг өдрийн нүд. Өнгө нь брэндийн ил тод байдлаар (0 = хоосон). Амралт = хүрээтэй.
class HeatCell extends StatelessWidget {
  const HeatCell({super.key, required this.level, this.holiday = false});

  final int level;
  final bool holiday;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const alphas = [0.0, 0.25, 0.45, 0.7, 1.0];
    return Container(
      width: ActivityHeatmap.cell,
      height: ActivityHeatmap.cell,
      decoration: BoxDecoration(
        color: level == 0 ? c.surfaceSunken : c.brand.withValues(alpha: alphas[level.clamp(0, 4)]),
        borderRadius: BorderRadius.circular(3),
        border: holiday ? Border.all(color: c.line) : null,
      ),
    );
  }
}

/// Онлайн шалгалтын дүнгийн хураангуй: өгсөн тоо, дундаж, хамгийн сайн.
class _TestStats extends ConsumerWidget {
  const _TestStats({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testResultsProvider(studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 1, padding: EdgeInsets.zero),
      error: (e, _) => SizedBox(
        height: 220,
        child: ErrorState(
          message: errorText(e, 'Шалгалтын дүн нээгдсэнгүй'),
          onRetry: () => ref.invalidate(testResultsProvider(studentId)),
        ),
      ),
      data: (list) {
        if (list.isEmpty) return const SizedBox(height: 180, child: EmptyState(title: 'Шалгалтын дүн алга'));
        final pcts = [for (final r in list) r.maxScore > 0 ? (r.totalScore / r.maxScore * 100).round() : 0];
        final avg = (pcts.reduce((a, b) => a + b) / pcts.length).round();
        final best = pcts.reduce((a, b) => a > b ? a : b);
        return Row(
          children: [
            Expanded(child: _Stat(label: 'Өгсөн тест', value: '${list.length}')),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: _Stat(label: 'Дундаж', value: '$avg%')),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: _Stat(label: 'Хамгийн сайн', value: '$best%')),
          ],
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(AppSpace.md),
    child: Semantics(
      label: '$label $value',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: context.text.titleLarge),
          const SizedBox(height: AppSpace.xs),
          Text(label, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        ],
      ),
    ),
  );
}
