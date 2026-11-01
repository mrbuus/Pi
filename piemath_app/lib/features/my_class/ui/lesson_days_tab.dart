import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'day_row.dart';
import 'list_frame.dart';

/// «Хичээлүүд» таб: сараар, хичээлийн өдөр бүр нэг мөр (шинэ нь дээр) — дарахад дэлгэрэнгүй.
class LessonDaysTab extends ConsumerStatefulWidget {
  const LessonDaysTab({super.key, this.initialMonth, this.today});

  final String? initialMonth;
  final String? today;

  @override
  ConsumerState<LessonDaysTab> createState() => _LessonDaysTabState();
}

class _LessonDaysTabState extends ConsumerState<LessonDaysTab> {
  late String _month = widget.initialMonth ?? currentMonthKey();

  @override
  Widget build(BuildContext context) {
    final days = ref.watch(hubDaysProvider(_month));
    final data = days.value;
    final today = widget.today ?? todayKey();

    Widget nav(int dir) {
      final target = dir < 0 ? data?.prevMonth : data?.nextMonth;
      return IconButton(
        tooltip: dir < 0 ? 'Өмнөх сар' : 'Дараагийн сар',
        icon: Icon(dir < 0 ? AppIcons.back : AppIcons.forward),
        onPressed: target == null ? null : () => setState(() => _month = target),
      );
    }

    return RefreshIndicator(
      onRefresh: () => refreshProviders(ref, [hubDaysProvider(_month)]),
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.gutter, AppSpace.gutter, AppSpace.md),
            sliver: SliverToBoxAdapter(
              child: AppCard(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
                child: Row(
                  children: [
                    nav(-1),
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(monthTitle(_month), textAlign: TextAlign.center, style: context.text.titleSmall),
                      ),
                    ),
                    nav(1),
                  ],
                ),
              ),
            ),
          ),
          ..._body(context, days, today),
        ],
      ),
    );
  }

  List<Widget> _body(BuildContext context, AsyncValue<HubDays> days, String today) {
    Widget box(Widget child) => SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverToBoxAdapter(child: child),
        );
    final data = days.value;
    if (data == null || data.month != _month) {
      if (days.hasError) {
        return [
          SliverFillRemaining(
            hasScrollBody: false,
            child: ErrorState(
              message: errorMessageOf(days.error!),
              onRetry: () => ref.invalidate(hubDaysProvider(_month)),
            ),
          ),
        ];
      }
      return [
        box(
          SkeletonPulse(
            child: Column(
              children: [for (var i = 0; i < 5; i++) ...[const SkeletonCard(lines: 1), const SizedBox(height: AppSpace.sm)]],
            ),
          ),
        ),
      ];
    }
    if (data.days.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            icon: AppIcons.calendar,
            title: 'Энэ сард хичээл алга',
            message: data.prevMonth != null ? 'Өмнөх сарын хичээлийг сумаар харна' : null,
          ),
        ),
      ];
    }
    final multiClass = data.days.map((d) => d.classroomId).toSet().length > 1;
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        sliver: SliverList.builder(
          itemCount: data.days.length,
          itemBuilder: (context, i) {
            final d = data.days[i];
            final first = i == 0, last = i == data.days.length - 1;
            return ListFrameTile(
              first: first,
              last: last,
              child: DayRow(
                day: d,
                today: today,
                showClass: multiClass,
                onOpen: () => context.push(dayPath(d.date, d.classroomId)),
              ),
            );
          },
        ),
      ),
    ];
  }
}
