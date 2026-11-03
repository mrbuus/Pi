import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../learning/data/activity_models.dart';
import '../../learning/data/activity_repository.dart';

/// Энэ долоо хоногийн нэг өдөр (Даваа-Ням).
class WeekDot {
  const WeekDot({required this.date, required this.count, required this.isToday, required this.isFuture});

  final UbDateTime date;
  final int count;
  final bool isToday;
  final bool isFuture;

  bool get done => count > 0;
}

/// Вэбийн `StreakWeekCard`-ийн долоо хоног: Даваагаас Ням хүртэл 7 өдөр (UB огноо).
List<WeekDot> weekDots(UbDateTime today, ActivityYear? year) {
  final start = today.startOfDay.addDays(1 - today.weekday);
  return [
    for (var i = 0; i < 7; i++)
      () {
        final d = start.addDays(i);
        return WeekDot(
          date: d,
          count: year?.byKey[d.dateKey]?.count ?? 0,
          isToday: d.isSameDay(today),
          isFuture: d.dayIndex > today.dayIndex,
        );
      }(),
  ];
}

/// Сурагчийн нүүрний «Идэвх» карт: `/activity/me` (7 хоног) + `/activity/streak`.
///
/// Тайван өнгө аяс (UX-RESEARCH §10): дарамт, буруутгал, «дараалал тасарлаа» гэсэн үг, улаан өнгө ХЭЗЭЭ Ч үгүй.
/// Идэвхгүй өдөр нь зүгээр хоосон тойрог. Өгөгдөл ачаалагдахгүй бол карт нууцлагдана (чухал биш мэдээлэл).
class ActivityWeekCard extends ConsumerWidget {
  const ActivityWeekCard({super.key, required this.today});

  final UbDateTime today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final year = ref.watch(activityYearProvider(today.year));
    final streak = ref.watch(activityStreakProvider);
    if (year.hasError && streak.hasError) return const SizedBox.shrink();
    if (!year.hasValue && !streak.hasValue) {
      return const SkeletonPulse(child: SkeletonCard(lines: 2));
    }
    final dots = weekDots(today, year.value);
    final s = streak.value;
    final weekCount = dots.where((d) => d.done).length;
    return AppCard(
      onTap: () => context.push('/app/activity'),
      semanticLabel:
          'Идэвх. Энэ долоо хоногт $weekCount өдөр бодлого бодсон.${s == null ? '' : ' Дараалсан ${s.currentStreak} өдөр.'} Дэлгэрэнгүй нээх',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(AppIcons.chart, size: 20, color: context.colors.brandSoft),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  'Идэвх',
                  style: context.text.titleMedium?.copyWith(
                    color: context.colors.brandSoft,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          ExcludeSemantics(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [for (final d in dots) _DayDot(dot: d)],
            ),
          ),
          if (s != null) ...[
            const SizedBox(height: AppSpace.md),
            Row(
              children: [
                Expanded(
                  child: _Stat(label: 'Дараалсан өдөр', value: s.currentStreak),
                ),
                Expanded(
                  child: _Stat(label: 'Хамгийн урт', value: s.longestStreak),
                ),
                Expanded(
                  child: _Stat(label: 'Нийт өдөр', value: s.totalActiveDays),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot({required this.dot});

  final WeekDot dot;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Opacity(
      opacity: dot.isFuture ? 0.5 : 1,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: dot.done ? c.brand : null,
              border: Border.all(color: dot.done ? c.brand : (dot.isToday ? c.brandSoft : c.line), width: 2),
            ),
            child: dot.done ? Icon(AppIcons.check, size: 18, color: c.onBrand) : null,
          ),
          const SizedBox(height: 4),
          Text(
            weekdayShortMn(dot.date.weekday),
            style: context.text.labelSmall?.copyWith(
              color: dot.isToday ? c.brandSoft : c.inkDim,
              fontWeight: dot.isToday ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$value', style: context.text.titleLarge),
        Text(
          label,
          style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
