import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/day_summary.dart';
import '../domain/board_logic.dart';
import 'teacher_widgets.dart';

/// «Ангиуд» → «Өнөөдөр» (вэбийн `TodayOverview`): сонгосон өдөр хичээлтэй анги бүрийн ирц, даалгаврын явц.
/// Мөр дээр дарвал тэр өдрийн ангийн самбар (ирц, даалгавар).
class TodayOverview extends ConsumerStatefulWidget {
  const TodayOverview({super.key});

  @override
  ConsumerState<TodayOverview> createState() => _TodayOverviewState();
}

class _TodayOverviewState extends ConsumerState<TodayOverview> {
  late var _date = ref.read(teacherTodayProvider).startOfDay;

  @override
  Widget build(BuildContext context) {
    final now = ref.watch(teacherTodayProvider);
    final today = now.startOfDay;
    final key = _date.dateKey;
    final async = ref.watch(daySummaryProvider(key));
    final minuteNow = now.hour * 60 + now.minute;
    return RefreshIndicator(
      onRefresh: () => ref
          .refresh(daySummaryProvider(key).future)
          .then((_) {}, onError: (_) {}),
      child: ListView(
        key: const ValueKey('today-overview'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          AppSpace.gutter,
          0,
          AppSpace.gutter,
          AppSpace.xxl,
        ),
        children: [
          DayStepper(
            date: _date,
            today: today,
            onChanged: (d) => setState(() => _date = d),
          ),
          ...async.when(
            skipLoadingOnRefresh: false,
            loading: () => [
              const LoadingState(cards: 4, padding: EdgeInsets.zero),
            ],
            error: (e, _) => [
              SizedBox(
                height: 320,
                child: ErrorState(
                  message: errorText(e, 'Өнөөдрийн тойм нээгдсэнгүй'),
                  onRetry: () => ref.invalidate(daySummaryProvider(key)),
                ),
              ),
            ],
            data: (d) => d.classes.isEmpty
                ? [
                    const SizedBox(
                      height: 280,
                      child: EmptyState(
                        icon: AppIcons.calendarOff,
                        title: 'Энэ өдөр хичээлтэй анги алга',
                        message: 'Өөр өдөр сонгоно уу',
                      ),
                    ),
                  ]
                : [
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: Meta(
                        key: const ValueKey('today-totals'),
                        style: context.text.bodySmall?.copyWith(
                          color: context.colors.inkDim,
                        ),
                        items: [
                          '${d.classes.length} анги',
                          'ирсэн ${d.cameTotal}/${d.studentTotal}',
                          if (d.homeworkBase > 0)
                            'даалгавар ${d.homeworkDone}/${d.homeworkBase}',
                        ],
                      ),
                    ),
                    for (final c in d.classes) ...[
                      _DayClassCard(
                        cls: c,
                        date: key,
                        started:
                            _date.dayIndex < today.dayIndex ||
                            (_date.isSameDay(today) &&
                                minuteNow >= c.startMinute),
                      ),
                      const SizedBox(height: AppSpace.sm),
                    ],
                  ],
          ),
        ],
      ),
    );
  }
}

class _DayClassCard extends StatelessWidget {
  const _DayClassCard({
    required this.cls,
    required this.date,
    required this.started,
  });

  final DaySummaryClass cls;
  final String date;
  final bool started;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final a = cls.attendance;
    final hw = cls.homework;
    final room = cls.room;
    return AppCard(
      semanticLabel: cls.shortName,
      onTap: () => context.push(
        '/app/teacher/board/${Uri.encodeComponent(cls.id)}?date=$date',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cls.shortName,
                      style: context.text.titleMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Meta(
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      items: [
                        hm(cls.startMinute),
                        if (room != null && room.isNotEmpty) '$room тоот',
                        '${cls.students} сурагч',
                      ],
                    ),
                  ],
                ),
              ),
              if (cls.confirmed)
                _Flag(
                  icon: AppIcons.badgeCheck,
                  text: 'Батлагдсан',
                  color: c.success,
                )
              else if (started && a.unmarked > 0)
                _Flag(
                  icon: AppIcons.warning,
                  text: '${a.unmarked} тэмдэглээгүй',
                  color: c.warning,
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          _Progress(
            label: 'Ирсэн',
            value: a.came,
            total: cls.students,
            note: a.away > 0 ? '${a.away} ирээгүй' : null,
          ),
          const SizedBox(height: AppSpace.sm),
          if (hw != null)
            _Progress(
              label: 'Даалгавар хийсэн',
              value: hw.done,
              total: cls.students,
              note: hw.missing > 0 ? '${hw.missing} дутуу, хийгээгүй' : null,
            )
          else
            Text(
              'Онлайн анги',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
        ],
      ),
    );
  }
}

class _Flag extends StatelessWidget {
  const _Flag({required this.icon, required this.text, required this.color});

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 16, color: color),
      const SizedBox(width: AppSpace.xs),
      Text(
        text,
        style: context.text.labelMedium?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    ],
  );
}

/// «Ирсэн 35/40» + нимгэн зурвас; ирээгүй, дутуу нь жижгээр.
class _Progress extends StatelessWidget {
  const _Progress({
    required this.label,
    required this.value,
    required this.total,
    this.note,
  });

  final String label;
  final int value;
  final int total;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final frac = total > 0 ? (value / total).clamp(0.0, 1.0) : 0.0;
    return Semantics(
      label: '$label $value/$total',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
              Text(
                '$value/$total',
                style: context.text.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: frac,
              minHeight: 6,
              color: c.brandBright,
              backgroundColor: c.line,
            ),
          ),
          if (note != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                note!,
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ),
        ],
      ),
    );
  }
}
